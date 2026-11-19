import { recordValue } from './levels-validation.js';
import { SDKError } from '@manygamescorp/core/error';
import { randomUuid, randomUuidV7 } from '@manygamescorp/core/context';
import { isSeed } from '@manygamescorp/core/random';
import { canonical, fail, freeze, integer, json, plain, wait } from './mechanic-validation.js';
const EMPTY = freeze({ active: null, last: null, cooldownUntil: 0, attempts: 0,
    wins: 0 });
const stateCode = 'MECHANIC_ATTEMPT_STATE_INVALID';
const GAME_STATE_DEPTH = 6;
const PARAMS_DEPTH = GAME_STATE_DEPTH - 5;
const uuid7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
function shape(v, fields) {
    return plain(v) && Object.keys(v).length === fields.length && fields.every(k => Object.hasOwn(v, k));
}
function measurements(v) {
    return plain(v) && typeof v.won === 'boolean' && integer(v.score, 0, 1_000_000_000)
        && integer(v.moves, 0, 1_000_000) && integer(v.reward, 0, 1_000_000_000);
}
function attempt(v) {
    return shape(v, ['id', 'seed', 'playerLevel', 'params', 'startedAt'])
        && typeof v.id === 'string' && uuid7.test(v.id) && isSeed(v.seed)
        && integer(v.playerLevel, 0, 1_000_000) && integer(v.startedAt, 0, Number.MAX_SAFE_INTEGER);
}
function read(data, id) {
    const m = data.mechanics;
    if (m === undefined)
        return EMPTY;
    if (!plain(m))
        fail(stateCode, { path: 'mechanics' });
    if (!Object.hasOwn(m, id))
        return EMPTY;
    const v = json(recordValue(m, id), stateCode);
    if (!shape(v, ['active', 'last', 'cooldownUntil', 'attempts', 'wins'])
        || !integer(v.cooldownUntil, 0, Number.MAX_SAFE_INTEGER)
        || !integer(v.attempts, 0, 1_000_000_000) || !integer(v.wins, 0, v.attempts)
        || (v.active !== null && (!attempt(v.active) || v.attempts === 0))
        || (v.last !== null && (!shape(v.last, ['attempt', 'result', 'durationMs', 'finishedAt'])
            || !attempt(v.last.attempt) || !measurements(v.last.result)
            || !integer(v.last.durationMs, 0, 86_400_000)
            || !integer(v.last.finishedAt, 0, Number.MAX_SAFE_INTEGER) || v.attempts === 0))) {
        fail(stateCode, { path: '' });
    }
    return freeze(v);
}
export function secondaryAttempts(deps) {
    let tail = Promise.resolve();
    let queued = 0;
    let pending;
    let seedGrant;
    deps.signal.addEventListener('abort', () => { pending = undefined; seedGrant = undefined; }, { once: true });
    const run = (options, work) => {
        const signal = deps.active(options);
        if (queued >= 16)
            fail('MECHANIC_ATTEMPT_CONFLICT');
        queued++;
        const task = tail.then(() => { deps.active(options); return work(signal); });
        tail = task.then(() => { }, () => { }).finally(() => { queued--; });
        return wait(task, signal);
    };
    const announce = (t) => {
        if (t.event === 'started')
            seedGrant = undefined;
        if (t.event)
            deps.notify(t.event, t.event === 'started' ? t.state.active.id : t.state.last.attempt.id, t.won, t.reward);
    };
    const flush = async (port, signal) => {
        const write = pending;
        if (!write)
            return;
        try {
            await wait(port.set(write.data, { version: write.version, idempotencyKey: write.key,
                signal }), signal);
        }
        catch (error) {
            deps.active({ signal });
            if (error instanceof SDKError && (error.code === 'GAME_STATE_VERSION_CONFLICT'
                || !error.retryable))
                pending = undefined;
            if (error instanceof SDKError && error.code === 'GAME_STATE_VERSION_CONFLICT')
                return;
            throw error;
        }
        deps.active({ signal });
        pending = undefined;
        announce(write.transition);
    };
    const mutate = async (signature, signal, transition, reset = false) => {
        const port = deps.port();
        if (pending && pending.signature !== signature)
            await flush(port, signal);
        let root = pending ? undefined : await wait(port.get({ signal }), signal);
        for (let writes = 0; writes < 3; writes++) {
            deps.active({ signal });
            if (!pending) {
                if (!root || !plain(root.data) || !integer(root.version, 0, Number.MAX_SAFE_INTEGER))
                    fail(stateCode, { path: '' });
                const s = reset ? EMPTY : read(root.data, deps.id);
                const t = await transition(s);
                deps.active({ signal });
                if (t.state === s && !reset)
                    return freeze(t.result);
                const state = freeze(json(t.state, stateCode));
                const mechanics = plain(root.data.mechanics) ? root.data.mechanics : undefined;
                pending = { signature, version: root.version, key: randomUuid(),
                    data: { ...root.data, mechanics: { ...mechanics, [deps.id]: state } },
                    transition: { ...t, state } };
            }
            const write = pending;
            try {
                await wait(port.set(write.data, { version: write.version, idempotencyKey: write.key,
                    signal }), signal);
                deps.active({ signal });
                pending = undefined;
                announce(write.transition);
                return freeze(write.transition.result);
            }
            catch (error) {
                deps.active({ signal });
                if (!(error instanceof SDKError) || error.code !== 'GAME_STATE_VERSION_CONFLICT') {
                    if (error instanceof SDKError && !error.retryable)
                        pending = undefined;
                    throw error;
                }
                pending = undefined;
                const details = error.details;
                if (!details || !integer(details.currentVersion, 0, Number.MAX_SAFE_INTEGER)
                    || !plain(details.data))
                    fail(stateCode, { path: '' });
                root = { version: details.currentVersion, data: details.data };
            }
        }
        fail('MECHANIC_ATTEMPT_CONFLICT');
    };
    return {
        async restore(options) {
            return run(options, async (signal) => {
                const port = deps.port();
                await flush(port, signal);
                const root = await wait(port.get({ signal }), signal);
                deps.active({ signal });
                if (!plain(root.data))
                    fail(stateCode, { path: '' });
                return read(root.data, deps.id);
            });
        },
        async begin(input, options) {
            deps.active(options);
            if (!plain(input))
                fail('VALIDATION_FAILED', { path: 'input' });
            const playerLevel = input.playerLevel;
            if (!integer(playerLevel, 0, 1_000_000))
                fail('MECHANIC_LEVEL_INVALID');
            const params = freeze(json(input.params, 'VALIDATION_FAILED', 'params', 16_384, PARAMS_DEPTH));
            const signature = canonical({ begin: { playerLevel, params } });
            return run(options, signal => mutate(signature, signal, async (s) => {
                let grant = seedGrant?.signature === signature ? seedGrant : undefined;
                if (s.active)
                    fail('MECHANIC_ATTEMPT_ACTIVE', { attemptId: s.active.id });
                const now = deps.now();
                if (now < s.cooldownUntil)
                    fail('MECHANIC_ATTEMPT_COOLDOWN', { availableAt: s.cooldownUntil });
                if (s.attempts === 1_000_000_000)
                    fail(stateCode, { path: 'attempts' });
                if (!grant) {
                    grant = { signature, id: randomUuidV7(now), startedAt: now };
                    seedGrant = grant;
                }
                if (grant.seed === undefined) {
                    const seed = await wait(deps.seed({ eventId: grant.id, playerLevel, params }, signal), signal);
                    deps.active({ signal });
                    if (!isSeed(seed))
                        fail('INTERNAL');
                    grant.seed = seed;
                }
                const active = freeze({ id: grant.id, seed: grant.seed,
                    playerLevel, params, startedAt: grant.startedAt });
                return { state: { ...s, active, attempts: s.attempts + 1 }, result: active,
                    event: 'started' };
            }));
        },
        async finish(id, input, options) {
            deps.active(options);
            if (typeof id !== 'string' || !uuid7.test(id))
                fail('MECHANIC_ATTEMPT_NOT_FOUND');
            const result = freeze(json(input, 'VALIDATION_FAILED', 'result', 16_384, GAME_STATE_DEPTH - 4));
            if (!measurements(result))
                fail('VALIDATION_FAILED', { path: 'result' });
            return run(options, signal => mutate(canonical({ finish: id, result }), signal, s => {
                if (s.last?.attempt.id === id)
                    return { state: s, result: s.last };
                if (s.active?.id !== id)
                    fail('MECHANIC_ATTEMPT_NOT_FOUND');
                const now = deps.now();
                const last = freeze({ attempt: s.active, result,
                    durationMs: Math.min(86_400_000, Math.max(0, now - s.active.startedAt)),
                    finishedAt: now });
                return { state: { ...s, active: null, last, wins: s.wins + Number(result.won),
                        cooldownUntil: now + deps.cooldownSec * 1000 }, result: last, event: 'finished',
                    won: result.won, reward: result.reward };
            }));
        },
        async reset(options) {
            return run(options, async (signal) => {
                const state = await mutate('reset', signal, () => ({ state: EMPTY, result: EMPTY }), true);
                seedGrant = undefined;
                return state;
            });
        },
    };
}

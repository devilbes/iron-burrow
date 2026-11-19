export { isMechanicOutcome, outcomeFromAttempt, attemptKey } from './mechanic-outcome.js';
import { recordValue } from './levels-validation.js';
import { SDKError } from '@manygamescorp/core/error';
import { randomUuidV7 } from '@manygamescorp/core/context';
import { parseMechanicSettings } from './mechanic-settings.js';
import { secondaryAttempts } from './mechanic-attempts.js';
import { canonical, fail, freeze, integer, json, level, plain, wait } from './mechanic-validation.js';
export { MECHANIC_SETTINGS_FIELDS, parseMechanicSettings, checkMechanicSettingsFields } from './mechanic-settings.js';
export { createCurve } from './mechanic-curve.js';
export function createMechanic(ctx, options) {
    const settings = parseMechanicSettings(ctx.settings);
    if (!plain(options) || typeof options.id !== 'string' || options.id.length > 64
        || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(options.id)
        || ['__proto__', 'constructor', 'prototype', 'core'].includes(options.id)
        || !Array.isArray(options.modes) || !options.modes.length
        || options.modes.some(m => !['core',
            'secondary'].includes(m)))
        fail('MECHANIC_SETTINGS_INVALID', { path: 'options' });
    if (!options.modes.includes(settings.mode))
        fail('MECHANIC_MODE_UNSUPPORTED', { mode: settings.mode });
    const id = options.id;
    const controller = new AbortController();
    const signal = AbortSignal.any([ctx.signal, controller.signal]);
    let ready = false;
    let readiness;
    let resolveCore;
    const coreReady = new Promise(resolve => { resolveCore = resolve; });
    const off = ctx.bus.on('sdk:core:ready', payload => resolveCore(payload), { signal });
    const active = (o, requireReady = true) => {
        const s = o?.signal ? AbortSignal.any([signal, o.signal]) : signal;
        if (s.aborted)
            fail('MODULE_NOT_ACTIVE');
        if (requireReady && !ready)
            fail('MECHANIC_NOT_READY');
        return s;
    };
    const emit = (action, attemptId, n, won, verified, reward) => {
        active();
        try {
            if (action === 'started')
                ctx.bus.emit(`${id}:attempt:started`, { attemptId, mode: settings.mode, n });
            else
                ctx.bus.emit(`${id}:attempt:finished`, { attemptId, mode: settings.mode, won: won,
                    verified: verified ?? null, reward: reward ?? null });
        }
        catch { }
    };
    const progress = () => ctx.sdk['progress'];
    let levels;
    const getLevels = (s) => {
        if (!levels) {
            levels = ctx.sdk['levels'].open(settings.levelsSet, { signal });
            void levels.catch(() => { levels = undefined; });
        }
        return wait(levels, s);
    };
    signal.addEventListener('abort', () => {
        off();
        void levels?.then(h => h.dispose(), () => { });
    }, { once: true });
    const appliedLevels = new WeakSet();
    const attempts = new WeakMap();
    const grants = new WeakMap();
    const core = Object.freeze({
        async currentStep(o) {
            const s = active(o);
            const state = await wait(progress().init(settings.progressKey, { signal: s }), s);
            active(o);
            let chosen;
            for (const [key, step] of Object.entries(state.steps)) {
                if (step.status !== 'available' || !key.startsWith(settings.stepPrefix))
                    continue;
                const suffix = key.slice(settings.stepPrefix.length);
                if (!/^[1-9][0-9]{0,6}$/.test(suffix))
                    continue;
                const n = Number(suffix);
                if (n > 1_000_000)
                    continue;
                if (!chosen || n < chosen.n)
                    chosen = { n, stepKey: key };
            }
            return chosen ?? fail('MECHANIC_STEP_UNAVAILABLE', { progressKey: settings.progressKey });
        },
        async load(n, o) {
            const s = active(o);
            level(n);
            const state = await wait(progress().init(settings.progressKey, { signal: s }), s);
            active(o);
            const step = recordValue(state.steps, `${settings.stepPrefix}${n}`);
            if (!step || step.status === 'locked')
                fail('MECHANIC_STEP_LOCKED', { progressKey: settings.progressKey, n });
            const handle = await getLevels(s);
            active(o);
            const applied = await wait(handle.get(n, { signal: s }), s);
            active(o);
            appliedLevels.add(applied);
            return applied;
        },
        async begin(applied) {
            active();
            if (!appliedLevels.has(applied))
                fail('VALIDATION_FAILED');
            let grant = grants.get(applied);
            if (!grant) {
                grant = { eventId: randomUuidV7(ctx.time.now()) };
                grants.set(applied, grant);
            }
            if (grant.flight)
                return wait(grant.flight, signal);
            const eventId = grant.eventId;
            const task = (async () => {
                const { set, n, key, levelId, configVersion, contentHash } = applied;
                const issued = await wait(progress().beginAttempt({ mechanic: id, eventId, mode: 'core',
                    level: { set, n, key, ...(levelId === undefined ? {} : { levelId }), configVersion,
                        contentHash } }, { signal }), signal);
                active();
                const attempt = freeze({ eventId, attemptId: issued.attemptId, applied, seed: issued.seed,
                    startedAt: ctx.time.now() });
                attempts.set(attempt, { perfStart: performance.now() });
                emit('started', attempt.eventId, applied.n);
                grants.delete(applied);
                return attempt;
            })();
            grant.flight = task;
            void task.catch(() => { delete grant.flight; });
            return task;
        },
        async levelEnd(attempt, input, o) {
            const s = active(o);
            const pinned = attempts.get(attempt);
            if (!pinned)
                fail('VALIDATION_FAILED');
            if (!plain(input) || Object.keys(input).some(k => !['moves', 'score', 'won',
                'objectives'].includes(k)))
                fail('VALIDATION_FAILED');
            const result = freeze(json(input, 'VALIDATION_FAILED'));
            if (!integer(result.moves, 0, 1_000_000) || !integer(result.score, 0, 1_000_000_000)
                || typeof result.won !== 'boolean' || (result.objectives !== undefined
                && (!Array.isArray(result.objectives) || result.objectives.length > 16
                    || !result.objectives.every(v => typeof v === 'string'
                        && v.length <= 64))))
                fail('VALIDATION_FAILED');
            const identity = canonical(result);
            let c = pinned.completion;
            if (c && c.canonical !== identity)
                fail('MECHANIC_ATTEMPT_RESULT_MISMATCH');
            if (!c) {
                c = { result, canonical: identity, durationMs: Math.min(86_400_000, Math.max(0, Math.round(performance.now() - pinned.perfStart))), emitted: false };
                pinned.completion = c;
            }
            if (c.ack)
                return c.ack;
            if (!c.flight) {
                const completion = c;
                const task = (async () => {
                    const h = await getLevels(signal);
                    active();
                    const ack = await h.levelEnd(attempt.applied, { ...completion.result,
                        seed: attempt.seed, durationMs: completion.durationMs }, { eventId: attempt.eventId, signal });
                    active();
                    completion.ack = freeze(ack);
                    if (!completion.emitted) {
                        completion.emitted = true;
                        emit('finished', attempt.eventId, attempt.applied.n, completion.result.won, ack.level.verified);
                    }
                    return completion.ack;
                })();
                c.flight = task;
                void task.then(() => { delete completion.flight; }, () => { delete completion.flight; });
            }
            return wait(c.flight, s);
        },
    });
    const attemptsApi = secondaryAttempts({ id, cooldownSec: settings.cooldownSec,
        now: () => ctx.time.now(), signal, active,
        seed: async (input, s) => (await progress().beginAttempt({ ...input, mechanic: id,
            mode: 'secondary' }, { signal: s })).seed,
        port: () => ctx.sdk['gamestate'],
        notify: (action, attemptId, won, reward) => emit(action, attemptId, null, won, null, reward) });
    return Object.freeze({ settings,
        async ready(o) {
            const s = active(o, false);
            if (!readiness) {
                const task = (async () => {
                    const snapshot = await wait(coreReady, signal);
                    active(undefined, false);
                    for (const module of settings.mode === 'core' ? ['progress', 'levels'] : ['progress', 'gamestate']) {
                        if (!snapshot.modules.includes(module) || snapshot.failed.includes(module)) {
                            fail('MECHANIC_DEPENDENCY_MISSING', { mode: settings.mode, module });
                        }
                    }
                    ready = true;
                    try {
                        ctx.bus.emit(`${id}:mechanic:ready`, { mode: settings.mode });
                    }
                    catch { }
                })();
                readiness = task;
                void task.catch(() => { readiness = undefined; });
            }
            await wait(readiness, s);
            active(o);
            return settings.mode;
        },
        async playerLevel(o) {
            const s = active(o);
            const state = await wait(progress().init(settings.progressKey, { signal: s }), s);
            active(o);
            return Object.values(state.steps).filter(step => step.status === 'completed').length;
        },
        async loadCurve(curve, o) {
            const s = active(o);
            const scope = `mechanic.${id}`;
            const configs = ctx.configs;
            const snapshot = await wait(configs.fetch({ scopes: [scope], keys: [settings.curve] }, { signal: s }), s);
            active(o);
            const data = recordValue(recordValue(snapshot.configs, scope), settings.curve);
            if (data === undefined)
                fail('MECHANIC_SETTINGS_MISSING', { scope, key: settings.curve });
            if (!plain(data) || !Object.hasOwn(data, 'curve'))
                fail('MECHANIC_CURVE_INVALID', { path: 'curve' });
            let points;
            try {
                points = curve.validate(data.curve);
            }
            catch (error) {
                if (error instanceof SDKError && error.code === 'MECHANIC_CURVE_INVALID') {
                    fail(error.code, { path: `curve${error.safeParams?.path ?? ''}` });
                }
                throw error;
            }
            const { curve: _points, ...own } = data;
            return freeze({ points, record: json(own, 'MECHANIC_CURVE_INVALID', '', 1_048_576) });
        },
        get core() {
            active(undefined, false);
            if (settings.mode !== 'core')
                fail('MECHANIC_MODE_MISMATCH', { mode: settings.mode });
            return core;
        },
        get attempts() {
            active(undefined, false);
            if (settings.mode !== 'secondary')
                fail('MECHANIC_MODE_MISMATCH', { mode: settings.mode });
            return attemptsApi;
        },
        dispose() { controller.abort(); off(); }, });
}

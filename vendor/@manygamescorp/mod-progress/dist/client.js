import { SDKError } from '@manygamescorp/core/error';
import { json, wait } from './mechanic-validation.js';
import { states } from './progress-state.js';
const FIELDS = new Set(['set', 'n', 'key', 'levelId', 'configVersion', 'contentHash',
    'seed', 'moves', 'durationMs', 'score', 'won', 'objectives']);
const SERVER_FIELDS = new Set(['appId', 'gid', 'uid', 'source', 'occurredAt', 'reward',
    'verified', 'stars', 'verify', 'replay']);
function object(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
        && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}
function invalid(message) {
    throw new SDKError('VALIDATION_FAILED', { module: 'progress', message });
}
function bounded(value, min, max) {
    return Number.isSafeInteger(value) && value >= min && value <= max;
}
function text(value, max) {
    return typeof value === 'string' && value.length <= max;
}
function levelData(value) {
    if (!object(value) || Object.keys(value).some((key) => !FIELDS.has(key))
        || !text(value.set, 57) || !/^[a-z0-9_-]+(\.[a-z0-9_-]+)*$/.test(value.set)
        || !bounded(value.n, 1, 1_000_000)
        || typeof value.key !== 'string' || !/^r_[A-Za-z0-9_]{1,62}$/.test(value.key)
        || (value.levelId !== undefined && !text(value.levelId, 64))
        || !bounded(value.configVersion, 1, Number.MAX_SAFE_INTEGER)
        || typeof value.contentHash !== 'string' || !/^[0-9a-f]{64}$/.test(value.contentHash)
        || (value.seed !== undefined && (typeof value.seed !== 'string'
            || !/^[A-Za-z0-9_-]{1,64}$/.test(value.seed)))
        || !bounded(value.moves, 0, 1_000_000) || !bounded(value.durationMs, 0, 86_400_000)
        || !bounded(value.score, 0, 1_000_000_000) || typeof value.won !== 'boolean'
        || (value.objectives !== undefined && (!Array.isArray(value.objectives)
            || value.objectives.length > 16 || !value.objectives.every((item) => text(item, 64))))) {
        invalid('Invalid levelEnd data');
    }
    return value;
}
function acknowledgement(value, eventId, type, won) {
    if (!object(value) || value.eventId !== eventId || value.status !== 'accepted'
        || typeof value.acceptedAt !== 'string' || !Number.isFinite(Date.parse(value.acceptedAt))
        || typeof value.duplicate !== 'boolean')
        badResponse();
    let level;
    if (type === 'levelEnd' || value.level !== undefined) {
        const candidate = value.level;
        if (!object(candidate) || typeof candidate.verified !== 'boolean'
            || !bounded(candidate.stars, 0, 3)
            || ((!candidate.verified || won === false) && candidate.stars !== 0)
            || (candidate.reason !== undefined && typeof candidate.reason !== 'string'))
            badResponse();
        level = { verified: candidate.verified, stars: candidate.stars,
            ...(candidate.reason === undefined ? {} : { reason: candidate.reason }) };
    }
    return { eventId: value.eventId, status: value.status, acceptedAt: value.acceptedAt,
        duplicate: value.duplicate, ...(level ? { level } : {}) };
}
function badResponse() {
    throw new SDKError('INTERNAL', { module: 'progress', message: 'Invalid progress response' });
}
export function createProgress(deps) {
    const controller = new AbortController();
    const signal = deps.signal
        ? AbortSignal.any([controller.signal, deps.signal]) : controller.signal;
    const active = () => {
        if (signal.aborted)
            throw new SDKError('MODULE_NOT_ACTIVE', { module: 'progress' });
    };
    const send = async (action, actionSignal) => {
        active();
        const requestSignal = actionSignal ? AbortSignal.any([signal, actionSignal]) : signal;
        if (requestSignal.aborted)
            throw new SDKError('MODULE_NOT_ACTIVE', { module: 'progress' });
        if (!object(action) || Object.keys(action).some((key) => !['eventId', 'type', 'data'].includes(key))
            || typeof action.type !== 'string' || action.type.length < 1 || action.type.length > 64
            || !object(action.data) || Object.keys(action.data).some((key) => SERVER_FIELDS.has(key))) {
            invalid('Invalid client action');
        }
        const eventId = action.eventId;
        if (typeof eventId !== 'string' || eventId.length < 8 || eventId.length > 64) {
            invalid('Invalid eventId');
        }
        const type = action.type;
        if (type === 'levelEnd')
            levelData(action.data);
        let data;
        try {
            data = JSON.parse(JSON.stringify(action.data));
        }
        catch {
            return invalid('Action data must be JSON');
        }
        if (!object(data) || Object.keys(data).some((key) => SERVER_FIELDS.has(key))) {
            invalid('Invalid client action data');
        }
        const checked = type === 'levelEnd' ? levelData(data) : data;
        const result = acknowledgement(await deps.http.request({ method: 'POST', path: '/me/actions',
            body: { eventId, type, data }, idempotent: true,
            signal: requestSignal }), eventId, type, checked.won);
        active();
        if (requestSignal.aborted)
            throw new SDKError('MODULE_NOT_ACTIVE', { module: 'progress' });
        try {
            deps.publish?.({ eventId, type, duplicate: result.duplicate });
        }
        catch { }
        return result;
    };
    let forcedRevision = 0;
    const revisionOf = () => deps.revision === undefined
        ? undefined : deps.revision() + forcedRevision;
    const snapshots = new Map();
    const reads = new Map();
    async function init(keys, options) {
        active();
        const list = typeof keys === 'string' ? [keys] : keys;
        if (list !== undefined && (!Array.isArray(list) || !list.length
            || !list.every(k => typeof k === 'string' && k.length > 0)
            || new Set(list).size !== list.length))
            invalid('Invalid progress keys');
        const readSignal = AbortSignal.any([signal, ...(options?.signal ? [options.signal] : [])]);
        if (readSignal.aborted)
            throw new SDKError('MODULE_NOT_ACTIVE', { module: 'progress' });
        if (options?.force) {
            snapshots.clear();
            forcedRevision++;
        }
        const cacheKey = JSON.stringify(list ? [...list].sort() : null);
        const revision = revisionOf();
        const cached = snapshots.get(cacheKey);
        const read = async (requestSignal) => {
            const value = states(await deps.http.request({ method: 'POST', path: '/me/init',
                body: list === undefined ? {} : { keys: [...list] }, signal: requestSignal }));
            active();
            requestSignal.throwIfAborted();
            if (revision !== undefined && revisionOf() === revision) {
                snapshots.set(cacheKey, { revision, expires: Math.min(Infinity, ...value.flatMap(s => s.endsAt ? [Date.parse(s.endsAt)] : [])), value });
                if (snapshots.size > 32)
                    snapshots.delete(snapshots.keys().next().value);
            }
            return value;
        };
        let result;
        if (!options?.force && revision !== undefined && cached?.revision === revision
            && (!deps.now || cached.expires > deps.now()))
            result = cached.value;
        else if (revision !== undefined) {
            const flightKey = `${revision}:${cacheKey}`;
            let flight = reads.get(flightKey);
            if (!flight) {
                const controller = new AbortController();
                const entry = { controller, waiters: 0,
                    promise: read(AbortSignal.any([signal, controller.signal])) };
                void entry.promise.catch(() => { }).finally(() => {
                    if (reads.get(flightKey) === entry)
                        reads.delete(flightKey);
                });
                reads.set(flightKey, flight = entry);
            }
            const shared = flight;
            shared.waiters++;
            try {
                result = await wait(shared.promise, readSignal).catch((error) => {
                    readSignal.throwIfAborted();
                    throw error;
                });
            }
            finally {
                if (--shared.waiters === 0 && readSignal.aborted) {
                    if (reads.get(flightKey) === shared)
                        reads.delete(flightKey);
                    shared.controller.abort();
                }
            }
        }
        else
            result = await read(readSignal);
        active();
        readSignal.throwIfAborted();
        result = structuredClone(result);
        if (typeof keys !== 'string')
            return result;
        const state = result.find(s => s.key === keys);
        return state ?? { key: keys, status: 'unavailable', periodKey: null, attemptId: null,
            endsAt: null, selectedStepKeys: [], steps: {}, groups: {}, rewards: [] };
    }
    return {
        init,
        async beginAttempt(input, options) {
            active();
            const requestSignal = AbortSignal.any([signal, ...(options?.signal ? [options.signal] : [])]);
            if (requestSignal.aborted)
                throw new SDKError('MODULE_NOT_ACTIVE', { module: 'progress' });
            if (!object(input) || typeof input.mechanic !== 'string'
                || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(input.mechanic) || input.mechanic.length > 64
                || typeof input.eventId !== 'string'
                || !/^[0-9a-f]{8}-[0-9a-f]{4}-[47][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(input.eventId)) {
                invalid('Invalid attempt context');
            }
            const fields = input.mode === 'core' ? ['mechanic', 'eventId', 'mode', 'level']
                : ['mechanic', 'eventId', 'mode', 'playerLevel', 'params'];
            if (Object.keys(input).some(k => !fields.includes(k)))
                invalid('Invalid attempt context');
            if (input.mode === 'core') {
                if (!object(input.level) || Object.keys(input.level).some(k => !['set', 'n', 'key',
                    'levelId', 'configVersion', 'contentHash'].includes(k)))
                    invalid('Invalid attempt level');
                levelData({ ...input.level, moves: 0, durationMs: 0, score: 0, won: false });
            }
            else if (input.mode !== 'secondary' || !bounded(input.playerLevel, 0, 1_000_000)) {
                invalid('Invalid attempt context');
            }
            const snapshot = json(input, 'VALIDATION_FAILED', '', 32_768);
            if (snapshot.mode === 'secondary') {
                json(snapshot.params, 'VALIDATION_FAILED', 'params', 16_384, 1);
                throw new SDKError('MECHANIC_MODE_UNSUPPORTED', { module: 'progress' });
            }
            const { set, n, levelId } = snapshot.level;
            const body = { set, n, ...(levelId === undefined ? {} : { levelId }) };
            const value = await deps.http.request({ method: 'POST', path: '/me/attempts/begin',
                body, idempotencyKey: snapshot.eventId, signal: requestSignal });
            active();
            if (requestSignal.aborted)
                throw new SDKError('MODULE_NOT_ACTIVE', { module: 'progress' });
            if (!object(value) || typeof value.attemptId !== 'string'
                || !/^[0-9a-f]{24}$/.test(value.attemptId) || typeof value.seed !== 'string'
                || !/^[A-Za-z0-9_-]{43}$/.test(value.seed))
                badResponse();
            return Object.freeze({ attemptId: value.attemptId, seed: value.seed });
        },
        send,
        async levelEnd(data, options) {
            if (!object(options) || Object.keys(options).some((key) => !['eventId',
                'signal'].includes(key))) {
                invalid('Invalid action options');
            }
            const eventId = options.eventId;
            return await send({ type: 'levelEnd', data, eventId }, options.signal);
        },
        dispose() { controller.abort(); },
    };
}

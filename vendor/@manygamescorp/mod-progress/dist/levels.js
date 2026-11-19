import { SDKError } from '@manygamescorp/core/error';
import { defineModule } from '@manygamescorp/core/module';
import { createLevelsCache } from './levels-cache.js';
import { PROGRESS_SETTINGS } from './levels-settings.js';
import { copyRecord, fail, integer, levelNumber, object, rangeIndex, readIndex, select, recordValue } from './levels-validation.js';
const MAX_RANGES = 64;
const MAX_HANDLES = 8;
const MAX_CALLS = 16;
function wait(promise, signal) {
    return new Promise((resolve, reject) => {
        const abort = () => { reject(new SDKError('MODULE_NOT_ACTIVE', { module: 'levels' })); };
        if (signal.aborted) {
            abort();
            void promise.catch(() => { });
            return;
        }
        signal.addEventListener('abort', abort, { once: true });
        void promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
    });
}
export function createLevels(deps) {
    const lifetime = new AbortController();
    const handles = new Set();
    const maxBytes = deps.settings?.cacheMaxBytes ?? 2_097_152;
    if (!integer(maxBytes, 81_920, 16_777_216))
        fail('SDK_MODULE_SETTINGS_INVALID');
    const cache = createLevelsCache(maxBytes, deps.storage, deps.configs.resolveSnapshot.bind(deps.configs));
    let outstanding = 0;
    const chunkSize = deps.settings?.chunkSize ?? 10;
    const prefetchDepth = deps.settings?.prefetchDepth ?? 1;
    if (!integer(chunkSize, 1, 200) || !integer(prefetchDepth, 0, 4)) {
        fail('SDK_MODULE_SETTINGS_INVALID');
    }
    const moduleSignal = AbortSignal.any([lifetime.signal, ...(deps.signal ? [deps.signal] : [])]);
    const close = () => {
        for (const handle of [...handles])
            handle.dispose();
        cache.reset();
    };
    moduleSignal.addEventListener('abort', close, { once: true });
    return {
        async open(set, options = {}) {
            if (typeof set !== 'string' || set.length > 57
                || !/^[a-z0-9_-]+(\.[a-z0-9_-]+)*$/.test(set))
                fail('VALIDATION_FAILED');
            if (options.key !== undefined && (typeof options.key !== 'string'
                || !/^r_[A-Za-z0-9_]{1,62}$/.test(options.key)))
                fail('VALIDATION_FAILED');
            if (moduleSignal.aborted || options.signal?.aborted)
                fail('MODULE_NOT_ACTIVE');
            if (handles.size >= MAX_HANDLES)
                fail();
            const controller = new AbortController();
            const signal = AbortSignal.any([moduleSignal, controller.signal,
                ...(options.signal ? [options.signal] : [])]);
            const scope = `levels.${set}`;
            let epoch = 0;
            let index;
            let scopeVer;
            let queued = Promise.resolve();
            let calls = 0;
            let prefetchQueued = Promise.resolve();
            let prefetchCalls = 0;
            const attempts = new WeakSet();
            const clear = () => {
                epoch++;
                index = undefined;
                scopeVer = undefined;
                cache.clear(scope);
            };
            const active = (s = signal, expected = epoch) => {
                if (s.aborted)
                    fail('MODULE_NOT_ACTIVE');
                if (expected !== epoch)
                    fail();
            };
            const loadSnapshot = async (keys, s, expected) => {
                active(s, expected);
                try {
                    if (outstanding >= 16)
                        fail();
                    const cached = keys.length === 1 ? cache.get(scope, keys.at(0)) : undefined;
                    const request = cached?.etag
                        ? deps.configs.fetch({ scopes: [scope], keys }, { signal: s, ifNoneMatch: cached.etag, raw: true })
                        : deps.configs.fetch({ scopes: [scope], keys }, { signal: s, raw: true });
                    outstanding++;
                    void request.then(() => { outstanding--; }, () => { outstanding--; });
                    const response = await wait(request, s);
                    active(s, expected);
                    const snapshot = response ?? cached ?? fail();
                    if (!integer(recordValue(snapshot.version, scope), 0, Number.MAX_SAFE_INTEGER))
                        fail();
                    return snapshot;
                }
                catch (error) {
                    active(s, expected);
                    if (error instanceof SDKError && ['NETWORK_ERROR', 'OFFLINE', 'TIMEOUT'].includes(error.code)) {
                        const cached = keys.length === 1 ? cache.get(scope, keys.at(0)) : undefined;
                        if (cached)
                            return cached;
                        fail('LEVELS_OFFLINE_MISSING');
                    }
                    throw error;
                }
            };
            const readRange = (snapshot, r) => {
                const data = copyRecord(recordValue(recordValue(snapshot.configs, scope), r.key));
                if (data.kind !== 'range' || data.first !== r.first || data.last !== r.last
                    || (data.entries !== undefined && (!Array.isArray(data.entries) || r.last === null
                        || data.entries.length !== r.last - r.first + 1
                        || !data.entries.every(object))))
                    fail();
                const meta = recordValue(recordValue(snapshot.levels, scope), r.key);
                if (!meta || !integer(meta.version, 1, Number.MAX_SAFE_INTEGER)
                    || !/^[0-9a-f]{64}$/.test(meta.contentHash))
                    fail();
                return { data, configVersion: meta.version, contentHash: meta.contentHash };
            };
            const loadIndex = async (s, expected) => {
                const snapshot = await loadSnapshot([options.key ?? 'set'], s, expected);
                active(s, expected);
                const key = options.key ?? 'set';
                const data = copyRecord(recordValue(recordValue(snapshot.configs, scope), key));
                const previous = cache.get(scope, key);
                if (previous && recordValue(previous.version, scope)
                    !== recordValue(snapshot.version, scope))
                    cache.clear(scope);
                if (options.key) {
                    const r = rangeIndex({ ...data, key: options.key });
                    if (r.last !== null)
                        fail();
                    index = { first: r.first, last: r.last, ranges: [r] };
                    readRange(snapshot, r);
                }
                else
                    index = readIndex(data);
                scopeVer = recordValue(snapshot.version, scope);
                cache.put(scope, key, snapshot, true);
            };
            const load = async (n, count, s) => {
                let expected = epoch;
                for (let retry = 0; retry < 2; retry++) {
                    active(s, expected);
                    if (!index)
                        await loadIndex(s, expected);
                    const selected = select(index, n);
                    let loaded;
                    const wanted = new Map();
                    const end = Math.min(n + count - 1, index.last ?? 1_000_000, 1_000_000);
                    for (let i = n; i <= end; i++) {
                        const r = select(index, i);
                        if (!cache.has(scope, r.key, scopeVer))
                            wanted.set(r.key, r);
                        if (wanted.size >= MAX_RANGES)
                            break;
                    }
                    if (wanted.size) {
                        const snapshot = await loadSnapshot([...wanted.keys()], s, expected);
                        active(s, expected);
                        if (recordValue(snapshot.version, scope) !== scopeVer) {
                            clear();
                            expected = epoch;
                            if (retry === 1)
                                fail();
                            continue;
                        }
                        loaded = snapshot;
                        const ranges = [...wanted.values()].map(r => [r.key, readRange(snapshot, r)]);
                        active(s, expected);
                        for (const [key] of ranges)
                            cache.put(scope, key, snapshot, ranges.length === 1);
                        try {
                            deps.publish?.({ set, keys: [...wanted.keys()], scopeVer: scopeVer,
                                loadedAt: deps.time.now() });
                        }
                        catch { }
                    }
                    active(s, expected);
                    const snapshot = cache.get(scope, selected.key) ?? loaded;
                    return { range: selected, epoch: expected, ...(snapshot ? { snapshot } : {}) };
                }
                return fail();
            };
            const run = (s, work) => {
                active(s);
                if (calls >= MAX_CALLS)
                    fail();
                calls++;
                const expected = epoch;
                const task = queued.then(() => { active(s, expected); return work(); });
                queued = task.then(() => { }, () => { }).finally(() => { calls--; });
                return wait(task, s);
            };
            const childSignal = (o) => AbortSignal.any([signal,
                ...(o?.signal ? [o.signal] : [])]);
            const prefetch = async (n, o) => {
                levelNumber(n);
                const s = childSignal(o);
                active(s);
                if (prefetchCalls >= MAX_CALLS)
                    fail();
                const expected = epoch;
                prefetchCalls++;
                const task = prefetchQueued.then(async () => {
                    active(s, expected);
                    await load(n, Math.min(chunkSize * Math.max(prefetchDepth, 1), 200), s);
                });
                prefetchQueued = task.then(() => { }, () => { }).finally(() => { prefetchCalls--; });
                await wait(task, s);
            };
            const handle = {
                async get(n, o) {
                    levelNumber(n);
                    const s = childSignal(o);
                    const level = await run(s, async () => {
                        const loaded = await load(n, 1, s);
                        active(s, loaded.epoch);
                        const r = loaded.range;
                        const snapshot = loaded.snapshot ?? cache.get(scope, r.key) ?? fail();
                        const cached = readRange(snapshot, r);
                        const entry = cached.data.entries?.at(n - r.first);
                        const id = object(entry) ? entry.id : undefined;
                        if (id !== undefined && (typeof id !== 'string' || id.length > 64))
                            fail();
                        const applied = Object.freeze({ set, n, key: r.key,
                            configVersion: cached.configVersion, contentHash: cached.contentHash,
                            ...(id === undefined ? {} : { levelId: id }),
                            ...(entry === undefined ? {} : { entry }), range: cached.data });
                        attempts.add(applied);
                        return applied;
                    });
                    active(s);
                    if (prefetchDepth > 0 && prefetchCalls === 0
                        && n < Math.min(index?.last ?? 1_000_000, 1_000_000) && !s.aborted) {
                        void prefetch(n + 1, o).catch(() => { });
                    }
                    return level;
                },
                prefetch,
                has(n) {
                    levelNumber(n);
                    active();
                    if (!index)
                        return false;
                    try {
                        return cache.has(scope, select(index, n).key, scopeVer);
                    }
                    catch {
                        return false;
                    }
                },
                async levelEnd(level, result, actionOptions) {
                    active();
                    if (!attempts.has(level) || !object(result)
                        || Object.keys(result).some(k => !['moves', 'durationMs', 'score', 'won',
                            'seed', 'objectives'].includes(k)))
                        fail('VALIDATION_FAILED');
                    const { set, n, key, levelId, configVersion, contentHash } = level;
                    return deps.progress.levelEnd({ ...result, set, n, key, configVersion, contentHash,
                        ...(levelId === undefined ? {} : { levelId }) }, actionOptions);
                },
                invalidate() { epoch++; index = undefined; scopeVer = undefined; },
                dispose() {
                    signal.removeEventListener('abort', handle.dispose);
                    controller.abort();
                    epoch++;
                    index = undefined;
                    scopeVer = undefined;
                    handles.delete(handle);
                },
            };
            handles.add(handle);
            signal.addEventListener('abort', handle.dispose, { once: true });
            try {
                await loadIndex(signal, epoch);
                return handle;
            }
            catch (error) {
                handle.dispose();
                throw error;
            }
        },
        invalidate() { for (const handle of handles)
            handle.invalidate(); cache.reset(); },
        dispose() { lifetime.abort(); close(); moduleSignal.removeEventListener('abort', close); },
    };
}
export function levelsModule() {
    let api;
    let offs = [];
    const close = () => {
        for (const off of offs)
            off();
        offs = [];
        api?.dispose();
        api = undefined;
    };
    return defineModule({
        manifest: {
            id: 'levels', version: '1.0.0', kind: 'service', engines: { core: '^1.0.0' },
            targets: ['web', 'cordova'], requires: { progress: '^1.0.0' },
            permissions: ['storage'], entry: 'levels.js', load: 'eager',
            settings: PROGRESS_SETTINGS,
            events: { emits: ['levels:range:loaded'], listens: ['configs:snapshot:updated', 'sdk:context:changed'] },
        },
        init() { },
        async start(ctx) {
            close();
            const configs = ctx.configs;
            if (typeof configs.fetch !== 'function')
                fail('MODULE_NOT_ACTIVE');
            api = createLevels({ configs, progress: {
                    levelEnd: (data, options) => ctx.sdk['progress'].levelEnd(data, options),
                }, settings: ctx.settings, signal: ctx.signal, time: ctx.time,
                storage: ctx.storage,
                publish: payload => ctx.bus.emit('levels:range:loaded', payload) });
            offs = [ctx.bus.on('configs:snapshot:updated', (payload) => {
                    if (payload.reason === 'context' || payload.scopes.some(s => s.startsWith('levels.'))) {
                        api?.invalidate();
                    }
                }, { signal: ctx.signal }), ctx.bus.on('sdk:context:changed', () => {
                    api?.invalidate();
                }, { signal: ctx.signal })];
        },
        async stop() { close(); },
        api() { return api ?? fail('MODULE_NOT_ACTIVE'); },
        async dispose() { close(); },
    });
}

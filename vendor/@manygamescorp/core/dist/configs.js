import { parseFilterParams } from './facts.js';
import { matchFilter } from '@manygamescorp/contracts-client/filters';
import { resolve as resolveConditionals } from '@manygamescorp/contracts-client/resolve';
import { versionMatches } from '@manygamescorp/contracts-client/module-settings';
import { SDKError } from './error.js';
import { readConfigBlob } from './configs-blob.js';
export const CONFIGS_UPDATED = 'configs:snapshot:updated';
function invalidData() {
    throw new SDKError('VALIDATION_FAILED', { message: 'Invalid SDK data request' });
}
function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        && [Object.prototype, null].includes(Object.getPrototypeOf(value));
}
function onlyKeys(value, keys) {
    if (!record(value) || Object.keys(value).some((key) => !keys.includes(key)))
        invalidData();
    return value;
}
const CACHE_KEY = 'snapshot';
const SCOPE = /^[a-z][a-z0-9_-]*(\.[a-z0-9_-]+)*$/;
const KEY = /^[A-Za-z0-9_-]{1,64}$/;
const SEGMENT_KEY = /^[a-z0-9_-]{1,32}$/;
const SEGMENTS = 'segments';
const LOGICAL = new Set(['$and', '$or', '$nor', '$not']);
function selectionCopy(value) {
    const body = onlyKeys(value, ['scopes', 'keys', 'values']);
    for (const [field, pattern, limit] of [
        ['scopes', SCOPE, 50], ['keys', KEY, 200],
    ]) {
        const list = body[field];
        if (list !== undefined && (!Array.isArray(list) || list.length > limit
            || list.some((item) => typeof item !== 'string'
                || item.length > 64 || !pattern.test(item))))
            invalidData();
    }
    if (body.values !== undefined) {
        if (!record(body.values) || Object.keys(body.values).length > 32)
            invalidData();
        for (const [key, item] of Object.entries(body.values)) {
            if (key.length > 64 || !(item === null || typeof item === 'boolean'
                || (typeof item === 'string' && item.length <= 256)
                || (typeof item === 'number' && Number.isFinite(item))))
                invalidData();
        }
        if (new TextEncoder().encode(JSON.stringify(body.values)).byteLength > 4096)
            invalidData();
    }
    return JSON.parse(JSON.stringify(value));
}
function validRecord(value) {
    return record(value) && Array.isArray(value.conditionals) && value.conditionals.length <= 32
        && (value.conditionalsMode === 'merge' || value.conditionalsMode === 'replace')
        && (value.filters === undefined || record(value.filters))
        && [value.minVersion, value.maxVersion].every((bound) => bound === undefined
            || bound === null || typeof bound === 'string');
}
function validSnapshot(value) {
    return record(value) && record(value.configs) && record(value.version)
        && Object.entries(value.configs).every(([scope, data]) => SCOPE.test(scope)
            && scope.length <= 64 && record(data)
            && Object.entries(data).every(([key, item]) => KEY.test(key) && validRecord(item)))
        && Object.entries(value.version).every(([scope, version]) => SCOPE.test(scope)
            && Number.isSafeInteger(version) && version >= 0)
        && typeof value.ts === 'string';
}
function copy(value) { return structuredClone(value); }
function reads(filter, out, depth = 0) {
    if (depth > 8 || typeof filter !== 'object' || filter === null)
        return;
    if (Array.isArray(filter)) {
        for (const item of filter)
            reads(item, out, depth + 1);
        return;
    }
    for (const [key, value] of Object.entries(filter)) {
        if (LOGICAL.has(key))
            reads(value, out, depth + 1);
        else if (!key.startsWith('$'))
            out.add(`custom.${key}`);
        else if (key.length > 1)
            out.add(key.slice(1));
    }
}
function dependencies(raw) {
    const out = new Set();
    reads(raw.filters, out);
    for (const item of raw.conditionals) {
        if (record(item) && item.enabled !== false && (item.side ?? 'client') === 'client') {
            reads(item.filters, out);
        }
    }
    if (raw.minVersion || raw.maxVersion)
        out.add('v');
    return out;
}
function outcome(raw, facts, parameters = {}) {
    if (!versionMatches(raw, facts))
        return undefined;
    if (raw.filters !== undefined && !matchFilter(raw.filters, facts, parameters))
        return undefined;
    let result = { data: raw.data, applied: null };
    let contentHash = raw.contentHash;
    for (const [index, conditional] of raw.conditionals.entries()) {
        const candidate = resolveConditionals(raw.data, [conditional], facts, { conditionalsMode: raw.conditionalsMode, sides: ['client'], parameters });
        if (candidate.applied === null)
            continue;
        result = { data: candidate.data, applied: record(conditional)
                && typeof conditional.label === 'string' ? conditional.label : `#${index}` };
        contentHash = record(conditional) ? conditional.contentHash : undefined;
        break;
    }
    return { ...result, ...(Number.isSafeInteger(raw.version) && (raw.version ?? 0) > 0
            && typeof contentHash === 'string' && /^[a-f0-9]{64}$/.test(contentHash)
            ? { level: { version: raw.version, contentHash } } : {}) };
}
const definition = (raw) => ({ data: raw.data, applied: null });
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
export function createConfigs(deps, initial = {}) {
    const defaults = selectionCopy(initial);
    const defaultKey = JSON.stringify(defaults);
    const facts = () => deps.context?.facts() ?? {};
    let prefix = '';
    let snapshot;
    let view;
    let etag;
    let sticky = new Map();
    let generation = 0;
    let lifetime = new AbortController();
    let started = 0;
    let applied = 0;
    let initStarted = 0;
    let initApplied = 0;
    let disposed = false;
    const unsubscribes = [];
    function active() {
        if (disposed)
            throw new SDKError('MODULE_NOT_ACTIVE', { module: 'configs' });
        deps.signal?.throwIfAborted();
    }
    function reset() {
        generation++;
        lifetime.abort();
        lifetime = new AbortController();
        prefix = '';
        snapshot = undefined;
        view = undefined;
        etag = undefined;
        sticky = new Map();
    }
    function hydrate() {
        active();
        const storage = deps.storage();
        if (prefix !== storage.prefix) {
            reset();
            prefix = storage.prefix;
            let cached;
            try {
                cached = storage.get(CACHE_KEY);
            }
            catch { }
            if (record(cached) && JSON.stringify(cached.selection) === defaultKey
                && validSnapshot(cached.snapshot))
                snapshot = copy(cached.snapshot);
        }
        return storage;
    }
    function parameters() { return parseFilterParams(snapshot?.configs['filters.params']?.main?.data) ?? {}; }
    function members(current, changed, purchase = false) {
        const definitions = snapshot?.configs[SEGMENTS] ?? {};
        const context = { ...facts(), segment: undefined };
        const previous = new Set(current?.members);
        const out = [];
        for (const [key, raw] of Object.entries(definitions)) {
            if (!SEGMENT_KEY.test(key))
                continue;
            const stuck = record(raw.data) && raw.data.sticky === 'session';
            let member;
            if (stuck && sticky.has(key) && !purchase)
                member = sticky.get(key);
            else if (current && changed && !purchase
                && ![...dependencies(raw)].some((fact) => changed.has(fact)))
                member = previous.has(key);
            else {
                member = raw.filters !== undefined && versionMatches(raw, context)
                    && matchFilter(raw.filters, context, parameters());
            }
            if (stuck)
                sticky.set(key, member);
            if (member)
                out.push(key);
        }
        return out.sort();
    }
    function build() {
        const next = { outcomes: new Map(), deps: new Map(), members: members(undefined) };
        deps.context?.segments(next.members);
        const context = facts();
        for (const [scope, records] of Object.entries(snapshot?.configs ?? {})) {
            const results = new Map();
            for (const [key, raw] of Object.entries(records)) {
                const result = scope === SEGMENTS ? definition(raw) : outcome(raw, context, parameters());
                if (result)
                    results.set(key, result);
                if (scope !== SEGMENTS)
                    next.deps.set(`${scope}/${key}`, dependencies(raw));
            }
            next.outcomes.set(scope, results);
        }
        if (snapshot) {
            const params = snapshot.configs['filters.params']?.main;
            try {
                deps.context?.params(params ? outcome(params, context)?.data : undefined);
            }
            catch {
            }
        }
        deps.context?.resolved?.();
        return next;
    }
    function ensure() {
        if (!snapshot)
            return undefined;
        view ??= build();
        return view;
    }
    function resolved(source) {
        const configs = {};
        const labels = {};
        const levels = {};
        for (const [scope, results] of source.outcomes) {
            configs[scope] = {};
            labels[scope] = {};
            for (const [key, result] of results) {
                configs[scope][key] = result.data;
                labels[scope][key] = result.applied;
                if (scope.startsWith('levels.') && result.level) {
                    (levels[scope] ??= {})[key] = result.level;
                }
            }
        }
        return copy({ configs, applied: labels,
            ...(Object.keys(levels).length > 0 ? { levels } : {}), segments: [...source.members],
            ...(snapshot?.configsURL ? { configsURL: snapshot.configsURL } : {}),
            version: snapshot?.version ?? {}, ts: snapshot?.ts ?? '' });
    }
    function plain(response) {
        const context = facts();
        const configs = {};
        const labels = {};
        const levels = {};
        for (const [scope, records] of Object.entries(response.configs)) {
            configs[scope] = {};
            labels[scope] = {};
            for (const [key, raw] of Object.entries(records)) {
                const result = scope === SEGMENTS ? definition(raw) : outcome(raw, context, parameters());
                if (!result)
                    continue;
                configs[scope][key] = result.data;
                labels[scope][key] = result.applied;
                if (scope.startsWith('levels.') && result.level) {
                    (levels[scope] ??= {})[key] = result.level;
                }
            }
        }
        const segment = context.segment;
        return copy({ configs, applied: labels,
            ...(Object.keys(levels).length > 0 ? { levels } : {}),
            segments: Array.isArray(segment) ? [...segment] : [],
            ...(response.configsURL ? { configsURL: response.configsURL } : {}),
            version: response.version, ts: response.ts });
    }
    function guard(storage, caller) {
        const signal = AbortSignal.any([lifetime.signal, ...(deps.signal ? [deps.signal] : []),
            ...(caller ? [caller] : [])]);
        const epoch = generation;
        return { signal, current() {
                signal.throwIfAborted();
                if (disposed || epoch !== generation || storage.prefix !== deps.storage().prefix) {
                    throw new DOMException('Configs request cancelled', 'AbortError');
                }
            } };
    }
    function commit(storage, response, init, nextTag) {
        const before = ensure();
        const last = before && resolved(before);
        const previous = last && JSON.stringify([snapshot?.version, last.configs, last.applied]);
        const previousTag = etag;
        snapshot = copy({ configs: response.configs, version: response.version, ts: response.ts,
            ...(response.configsURL ? { configsURL: response.configsURL } : {}) });
        view = undefined;
        etag = init ? undefined : nextTag;
        try {
            storage.set(CACHE_KEY, { selection: defaults, snapshot: {
                    configs: snapshot.configs, version: snapshot.version, ts: snapshot.ts,
                } });
        }
        catch { }
        const next = resolved(ensure());
        if (previous !== JSON.stringify([snapshot.version, next.configs, next.applied])
            || (!init && previousTag !== nextTag)) {
            deps.bus.emit(CONFIGS_UPDATED, { scopes: Object.keys(snapshot.version),
                version: snapshot.version, reason: 'fetch' });
        }
    }
    function abFacts(response) {
        const values = {};
        if (typeof response.ab === 'string' && typeof response.abg === 'string') {
            values.ab = response.ab;
            values.abg = response.abg;
        }
        for (const item of Array.isArray(response.abs) ? response.abs.slice(0, 8) : []) {
            if (record(item) && typeof item.ab === 'string' && typeof item.abg === 'string'
                && /^[a-z][a-z0-9_-]{0,62}$/.test(item.ab))
                values[`ab.${item.ab}`] = item.abg;
        }
        try {
            deps.context?.ab(values);
        }
        catch { }
    }
    async function load(init, selection, options = {}) {
        const query = selectionCopy(selection);
        const storage = hydrate();
        const shared = JSON.stringify(query) === defaultKey;
        const seq = shared ? ++started : 0;
        const initSeq = init ? ++initStarted : 0;
        const cached = shared ? snapshot : undefined;
        if (options.ifNoneMatch !== undefined && (typeof options.ifNoneMatch !== 'string'
            || options.ifNoneMatch.length === 0 || options.ifNoneMatch.length > 1024
            || /[\r\n]/.test(options.ifNoneMatch)))
            invalidData();
        const tag = !init ? options.ifNoneMatch ?? (shared ? etag : undefined) : undefined;
        const { signal, current } = guard(storage, options.signal);
        current();
        let nextTag;
        try {
            const response = await deps.transport.request({
                module: 'configs', method: 'POST', path: init ? '/v1/configs/init' : '/v1/configs/fetch',
                body: query, signal, ...(tag ? { ifNoneMatch: tag, acceptNotModified: true } : {}),
                onResponse(meta) { nextTag = meta.etag ?? undefined; },
            });
            current();
            if (response === undefined) {
                if (options.ifNoneMatch !== undefined)
                    return undefined;
                if (!tag || !cached)
                    throw new SDKError('INTERNAL', { module: 'configs' });
                return resolved(ensure());
            }
            const contextOnly = init && query.scopes === undefined && query.keys === undefined
                && (response.configs === undefined || (record(response.configs)
                    && Object.keys(response.configs).length === 0
                    && Object.keys(response.configsURL ?? {}).length === 0));
            if (contextOnly && response.configs !== undefined && !validSnapshot(response)) {
                throw new SDKError('INTERNAL', { module: 'configs' });
            }
            const withSnapshot = !init || (response.configs !== undefined && !contextOnly);
            const applyAb = () => {
                if (!init || initSeq <= initApplied)
                    return;
                initApplied = initSeq;
                abFacts(response);
            };
            if (withSnapshot) {
                if (!validSnapshot(response))
                    throw new SDKError('INTERNAL', { module: 'configs' });
                applyAb();
                if (shared && seq > applied) {
                    applied = seq;
                    commit(storage, response, init, nextTag);
                }
                const result = shared && seq === applied ? resolved(ensure()) : plain(response);
                if (!init)
                    return (query.keys ? { ...result, ...(nextTag ? { etag: nextTag } : {}),
                        ...(options.raw ? { raw: copy({ configs: response.configs,
                                version: response.version, ts: response.ts }) } : {}) }
                        : result);
                const { ab, abg, abExp, abs, minVersion, maxVersion } = response;
                return copy({ ab, abg, abExp, abs, minVersion, maxVersion, ...result,
                    ts: response.ts });
            }
            applyAb();
            return copy(response);
        }
        catch (error) {
            current();
            if (!init && shared && snapshot && error instanceof SDKError
                && ['OFFLINE', 'NETWORK_ERROR', 'TIMEOUT'].includes(error.code)) {
                return resolved(ensure());
            }
            throw error;
        }
    }
    function fetch(selection = defaults, options = {}) {
        return load(false, selection, options);
    }
    const api = {
        init: (selection = defaults) => load(true, selection),
        fetch,
        refresh: () => load(false, defaults),
        resolveSnapshot(payload) {
            hydrate();
            if (!validSnapshot(payload) || payload.configsURL !== undefined)
                invalidData();
            return plain(payload);
        },
        snapshot() {
            hydrate();
            const current = ensure();
            return current ? resolved(current) : undefined;
        },
        getScope(scope) {
            hydrate();
            const results = ensure()?.outcomes.get(scope);
            return copy(Object.fromEntries([...results ?? []].map(([key, item]) => [key, item.data])));
        },
        get(scope, key) {
            hydrate();
            const result = ensure()?.outcomes.get(scope)?.get(key);
            return result === undefined ? undefined : copy(result.data);
        },
        async resolve(scope, key) {
            const storage = hydrate();
            if (!SCOPE.test(scope) || scope.length > 64 || !KEY.test(key))
                invalidData();
            const value = api.get(scope, key);
            if (value !== undefined)
                return value;
            const links = snapshot?.configsURL;
            const path = `${scope}/${key}`;
            const link = links && Object.hasOwn(links, path) ? links[path] : undefined;
            if (!link)
                return undefined;
            const { signal, current } = guard(storage);
            let result;
            try {
                result = await readConfigBlob(link, signal, deps.blobFetch, deps.now);
            }
            catch (error) {
                current();
                throw error;
            }
            current();
            if (!validRecord(result)) {
                throw new SDKError('VALIDATION_FAILED', { module: 'configs', message: 'Invalid config record' });
            }
            return copy(outcome(result, facts(), parameters())?.data);
        },
        recompute(changed, purchase = false) {
            if (disposed || !snapshot || !view)
                return false;
            const current = view;
            const next = members(current, changed, purchase);
            const segmentsChanged = JSON.stringify(next) !== JSON.stringify(current.members);
            if (segmentsChanged)
                current.members = next;
            deps.context?.segments(next);
            const keys = new Set(changed);
            if (segmentsChanged)
                keys.add('segment');
            const context = facts();
            const scopes = new Set();
            for (const [scope, records] of Object.entries(snapshot.configs)) {
                if (scope === SEGMENTS)
                    continue;
                const results = current.outcomes.get(scope) ?? new Map();
                for (const [key, raw] of Object.entries(records)) {
                    const reads = current.deps.get(`${scope}/${key}`);
                    if (!reads || ![...reads].some((fact) => keys.has(fact)))
                        continue;
                    const result = outcome(raw, context, parameters());
                    if (same(results.get(key), result))
                        continue;
                    if (result)
                        results.set(key, result);
                    else
                        results.delete(key);
                    scopes.add(scope);
                }
                current.outcomes.set(scope, results);
            }
            if (scopes.size > 0) {
                deps.bus.emit(CONFIGS_UPDATED, { scopes: [...scopes].sort(), version: snapshot.version,
                    reason: 'context' });
            }
            return segmentsChanged;
        },
        timeDependent() {
            const current = view;
            if (!current)
                return false;
            const records = [...current.deps.values()];
            for (const raw of Object.values(snapshot?.configs[SEGMENTS] ?? {})) {
                records.push(dependencies(raw));
            }
            return records.some((reads) => [...reads].some((fact) => fact.startsWith('time.')));
        },
        dispose() {
            if (disposed)
                return;
            disposed = true;
            reset();
            for (const off of unsubscribes)
                off();
        },
    };
    unsubscribes.push(deps.bus.on('auth:identity:changed', reset));
    if (deps.poller)
        unsubscribes.push(deps.poller.register({
            id: 'configs:refresh', intervalMs: 300_000, visibleAfterMs: false,
            pauseWhenHidden: true, runOnRegister: false,
            async run() { await api.refresh(); },
        }));
    return api;
}

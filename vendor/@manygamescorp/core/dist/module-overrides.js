const plain = (v) => typeof v === 'object' && v !== null
    && !Array.isArray(v) && [Object.prototype, null].includes(Object.getPrototypeOf(v));
const cacheKey = 'module-overrides';
export function parseModuleOverrides(value) {
    if (!plain(value) || Object.keys(value).length > 128
        || new TextEncoder().encode(JSON.stringify(value)).length > 64 * 1024)
        throw new Error('invalid overrides');
    const out = Object.create(null);
    for (const [id, records] of Object.entries(value)) {
        if (!/^[a-z][a-z0-9-]{0,31}$/.test(id) || !Array.isArray(records) || records.length > 128)
            throw new Error('invalid records');
        out[id] = Object.freeze(records.map((item) => {
            if (!plain(item) || !Number.isSafeInteger(item.configId) || item.configId <= 0
                || !Number.isSafeInteger(item.priority) || !Object.hasOwn(item, 'data')
                || !Array.isArray(item.conditionals) || item.conditionals.length > 32
                || item.conditionalsMode !== 'merge' || ![item.minVersion, item.maxVersion]
                .every(bound => bound === undefined || bound === null || typeof bound === 'string'))
                throw new Error('invalid record');
            return Object.freeze({ configId: item.configId, priority: item.priority,
                data: structuredClone(item.data), filters: structuredClone(item.filters),
                ...(item.minVersion !== undefined ? { minVersion: item.minVersion } : {}),
                ...(item.maxVersion !== undefined ? { maxVersion: item.maxVersion } : {}),
                conditionals: structuredClone(item.conditionals), conditionalsMode: 'merge' });
        }));
    }
    return Object.freeze(out);
}
export async function loadModuleOverrides(options) {
    const controller = new AbortController();
    const signal = AbortSignal.any([options.signal, controller.signal]);
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 2000);
    let abort;
    let cached;
    try {
        const saved = options.storage?.get(cacheKey);
        if (plain(saved) && Number.isSafeInteger(saved.version) && saved.version >= 0
            && (saved.etag === undefined || (typeof saved.etag === 'string' && saved.etag.length <= 256))) {
            parseModuleOverrides(saved.records);
            cached = saved;
        }
    }
    catch { }
    let etag;
    try {
        const stopped = new Promise((_, reject) => {
            abort = () => reject(signal.reason);
            if (signal.aborted)
                abort();
            else
                signal.addEventListener('abort', abort, { once: true });
        });
        const response = await Promise.race([options.transport.request({ module: 'configs',
                method: 'POST', path: '/v1/configs/fetch', body: { scopes: ['panel.sdk.overrides'] }, signal,
                ...(cached?.etag ? { ifNoneMatch: cached.etag, acceptNotModified: true } : {}),
                onResponse: meta => { etag = meta.etag ?? undefined; } }), stopped]);
        signal.throwIfAborted();
        if (response === undefined && cached)
            return parseModuleOverrides(cached.records);
        if (!plain(response) || !plain(response.configs) || !plain(response.version))
            throw new Error('invalid snapshot');
        const raw = response.configs['panel.sdk.overrides'] ?? {};
        const version = response.version['panel.sdk.overrides'] ?? 0;
        if (!Number.isSafeInteger(version) || version < 0)
            throw new Error('invalid version');
        const result = parseModuleOverrides(raw);
        try {
            options.storage?.set(cacheKey, { records: raw, version, ...(etag ? { etag } : {}) });
        }
        catch { }
        return result;
    }
    catch {
        options.signal.throwIfAborted();
        options.unavailable();
        try {
            return parseModuleOverrides(cached?.records ?? {});
        }
        catch {
            return Object.freeze({});
        }
    }
    finally {
        clearTimeout(timer);
        if (abort)
            signal.removeEventListener('abort', abort);
    }
}

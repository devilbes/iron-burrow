import { defineSkin, prepareSkin } from './skin-spec.js';
import { skinLayers, validSkinScope, useScopePreloader } from './skin-layer.js';
const ID = /^[a-z][a-z0-9-]{0,63}$/;
const ASSET = /^apps\/([1-9][0-9]*)\/skin\/([a-f0-9]{64})\.[a-z][a-z0-9]{0,15}$/;
const KEY = Symbol.for('@manygamescorp/ui-kit/skin-catalog@1');
function catalog() {
    const found = globalThis[KEY];
    if (!found)
        throw new Error('UI_SKIN_CATALOG_NOT_INITIALIZED');
    return found;
}
function invalid() { throw new TypeError('UI_SKIN_CATALOG_INVALID'); }
function asset(key, app) {
    const match = typeof key === 'string' ? ASSET.exec(key) : null;
    if (!match || match[0] !== key || !Number.isSafeInteger(Number(match[1]))
        || (app !== undefined && match[1] !== app))
        invalid();
    return match;
}
function refValid(id, ref) {
    if (typeof id !== 'string' || ID.exec(id)?.[0] !== id || !ref
        || !/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(ref.version)
        || !ref.manifest.endsWith('.json') || asset(ref.manifest)[2] !== ref.sha256)
        invalid();
}
export function registerSkin(id, ref) {
    refValid(id, ref);
    if (!catalog().refs.has(id) && catalog().refs.size >= 64)
        invalid();
    catalog().refs.set(id, Object.freeze({ ...ref }));
}
async function bytes(c, key, signal) {
    const hash = asset(key)[2];
    const cached = await c.options.cache?.read(hash, signal);
    signal.throwIfAborted();
    if (cached)
        return cached;
    const response = await (c.options.fetch ?? globalThis.fetch)(c.options.assets.url(key), {
        signal, credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer',
    });
    if (!response.ok || !response.body)
        throw new Error('LOAD');
    const reader = response.body.getReader();
    const abort = () => { void reader.cancel().catch(() => { }); };
    signal.addEventListener('abort', abort, { once: true });
    const chunks = [];
    let size = 0;
    try {
        for (;;) {
            const chunk = await reader.read();
            signal.throwIfAborted();
            if (chunk.done)
                break;
            size += chunk.value.byteLength;
            if (size > 262144)
                throw new Error('SIZE');
            chunks.push(chunk.value);
        }
    }
    finally {
        signal.removeEventListener('abort', abort);
        await reader.cancel().catch(() => { });
        reader.releaseLock();
    }
    const result = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.byteLength;
    }
    signal.throwIfAborted();
    await c.options.cache?.write(hash, result, signal);
    signal.throwIfAborted();
    return result;
}
async function manifest(c, id, ref, signal) {
    const spec = JSON.parse(new TextDecoder('utf-8', { fatal: true })
        .decode(await bytes(c, ref.manifest, signal)));
    if (spec.id !== id || spec.base !== undefined)
        invalid();
    const app = asset(ref.manifest)[1];
    if (Object.values(spec.tokens ?? {}).some(value => /url\s*\(|image-set\s*\(/i.test(value))) {
        invalid();
    }
    const url = (key) => { asset(key, app); return c.options.assets.url(key); };
    const css = {};
    for (const [target, key] of Object.entries(spec.css ?? {})) {
        if (typeof key !== 'string' || !key.endsWith('.css'))
            invalid();
        url(key);
        const text = new TextDecoder('utf-8', { fatal: true }).decode(await bytes(c, key, signal));
        if (/\\|@(?:import|namespace)|image-set\s*\(/i.test(text))
            invalid();
        css[target] = text.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (_all, _quote, value) => `url("${url(value)}")`);
    }
    return defineSkin({ ...spec, css,
        assets: Object.fromEntries(Object.entries(spec.assets ?? {})
            .map(([key, value]) => [key, url(value)])),
        assetVariants: Object.fromEntries(Object.entries(spec.assetVariants ?? {})
            .map(([key, variants]) => [key, variants.map(v => ({ ...v, url: url(v.url) }))])),
        fonts: (spec.fonts ?? []).map(font => ({ ...font, url: url(font.url) })),
    });
}
export function loadSkin(id) {
    const c = catalog();
    const ref = c.refs.get(id);
    if (!ref)
        return Promise.reject(new Error('UNKNOWN_SKIN'));
    const key = ref.sha256;
    const found = c.loaded.get(key);
    if (found)
        return found.then(skin => { if (skin.id !== id)
            invalid(); return skin; });
    const signal = AbortSignal.any([c.controller.signal,
        AbortSignal.timeout(c.options.timeoutMs ?? 1500)]);
    const job = new Promise((resolve, reject) => {
        const abort = () => reject(new Error(signal.reason?.name === 'TimeoutError' ? 'TIMEOUT' : 'CANCELLED'));
        signal.addEventListener('abort', abort, { once: true });
        void manifest(c, id, ref, signal).then(resolve, reject)
            .finally(() => signal.removeEventListener('abort', abort));
    });
    c.loaded.set(key, job);
    void job.catch(() => { if (c.loaded.get(key) === job)
        c.loaded.delete(key); });
    return job;
}
function selected(c, scope) {
    return c.config.map.find(rule => rule.scope === scope
        && (rule.when === undefined || c.options.match?.(rule.when) === true))?.skin;
}
export function resolveSkin(scope) {
    if (!validSkinScope(scope))
        invalid();
    const layers = skinLayers();
    const top = [...layers].reverse().find(layer => layer.level !== 'scope' || layer.scope === scope);
    return { skinId: top?.id, source: top?.level === 'scope' ? 'config' : top?.level ?? 'kit' };
}
export function preloadSkinScope(scope) {
    if (!validSkinScope(scope))
        return Promise.resolve();
    const c = catalog();
    if (!c.scopes.has(scope) && c.scopes.size >= 256)
        return Promise.resolve();
    c.scopes.add(scope);
    const found = c.pending.get(scope);
    if (found)
        return found;
    const generation = c.generation;
    const id = selected(c, scope);
    const ref = id ? c.refs.get(id) : undefined;
    const previous = c.handles.get(scope);
    if (id && previous?.handle.id === id && previous.sha256 === ref?.sha256)
        return Promise.resolve();
    const job = (async () => {
        try {
            if (!id) {
                previous?.handle.remove();
                c.handles.delete(scope);
                return;
            }
            const skin = await loadSkin(id);
            const commit = await prepareSkin(skin, { level: 'scope', scope,
                ...(c.options.document ? { document: c.options.document } : {}) });
            if (c.controller.signal.aborted)
                throw new Error('CANCELLED');
            if (generation !== c.generation)
                return preloadSkinScope(scope);
            c.handles.set(scope, { handle: commit(), sha256: ref.sha256 });
        }
        catch (error) {
            if (c.controller.signal.aborted)
                throw new Error('UI_SKIN_PRELOAD_CANCELLED', { cause: error });
            if (generation !== c.generation)
                return preloadSkinScope(scope);
            if (generation === c.generation && !c.controller.signal.aborted) {
                try {
                    c.options.diagnostic?.('sdk:ui:skin-failed', { scope, skin: id ?? '',
                        code: error instanceof Error && error.message === 'TIMEOUT' ? 'TIMEOUT' : 'LOAD_FAILED' });
                }
                catch { }
            }
            if (!c.handles.has(scope))
                throw new Error('UI_SKIN_PRELOAD_FAILED', { cause: error });
        }
    })();
    c.pending.set(scope, job);
    const done = () => { if (c.pending.get(scope) === job)
        c.pending.delete(scope); };
    void job.then(done, done);
    return job;
}
export async function updateSkinsConfig(config) {
    const c = catalog();
    if (!config || !Array.isArray(config.skins) || config.skins.length > 64
        || !Array.isArray(config.map) || config.map.length > 256)
        invalid();
    const refs = new Map();
    for (const ref of config.skins) {
        refValid(ref.id, ref);
        if (refs.has(ref.id))
            invalid();
        refs.set(ref.id, Object.freeze({ ...ref }));
    }
    for (const rule of config.map) {
        if (!rule || !validSkinScope(rule.scope) || !ID.test(rule.skin))
            invalid();
    }
    c.generation += 1;
    c.refs = refs;
    const hashes = new Set([...refs.values()].map(ref => ref.sha256));
    for (const hash of c.loaded.keys())
        if (!hashes.has(hash))
            c.loaded.delete(hash);
    c.config = structuredClone(config);
    c.pending.clear();
    await Promise.all([...c.scopes].map(scope => preloadSkinScope(scope).catch(() => undefined)));
}
export function initSkins(options) {
    const global = globalThis;
    if (global[KEY])
        throw new Error('UI_SKIN_CATALOG_ALREADY_INITIALIZED');
    if (options.timeoutMs !== undefined && (!Number.isFinite(options.timeoutMs)
        || options.timeoutMs <= 0 || options.timeoutMs > 30000))
        invalid();
    const c = { options, refs: new Map(), loaded: new Map(),
        config: { skins: [], map: [] }, scopes: new Set(options.preloadScopes ?? []),
        handles: new Map(), pending: new Map(), generation: 0, controller: new AbortController() };
    if ([...c.scopes].some(scope => !validSkinScope(scope)))
        invalid();
    global[KEY] = c;
    const offPreload = useScopePreloader(preloadSkinScope);
    const offWindows = options.windows?.useSkinScopes({
        preload: preloadSkinScope, generation: () => c.generation,
    });
    const apply = (config) => {
        if (c.controller.signal.aborted || global[KEY] !== c)
            return Promise.resolve();
        return updateSkinsConfig(config);
    };
    const update = async () => {
        try {
            await apply(options.source?.read() ?? { skins: [], map: [] });
        }
        catch {
            try {
                options.diagnostic?.('sdk:ui:skin-failed', { scope: '', skin: '', code: 'CONFIG_INVALID' });
            }
            catch { }
        }
    };
    const offSource = options.source?.subscribe(() => { void update(); });
    if (options.source)
        void update();
    return {
        update: apply,
        async refresh() { await apply(c.config); },
        dispose() {
            offPreload();
            offWindows?.();
            offSource?.();
            c.generation += 1;
            c.controller.abort();
            for (const { handle } of c.handles.values())
                handle.remove();
            c.handles.clear();
            c.loaded.clear();
            if (global[KEY] === c)
                delete global[KEY];
        },
    };
}

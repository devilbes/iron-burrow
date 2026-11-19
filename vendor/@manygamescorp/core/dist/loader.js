import { mechanicPath, validateModuleMechanicFiles } from '@manygamescorp/contracts-client/module-mechanic';
import { applyModuleOverrides, validateModuleSettings } from '@manygamescorp/contracts-client/module-settings';
import { SDKError } from './error.js';
import { readResponseBytes } from './response-bytes.js';
import { satisfies, validModuleLoading, normalizedModuleLoad } from '@manygamescorp/contracts-client/module-composition';
import { supportsBuild } from '@manygamescorp/contracts-client/module-targets';
import { defineModule } from './module.js';
export const SDK_MODULE_FAILED = 'sdk:module:failed';
export { parseModuleComposition, satisfies } from '@manygamescorp/contracts-client/module-composition';
export const MAX_MANIFEST_BYTES = 64 * 1024;
const MAX_FILES = 256;
const CACHE_KEY = 'loader:manifests';
const SEGMENT = '[a-z][a-z0-9]*(?:-[a-z0-9]+)*';
const MODULE_ID = new RegExp(`^${SEGMENT}(?:\\.${SEGMENT})*$`);
const PACKAGE = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
const NUMBER = '(?:0|[1-9][0-9]*)';
const IDENT = '(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)';
const VERSION = new RegExp(`^(${NUMBER})\\.(${NUMBER})\\.(${NUMBER})(?:-(${IDENT}(?:\\.${IDENT})*))?`
    + '(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$');
const FILE = /^[A-Za-z0-9_][A-Za-z0-9._-]*(?:\/[A-Za-z0-9_][A-Za-z0-9._-]*)*$/;
const SCRIPT = /\.m?js$/;
const MANIFEST_KEYS = new Set(['$schema', 'id', 'version', 'kind', 'engines', 'requires', 'optional',
    'provides', 'permissions', 'sdk', 'events', 'consumes', 'load', 'onEvent', 'onRoute', 'critical', 'source',
    'nativePlugins', 'targets', 'stores', 'realtime', 'ui', 'entry', 'package', 'files',
    'title', 'description', 'llmDescription', 'group', 'tags', 'selection', 'status', 'preview', 'docs', 'settings', 'actions',
    'skin', 'compat', 'modes', 'genres', 'layers', 'extensionPoints']);
function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        && [Object.prototype, null].includes(Object.getPrototypeOf(value));
}
function only(value, keys) {
    return Object.keys(value).every((key) => keys.includes(key));
}
function moduleId(value) {
    return typeof value === 'string' && value.length <= 64 && MODULE_ID.test(value);
}
function packageName(value) {
    return typeof value === 'string' && value.length <= 214 && PACKAGE.test(value);
}
function exactVersion(value) {
    return typeof value === 'string' && value.length <= 64 && VERSION.test(value);
}
function failure(code, id) {
    return new SDKError(code, { module: id, retryable: false });
}
export function parseSdkLock(platformConfig) {
    const invalid = () => {
        throw new SDKError('SDK_PLATFORM_CONFIG_INVALID', {
            message: 'Invalid platform.json sdk', retryable: false,
        });
    };
    if (!record(platformConfig) || !Object.hasOwn(platformConfig, 'sdk'))
        return { modules: [] };
    let sdk;
    try {
        sdk = structuredClone(platformConfig.sdk);
    }
    catch {
        invalid();
    }
    if (!record(sdk) || !Array.isArray(sdk.modules) || sdk.modules.length > 256)
        invalid();
    const lock = sdk;
    let adapter;
    if (lock.adapter !== undefined) {
        const value = lock.adapter;
        if (!record(value) || !only(value, ['package', 'version']) || !packageName(value.package)
            || !exactVersion(value.version))
            invalid();
        adapter = Object.freeze({ package: value.package,
            version: value.version });
    }
    if (lock.overrides !== undefined && (!record(lock.overrides)
        || !only(lock.overrides, ['scope']) || lock.overrides.scope !== 'panel.sdk.overrides'))
        invalid();
    const ids = new Set();
    const modules = lock.modules.map((item) => {
        if (!record(item) || !only(item, ['id', 'package', 'version', 'load', 'source', 'settings', 'onEvent', 'onRoute'])
            || !moduleId(item.id) || ids.has(item.id) || !packageName(item.package)
            || !exactVersion(item.version) || !validModuleLoading(item)
            || (item.source !== 'local' && item.source !== 'remote')
            || item.filters !== undefined)
            invalid();
        const ref = item;
        ids.add(ref.id);
        return Object.freeze({ ...ref });
    });
    return Object.freeze({ ...(adapter ? { adapter } : {}), modules: Object.freeze(modules),
        ...(lock.overrides ? { overrides: Object.freeze({ scope: 'panel.sdk.overrides' }) } : {}) });
}
export function checkRequiredRef(manifest, ref) {
    if (manifest.selection === 'required'
        && (ref.source === 'remote' || normalizedModuleLoad(ref.load) !== normalizedModuleLoad(manifest.load ?? 'eager')
            || ref.onEvent !== manifest.onEvent || ref.onRoute !== manifest.onRoute)) {
        throw new SDKError('SDK_MODULE_INCOMPATIBLE', { module: manifest.id, retryable: false,
            message: `required module "${manifest.id}" loading policy is fixed` });
    }
}
export function planModules(input) {
    const refs = new Map(input.lock.modules.map(ref => [ref.id, ref]));
    for (const definition of input.local) {
        const ref = refs.get(definition.manifest.id);
        if (ref)
            checkRequiredRef(definition.manifest, ref);
    }
    return {
        local: input.local.filter(definition => refs.get(definition.manifest.id)?.source !== 'remote').map(definition => {
            const ref = refs.get(definition.manifest.id);
            return ref ? defineModule({ ...definition, manifest: { ...definition.manifest,
                    load: ref.load, onEvent: ref.onEvent, onRoute: ref.onRoute } }) : definition;
        }),
        remote: input.lock.modules.filter(ref => ref.source === 'remote'
            || !input.local.some(d => d.manifest.id === ref.id)),
    };
}
export function resolveModuleSettings(manifest, ref, overrides = [], context = { facts: {} }, report) {
    const schema = manifest.settings ?? { schemaVersion: 1, fields: [] };
    const result = applyModuleOverrides(schema, ref && Object.hasOwn(ref, 'settings') ? ref.settings : {}, overrides, context);
    report?.(result);
    const invalid = () => {
        throw new SDKError('SDK_MODULE_SETTINGS_INVALID', {
            module: manifest.id, retryable: false, details: { errors: result.errors },
        });
    };
    if (!result.valid)
        invalid();
    return Object.freeze({ ...result.value });
}
export function moduleBase(cdn, ref) {
    const root = new URL(cdn.endsWith('/') ? cdn : `${cdn}/`);
    if (!packageName(ref.package) || !exactVersion(ref.version)) {
        throw failure('SDK_MODULE_LOAD_FAILED', 'loader');
    }
    const dir = ref.package.replace(/^@manygamescorp\//, '');
    const base = new URL(`${dir}/${ref.version}/`, root);
    if (base.origin !== root.origin || !base.href.startsWith(root.href)
        || base.search || base.hash || base.username || base.password) {
        throw failure('SDK_MODULE_LOAD_FAILED', 'loader');
    }
    return base;
}
function fileUrl(base, path, id) {
    if (!(FILE.test(path) || path === 'presentation/.mech-copy.json') || path.length > 256)
        throw failure('SDK_MODULE_MANIFEST_INVALID', id);
    const url = new URL(path, base);
    if (url.origin !== base.origin || !url.href.startsWith(base.href)) {
        throw failure('SDK_MODULE_MANIFEST_INVALID', id);
    }
    return url.href;
}
function fileList(value, required) {
    return (value === undefined && !required) || (Array.isArray(value)
        && (!required || value.length > 0) && value.length <= MAX_FILES
        && value.every((file) => typeof file === 'string' && file.length <= 256 && (FILE.test(file) || file === 'presentation/.mech-copy.json'))
        && new Set(value).size === value.length);
}
const SKIN_TARGET = /^(?:\*|[a-zA-Z][a-zA-Z0-9-]{0,63})$/;
const SKIN_KEY = /^[a-z0-9][a-z0-9_-]{0,63}$/;
function skinFiles(skin, files) {
    if (skin === undefined)
        return true;
    if (!record(skin) || !only(skin, ['css', 'assets', 'displayTitle', 'closePosition']))
        return false;
    if (skin.closePosition !== undefined
        && !['head-right', 'head-left', 'corner-out'].includes(skin.closePosition))
        return false;
    const listed = (map, list, key) => map === undefined || (record(map) && Object.keys(map).length <= 64
        && Object.entries(map).every(([name, file]) => key.test(name) && typeof file === 'string'
            && (list ?? []).includes(file)));
    const title = skin.displayTitle;
    return listed(skin.css, files.styles, SKIN_TARGET) && listed(skin.assets, files.assets, SKIN_KEY)
        && (title === undefined || (record(title) && only(title, ['arc', 'windows'])
            && (title.arc === undefined || (typeof title.arc === 'number' && title.arc >= 0
                && title.arc <= 48))
            && (title.windows === undefined || typeof title.windows === 'boolean')));
}
export function checkRemoteManifest(value, ref) {
    const invalid = () => { throw failure('SDK_MODULE_MANIFEST_INVALID', ref.id); };
    if (!record(value) || !Object.keys(value).every((key) => MANIFEST_KEYS.has(key)))
        invalid();
    if (record(value) && value.status === 'soon')
        throw failure('MODULE_NOT_READY', ref.id);
    const manifest = value;
    if (manifest.id !== ref.id || manifest.version !== ref.version
        || (manifest.package !== undefined && manifest.package !== ref.package)
        || !record(manifest.files)
        || !only(manifest.files, ['scripts', 'styles', 'assets'])
        || !fileList(manifest.files.scripts, true) || !fileList(manifest.files.styles, false)
        || !fileList(manifest.files.assets, false)
        || typeof manifest.entry !== 'string' || !manifest.files.scripts.includes(manifest.entry)
        || !SCRIPT.test(manifest.entry) || !skinFiles(manifest.skin, manifest.files)
        || validateModuleMechanicFiles(value).length)
        invalid();
    const { $schema: _schema, package: _package, files: _files, critical: _critical, ...rest } = manifest;
    return { ...rest, load: ref.load, source: ref.source, onEvent: ref.onEvent, onRoute: ref.onRoute,
        ...(ref.source === 'local' && _critical !== undefined ? { critical: _critical } : {}) };
}
export function checkBuild(manifest, build, remote = false) {
    if (build && !supportsBuild(manifest, build)) {
        throw new SDKError('SDK_MODULE_INCOMPATIBLE', { module: manifest.id, retryable: false,
            message: `module "${manifest.id}" has no implementation for target "${build.target}"`
                + (build.store === undefined ? '' : ` and store "${build.store}"`) });
    }
    if (remote && (manifest.selection === 'required' || (manifest.nativePlugins?.length ?? 0) > 0)) {
        throw new SDKError('SDK_MODULE_INCOMPATIBLE', { module: manifest.id, retryable: false,
            message: `module "${manifest.id}" needs native plugins: a new build is required` });
    }
}
export function checkEngines(manifest, coreVersion, adapter) {
    const engines = manifest.engines;
    if (!satisfies(coreVersion, engines.core)
        || (engines.adapter !== undefined
            && (!adapter || !satisfies(adapter.version, engines.adapter)))) {
        throw failure('SDK_MODULE_INCOMPATIBLE', manifest.id);
    }
}
function readCache(cache) {
    try {
        const raw = cache?.getItem(CACHE_KEY);
        const parsed = raw ? JSON.parse(raw) : undefined;
        return record(parsed) ? parsed : {};
    }
    catch {
        return {};
    }
}
export function createModuleLoader(options) {
    const fetcher = options.fetch ?? ((...args) => fetch(...args));
    const importer = options.import
        ?? ((url) => import(url));
    const timeoutMs = options.timeoutMs ?? 15_000;
    const root = new URL(options.cdn.endsWith('/') ? options.cdn : `${options.cdn}/`);
    const secure = root.protocol === 'https:' || ['localhost', '127.0.0.1', '[::1]']
        .includes(root.hostname);
    const memory = {};
    const selected = new Map();
    let index;
    const remoteIndex = (signal) => {
        index ??= readRemoteModuleIndex({ cdn: root.href, coreVersion: options.coreVersion,
            fetch: fetcher, ...(options.cache ? { cache: options.cache } : {}),
            timeoutMs: options.indexTimeoutMs ?? 3000 }, signal);
        return index;
    };
    const key = (ref) => `${ref.package}@${ref.version}:${ref.id}`;
    const manifestOf = async (ref, base, signal, path = 'module.json') => {
        signal.throwIfAborted();
        const url = new URL(fileUrl(base, path, ref.id));
        let response;
        try {
            response = await fetcher(url.href, { method: 'GET', redirect: 'error', credentials: 'omit',
                mode: 'cors', headers: { Accept: 'application/json' }, signal });
        }
        catch (cause) {
            signal.throwIfAborted();
            const cached = path === 'module.json'
                ? memory[key(ref)] ?? readCache(options.cache)[key(ref)] : undefined;
            if (cached !== undefined)
                return cached;
            throw new SDKError('SDK_MODULE_LOAD_FAILED', { module: ref.id, cause });
        }
        signal.throwIfAborted();
        const final = response.url ? new URL(response.url) : url;
        if (response.redirected || final.origin !== base.origin || final.href !== url.href) {
            throw failure('SDK_MODULE_LOAD_FAILED', ref.id);
        }
        if (!response.ok) {
            const cached = path === 'module.json' && response.status >= 500
                ? memory[key(ref)] ?? readCache(options.cache)[key(ref)] : undefined;
            if (cached !== undefined)
                return cached;
            throw failure('SDK_MODULE_LOAD_FAILED', ref.id);
        }
        const bytes = await readResponseBytes(response, MAX_MANIFEST_BYTES, signal, () => {
            throw failure('SDK_MODULE_LOAD_FAILED', ref.id);
        });
        const text = new TextDecoder().decode(bytes);
        try {
            return JSON.parse(text);
        }
        catch {
            throw failure('SDK_MODULE_MANIFEST_INVALID', ref.id);
        }
    };
    const loadOnce = async (ref, signal, validate) => {
        signal.throwIfAborted();
        if (!moduleId(ref.id) || !packageName(ref.package) || !exactVersion(ref.version))
            throw failure('SDK_MODULE_LOAD_FAILED', ref.id);
        let base;
        if (ref.source === 'local') {
            const documentBase = options.localBase ?? (typeof document === 'undefined' ? undefined : document.baseURI);
            if (!documentBase)
                throw failure('SDK_MODULE_LOAD_FAILED', ref.id);
            const app = new URL('./', documentBase);
            if (!['https:', 'http:', 'file:'].includes(app.protocol) || app.username || app.password)
                throw failure('SDK_MODULE_LOAD_FAILED', ref.id);
            base = new URL(`sdk/modules/${ref.id}/${ref.version}/`, app);
        }
        else {
            if (!secure)
                throw failure('SDK_MODULE_LOAD_FAILED', ref.id);
            base = moduleBase(root.href, ref);
        }
        let raw = await manifestOf(ref, base, signal);
        if (record(raw) && raw.kind === undefined) {
            if (!only(raw, ['id', 'version', 'entry', 'files', 'targets', 'stores', 'nativePlugins',
                'title', 'description', 'llmDescription', 'group', 'tags', 'selection', 'status',
                'preview', 'docs', 'settings', 'load', 'skin', 'ui', 'compat', 'actions', 'modes', 'genres', 'layers', 'extensionPoints'])
                || !moduleId(raw.id))
                throw failure('SDK_MODULE_MANIFEST_INVALID', ref.id);
            checkRemoteManifest({ ...raw, id: ref.id }, ref);
            const path = `sdk-runtime/${ref.id}.json`;
            const files = raw.files;
            if (!files.assets?.includes(path))
                throw failure('SDK_MODULE_MANIFEST_INVALID', ref.id);
            const discovery = raw;
            const runtime = await manifestOf(ref, base, signal, path);
            if (!record(runtime) || JSON.stringify(runtime.files) !== JSON.stringify(files)
                || ['modes', 'genres', 'layers', 'extensionPoints'].some(key => JSON.stringify(runtime[key]) !== JSON.stringify(discovery[key]))) {
                throw failure('SDK_MODULE_MANIFEST_INVALID', ref.id);
            }
            raw = runtime;
        }
        signal.throwIfAborted();
        const { manifest } = defineModule({ manifest: checkRemoteManifest(raw, ref),
            init: () => undefined, api: () => undefined });
        checkRequiredRef({ ...manifest, load: raw.load,
            onEvent: raw.onEvent,
            onRoute: raw.onRoute }, ref);
        signal.throwIfAborted();
        checkEngines(manifest, options.coreVersion, options.adapter);
        const settings = validateModuleSettings(manifest.settings ?? { schemaVersion: 1, fields: [] }, Object.hasOwn(ref, 'settings') ? ref.settings : {});
        if (!settings.valid)
            throw failure('SDK_MODULE_SETTINGS_INVALID', ref.id);
        validate?.(manifest);
        signal.throwIfAborted();
        checkBuild(manifest, options.build, ref.source === 'remote');
        if (manifest.layers) {
            for (const layer of [manifest.layers.engine, manifest.layers.presentation]) {
                if (!layer)
                    continue;
                const url = fileUrl(base, mechanicPath(layer.entry), ref.id);
                const response = await fetcher(url, { method: 'HEAD', redirect: 'error', credentials: 'omit', mode: 'cors', signal });
                signal.throwIfAborted();
                if (!response.ok || response.redirected || (response.url && response.url !== url))
                    throw failure('SDK_MODULE_MANIFEST_INVALID', ref.id);
            }
            const files = raw.files;
            if (files.assets?.includes('presentation/.mech-copy.json')) {
                const copy = await manifestOf(ref, base, signal, 'presentation/.mech-copy.json');
                if (!record(copy) || !record(copy.copiedFrom)
                    || copy.copiedFrom.mechanic !== manifest.id
                    || typeof copy.copiedFrom.engineRange !== 'string'
                    || !satisfies(manifest.layers.engine.version, copy.copiedFrom.engineRange))
                    throw failure('SDK_MODULE_INCOMPATIBLE', ref.id);
            }
        }
        const entry = fileUrl(base, manifest.entry, ref.id);
        let namespace;
        try {
            namespace = await importer(entry);
        }
        catch (cause) {
            throw new SDKError('SDK_MODULE_LOAD_FAILED', { module: ref.id, cause });
        }
        signal.throwIfAborted();
        let hooks = typeof namespace === 'object' && namespace !== null
            ? namespace.default : undefined;
        if (typeof hooks === 'object' && hooks !== null
            && typeof hooks.create === 'function') {
            hooks = hooks.create();
        }
        if (typeof hooks !== 'object' || hooks === null)
            throw failure('SDK_MODULE_LOAD_FAILED', ref.id);
        const definition = defineModule(Object.defineProperty(Object.create(hooks), 'manifest', { value: manifest, enumerable: true }));
        memory[key(ref)] = raw;
        return definition;
    };
    const attempt = async (ref, outer, validate) => {
        const controller = new AbortController();
        const signal = AbortSignal.any([outer, controller.signal]);
        const timer = setTimeout(() => controller.abort(failure('SDK_MODULE_TIMEOUT', ref.id)), timeoutMs);
        let abort;
        try {
            const stopped = new Promise((_, reject) => {
                abort = () => reject(signal.reason);
                if (signal.aborted)
                    abort();
                else
                    signal.addEventListener('abort', abort, { once: true });
            });
            return await Promise.race([loadOnce(ref, signal, validate), stopped]);
        }
        finally {
            clearTimeout(timer);
            if (abort)
                signal.removeEventListener('abort', abort);
        }
    };
    return {
        async prepare(signal) {
            if (options.modules?.some(ref => ref.source === 'remote'))
                await remoteIndex(signal);
            signal.throwIfAborted();
        },
        load(ref, outer, validate) {
            const controller = new AbortController();
            const signal = outer ? AbortSignal.any([outer, controller.signal]) : controller.signal;
            let timer;
            let abort;
            const stopped = new Promise((_resolve, reject) => {
                abort = () => reject(signal.reason instanceof SDKError ? signal.reason
                    : new SDKError('SDK_MODULE_CANCELLED', { module: ref.id }));
                if (signal.aborted)
                    abort();
                else
                    signal.addEventListener('abort', abort, { once: true });
            });
            const expired = new Promise((_, reject) => {
                timer = setTimeout(() => {
                    const error = new SDKError('SDK_MODULE_TIMEOUT', { module: ref.id });
                    reject(error);
                    controller.abort(error);
                }, timeoutMs * 2 + (options.indexTimeoutMs ?? 3000));
            });
            const run = (async () => {
                const registry = ref.source === 'remote' ? await remoteIndex(signal) : undefined;
                signal.throwIfAborted();
                const candidate = registry?.modules[ref.id];
                if (candidate && candidate.package === ref.package && candidate.version !== ref.version) {
                    const upgraded = { ...ref, version: candidate.version };
                    try {
                        const result = await attempt(upgraded, signal, manifest => {
                            for (const [id, range] of Object.entries(manifest.requires ?? {})) {
                                const version = selected.get(id)?.version
                                    ?? options.modules?.find(m => m.id === id)?.version
                                    ?? options.localVersions?.[id];
                                if (!version || !satisfies(version, range))
                                    throw failure('SDK_MODULE_INCOMPATIBLE', ref.id);
                            }
                            validate?.(manifest);
                        });
                        selected.set(ref.id, upgraded);
                        return result;
                    }
                    catch (cause) {
                        signal.throwIfAborted();
                        options.onFallback?.({ moduleId: ref.id, from: candidate.version, to: ref.version,
                            reason: cause instanceof SDKError ? cause.code : 'SDK_MODULE_LOAD_FAILED' });
                    }
                }
                const result = await attempt(ref, signal, validate);
                selected.set(ref.id, ref);
                return result;
            })();
            run.catch(() => undefined);
            return Promise.race([run, expired, stopped]).catch((cause) => {
                if (cause instanceof SDKError)
                    throw cause;
                throw new SDKError('SDK_MODULE_LOAD_FAILED', { module: ref.id, cause });
            }).finally(() => {
                clearTimeout(timer);
                if (abort)
                    signal.removeEventListener('abort', abort);
            });
        },
        retain(refs) {
            if (!options.cache)
                return;
            const stored = readCache(options.cache);
            const kept = Object.fromEntries(refs.flatMap(ref => {
                const actual = selected.get(ref.id) ?? ref;
                return [actual, ref].map(item => [key(item), memory[key(item)] ?? stored[key(item)]]);
            }).filter(([, value]) => value !== undefined));
            try {
                if (Object.keys(kept).length > 0)
                    options.cache.setItem(CACHE_KEY, JSON.stringify(kept));
                else if (options.cache.getItem(CACHE_KEY) !== null)
                    options.cache.removeItem(CACHE_KEY);
            }
            catch {
            }
        },
    };
}
export function parseRemoteModuleIndex(value, coreVersion) {
    if (!record(value) || !only(value, ['coreVersion', 'generatedAt', 'modules'])
        || value.coreVersion !== coreVersion || typeof value.generatedAt !== 'string'
        || !Number.isFinite(Date.parse(value.generatedAt)) || !record(value.modules)
        || Object.keys(value.modules).length > 256)
        return undefined;
    const modules = Object.create(null);
    for (const [id, item] of Object.entries(value.modules)) {
        if (!moduleId(id) || !record(item) || !only(item, ['package', 'version'])
            || !packageName(item.package) || !exactVersion(item.version))
            return undefined;
        modules[id] = Object.freeze({ package: item.package, version: item.version });
    }
    return Object.freeze({ coreVersion, generatedAt: value.generatedAt,
        modules: Object.freeze(modules) });
}
export async function readRemoteModuleIndex(options, outer) {
    const controller = new AbortController();
    const signal = AbortSignal.any([outer, controller.signal]);
    const cacheKey = `loader:index:${options.coreVersion}`;
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 3000);
    let abort;
    const cached = () => {
        try {
            return parseRemoteModuleIndex(JSON.parse(options.cache?.getItem(cacheKey) ?? 'null'), options.coreVersion);
        }
        catch {
            return undefined;
        }
    };
    try {
        const root = moduleBase(options.cdn, { package: 'catalog', version: options.coreVersion });
        if (root.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(root.hostname))
            return undefined;
        const url = new URL('remote.json', root).href;
        const stopped = new Promise((_, reject) => {
            abort = () => reject(signal.reason);
            if (signal.aborted)
                abort();
            else
                signal.addEventListener('abort', abort, { once: true });
        });
        const result = await Promise.race([(async () => {
                const response = await (options.fetch ?? fetch)(url, { signal, redirect: 'error', credentials: 'omit' });
                signal.throwIfAborted();
                if (!response.ok || response.redirected
                    || (response.url && response.url !== url))
                    return undefined;
                const bytes = await readResponseBytes(response, MAX_MANIFEST_BYTES, signal, () => { throw new Error('index too large'); });
                signal.throwIfAborted();
                return parseRemoteModuleIndex(JSON.parse(new TextDecoder().decode(bytes)), options.coreVersion);
            })(), stopped]);
        if (result) {
            try {
                options.cache?.setItem(cacheKey, JSON.stringify(result));
            }
            catch { }
        }
        return result;
    }
    catch {
        outer.throwIfAborted();
        return controller.signal.aborted ? undefined : cached();
    }
    finally {
        clearTimeout(timer);
        if (abort)
            signal.removeEventListener('abort', abort);
    }
}

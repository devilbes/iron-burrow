import { createAnalytics } from './analytics-controller.js';
import { bindPortalSession, readPortalSession } from './portal-session.js';
import { portalCore } from './portal-core.js';
import { randomUuid } from './context.js';
import { createDiagnostics, diagnosticLogger } from './diagnostics.js';
import { loadModuleOverrides } from './module-overrides.js';
import { hasAvailability, moduleAvailable } from '@manygamescorp/contracts-client/module-settings';
import { createAdapterModules } from './adapter-modules.js';
import { createSkinSelection } from './skin-slot.js';
import { UI_FULLSCREEN_CHANGED } from './ui-state.js';
import { createRealtimeBus } from './realtime-bus.js';
import { baseProfile } from './base-profile.js';
import { createSessionChannel, SESSION_TRANSPORT } from './session-transport.js';
import { REALTIME_DELIVERY } from './realtime-port.js';
import { AUTH_IDENTITY_CHANGED, AUTH_PLAYER_CHANGED, createAuth, refusedById } from './auth.js';
import { createBus, createScopedBus } from './bus.js';
import { CONFIGS_UPDATED, createConfigs } from './configs.js';
import { CONTEXT_CHANGED, createContextEngine, PROVIDER_ORDER } from './filter-context.js';
import { createFacts, parseFilterParams } from './facts.js';
import { scopePoller } from './poller.js';
import { createPoller } from './poller-controller.js';
import { createAppLifecycle } from './app-lifecycle.js';
import { purgeBlobs } from './storage/blob-store.js';
import { createMemoryBackend, createStorage, DEVICE, localBackend, storagePrefix } from './storage/scoped.js';
import { ModuleContainer } from './container.js';
import { SDKError } from './error.js';
import { createAssets } from './assets.js';
import { createEndpoints, parsePlatformConfig } from './endpoints.js';
import { createFilters } from './filters.js';
import { ModuleLifecycle } from './lifecycle.js';
import { createLogger } from './logger.js';
import { detectPlatform } from './platform.js';
import { webRuntime } from './web-runtime.js';
import { createModuleContext } from './module-context.js';
import { ModuleRegistry } from './registry.js';
import { createScopedHttp } from './scoped-http.js';
import { createModuleServices } from './services.js';
import { createReliableHttpTransport } from './transport.js';
import { createServerClock, TIME_OFFSET_CHANGED } from './time.js';
import { createDevice } from './device.js';
import { checkModuleComposition } from '@manygamescorp/contracts-client/module-composition';
import { createModuleLoader, parseSdkLock, planModules, resolveModuleSettings, satisfies, SDK_MODULE_FAILED } from './loader.js';
import { VERSION } from './version.js';
import { createL10n } from './l10n.js';
import { createL10nRuntime } from './l10n/configs.js';
import { canonicalLocale } from './l10n/locale.js';
import { createUiWindows } from './window-triggers.js';
import { createTriggerEngine } from './triggers.js';
export { SDK_MODULE_FAILED } from './loader.js';
export { CONTEXT_CHANGED } from './filter-context.js';
export { AUTH_PLAYER_CHANGED, AUTH_ACCOUNT_CHANGING, AUTH_ACCOUNT_CHANGED } from './auth.js';
export const SDK_FACTS_UNKNOWN_PARAM = 'sdk:facts:unknown-param';
export const SDK_CORE_READY = 'sdk:core:ready';
export const SDK_RELOAD_REQUIRED = 'sdk:reload:required';
const reserved = new Set([
    'debug', 'state', 'bus', 'platform', 'time', 'device', 'endpoints', 'assets', 'auth', 'configs', 'l10n', 'context',
    'analytics', 'filters', 'uiState', 'boot', 'destroy', 'getModule', 'loadModule', 'modules', 'moduleStatuses',
    'then', 'toJSON', '__proto__', 'prototype', 'constructor',
]);
const uiCoreNames = new Set(['register', 'usePlacements', 'canShow', 'show', 'elementAction', 'resetSession']);
const empty = Object.freeze({});
const LOADER_SCOPE = 'core.loader';
const LEGACY_LOADER_KEY = 'loader:manifests';
const UNSENT_KEY = 'kernel:unsent';
const UNSENT_GIDS = 8;
const UNSENT_PER_GID = 16;
export function createSdk(config) {
    if (!record(config) || !Array.isArray(config.modules)
        || (config.context !== undefined && typeof config.context !== 'function'))
        invalid();
    if (config.debug !== undefined && typeof config.debug !== 'boolean')
        invalid();
    const platformConfig = Object.hasOwn(config, 'platformConfig')
        ? parsePlatformConfig(config.platformConfig) : undefined;
    const endpoints = platformConfig && createEndpoints(platformConfig);
    if (config.http !== undefined && (!endpoints || !record(config.http)))
        invalid();
    const appId = platformConfig?.appId;
    const localModules = appId === undefined ? config.modules : [baseProfile(), ...config.modules];
    if (appId !== undefined && (config.http?.token !== undefined
        || config.http?.onUnauthorized !== undefined))
        invalid();
    if (config.storage !== undefined && (appId === undefined || !record(config.storage)))
        invalid();
    if (config.configs !== undefined && appId === undefined)
        invalid();
    const l10nOptions = parseL10nOptions(config.l10n);
    const portal = portalCore(config.portal);
    if (config.portal !== undefined && !portal)
        invalid();
    if (appId !== undefined && (typeof config.http?.appVersion !== 'string'
        || config.http.appVersion.length > 64
        || config.http.appVersion.trim() !== config.http.appVersion
        || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(config.http.appVersion))) {
        throw new SDKError('SDK_CONFIG_INVALID', {
            message: 'http.appVersion is required in X.Y.Z format when configs are enabled',
            retryable: false,
        });
    }
    const diagnostics = createDiagnostics();
    const logger = diagnosticLogger(config.http?.logger ?? createLogger(), (record) => diagnostics.publish('logs', record));
    let auth;
    let realtimeSession;
    let realtimeOpen = false;
    const sessionInstance = randomUuid();
    const clock = createServerClock();
    const transport = endpoints ? createReliableHttpTransport({
        ...config.http, endpoints, clock, logger,
        onDiagnostic: (record) => diagnostics.publish('network', record),
        ...(appId === undefined ? {} : { appId }),
        authScope: () => auth?.api.session ? `${appId}:${generation}` : undefined,
        realtimeSession: () => realtimeSession,
        ...(appId === undefined ? {} : { token: () => auth?.token(),
            onUnauthorized: (token) => auth?.unauthorized(token) })
    }) : undefined;
    const platformTimeout = config.platformReadyTimeoutMs ?? 10_000;
    timeout(platformTimeout);
    const configuredLifecycle = config.lifecycle;
    if (configuredLifecycle !== undefined && !record(configuredLifecycle))
        invalid();
    if (configuredLifecycle?.timeouts !== undefined && !record(configuredLifecycle.timeouts)) {
        invalid();
    }
    const lifecycleOptions = {
        ...configuredLifecycle, timeouts: { ...configuredLifecycle?.timeouts },
    };
    if (lifecycleOptions.timeoutMs !== undefined)
        timeout(lifecycleOptions.timeoutMs);
    for (const value of Object.values(lifecycleOptions.timeouts ?? {}))
        timeout(value);
    let moduleConfig = empty;
    const configuredModules = config.moduleConfig ?? platformConfig?.moduleConfig;
    if (configuredModules !== undefined) {
        if (!record(configuredModules))
            invalid();
        try {
            moduleConfig = structuredClone(configuredModules);
        }
        catch (cause) {
            invalid(cause);
        }
        for (const [id, settings] of Object.entries(moduleConfig)) {
            if (/auth.*(google|facebook)/i.test(id) && record(settings)
                && ['clientId', 'webClientId', 'androidClientId', 'appId', 'clientSecret',
                    'appSecret', 'redirectUri', 'redirectUris', 'loginProviders']
                    .some((key) => Object.hasOwn(settings, key)))
                invalid();
        }
    }
    const loaderOptions = config.loader;
    if (loaderOptions !== undefined && (!record(loaderOptions)
        || (loaderOptions.fetch !== undefined && typeof loaderOptions.fetch !== 'function')
        || (loaderOptions.import !== undefined && typeof loaderOptions.import !== 'function')
        || (loaderOptions.localBase !== undefined && typeof loaderOptions.localBase !== 'string')))
        invalid();
    for (const ms of [loaderOptions?.timeoutMs, loaderOptions?.indexTimeoutMs,
        loaderOptions?.overridesTimeoutMs])
        if (ms !== undefined)
            timeout(ms);
    const lock = parseSdkLock(platformConfig ? config.platformConfig : undefined);
    if (appId !== undefined && (config.modules.some(m => m.manifest.id === 'profile')
        || lock.modules.some(m => m.id === 'profile')))
        invalid();
    const lockRemote = new Set(lock.modules.filter((ref) => ref.source === 'remote')
        .map((ref) => ref.id));
    const lockPending = new Set(lock.modules.filter((ref) => ref.source === 'remote'
        || !localModules.some((definition) => definition.manifest.id === ref.id))
        .map((ref) => ref.id));
    const registry = new ModuleRegistry();
    const bundled = planModules({ local: localModules.filter(definition => !lockRemote.has(definition.manifest.id)), lock }).local
        .map((definition) => registry.register(definition));
    const bundledIds = new Set(bundled.map((definition) => definition.manifest.id));
    const waiting = new Set();
    for (let changed = true; changed;) {
        changed = false;
        for (const definition of bundled) {
            const { id, requires = {} } = definition.manifest;
            if (waiting.has(id))
                continue;
            if (Object.keys(requires).some((dependency) => waiting.has(dependency)
                || (!bundledIds.has(dependency) && lockPending.has(dependency)))) {
                waiting.add(id);
                changed = true;
            }
        }
    }
    for (const id of waiting)
        registry.unregister(id);
    const container = new ModuleContainer(registry);
    const order = container.order();
    const active = new Set(order.filter((definition) => definition.manifest.load === 'eager')
        .map((definition) => definition.manifest.id));
    for (const definition of [...order].reverse()) {
        if (active.has(definition.manifest.id)) {
            for (const id of Object.keys(definition.manifest.requires ?? {}))
                active.add(id);
        }
    }
    const baseline = [...active];
    const paths = bundled.map((definition) => definition.manifest.id);
    for (const path of paths) {
        if (path === 'ui' || path.split('.')[0] === 'diagnostics' || path.split('.').some((part) => reserved.has(part))
            || (path.startsWith('ui.') && uiCoreNames.has(path.slice(3).split('.')[0]))
            || paths.some((other) => other !== path && other.startsWith(`${path}.`)))
            invalid();
    }
    const selectedPlatform = config.platform === undefined || config.platform === 'auto'
        ? detectPlatform() ?? webRuntime() : config.platform;
    if (!record(selectedPlatform))
        invalid();
    if (selectedPlatform.createStorage !== undefined
        && typeof selectedPlatform.createStorage !== 'function')
        invalid();
    const platform = selectedPlatform.createStorage === undefined ? selectedPlatform
        : { ...selectedPlatform, ...selectedPlatform.createStorage(appId !== undefined && platformConfig
                ? storagePrefix(appId, platformConfig.endpoints.api) : undefined) };
    if (platform !== undefined && (!record(platform) || typeof platform.id !== 'string'
        || !platform.id || typeof platform.ready !== 'function' || !record(platform.secureStore)
        || !record(platform.lifecycle) || typeof platform.lifecycle.on !== 'function'
        || !record(platform.device) || typeof platform.device.info !== 'function'
        || typeof platform.device.vendorId !== 'function' || !record(platform.plugins)
        || typeof platform.plugins.has !== 'function' || typeof platform.plugins.get !== 'function'
        || typeof platform.openUrl !== 'function'
        || !['get', 'set', 'delete', 'isAvailable'].every((key) => typeof platform.secureStore[key] === 'function'))) {
        invalid();
    }
    const platformView = Object.freeze({ id: platform.id });
    const env = import.meta.env;
    const mode = env?.PROD === true || env?.MODE === 'production' ? 'production'
        : env?.MODE === 'test' ? 'test' : 'development';
    const bus = createBus({ mode, debug: config.debug === true, logger,
        onDiagnostic: (data, payload) => diagnostics.publish('bus', data, payload) });
    const poller = createPoller(bus, clock.now);
    const analytics = createAnalytics();
    const offClock = clock.onChange((change) => bus.emit(TIME_OFFSET_CHANGED, change));
    let storage;
    let configs;
    let chain = Promise.resolve();
    const serial = (run) => {
        const result = chain.then(run);
        chain = result.then(() => undefined, () => undefined);
        return result;
    };
    let generation = 0;
    let scope = new AbortController();
    const activatingRealtime = new Map();
    const realtimeBus = createRealtimeBus(bus, (id) => entries.get(id)?.definition.manifest, async (id, signal) => {
        const existing = activatingRealtime.get(id);
        if (existing)
            return existing;
        const task = (async () => {
            const activate = async (module) => {
                signal.throwIfAborted();
                const entry = entries.get(module);
                if (!entry || entry.failure || entry.cleanup) {
                    throw new SDKError('MODULE_DEPENDENCY_FAILED', { module });
                }
                if (entry.lifecycle.state === 'started')
                    return;
                if (module === id && !availableModule(entry.definition.manifest)) {
                    throw new SDKError('MODULE_NOT_ACTIVE', { module });
                }
                for (const dep of Object.keys(entry.definition.manifest.requires ?? {})) {
                    await activate(dep);
                }
                signal.throwIfAborted();
                if (entry.lifecycle.state === 'registered')
                    entry.lifecycle.resolve();
                if (entry.lifecycle.state === 'resolved')
                    await entry.lifecycle.init();
                signal.throwIfAborted();
                await start(entry);
            };
            await activate(id);
        })();
        activatingRealtime.set(id, task);
        try {
            await task;
        }
        finally {
            if (activatingRealtime.get(id) === task)
                activatingRealtime.delete(id);
        }
    }, () => realtimeOpen);
    const epochs = new Map();
    const starts = new Map();
    const suspended = new Set();
    let reloading = false;
    let playerChange;
    const gid = () => {
        const value = auth?.api.session?.gid;
        return value === undefined ? undefined : String(value);
    };
    const memoryRoot = appId === undefined || platformConfig === undefined ? undefined
        : createStorage({ appCode: String(appId),
            ...(appId === undefined ? {} : { appId }),
            api: platformConfig.endpoints.api, backend: createMemoryBackend() });
    const buildStore = typeof config.platformConfig?.store
        === 'string' ? config.platformConfig.store : undefined;
    const build = Object.freeze({
        target: platform.id === 'cordova' ? 'cordova' : 'web',
        ...(buildStore === undefined ? {} : { store: buildStore })
    });
    let facts;
    let unsubscribeFacts;
    const provided = new Map();
    const engine = createContextEngine({
        emit: (event, payload) => bus.emit(event, payload),
        recompute: (keys, purchase) => configs?.recompute(keys, purchase) ?? false,
        timeDependent: () => configs?.timeDependent() ?? false,
        snapshot: () => contextStore().snapshot(),
    });
    let closed = false;
    const contextStore = () => {
        if (closed)
            throw new SDKError('MODULE_NOT_ACTIVE', { module: 'context' });
        const current = gid();
        const key = current ?? '0';
        if (facts?.gid === key)
            return facts;
        unsubscribeFacts?.();
        engine.reset();
        const session = auth?.api.session;
        const factStorage = current !== undefined && storage ? storage : memoryRoot;
        const next = createFacts({ ...(factStorage ? { storage: factStorage } : {}),
            gid: key, platform: platform.id, now: clock.now,
            ...(config.http?.appVersion === undefined ? {} : { appVersion: config.http.appVersion }),
            ...(buildStore === undefined ? {} : { store: buildStore }),
            ...(session ? { identity: { uid: session.uid, gid: session.gid } } : {}),
            ...(mode === 'production' ? {} : {
                onUnknownParam: (param) => bus.emit(SDK_FACTS_UNKNOWN_PARAM, { param }),
            }) });
        facts = next;
        const rank = (owner) => {
            const index = PROVIDER_ORDER.indexOf(owner);
            return index >= 0 ? index : PROVIDER_ORDER.length - 1.5;
        };
        for (const [owner, batch] of [...provided].sort(([a], [b]) => rank(a) - rank(b))) {
            if (batch.gid !== undefined && batch.gid !== key)
                continue;
            try {
                next.view(owner).set(batch.values);
            }
            catch { }
        }
        unsubscribeFacts = next.subscribe((keys) => engine.changed(keys));
        return next;
    };
    const provide = (owner, values, owned) => {
        if (facts && (owned === undefined || facts.gid === owned))
            facts.view(owner).set(values);
        const previous = provided.get(owner);
        provided.set(owner, { ...(owned === undefined ? {} : { gid: owned }),
            values: { ...(previous && previous.gid === owned ? previous.values : {}), ...values } });
    };
    const dropContext = () => {
        unsubscribeFacts?.();
        unsubscribeFacts = undefined;
        facts = undefined;
        engine.reset();
    };
    const providerView = (owner) => Object.freeze({
        get: (key) => contextStore().view(owner).get(key),
        snapshot: () => contextStore().snapshot(),
        set: (values) => provide(owner, { ...values }),
    });
    const purge = async (target, keep) => {
        if (!storage)
            return;
        const root = storage;
        try {
            const kept = unsent();
            for (const other of target === undefined ? root.gids() : [target]) {
                if (other === keep)
                    continue;
                try {
                    root.clearGid(other, kept.get(other));
                }
                catch { }
            }
        }
        catch { }
        if (platform.blobStore) {
            await purgeBlobs(platform.blobStore, target === undefined ? root.prefix : `${root.prefix}${target}:`, [`${root.prefix}${DEVICE}:`, ...(keep === undefined ? [] : [`${root.prefix}${keep}:`])])
                .catch(() => undefined);
        }
    };
    let saving = Promise.resolve();
    const unsent = () => {
        const found = new Map();
        let value;
        try {
            value = JSON.parse(storage?.device().getItem(UNSENT_KEY) ?? '[]');
        }
        catch {
            return found;
        }
        if (!Array.isArray(value))
            return found;
        for (const entry of value.slice(-UNSENT_GIDS)) {
            if (!Array.isArray(entry))
                continue;
            const [owner, keys] = entry;
            if (typeof owner !== 'string' || !/^\d{1,16}$/.test(owner) || !Array.isArray(keys))
                continue;
            found.set(owner, keys.filter((key) => typeof key === 'string'
                && key.startsWith(`${storage?.prefix}${owner}:`)).slice(0, UNSENT_PER_GID));
        }
        return found;
    };
    const remember = (owner, keys) => {
        const next = unsent();
        next.delete(owner);
        if (keys?.length)
            next.set(owner, keys);
        const entries = [...next].slice(-UNSENT_GIDS);
        try {
            if (entries.length)
                storage?.device().setItem(UNSENT_KEY, JSON.stringify(entries));
            else
                storage?.device().removeItem(UNSENT_KEY);
        }
        catch { }
    };
    const saveModules = async (owner, signal) => {
        const left = [];
        await Promise.all(ordered().map(async (entry) => {
            if (entry.lifecycle.state !== 'started' || !entry.definition.save)
                return;
            const { id } = entry.definition.manifest;
            try {
                const expired = new Promise((resolve) => {
                    const done = () => { setTimeout(() => { resolve(undefined); }, 0); };
                    if (signal.aborted)
                        done();
                    else
                        signal.addEventListener('abort', done, { once: true });
                });
                const keys = await Promise.race([entry.definition.save(signal), expired]);
                if (!storage || !Array.isArray(keys))
                    return;
                const prefix = storage.scope(owner, id).prefix;
                for (const key of keys.slice(0, UNSENT_PER_GID)) {
                    if (typeof key === 'string' && key.length > 0 && key.length <= 256)
                        left.push(prefix + key);
                }
            }
            catch { }
        }));
        if (left.length) {
            remember(owner, [...new Set([...(unsent().get(owner) ?? []), ...left])]
                .slice(-UNSENT_PER_GID));
        }
    };
    const refused = async (error) => {
        if (!refusedById(error))
            return;
        await serial(async () => {
            await auth?.idle();
            await purge(undefined, gid());
        }).catch(() => undefined);
    };
    const identity = (change) => {
        const { previousGid } = change;
        if (previousGid === null)
            return;
        playerChange = change;
        dropContext();
        generation += 1;
        uiWindows.resetSession();
        triggerEngine.resetSession();
        stopTriggers();
        currentRoute = undefined;
        scope.abort();
        scope = new AbortController();
        const reload = Object.freeze({ previousGid, gid: change.gid,
            reason: change.reason === 'logout' ? 'logout' : change.gid === null ? 'revoked' : 'identity' });
        const revoked = reload.reason === 'revoked' && auth?.storageCurrent() !== false;
        void serial(async () => {
            await auth?.idle();
            if (revoked) {
                await saveModules(String(previousGid), AbortSignal.abort());
            }
            await saving;
            reloading = true;
            for (const entry of ordered().reverse()) {
                if (entry.lifecycle.state !== 'started')
                    continue;
                suspended.add(entry);
                try {
                    await entry.lifecycle.stop('auth-change');
                }
                catch { }
            }
            await decompose();
            bus.forget(SDK_CORE_READY);
            await purge(String(previousGid), gid());
            bus.emit(SDK_RELOAD_REQUIRED, reload);
        }).catch(() => undefined);
    };
    if (appId !== undefined && transport && platformConfig) {
        const api = platformConfig.endpoints.api;
        const storageIdentity = { appId: platformConfig.appId };
        const local = config.storage
            ?? localBackend(`${storagePrefix(platformConfig.appId, api)}${DEVICE}:probe`);
        const root = createStorage({ appCode: String(appId), ...storageIdentity, api, backend: local });
        const scratch = createStorage({ appCode: String(appId), ...storageIdentity, api,
            backend: createMemoryBackend() });
        storage = root;
        auth = createAuth({ ...storageIdentity, api, transport, platform, local, now: clock.now,
            ...(platformConfig.clientAuthoritative === undefined ? {}
                : { clientAuthoritative: platformConfig.clientAuthoritative }),
            ...(portal ? { portal } : {}),
            ...(config.providerAdapters ? { providerAdapters: config.providerAdapters } : {}),
            beforeSwitch: (signal) => {
                const owner = gid();
                if (owner === undefined)
                    return Promise.resolve();
                const run = saveModules(owner, signal);
                saving = run;
                return run;
            },
            onSession: (session) => {
                if (!session)
                    return;
                try {
                    provide('auth', { 'auth.anonymous': session.anonymous, ...(session.account ? {
                            'account.registeredAt': session.account.registeredAt,
                            'account.lastLoginAt': session.account.lastLoginAt,
                        } : {}) }, String(session.gid));
                }
                catch { }
            },
            emit: (event, payload) => {
                if (event === AUTH_IDENTITY_CHANGED)
                    identity(payload);
                bus.emit(event, payload);
            } });
        configs = createConfigs({ transport, bus, poller, now: clock.now, storage: () => {
                const current = gid();
                return current === undefined ? scratch.scope('0', 'configs') : root.scope(current, 'configs');
            }, context: {
                facts: () => contextStore().facts(),
                segments: (keys) => contextStore().segments(keys),
                ab: (values) => contextStore().ab(values),
                params: (data) => contextStore().params(parseFilterParams(data)),
                resolved: () => engine.discard(),
            } }, bootSelection(config.configs));
    }
    const unsubscribeConfigs = bus.on(CONFIGS_UPDATED, () => {
        engine.sync();
        armWindowTriggers();
    });
    let moduleOverrides = {};
    let settingsFacts = {};
    let settingsParameters = parseFilterParams(undefined) ?? {};
    const sessionSettings = new Map();
    const settingsOf = (manifest) => {
        const { id } = manifest;
        const known = sessionSettings.get(id);
        if (known)
            return known;
        const settings = resolveModuleSettings(manifest, lock.modules.find(ref => ref.id === id), moduleOverrides[id] ?? [], { facts: settingsFacts, parameters: settingsParameters }, result => {
            for (const issue of result.ignored)
                bus.emit('sdk:module:override-ignored', { moduleId: id, ...issue });
            bus.emit('sdk:module:settings', { moduleId: id, overrides: result.overrides });
        });
        sessionSettings.set(id, settings);
        return settings;
    };
    const availableModule = (manifest) => {
        if (manifest.selection === 'required' || !hasAvailability(manifest.settings))
            return true;
        try {
            return moduleAvailable(manifest.settings, settingsOf(manifest), settingsFacts, settingsParameters);
        }
        catch {
            return true;
        }
    };
    const loadConfigs = async () => {
        const epoch = generation;
        moduleOverrides = {};
        sessionSettings.clear();
        loadFailures.clear();
        const signal = AbortSignal.any([loads.signal, scope.signal]);
        (sessionLoader ??= createLoader(gid()))?.prepare(signal).catch(() => undefined);
        contextStore();
        const context = await configs?.init().catch(() => undefined);
        const contextOnly = config.configs?.scopes === undefined && config.configs?.keys === undefined;
        if (context && (context.configs === undefined
            || (contextOnly && Object.keys(context.configs).length === 0))) {
            await configs?.fetch().catch(() => undefined);
        }
        try {
            configs?.snapshot();
        }
        catch { }
        engine.sync();
        if (lock.overrides && transport) {
            let loaded;
            try {
                loaded = await loadModuleOverrides({ transport, signal,
                    ...(storage && gid() !== undefined
                        ? { storage: storage.scope(gid(), LOADER_SCOPE) } : {}),
                    ...(loaderOptions?.overridesTimeoutMs !== undefined
                        ? { timeoutMs: loaderOptions.overridesTimeoutMs } : {}),
                    unavailable: () => bus.emit('sdk:overrides:unavailable', {}), });
            }
            catch {
                return;
            }
            if (epoch !== generation)
                return;
            moduleOverrides = loaded;
        }
        if (epoch !== generation)
            return;
        settingsFacts = structuredClone(contextStore().facts());
        settingsParameters = structuredClone(parseFilterParams(configs?.get('filters.params', 'main')) ?? {});
    };
    const hostContext = (definition) => {
        const context = config.context?.(definition.manifest) ?? empty;
        if (!record(context))
            invalid();
        if (transport && endpoints)
            createScopedHttp(transport, endpoints, definition.manifest);
        return context;
    };
    const contexts = order.map(hostContext);
    const deviceStorage = storage?.device();
    const deviceRuntime = createDevice({
        ...(storage ? { storage: {
                get: (key) => {
                    const player = gid();
                    return player === undefined ? undefined : storage.scope(player, 'core.device').get(key);
                },
                set: (key, value) => {
                    const player = gid();
                    if (player === undefined)
                        return;
                    try {
                        storage.scope(player, 'core.device').set(key, value);
                    }
                    catch {
                        throw new SDKError('SDK_STORAGE_WRITE_FAILED');
                    }
                },
            } } : {}),
        ...config.device, platform, bus, facts: providerView('device'),
    });
    const appLifecycle = createAppLifecycle(platform, deviceRuntime.device.network, bus);
    const entries = new Map();
    const l10nDeps = {
        bus, appCode: appId === undefined ? '' : String(appId), debug: config.debug === true,
        ...(portal ? { portalLocale: () => portal.locale() } : {}),
        device: { info: () => deviceRuntime.device.info() },
        moduleIds: () => entries.keys(),
        facts: { set: (key, value) => provide('l10n', { [key]: value }) },
    };
    const l10n = storage && transport
        ? createL10nRuntime(l10nOptions, {
            ...l10nDeps, now: clock.now, platform, poller, profileStorage: storage, gid: () => gid() ?? '',
            context: () => contextStore().facts(),
            transport: l10nTransport(transport, config.http?.fetch, () => gid() !== undefined, () => scope.signal),
        })
        : createL10n(l10nOptions, l10nDeps);
    const playerFilters = createFilters(() => contextStore().facts(), () => contextStore().filterParameters());
    const windowOwners = new Map();
    const uiWindows = createUiWindows({
        async acquire(id) {
            const epoch = generation;
            const manifest = entries.get(id)?.definition.manifest ?? demandLocal.get(id)?.manifest;
            if (!manifest && !demandRefs.has(id))
                return async () => { };
            if ((demandRefs.get(id)?.load ?? manifest?.load) === 'eager')
                return async () => { };
            const retained = windowOwners.get(id);
            const lease = retained?.epoch === epoch ? retained : { epoch, count: 0 };
            lease.count += 1;
            windowOwners.set(id, lease);
            try {
                await loadModule(id);
            }
            catch (error) {
                lease.count -= 1;
                if (lease.count === 0 && windowOwners.get(id) === lease)
                    windowOwners.delete(id);
                throw error;
            }
            const owner = entries.get(id);
            return () => serial(async () => {
                lease.count -= 1;
                if (lease.count > 0)
                    return;
                if (windowOwners.get(id) === lease)
                    windowOwners.delete(id);
                if (epoch !== generation || closed || reloading || entries.get(id) !== owner)
                    return;
                const candidates = new Set();
                const visit = (module) => {
                    if (candidates.has(module))
                        return;
                    const entry = entries.get(module);
                    if (!entry || entry.definition.manifest.load === 'eager')
                        return;
                    candidates.add(module);
                    for (const dependency of Object.keys(entry.definition.manifest.requires ?? {})) {
                        visit(dependency);
                    }
                };
                visit(id);
                for (const module of candidates) {
                    const retained = windowOwners.get(module);
                    if (retained?.epoch === epoch && retained.count > 0)
                        candidates.delete(module);
                }
                for (let changed = true; changed;) {
                    changed = false;
                    for (const entry of entries.values()) {
                        if (candidates.has(entry.definition.manifest.id)
                            || entry.cleanup || entry.failure)
                            continue;
                        for (const dependency of Object.keys(entry.definition.manifest.requires ?? {})) {
                            if (candidates.delete(dependency))
                                changed = true;
                        }
                    }
                }
                for (const entry of ordered().reverse()) {
                    const module = entry.definition.manifest.id;
                    if (!candidates.has(module))
                        continue;
                    try {
                        await cleanup(entry);
                    }
                    catch { }
                    entries.delete(module);
                    suspended.delete(entry);
                    active.delete(module);
                    container.remove(module);
                    registry.unregister(module);
                    remoteIds.delete(module);
                    demandFailures.delete(module);
                    loadFailures.delete(module);
                    if (bundledIds.has(module))
                        composition?.touched.add(module);
                }
            });
        },
    });
    const triggerEngine = createTriggerEngine({ now: clock.now,
        async activate(id) {
            const manifest = entries.get(id)?.definition.manifest ?? demandLocal.get(id)?.manifest;
            if ((demandRefs.get(id)?.load ?? manifest?.load ?? 'eager') !== 'eager') {
                await loadModule(id);
            }
        },
        target: (id) => {
            const entry = entries.get(id);
            if (!entry || entry.lifecycle.state !== 'started' || entry.failure)
                return undefined;
            return { ...(entry.definition.manifest.actions
                    ? { actions: entry.definition.manifest.actions } : {}), signal: entry.context.signal };
        },
        matches: (filter) => playerFilters.match(filter),
        windows: uiWindows,
        automaticWindowsEnabled: () => container.get('ui.slots@1')
            ?.automaticEnabled?.() !== false,
        cooldowns: {
            get: (rule) => {
                const player = gid();
                const value = storage && player !== undefined
                    ? storage.scope(player, 'core.triggers').get(`cooldown.${rule}`) : undefined;
                return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
            },
            set: (rule, at) => {
                const player = gid();
                if (storage && player !== undefined) {
                    storage.scope(player, 'core.triggers').set(`cooldown.${rule}`, at);
                }
            },
        },
        rules: () => {
            const main = configs?.getScope('ui.windows')['main'];
            return record(main) && Array.isArray(main['triggers'])
                ? main['triggers'] : [];
        },
        unknownAction: (rule, ref) => bus.emit('sdk:ui:trigger-failed', { rule, code: 'TRIGGER_ACTION_UNKNOWN', module: ref.module, action: ref.action }) });
    const moduleFacts = (id, current) => {
        const refuse = () => { throw new SDKError('MODULE_NOT_ACTIVE', { module: id }); };
        return Object.freeze({
            get: (key) => (current() ? contextStore().view(id).get(key) : undefined),
            snapshot: () => (current() ? contextStore().snapshot() : empty),
            set: (values) => {
                if (!current())
                    refuse();
                contextStore().view(id).set(values);
            },
            hold: () => {
                if (!current())
                    refuse();
                contextStore();
                return engine.hold();
            },
            purchase: () => {
                if (!current())
                    refuse();
                if (id !== 'iap') {
                    throw new SDKError('SDK_PERMISSION_DENIED', { message: 'Only iap reports purchases', module: id });
                }
                engine.purchase();
            },
        });
    };
    const moduleSession = (current) => Object.freeze({
        get gid() { return current() ? auth?.api.session?.gid : undefined; },
        get clientAuthoritative() {
            return current() ? auth?.api.session?.clientAuthoritative === true : undefined;
        },
    });
    const buildEntry = (definition, supplied, remote) => {
        const { id, permissions } = definition.manifest;
        const controller = new AbortController();
        const signal = controller.signal;
        const services = createModuleServices(definition.manifest, container, {
            signal, state: (moduleId) => entries.get(moduleId)?.lifecycle.state,
            current: (moduleId) => (epochs.get(moduleId) ?? 0) === generation,
            generation: () => generation,
            starting: (moduleId) => entries.get(moduleId)?.starting === true,
            available: (moduleId) => {
                const entry = entries.get(moduleId);
                return entry !== undefined && !entry.failure && !entry.cleanup;
            },
        });
        const ports = (bound) => {
            const current = () => {
                gid();
                return !bound.controller.signal.aborted && bound.generation === generation;
            };
            const http = transport && endpoints ? createScopedHttp(identityHttp(transport, () => {
                if (!current())
                    throw new DOMException('Identity changed', 'AbortError');
                return AbortSignal.any([scope.signal, bound.controller.signal]);
            }), endpoints, definition.manifest) : supplied.http;
            const runSignal = AbortSignal.any([signal, scope.signal, bound.controller.signal]);
            const rtView = realtimeBus.view(id, runSignal);
            const activeRt = () => {
                if (!current())
                    throw new SDKError('MODULE_NOT_ACTIVE', { module: id });
                runSignal.throwIfAborted();
            };
            const deliveryRequested = definition.manifest.consumes?.includes(REALTIME_DELIVERY);
            const rtDelivery = deliveryRequested
                && permissions.includes('http:realtime') && endpoints && auth ? {
                ...rtView,
                publish(message) { activeRt(); bus.emit(`realtime:${message.type}`, message); },
                critical(message) {
                    activeRt();
                    return realtimeBus.critical(message, runSignal, [...entries.values()]
                        .filter((entry) => entry.definition.manifest.realtime?.handles.includes(message.type))
                        .map((entry) => entry.definition.manifest.id));
                },
                register(module, type, handler) {
                    activeRt();
                    const target = entries.get(module);
                    if (!target)
                        throw new SDKError('MODULE_DEPENDENCY_FAILED', { module });
                    return realtimeBus.register(module, type, handler, AbortSignal.any([runSignal, target.context.signal]));
                },
                session(value) { activeRt(); realtimeSession = value; if (!value)
                    realtimeOpen = false; },
                state(value, kind) {
                    activeRt();
                    realtimeOpen = value === 'open';
                    bus.emit('sdk:realtime:status:changed', { state: value });
                    if (kind)
                        bus.emit('sdk:realtime:transport:changed', { to: kind });
                },
            } : undefined;
            const sessionTransport = endpoints && auth ? Object.freeze({
                channel(service) {
                    activeRt();
                    if (!permissions.includes(`http:${service}`)) {
                        throw new SDKError('SDK_PERMISSION_DENIED', { module: id });
                    }
                    return createSessionChannel({ baseUrl: endpoints.service(service),
                        ...(appId === undefined ? {} : { appId }),
                        token: () => { activeRt(); return auth?.token(); },
                        deviceId: async () => {
                            activeRt();
                            const did = await auth.deviceId();
                            activeRt();
                            return `${did.slice(0, 91)}:${sessionInstance}`;
                        },
                        signal: runSignal, ...(config.http?.fetch ? { fetch: config.http.fetch } : {}),
                        renew: async () => { activeRt(); await auth.api.refresh(); activeRt(); },
                        unauthorized: (token) => { if (current())
                            auth?.unauthorized(token); }, });
                },
            }) : undefined;
            const runBoundServices = runServices(services, current, id);
            const hostGet = (capability) => {
                activeRt();
                if (capability === SESSION_TRANSPORT || capability === REALTIME_DELIVERY) {
                    if (!definition.manifest.consumes?.includes(capability)) {
                        throw new SDKError('SDK_PERMISSION_DENIED', { module: id });
                    }
                    const service = capability === SESSION_TRANSPORT ? sessionTransport : rtDelivery;
                    return service;
                }
                return runBoundServices.get(capability);
            };
            const hostServices = Object.freeze({
                provide: runBoundServices.provide,
                get: hostGet,
                require(capability) {
                    const service = hostGet(capability);
                    if (service === undefined)
                        throw new SDKError('MODULE_DEPENDENCY_FAILED', { module: id });
                    return service;
                },
            });
            return {
                ...(permissions.includes('windows') ? { windows: {
                        register(windows) {
                            if (!current())
                                throw new SDKError('MODULE_NOT_ACTIVE', { module: id });
                            const off = uiWindows.register(id, windows);
                            runSignal.addEventListener('abort', off, { once: true });
                            return off;
                        },
                        show(name, params, options) {
                            if (!current())
                                throw new SDKError('MODULE_NOT_ACTIVE', { module: id });
                            return uiWindows.show(`${id}:${name}`, params, { ...options, signal: runSignal });
                        },
                    } } : {}),
                ...(permissions.includes('actions') ? { actions: {
                        async call(module, action, params, options) {
                            const manifest = definition.manifest;
                            const allowed = manifest.kind === 'game' ? manifest.sdk?.uses ?? []
                                : [...Object.keys(manifest.requires ?? {}), ...Object.keys(manifest.optional ?? {})];
                            if (!allowed.includes(module))
                                throw new SDKError('SDK_MODULE_NOT_DECLARED', { module });
                            return triggerEngine.call(module, action, params, { ...options,
                                signal: AbortSignal.any([runSignal, ...(options?.signal ? [options.signal] : [])]) });
                        },
                        publish(actions) {
                            if (!current())
                                throw new SDKError('MODULE_NOT_ACTIVE', { module: id });
                            const off = triggerEngine.publish(id, actions);
                            runSignal.addEventListener('abort', off, { once: true });
                            return off;
                        },
                    } } : {}),
                ...(permissions.includes('modules') ? { modules: createAdapterModules({
                        owner: definition.manifest, signal: runSignal, bus, lifecycle: lifecycleOptions,
                        build,
                        loader: endpoints ? createModuleLoader({ cdn: endpoints.cdn, coreVersion: VERSION, build,
                            ...loaderOptions, ...(lock.adapter ? { adapter: lock.adapter } : {}),
                            ...(storage && bound.gid !== undefined ? { cache: loaderCache(storage.scope(String(bound.gid), LOADER_SCOPE)) } : {}),
                        }) : undefined,
                        coreVersion: VERSION, adapter: lock.adapter,
                        context: (manifest, childSignal) => createModuleContext(manifest, {
                            ...runContext, diagnostics: diagnostics.api, signal: childSignal,
                            config: moduleConfig[manifest.id],
                            services: {
                                provide() { throw new SDKError('SDK_PERMISSION_DENIED', { module: manifest.id }); },
                                get(capability) {
                                    if (childSignal.aborted)
                                        throw new SDKError('MODULE_NOT_ACTIVE', { module: manifest.id });
                                    if (capability !== 'ui.slots@1' || !manifest.consumes?.includes(capability)
                                        || !definition.manifest.consumes?.includes(capability)) {
                                        throw new SDKError('SDK_PERMISSION_DENIED', { module: manifest.id });
                                    }
                                    const ui = services.get(capability);
                                    return ui?.forAdapter(childSignal);
                                },
                                require(capability) {
                                    const service = this.get(capability);
                                    if (!service)
                                        throw new SDKError('MODULE_DEPENDENCY_FAILED', { module: manifest.id });
                                    return service;
                                },
                            },
                            facts: moduleFacts(manifest.id, () => current() && !childSignal.aborted),
                            log: logger.child(manifest.id),
                            platform: modulePlatform(platform, childSignal, manifest, () => auth?.deviceId()),
                        }, (moduleId) => getModule(moduleId)),
                    }) } : {}),
                services: hostServices,
                realtime: rtView,
                session: supplied.session ?? moduleSession(current),
                configs: supplied.configs ?? (configs ? identityConfigs(configs, current, id) : empty),
                filters: supplied.filters
                    ?? createFilters(() => (current() ? contextStore().facts() : empty), () => current() ? contextStore().filterParameters() : {}),
                facts: supplied.facts ?? moduleFacts(id, current),
                ...(http === undefined ? {} : { http }),
                ...(supplied.storage === undefined && storage ? { storage: playerStorage(storage, () => (auth?.storageCurrent() !== false && !bound.controller.signal.aborted
                        ? bound.gid : undefined), id) } : {}),
            };
        };
        let run = { controller: new AbortController(), generation };
        const context = createModuleContext(definition.manifest, {
            diagnostics: diagnostics.api,
            bus: createScopedBus(bus, definition.manifest, { signal }), services, signal,
            config: moduleConfig[id], time: clock.view,
            strings: l10n.view(definition.manifest.kind === 'ui'
                ? { kind: 'core' } : { kind: 'module', id }),
            ...(config.http?.appVersion === undefined ? {} : { appVersion: config.http.appVersion }),
            session: moduleSession(() => false), configs: empty, filters: playerFilters,
            facts: moduleFacts(id, () => false),
            ...(platformConfig?.environment === undefined ? {}
                : { environment: platformConfig.environment }),
            log: supplied.log ? diagnosticLogger(supplied.log, (record) => diagnostics.publish('logs', { ...record, moduleId: id })) : logger.child(id),
            device: supplied.device ?? deviceRuntime.device,
            poller,
            ...(permissions.includes('platform')
                ? { platform: modulePlatform(platform, signal, definition.manifest, () => auth?.deviceId()) } : {}),
            ...Object.fromEntries(['http', 'storage', 'windows', 'screens', 'analytics', 'poller', 'device']
                .filter((key) => supplied[key] !== undefined)
                .map((key) => [key, supplied[key]])),
            ...ports(run),
        }, (moduleId) => getModule(moduleId));
        let runContext = context;
        const view = (hookContext) => {
            const runSignal = AbortSignal.any([hookContext.signal, run.controller.signal]);
            const { poller: hookPoller, ...rest } = hookContext;
            const viewed = createModuleContext(definition.manifest, { ...rest,
                diagnostics: diagnostics.api, signal: runSignal,
                settings: settingsOf(definition.manifest),
                bus: createScopedBus(bus, definition.manifest, { signal: runSignal }),
                device: supplied.device ?? deviceRuntime.device,
                ...ports(run),
            }, (moduleId) => getModule(moduleId));
            return hookPoller ? Object.freeze({ ...viewed, poller: scopePoller(hookPoller, runSignal) })
                : viewed;
        };
        const lifecycle = new ModuleLifecycle({ ...definition,
            init: (ctx) => {
                epochs.set(id, generation);
                run.controller.abort();
                run = { controller: new AbortController(), generation };
                runContext = view(ctx);
                return definition.init(runContext);
            },
            start: async (ctx) => {
                const next = starts.get(id) ?? { generation };
                if (run.controller.signal.aborted || run.generation !== next.generation) {
                    run.controller.abort();
                    run = { controller: new AbortController(), generation: next.generation };
                    runContext = view(ctx);
                }
                run.gid = next.gid;
                return definition.start?.(runContext);
            },
            stop: async (reason) => {
                try {
                    await definition.stop?.(reason);
                }
                finally {
                    run.controller.abort();
                }
            },
            dispose: async () => {
                run.controller.abort();
                if (lifecycle.state !== 'registered')
                    await definition.dispose?.();
            },
        }, context, bus, lifecycleOptions);
        return { definition, get context() { return runContext; }, controller, lifecycle,
            ...(remote ? { remote } : {}) };
    };
    for (const [index, definition] of order.entries()) {
        entries.set(definition.manifest.id, buildEntry(definition, contexts[index], false));
    }
    let state = 'created';
    let destroying;
    let rollingBack;
    const getModule = (id) => {
        const entry = entries.get(id);
        if (!entry)
            throw new SDKError('SDK_MODULE_NOT_INSTALLED', { module: id });
        if (entry.failure)
            throw new SDKError('MODULE_DEPENDENCY_FAILED', { module: id });
        if (entry.lifecycle.state !== 'started' || state !== 'ready'
            || entry.generation !== generation) {
            throw new SDKError('MODULE_NOT_ACTIVE', { module: id });
        }
        return entry.api;
    };
    const cleanup = (entry) => {
        entry.cleanup ??= Promise.resolve().then(async () => {
            if (entry.lifecycle.state === 'started') {
                try {
                    await entry.lifecycle.stop('unload');
                }
                catch { }
            }
            try {
                await entry.lifecycle.dispose();
            }
            finally {
                entry.controller.abort();
            }
        });
        return entry.cleanup;
    };
    const ordered = () => {
        const list = container.order().map((definition) => entries.get(definition.manifest.id))
            .filter((entry) => entry !== undefined);
        const seen = new Set(list);
        return [...list, ...[...entries.values()].filter((entry) => !seen.has(entry))];
    };
    const modules = () => Object.freeze(ordered().map((entry) => {
        const { manifest } = entry.definition;
        return Object.freeze({ id: manifest.id, version: manifest.version, kind: manifest.kind,
            state: entry.failure ? 'failed' : entry.lifecycle.state,
            source: entry.remote ? 'remote' : 'local', manifest });
    }));
    const loadFailures = new Map();
    const moduleStatuses = () => {
        const states = new Map(ordered().map(entry => [
            entry.definition.manifest.id, { id: entry.definition.manifest.id, status: entry.failure ? 'failed' : 'working' }
        ]));
        for (const ref of lock.modules) {
            const failure = loadFailures.get(ref.id);
            if (failure)
                states.set(ref.id, { id: ref.id, status: failure.source === 'remote'
                        && ['SDK_MODULE_LOAD_FAILED', 'SDK_MODULE_TIMEOUT'].includes(failure.code) ? 'pending-network' : 'failed' });
        }
        return Object.freeze([...states.values()].map(value => Object.freeze(value)));
    };
    const skinSelection = createSkinSelection({ port: config.skin, bus,
        active: () => state === 'ready' });
    const loads = new AbortController();
    const rollback = async () => {
        loads.abort();
        skinSelection.dispose();
        portal?.dispose();
        stopTriggers();
        appLifecycle.dispose();
        poller.dispose();
        auth?.dispose();
        configs?.dispose();
        unsubscribeConfigs();
        offClock();
        closed = true;
        analytics.dispose();
        dropContext();
        engine.dispose();
        l10n.dispose();
        for (const entry of ordered().reverse()) {
            try {
                await cleanup(entry);
            }
            catch { }
        }
        deviceRuntime.dispose();
    };
    const failed = (payload) => {
        if (payload.id)
            loadFailures.set(payload.id, payload);
        bus.emit(SDK_MODULE_FAILED, Object.freeze({ ...payload }));
    };
    const fail = async (entry, cause) => {
        const { id, version, critical } = entry.definition.manifest;
        if (composition && !composition.added.includes(id) && bundledIds.has(id)) {
            composition.touched.add(id);
        }
        entry.failure = new SDKError(cause instanceof SDKError ? cause.code : 'SDK_MODULE_STEP_FAILED', {
            module: id, cause,
        });
        failed({ id, version, source: entry.remote ? 'remote' : 'local', code: entry.failure.code });
        entry.settingsInvalid = entry.failure.code === 'SDK_MODULE_SETTINGS_INVALID'
            || (entry.failure.code === 'MODULE_DEPENDENCY_FAILED'
                && Object.keys(entry.definition.manifest.requires ?? {})
                    .some(dependency => entries.get(dependency)?.settingsInvalid));
        if (critical && !entry.settingsInvalid)
            throw entry.failure;
        try {
            await cleanup(entry);
        }
        catch { }
    };
    const dependencyFailure = (entry) => {
        const unavailable = Object.keys(entry.definition.manifest.requires ?? {})
            .some((id) => !entries.has(id) || entries.get(id)?.failure !== undefined);
        return unavailable ? new SDKError('MODULE_DEPENDENCY_FAILED', {
            module: entry.definition.manifest.id,
        }) : undefined;
    };
    const createLoader = (owner) => (endpoints ? createModuleLoader({
        cdn: endpoints.cdn, coreVersion: VERSION, build, modules: lock.modules,
        localVersions: Object.fromEntries(bundled.map(({ manifest }) => [manifest.id, manifest.version])),
        onFallback: event => bus.emit('sdk:module:fallback', event),
        ...(loaderOptions?.localBase ? { localBase: loaderOptions.localBase } : {}),
        ...(loaderOptions?.indexTimeoutMs !== undefined
            ? { indexTimeoutMs: loaderOptions.indexTimeoutMs } : {}),
        ...(lock.adapter ? { adapter: lock.adapter } : {}),
        ...(loaderOptions?.fetch ? { fetch: loaderOptions.fetch } : {}),
        ...(loaderOptions?.import ? { import: loaderOptions.import } : {}),
        ...(loaderOptions?.timeoutMs ? { timeoutMs: loaderOptions.timeoutMs } : {}),
        ...(storage && owner !== undefined
            ? { cache: loaderCache(storage.scope(owner, LOADER_SCOPE)) } : {}),
    }) : undefined);
    const remoteIds = new Set();
    const conflicts = (id) => {
        const ids = [...bundledIds, ...remoteIds];
        return id === 'ui' || id.split('.')[0] === 'diagnostics' || id.split('.').some((part) => reserved.has(part))
            || (id.startsWith('ui.') && uiCoreNames.has(id.slice(3).split('.')[0]))
            || ids.some((other) => other === id || other.startsWith(`${id}.`) || id.startsWith(`${other}.`));
    };
    let composed;
    let sessionLoader;
    let demandRefs = new Map();
    let demandLocal = new Map();
    const demandLoads = new Map();
    const demandFailures = new Map();
    const restartingDemand = new Set();
    let composition;
    const compose = () => {
        composed ??= (async () => {
            const epoch = generation;
            const signal = AbortSignal.any([loads.signal, scope.signal]);
            const loader = sessionLoader ??= createLoader(gid());
            try {
                await loader?.prepare(signal);
            }
            catch {
                if (destroying || rollingBack || epoch !== generation || signal.aborted)
                    return;
            }
            const changes = { added: [], touched: new Set() };
            composition = changes;
            const plan = planModules({ local: bundled, lock });
            const kept = new Set(plan.local.map(definition => definition.manifest.id));
            const refs = new Map(plan.remote.map((ref) => [ref.id, ref]));
            demandRefs = refs;
            demandLocal = new Map(plan.local.map((definition) => [definition.manifest.id, definition]));
            const loaded = new Map();
            const known = (id) => [loaded.get(id),
                ...(kept.has(id) ? bundled.filter((definition) => definition.manifest.id === id) : [])]
                .find((definition) => definition !== undefined);
            const wanted = new Set([...plan.local, ...plan.remote]
                .filter((item) => ('manifest' in item ? item.manifest.load : item.load) === 'eager')
                .map((item) => ('manifest' in item ? item.manifest.id : item.id)));
            for (const id of restartingDemand) {
                if (kept.has(id) || refs.has(id))
                    wanted.add(id);
            }
            active.clear();
            for (const id of wanted)
                active.add(id);
            const tried = new Set();
            for (;;) {
                for (let changed = true; changed;) {
                    changed = false;
                    for (const id of [...wanted]) {
                        for (const dependency of Object.keys(known(id)?.manifest.requires ?? {})) {
                            if (wanted.has(dependency))
                                continue;
                            wanted.add(dependency);
                            changed = true;
                        }
                    }
                }
                const batch = [...wanted].filter((id) => refs.has(id) && !tried.has(id));
                if (batch.length === 0)
                    break;
                await Promise.all(batch.map(async (id) => {
                    tried.add(id);
                    const ref = refs.get(id);
                    try {
                        if (!loader)
                            throw new SDKError('SDK_MODULE_LOAD_FAILED', { module: id });
                        loaded.set(id, await loader.load(ref, signal));
                    }
                    catch (cause) {
                        failed({ id, version: ref.version, source: ref.source,
                            code: cause instanceof SDKError ? cause.code : 'SDK_MODULE_LOAD_FAILED' });
                    }
                }));
                if (destroying || rollingBack || epoch !== generation)
                    return;
            }
            loader?.retain([...refs.values()]);
            if (destroying || rollingBack || epoch !== generation)
                return;
            const candidates = [...loaded.values(), ...plan.local.filter((definition) => !entries.has(definition.manifest.id)
                    && wanted.has(definition.manifest.id))];
            for (let progress = true; progress && candidates.length > 0;) {
                progress = false;
                for (const definition of [...candidates]) {
                    const { id, version, requires = {} } = definition.manifest;
                    const missing = Object.keys(requires).filter((dependency) => !registry.has(dependency));
                    const blocked = missing.some((dependency) => candidates.some((other) => other.manifest.id === dependency));
                    if (blocked)
                        continue;
                    candidates.splice(candidates.indexOf(definition), 1);
                    progress = true;
                    const remote = loaded.has(id) && refs.get(id)?.source === 'remote';
                    try {
                        if (missing.length > 0)
                            throw new SDKError('MODULE_DEPENDENCY_FAILED', { module: id });
                        if (!bundledIds.has(id) && conflicts(id)) {
                            throw new SDKError('SDK_MODULE_DUPLICATE', { module: id });
                        }
                        registry.register(definition);
                        try {
                            container.add(definition);
                        }
                        catch (cause) {
                            registry.unregister(id);
                            throw cause;
                        }
                        const entry = buildEntry(definition, hostContext(definition), remote);
                        entries.delete(id);
                        entries.set(id, entry);
                        changes.added.push(id);
                        if (!bundledIds.has(id))
                            remoteIds.add(id);
                        active.add(id);
                    }
                    catch (cause) {
                        failed({ id, version, source: refs.get(id)?.source ?? 'local',
                            code: cause instanceof SDKError ? cause.code : 'MODULE_DEPENDENCY_FAILED' });
                    }
                }
            }
            for (const definition of candidates) {
                const { id, version } = definition.manifest;
                failed({ id, version, source: refs.get(id)?.source ?? 'local',
                    code: 'MODULE_DEPENDENCY_FAILED' });
            }
            for (const definition of [...container.order()].reverse()) {
                const { id } = definition.manifest;
                if (!active.has(id) || availableModule(definition.manifest))
                    continue;
                if (container.order().some((other) => active.has(other.manifest.id)
                    && Object.hasOwn(other.manifest.requires ?? {}, id)))
                    continue;
                active.delete(id);
            }
            for (const definition of [...container.order()].reverse()) {
                if (active.has(definition.manifest.id)) {
                    for (const id of Object.keys(definition.manifest.requires ?? {}))
                        active.add(id);
                }
            }
            for (const entry of ordered()) {
                if (entry.failure || entry.cleanup)
                    continue;
                const { id, requires = {} } = entry.definition.manifest;
                const broken = Object.entries(requires).find(([dependency, range]) => {
                    const other = entries.get(dependency);
                    const actualVersion = other?.remote
                        ? other.definition.manifest.version
                        : lock.modules.find((item) => item.id === dependency)?.version
                            ?? other?.definition.manifest.version;
                    return !other || other.failure || !container.order()
                        .some((definition) => definition.manifest.id === dependency)
                        || !satisfies(actualVersion ?? '', range);
                });
                if (!broken)
                    continue;
                const other = entries.get(broken[0]);
                const code = other && !other.failure ? 'SDK_MODULE_INCOMPATIBLE'
                    : 'MODULE_DEPENDENCY_FAILED';
                suspended.delete(entry);
                await fail(entry, new SDKError(code, { module: id }));
            }
            const effective = [...entries.values()].filter((entry) => !entry.failure && !entry.cleanup);
            const manifests = effective.map((entry) => {
                const { manifest } = entry.definition;
                const ref = lock.modules.find((item) => item.id === manifest.id);
                const source = localModules.find((definition) => definition.manifest.id === manifest.id);
                return { ...manifest,
                    load: entry.remote ? manifest.load : source?.manifest.load ?? manifest.load,
                    package: ref?.package ?? manifest.id,
                    version: entry.remote ? manifest.version : ref?.version ?? manifest.version };
            });
            const compatibility = checkModuleComposition(manifests.map((manifest) => {
                const ref = lock.modules.find((item) => item.id === manifest.id);
                return { id: manifest.id, package: manifest.package, version: manifest.version,
                    load: ref?.load ?? manifest.load,
                    onEvent: ref?.onEvent ?? manifest.onEvent, onRoute: ref?.onRoute ?? manifest.onRoute,
                    source: ref?.source ?? (entries.get(manifest.id)?.remote ? 'remote' : 'local') };
            }), manifests, { coreVersion: VERSION, build,
                ...(lock.adapter ? { adapter: lock.adapter } : {}) });
            for (const problem of compatibility) {
                const entry = entries.get(problem.id);
                if (!entry || entry.failure)
                    continue;
                const code = problem.code ?? (/required module|dependency cycle/.test(problem.reason)
                    ? 'MODULE_DEPENDENCY_FAILED' : 'SDK_MODULE_INCOMPATIBLE');
                suspended.delete(entry);
                await fail(entry, new SDKError(code, { module: problem.id }));
            }
            for (const entry of ordered()) {
                if (!active.has(entry.definition.manifest.id) || entry.failure
                    || entry.lifecycle.state !== 'registered')
                    continue;
                try {
                    const error = dependencyFailure(entry);
                    if (error)
                        throw error;
                    entry.lifecycle.resolve();
                    await entry.lifecycle.init();
                    suspended.add(entry);
                }
                catch (cause) {
                    await fail(entry, cause);
                }
            }
            if (epoch === generation)
                restartingDemand.clear();
        })();
        return composed;
    };
    const loadModule = (id) => {
        if (state !== 'ready' || reloading || closed) {
            return Promise.reject(new SDKError('MODULE_NOT_ACTIVE', { module: id }));
        }
        const epoch = generation;
        const failedLoad = demandFailures.get(id);
        if (failedLoad && clock.view.now() - failedLoad.at < 30_000) {
            return Promise.reject(failedLoad.cause);
        }
        const current = demandLoads.get(id);
        if (current)
            return current;
        const task = serial(async () => {
            const signal = AbortSignal.any([loads.signal, scope.signal]);
            const check = () => {
                signal.throwIfAborted();
                if (state !== 'ready' || epoch !== generation || reloading || closed) {
                    throw new SDKError('MODULE_NOT_ACTIVE', { module: id });
                }
            };
            check();
            await compose();
            check();
            const existing = entries.get(id);
            if (existing?.lifecycle.state === 'started' && !existing.failure)
                return getModule(id);
            const ref = demandRefs.get(id);
            const local = demandLocal.get(id);
            if (!existing && !ref && !local) {
                throw new SDKError('SDK_MODULE_NOT_INSTALLED', { module: id });
            }
            if ((ref?.load ?? local?.manifest.load ?? existing?.definition.manifest.load) === 'eager') {
                throw new SDKError('MODULE_NOT_ACTIVE', { module: id });
            }
            const loader = sessionLoader ??= createLoader(gid());
            const visiting = new Set();
            const needed = new Set();
            let gated = false;
            const prepare = async (module) => {
                check();
                if (visiting.has(module))
                    throw new SDKError('MODULE_DEPENDENCY_FAILED', { module });
                let entry = entries.get(module);
                const remote = demandRefs.get(module);
                visiting.add(module);
                try {
                    const localDependency = demandLocal.get(module);
                    const broken = entry !== undefined
                        && (entry.failure !== undefined || entry.cleanup !== undefined);
                    const fresh = !entry || (broken && module === id);
                    if (fresh && ((!remote || !loader) && !localDependency)) {
                        throw new SDKError('SDK_MODULE_NOT_INSTALLED', { module });
                    }
                    if (!fresh && (entry.failure || entry.cleanup)) {
                        throw new SDKError('MODULE_DEPENDENCY_FAILED', { module });
                    }
                    let definition = entry?.definition;
                    let fromRemote = false;
                    if (fresh && remote && loader) {
                        try {
                            definition = await loader.load(remote, signal);
                            fromRemote = remote.source === 'remote';
                        }
                        catch (cause) {
                            if (!entry || entry.failure)
                                throw cause;
                            definition = entry.definition;
                        }
                    }
                    else if (fresh)
                        definition = localDependency;
                    if (!definition)
                        throw new SDKError('SDK_MODULE_NOT_INSTALLED', { module });
                    check();
                    if (module === id && !availableModule(definition.manifest)) {
                        gated = true;
                        throw new SDKError('MODULE_NOT_ACTIVE', { module });
                    }
                    for (const [dependency, range] of Object.entries(definition.manifest.requires ?? {})) {
                        let other;
                        try {
                            other = await prepare(dependency);
                        }
                        catch {
                            throw new SDKError('MODULE_DEPENDENCY_FAILED', { module });
                        }
                        const actualVersion = other.remote ? other.definition.manifest.version
                            : lock.modules.find((item) => item.id === dependency)?.version
                                ?? other.definition.manifest.version;
                        if (!satisfies(actualVersion, range)) {
                            throw new SDKError('SDK_MODULE_INCOMPATIBLE', { module });
                        }
                    }
                    check();
                    if (fresh) {
                        if (entry) {
                            await cleanup(entry);
                            container.remove(module);
                            registry.unregister(module);
                            remoteIds.delete(module);
                        }
                        check();
                        if (!bundledIds.has(module) && conflicts(module)) {
                            throw new SDKError('SDK_MODULE_DUPLICATE', { module });
                        }
                        registry.register(definition);
                        try {
                            container.add(definition);
                        }
                        catch (cause) {
                            registry.unregister(module);
                            throw cause;
                        }
                        entry = buildEntry(definition, hostContext(definition), fromRemote);
                        entries.set(module, entry);
                        if (!composition.added.includes(module))
                            composition.added.push(module);
                        if (!bundledIds.has(module))
                            remoteIds.add(module);
                    }
                    needed.add(module);
                    return entry;
                }
                catch (cause) {
                    if (epoch === generation && !closed && !signal.aborted && !(gated && module === id)) {
                        failed({ id: module, ...(remote ? { version: remote.version } : {}),
                            source: remote?.source ?? 'local',
                            code: cause instanceof SDKError ? cause.code : 'SDK_MODULE_LOAD_FAILED' });
                    }
                    throw cause;
                }
                finally {
                    visiting.delete(module);
                }
            };
            await prepare(id);
            for (const entry of ordered()) {
                const module = entry.definition.manifest.id;
                if (!needed.has(module) || entry.lifecycle.state === 'started')
                    continue;
                check();
                try {
                    const error = dependencyFailure(entry);
                    if (error)
                        throw error;
                    if (entry.lifecycle.state === 'registered')
                        entry.lifecycle.resolve();
                    if (entry.lifecycle.state === 'resolved')
                        await entry.lifecycle.init();
                    check();
                    active.add(module);
                    suspended.delete(entry);
                    await start(entry);
                    loadFailures.delete(module);
                    check();
                }
                catch (cause) {
                    if (epoch === generation && !closed && !signal.aborted) {
                        try {
                            await fail(entry, cause);
                        }
                        catch (critical) {
                            state = 'failed';
                            rollingBack ??= Promise.resolve().then(rollback);
                            await rollingBack;
                            throw critical;
                        }
                    }
                    throw cause;
                }
            }
            loader?.retain([...demandRefs.values()]);
            return getModule(id);
        });
        void task.then(() => demandFailures.delete(id), cause => {
            if (epoch === generation && !closed)
                demandFailures.set(id, { at: clock.view.now(), cause });
        });
        demandLoads.set(id, task);
        void task.finally(() => { if (demandLoads.get(id) === task)
            demandLoads.delete(id); })
            .catch(() => undefined);
        return task;
    };
    const triggerDisposers = [];
    let currentRoute;
    let fullscreenPopup = false;
    const routeModules = new Map();
    const windowTriggerDisposers = [];
    const stopWindowTriggers = () => {
        for (const dispose of windowTriggerDisposers.splice(0))
            dispose();
    };
    const armWindowTriggers = () => {
        stopWindowTriggers();
        if (state !== 'ready' || reloading || closed)
            return;
        for (const name of triggerEngine.events()) {
            windowTriggerDisposers.push(bus.on(name, (payload) => {
                if (state !== 'ready' || reloading || closed)
                    return;
                triggerEngine.handle(name, payload).catch((error) => {
                    bus.emit('sdk:ui:trigger-failed', { event: name,
                        code: error instanceof SDKError ? error.code : 'TRIGGER_ACTION_FAILED' });
                });
            }));
        }
    };
    const stopTriggers = () => {
        for (const dispose of triggerDisposers.splice(0))
            dispose();
        stopWindowTriggers();
        routeModules.clear();
    };
    const triggerLoad = (id) => {
        if (state !== 'ready' || reloading || closed)
            return;
        void loadModule(id).catch(() => undefined);
    };
    const triggerRoute = (route) => {
        for (const id of routeModules.get(route) ?? [])
            triggerLoad(id);
    };
    const armTriggers = () => {
        stopTriggers();
        if (state !== 'ready' || reloading || closed)
            return;
        armWindowTriggers();
        const epoch = generation;
        const policies = new Map();
        for (const definition of bundled)
            policies.set(definition.manifest.id, definition.manifest);
        for (const ref of lock.modules)
            policies.set(ref.id, ref);
        const deferred = [];
        for (const [id, policy] of policies) {
            if (policy.load === 'deferred')
                deferred.push(id);
            if (policy.load === 'on-event' && policy.onEvent) {
                triggerDisposers.push(bus.on(policy.onEvent, () => triggerLoad(id)));
            }
            if (policy.load === 'on-route' && policy.onRoute) {
                const ids = routeModules.get(policy.onRoute) ?? [];
                ids.push(id);
                routeModules.set(policy.onRoute, ids);
            }
        }
        if (currentRoute !== undefined)
            triggerRoute(currentRoute);
        if (deferred.length === 0)
            return;
        let cancelled = false;
        let frame;
        let idle;
        let timer;
        const run = () => {
            if (cancelled || epoch !== generation)
                return;
            cancelled = true;
            if (frame !== undefined)
                globalThis.cancelAnimationFrame(frame);
            if (idle !== undefined)
                globalThis.cancelIdleCallback(idle);
            if (timer !== undefined)
                clearTimeout(timer);
            if (deadline !== undefined)
                clearTimeout(deadline);
            for (const id of deferred)
                triggerLoad(id);
        };
        const afterFrame = () => {
            if (cancelled)
                return;
            if (typeof globalThis.requestIdleCallback === 'function') {
                idle = globalThis.requestIdleCallback(run, { timeout: 1000 });
            }
            else
                timer = setTimeout(run, 0);
        };
        const deadline = setTimeout(run, 1000);
        if (typeof globalThis.requestAnimationFrame === 'function') {
            frame = globalThis.requestAnimationFrame(afterFrame);
        }
        else {
            timer = setTimeout(afterFrame, 0);
        }
        triggerDisposers.push(() => {
            cancelled = true;
            if (frame !== undefined)
                globalThis.cancelAnimationFrame(frame);
            if (idle !== undefined)
                globalThis.cancelIdleCallback(idle);
            if (timer !== undefined)
                clearTimeout(timer);
            if (deadline !== undefined)
                clearTimeout(deadline);
        });
    };
    const decompose = async () => {
        realtimeSession = undefined;
        realtimeOpen = false;
        stopTriggers();
        const last = composition;
        composition = undefined;
        composed = undefined;
        sessionLoader = undefined;
        loadFailures.clear();
        sessionSettings.clear();
        moduleOverrides = {};
        demandRefs.clear();
        demandLocal.clear();
        demandLoads.clear();
        demandFailures.clear();
        for (const id of active) {
            if (entries.get(id)?.definition.manifest.load === 'on-demand')
                restartingDemand.add(id);
        }
        active.clear();
        for (const id of baseline)
            active.add(id);
        if (!last)
            return;
        for (const id of [...last.added].reverse()) {
            const entry = entries.get(id);
            container.remove(id);
            registry.unregister(id);
            remoteIds.delete(id);
            if (!entry)
                continue;
            entries.delete(id);
            suspended.delete(entry);
            try {
                await cleanup(entry);
            }
            catch { }
        }
        for (const definition of order) {
            const { id, version } = definition.manifest;
            if (!last.touched.has(id))
                continue;
            if (destroying || rollingBack)
                return;
            const previous = entries.get(id);
            if (previous) {
                suspended.delete(previous);
                try {
                    await cleanup(previous);
                }
                catch { }
            }
            container.remove(id);
            registry.unregister(id);
            let entry;
            try {
                registry.register(definition);
                container.add(definition);
                entry = buildEntry(definition, hostContext(definition), false);
            }
            catch (cause) {
                registry.unregister(id);
                failed({ id, version, source: 'local',
                    code: cause instanceof SDKError ? cause.code : 'MODULE_DEPENDENCY_FAILED' });
                continue;
            }
            entries.delete(id);
            entries.set(id, entry);
        }
    };
    const coreReady = () => Object.freeze({
        modules: Object.freeze([...entries.keys()].filter((id) => entries.get(id)?.lifecycle.state === 'started')),
        failed: Object.freeze([...entries.keys()].filter((id) => entries.get(id)?.failure)),
    });
    const start = async (entry) => {
        const error = dependencyFailure(entry);
        if (error)
            throw error;
        const { id } = entry.definition.manifest;
        const current = gid();
        starts.set(id, { generation, ...(current === undefined ? {} : { gid: current }) });
        entry.generation = generation;
        epochs.set(id, generation);
        entry.starting = true;
        try {
            await entry.lifecycle.start();
        }
        finally {
            entry.starting = false;
        }
        entry.api = entry.definition.api(entry.context);
    };
    let portalAuthJob;
    const boot = async () => {
        if (state !== 'created')
            throw new SDKError('SDK_BOOT_STATE_INVALID');
        state = 'booting';
        try {
            if (!auth) {
                for (const entry of entries.values()) {
                    if (!active.has(entry.definition.manifest.id))
                        continue;
                    try {
                        const error = dependencyFailure(entry);
                        if (error)
                            throw error;
                        entry.lifecycle.resolve();
                        await entry.lifecycle.init();
                    }
                    catch (cause) {
                        await fail(entry, cause);
                    }
                }
            }
            await platformReady(platform, platformTimeout);
            await portal?.start();
            appLifecycle.start();
            poller.start();
            deviceRuntime.start();
            bus.emit('sdk:platform:ready', platformView);
            try {
                deviceStorage?.removeItem(LEGACY_LOADER_KEY);
            }
            catch { }
            await auth?.api.init().catch(async (error) => {
                await refused(error);
                throw error;
            });
            await portalAuthJob;
            await serial(async () => {
                const current = gid();
                const epoch = generation;
                if (auth && current === undefined) {
                    reloading = true;
                    let signedOut = false;
                    try {
                        signedOut = deviceStorage?.getItem('auth:session') === null;
                    }
                    catch { }
                    if (signedOut)
                        await purge(undefined, undefined);
                }
                if (current !== undefined && !reloading) {
                    await purge(undefined, current);
                    if (unsent().has(current))
                        remember(current, undefined);
                    await loadConfigs();
                }
                await l10n.start();
                if (!reloading)
                    await compose();
                for (const entry of ordered()) {
                    const { id } = entry.definition.manifest;
                    if (entry.failure || !active.has(id))
                        continue;
                    if (reloading || epoch !== generation) {
                        suspended.add(entry);
                        continue;
                    }
                    suspended.delete(entry);
                    try {
                        await start(entry);
                    }
                    catch (cause) {
                        await fail(entry, cause);
                    }
                }
                state = 'ready';
                armTriggers();
                bus.emit(SDK_CORE_READY, coreReady());
                portal?.ready();
            });
        }
        catch (cause) {
            portal?.error();
            rollingBack = Promise.resolve().then(rollback);
            await rollingBack;
            if (!destroying)
                state = 'failed';
            throw cause;
        }
    };
    const destroy = () => {
        if (state === 'booting' && !rollingBack) {
            return Promise.reject(new SDKError('SDK_BOOT_STATE_INVALID'));
        }
        if (destroying)
            return destroying;
        state = 'destroying';
        diagnostics.dispose();
        uiWindows.resetSession();
        triggerEngine.resetSession();
        destroying = Promise.resolve().then(() => rollingBack ?? rollback())
            .then(() => { state = 'destroyed'; });
        return destroying;
    };
    const resume = () => serial(async () => {
        const current = gid();
        if (state !== 'ready' || current === undefined || !reloading)
            return;
        reloading = false;
        const epoch = generation;
        await purge(undefined, current);
        if (unsent().has(current))
            remember(current, undefined);
        await loadConfigs();
        await l10n.idle?.();
        await compose();
        for (const entry of ordered()) {
            if (epoch !== generation)
                break;
            if (!suspended.delete(entry))
                continue;
            if (!active.has(entry.definition.manifest.id) || entry.failure)
                continue;
            try {
                await start(entry);
            }
            catch (cause) {
                await fail(entry, cause).catch(() => undefined);
            }
        }
        if (epoch === generation) {
            armTriggers();
            bus.emit(SDK_CORE_READY, coreReady());
            if (playerChange && Number(current) !== playerChange.previousGid) {
                const changed = playerChange;
                playerChange = undefined;
                bus.emit(AUTH_PLAYER_CHANGED, { ...changed, gid: Number(current) });
            }
        }
    }).catch(() => undefined);
    const session = (run) => async (...args) => {
        let value;
        try {
            value = await run(...args);
        }
        catch (error) {
            await refused(error);
            throw error;
        }
        await resume();
        return value;
    };
    const player = auth?.api;
    function authCode(request) {
        if (request && typeof request === 'object' && 'audience' in request
            && request.audience === 'portal')
            return player.code(request);
        return session(player.code)(request);
    }
    let portalAuthRevision = 0;
    portal?.listen({
        auth: () => {
            const revision = ++portalAuthRevision;
            portalAuthJob = player?.logout().then(async () => {
                if (closed || revision !== portalAuthRevision)
                    return;
                await player.init();
                if (!closed && revision === portalAuthRevision)
                    await resume();
            }).catch(refused);
        },
        locale: () => { void l10n.refresh().catch(() => undefined); },
        visibility: (hidden) => appLifecycle.visibility(hidden),
    });
    const sdk = Object.assign(Object.create(null), {
        debug: Object.freeze({ bus: bus.debug }),
        bus: Object.freeze({ on: bus.on, once: bus.once, off: bus.off, replay: bus.replay }),
        platform: platformView, device: deviceRuntime.device, endpoints, boot, destroy,
        time: clock.view, analytics: analytics.api,
        ...(portal ? { portal: portal.ui } : {}),
        locale: Object.freeze({
            get: () => l10n.view({ kind: 'game' }).locale(),
            on: (event, listener) => {
                if (event !== 'changed' || typeof listener !== 'function') {
                    throw new SDKError('VALIDATION_FAILED', { module: 'l10n' });
                }
                return bus.on('l10n:locale:changed', ({ to }) => listener(to));
            },
        }),
        getModule, loadModule,
        modules: Object.freeze(Object.assign(modules, {
            set: skinSelection.set,
            register: (module, options) => {
                if (!modules().some((entry) => entry.id === module)) {
                    throw new SDKError('SDK_MODULE_NOT_INSTALLED', { module });
                }
                return uiWindows.register(module, options.windows);
            },
        })), moduleStatuses,
        ...(player ? { auth: Object.freeze({
                get session() { return player.session; },
                get portalSession() { return player.portalSession; },
                restorePortal: player.restorePortal,
                refreshPortal: player.refreshPortal,
                get pending() { return player.pending; },
                init: session(() => player.init()),
                refresh: session(() => player.refresh()),
                logout: async () => {
                    const owner = gid();
                    try {
                        await player.logout();
                    }
                    finally {
                        await serial(async () => {
                            await auth?.idle();
                            await purge(owner, gid());
                        }).catch(() => undefined);
                    }
                },
                getAccount: player.getAccount, changeNickname: player.changeNickname,
                checkMyNicknameAvailability: player.checkMyNicknameAvailability,
                suggestNickname: player.suggestNickname, getGames: player.getGames,
                getProviderConfig: player.getProviderConfig,
                availableProviders: player.availableProviders,
                signinWithProvider: session(player.signinWithProvider),
                linkProvider: player.linkProvider,
                cancelProvider: player.cancelProvider,
                signin: player.signin,
                code: authCode,
                confirm: session(player.confirm),
                resume: session(player.resume),
                savedEmail: player.savedEmail, forgetSaved: player.forgetSaved,
                onAccountChanging: player.onAccountChanging,
                discard: player.discard, links: player.links, link: player.link, unlink: player.unlink,
            }) } : {}),
        assets: createAssets(platformConfig?.assets?.cdnBase, platformConfig?.assets?.allowedHosts),
        ...(configs ? { configs: publicConfigs(configs) } : {}),
        l10n: Object.freeze({ ...l10n.view({ kind: 'game' }),
            refresh: () => l10n.refresh() }),
        context: Object.freeze({
            get: (name) => contextStore().context.get(name),
            set: (params) => contextStore().context.set(params),
            snapshot: () => contextStore().context.snapshot(),
            on: (listener) => bus.on(CONTEXT_CHANGED, listener),
        }),
        filters: playerFilters,
        ui: Object.assign(Object.create(null), {
            usePlacements: uiWindows.usePlacements,
            useSkinScopes: uiWindows.useSkinScopes,
            canShow: async (name, context) => {
                if (typeof name !== 'string' || !name || (context !== undefined && !record(context))) {
                    throw new SDKError('VALIDATION_FAILED', { module: 'ui' });
                }
                return state === 'ready' && !reloading && !closed
                    ? uiWindows.canShow(name, context) : false;
            },
            show: (name, params, options) => {
                if (state !== 'ready' || reloading || closed) {
                    throw new SDKError('MODULE_NOT_ACTIVE', { module: 'ui' });
                }
                return uiWindows.show(name, params, options);
            },
            elementAction: (element, payload) => {
                if (state !== 'ready' || reloading || closed)
                    return;
                if (typeof element !== 'string' || !element)
                    throw new SDKError('VALIDATION_FAILED');
                bus.emit('ui:element:action', payload ? { element, payload } : { element });
            },
        }),
        uiState: Object.freeze({
            setScreen(id, kind) {
                if (closed)
                    throw new SDKError('MODULE_NOT_ACTIVE', { module: 'ui' });
                currentRoute = id;
                contextStore();
                provide('screens', { 'screen.current': id, 'screen.kind': kind });
                engine.flush();
                triggerRoute(id);
            },
            setFullscreenPopup(active) {
                if (closed)
                    throw new SDKError('MODULE_NOT_ACTIVE', { module: 'ui' });
                if (typeof active !== 'boolean')
                    throw new SDKError('VALIDATION_FAILED', { module: 'ui' });
                if (active === fullscreenPopup)
                    return;
                fullscreenPopup = active;
                bus.emit(UI_FULLSCREEN_CHANGED, { active });
            },
        }),
    });
    Object.defineProperty(sdk, 'state', { enumerable: true, get: () => state });
    const namespaces = new Set();
    namespaces.add(sdk['ui']);
    for (const id of bundledIds) {
        const parts = id.split('.');
        const leaf = parts.pop();
        let namespace = sdk;
        for (const part of parts) {
            if (namespace[part] === undefined) {
                namespace[part] = Object.create(null);
                namespaces.add(namespace[part]);
            }
            namespace = namespace[part];
        }
        Object.defineProperty(namespace, leaf, { enumerable: true, get: () => getModule(id) });
    }
    const views = new Map();
    const view = (target, prefix) => {
        for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(target))) {
            if ('value' in descriptor && namespaces.has(descriptor.value)) {
                target[key] = view(descriptor.value, `${prefix}${key}.`);
            }
        }
        return new Proxy(Object.freeze(target), {
            get(object, key, receiver) {
                if (typeof key === 'symbol' || Object.hasOwn(object, key)) {
                    return Reflect.get(object, key, receiver);
                }
                const path = `${prefix}${key}`;
                if (remoteIds.has(path))
                    return getModule(path);
                if (![...remoteIds].some((id) => id.startsWith(`${path}.`)))
                    return undefined;
                let child = views.get(path);
                if (!child) {
                    child = view(Object.create(null), `${path}.`);
                    views.set(path, child);
                }
                return child;
            },
        });
    };
    if (player && sdk.auth)
        bindPortalSession(sdk.auth, () => readPortalSession(player));
    return view(sdk, '');
}
function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function parseL10nOptions(value) {
    if (value === undefined)
        return { defaultLocale: 'en' };
    if (!record(value))
        invalid();
    const { defaultLocale = 'en', supported, refresh, applyUpdates, readyTimeoutMs } = value;
    const locale = (tag) => typeof tag === 'string' && tag.length <= 64
        && canonicalLocale(tag) !== undefined;
    if (!locale(defaultLocale)
        || (supported !== undefined && (!Array.isArray(supported) || supported.length > 200
            || !supported.every(locale)))
        || (refresh !== undefined && refresh !== 'poller' && refresh !== 'start-only')
        || (applyUpdates !== undefined && applyUpdates !== 'immediate'
            && applyUpdates !== 'next-start'))
        invalid();
    if (readyTimeoutMs !== undefined)
        timeout(readyTimeoutMs);
    return {
        defaultLocale: defaultLocale,
        ...(supported === undefined ? {} : { supported: [...supported] }),
        ...(refresh === undefined ? {} : { refresh: refresh }),
        ...(applyUpdates === undefined ? {} : {
            applyUpdates: applyUpdates,
        }),
        ...(readyTimeoutMs === undefined ? {} : { readyTimeoutMs: readyTimeoutMs }),
    };
}
function l10nTransport(transport, download, signed, identity) {
    return {
        async request(spec) {
            if (spec.auth === 'none') {
                if (spec.method !== 'GET' || !/^https?:\/\//i.test(spec.url)) {
                    throw new SDKError('VALIDATION_FAILED', { module: 'l10n' });
                }
                return (download ?? fetch)(spec.url, {
                    signal: spec.signal, credentials: 'omit', referrerPolicy: 'no-referrer',
                });
            }
            if (spec.method !== 'POST' || spec.url !== '/v1/configs/fetch') {
                throw new SDKError('VALIDATION_FAILED', { module: 'l10n' });
            }
            if (!signed())
                throw new SDKError('SDK_NOT_INITIALIZED', { module: 'l10n' });
            const tag = spec.headers['If-None-Match'];
            let status = 200;
            let etag = null;
            const payload = await transport.request({
                module: 'configs', method: 'POST', path: '/v1/configs/fetch', body: spec.body,
                signal: AbortSignal.any([spec.signal, identity()]),
                ...(tag ? { ifNoneMatch: tag, acceptNotModified: true } : {}),
                onResponse(meta) { status = meta.status; etag = meta.etag; },
            });
            return {
                status,
                headers: { get: (name) => (name.toLowerCase() === 'etag' ? etag : null) },
                json: () => Promise.resolve(payload),
                body: null,
            };
        },
    };
}
function invalid(cause) {
    throw new SDKError('VALIDATION_FAILED', { message: 'Invalid SDK configuration', cause });
}
function timeout(value) {
    if (!Number.isInteger(value) || value <= 0 || value > 2_147_483_647) {
        invalid();
    }
}
async function platformReady(platform, timeoutMs) {
    let timer;
    const controller = new AbortController();
    try {
        await new Promise((resolve, reject) => {
            timer = setTimeout(() => reject(new SDKError('SDK_PLATFORM_NOT_READY')), timeoutMs);
            Promise.resolve(platform.ready({ signal: controller.signal })).then(resolve, reject);
        });
    }
    catch (cause) {
        throw new SDKError('SDK_PLATFORM_NOT_READY', { cause });
    }
    finally {
        clearTimeout(timer);
        controller.abort();
    }
}
function playerStorage(root, gid, id) {
    const scope = () => {
        const current = gid();
        if (current === undefined)
            throw new SDKError('SDK_NOT_INITIALIZED', { module: id });
        return root.scope(current, id);
    };
    return Object.freeze({
        get prefix() { return scope().prefix; },
        get: (key) => scope().get(key),
        set: (key, value) => scope().set(key, value),
        remove: (key) => scope().remove(key),
        keys: () => scope().keys(),
        clear: () => scope().clear(),
    });
}
function identityHttp(transport, live) {
    return Object.freeze({
        request(spec) {
            const signal = live();
            return transport.request({ ...spec,
                signal: spec.signal ? AbortSignal.any([spec.signal, signal]) : signal });
        },
    });
}
function loaderCache(scope) {
    return Object.freeze({
        getItem: (key) => {
            const value = scope.get(key);
            return typeof value === 'string' ? value : null;
        },
        setItem: (key, value) => scope.set(key, value),
        removeItem: (key) => scope.remove(key),
    });
}
function bootSelection(selection) {
    if (!selection)
        return {};
    const scopes = selection.scopes && !selection.scopes.includes('ui.windows')
        ? [...selection.scopes, 'ui.windows'] : selection.scopes;
    const keys = selection.keys && !selection.keys.includes('main')
        ? [...selection.keys, 'main'] : selection.keys;
    return { ...selection, ...(scopes ? { scopes } : {}), ...(keys ? { keys } : {}) };
}
function publicConfigs(configs) {
    return Object.freeze({
        init: configs.init, fetch: configs.fetch, refresh: configs.refresh,
        snapshot: configs.snapshot, getScope: configs.getScope, get: configs.get,
        resolve: configs.resolve, resolveSnapshot: configs.resolveSnapshot, dispose: configs.dispose,
    });
}
function identityConfigs(configs, current, id) {
    const later = (run) => (current() ? run()
        : Promise.reject(new SDKError('MODULE_NOT_ACTIVE', { module: id })));
    function fetch(selection, options = {}) {
        return options.ifNoneMatch !== undefined
            ? later(() => configs.fetch(selection, { ...options, ifNoneMatch: options.ifNoneMatch }))
            : later(() => configs.fetch(selection, { ...options, ifNoneMatch: undefined }));
    }
    return Object.freeze({
        init: (selection) => later(() => configs.init(selection)),
        fetch,
        resolveSnapshot: (payload) => {
            if (!current())
                throw new SDKError('MODULE_NOT_ACTIVE', { module: id });
            return configs.resolveSnapshot(payload);
        },
        refresh: () => later(() => configs.refresh()),
        resolve: (scope, key) => later(() => configs.resolve(scope, key)),
        snapshot: () => (current() ? configs.snapshot() : undefined),
        getScope: (scope) => (current() ? configs.getScope(scope) : empty),
        get: (scope, key) => (current() ? configs.get(scope, key) : undefined),
    });
}
function runServices(services, current, id) {
    const active = () => {
        if (!current())
            throw new SDKError('MODULE_NOT_ACTIVE', { module: id });
    };
    return Object.freeze({
        provide: (capability, service) => {
            active();
            services.provide(capability, service);
        },
        get: (capability) => { active(); return services.get(capability); },
        require: (capability) => { active(); return services.require(capability); },
    });
}
const CORE_PLUGINS = ['device', 'cordova-plugin-device',
    'cordova-plugin-manygames-device', 'cordova-plugin-artint-secure', 'InAppBrowser',
    'cordova-plugin-inappbrowser'];
function platformDeviceInfo(value) {
    const source = record(value) ? value : {};
    const out = {
        platform: typeof source.platform === 'string' ? source.platform : ''
    };
    for (const key of ['os', 'userAgent', 'language']) {
        if (typeof source[key] === 'string')
            out[key] = source[key];
    }
    if (typeof source.online === 'boolean')
        out.online = source.online;
    return Object.freeze(out);
}
function modulePlatform(platform, signal, manifest, deviceId) {
    const { id } = manifest;
    const subscriptions = new Set();
    const active = () => {
        if (signal.aborted)
            throw new SDKError('MODULE_NOT_ACTIVE', { module: id });
    };
    const declared = new Set(manifest.nativePlugins ?? []);
    const plugin = (name) => {
        active();
        if (typeof name !== 'string' || !declared.has(name) || CORE_PLUGINS.some((owned) => name === owned || name.startsWith(`${owned}.`))) {
            throw new SDKError('SDK_PERMISSION_DENIED', { module: id });
        }
        return name;
    };
    signal.addEventListener('abort', () => {
        for (const off of [...subscriptions]) {
            try {
                off();
            }
            catch { }
        }
    }, { once: true });
    return Object.freeze({
        id: platform.id,
        lifecycle: Object.freeze({ on: (event, handler) => {
                active();
                const unsubscribe = platform.lifecycle.on(event, () => { if (!signal.aborted)
                    handler(); });
                const off = () => { if (subscriptions.delete(off))
                    unsubscribe(); };
                subscriptions.add(off);
                return off;
            } }),
        device: Object.freeze({
            info: () => { active(); return platformDeviceInfo(platform.device.info()); },
            deviceId: async () => {
                active();
                const pending = deviceId();
                if (!pending)
                    throw new SDKError('SDK_PLATFORM_UNSUPPORTED', { module: id });
                const value = await pending;
                active();
                return value;
            },
        }),
        plugins: Object.freeze({
            has: (name) => platform.plugins.has(plugin(name)),
            get: (name) => platform.plugins.get(plugin(name)),
        }),
        openUrl: (url, mode) => { active(); return platform.openUrl(url, mode); },
    });
}

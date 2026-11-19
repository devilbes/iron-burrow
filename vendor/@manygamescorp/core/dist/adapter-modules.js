import { UI_SLOTS_CAPABILITY } from './ui-slot.js';
import { SDKError } from './error.js';
import { checkBuild, checkEngines, parseSdkLock, resolveModuleSettings } from './loader.js';
import { ModuleLifecycle } from './lifecycle.js';
import { defineModule } from './module.js';
export function createAdapterModules(options) {
    let selected;
    let pending;
    const budget = Math.max(1, Math.floor((options.lifecycle.timeouts?.start
        ?? options.lifecycle.timeoutMs ?? 10_000) / 4));
    const lifecycleOptions = { timeoutMs: budget };
    const controller = new AbortController();
    const signal = AbortSignal.any([options.signal, controller.signal]);
    const cancelled = () => signal.reason instanceof SDKError ? signal.reason
        : new SDKError('SDK_MODULE_CANCELLED', { module: options.owner.id });
    const invalid = () => {
        throw new SDKError('SDK_MODULE_MANIFEST_INVALID', { module: options.owner.id });
    };
    return Object.freeze({
        load(ref, local) {
            if (options.signal.aborted)
                return Promise.reject(new SDKError('MODULE_NOT_ACTIVE', { module: options.owner.id }));
            let checked;
            try {
                checked = parseSdkLock({ sdk: { modules: [ref] } }).modules[0];
                if (checked.load !== 'eager'
                    || (local ? checked.source !== 'local' : checked.source !== 'remote'))
                    invalid();
            }
            catch (cause) {
                return Promise.reject(cause);
            }
            const key = `${checked.id}:${checked.package}@${checked.version}:${checked.source}`;
            if (selected !== undefined && selected !== key)
                return Promise.reject(new SDKError('SDK_MODULE_DUPLICATE', { module: options.owner.id }));
            selected = key;
            if (pending)
                return pending;
            const validate = (manifest) => {
                if (manifest.id !== checked.id || manifest.version !== checked.version
                    || manifest.kind !== 'adapter' || Object.keys(manifest.requires ?? {}).length
                    || Object.keys(manifest.optional ?? {}).length || manifest.provides?.length
                    || manifest.consumes?.some(capability => capability !== UI_SLOTS_CAPABILITY
                        || !options.owner.consumes?.includes(capability)) || manifest.sdk || manifest.ui
                    || manifest.realtime
                    || manifest.events.emits.length || manifest.events.listens?.length
                    || manifest.events.handles?.length || manifest.permissions.includes('modules')
                    || manifest.permissions.some((right) => !options.owner.permissions.includes(right))
                    || manifest.nativePlugins?.some((plugin) => !options.owner.nativePlugins?.includes(plugin))) {
                    invalid();
                }
            };
            const timer = setTimeout(() => controller.abort(new SDKError('SDK_MODULE_TIMEOUT', { module: checked.id })), budget);
            pending = (async () => {
                const definition = local ? defineModule(local)
                    : await options.loader?.load(checked, signal, validate);
                if (!definition)
                    throw new SDKError('SDK_MODULE_LOAD_FAILED', { module: checked.id });
                validate(definition.manifest);
                const manifest = definition.manifest;
                checkEngines(manifest, options.coreVersion, options.adapter);
                checkBuild(manifest, options.build);
                signal.throwIfAborted();
                const context = Object.freeze({ ...options.context(manifest, signal),
                    settings: resolveModuleSettings(manifest, checked),
                });
                let runContext = context;
                const lifecycle = new ModuleLifecycle({ ...definition,
                    init(ctx) { runContext = ctx; return definition.init(ctx); },
                    async start(ctx) { runContext = ctx; await definition.start?.(ctx); },
                }, context, options.bus, lifecycleOptions);
                let disposal;
                const dispose = () => {
                    disposal ??= (async () => {
                        signal.removeEventListener('abort', aborted);
                        controller.abort(new SDKError('SDK_MODULE_CANCELLED', { module: checked.id }));
                        if (lifecycle.state === 'started') {
                            try {
                                await lifecycle.stop('unload');
                            }
                            catch { }
                        }
                        await lifecycle.dispose();
                    })();
                    return disposal;
                };
                const aborted = () => { void dispose().catch(() => undefined); };
                try {
                    lifecycle.resolve();
                    await lifecycle.init();
                    await lifecycle.start();
                    signal.throwIfAborted();
                    const api = definition.api(runContext);
                    signal.throwIfAborted();
                    signal.addEventListener('abort', aborted, { once: true });
                    return Object.freeze({ api, dispose });
                }
                catch (cause) {
                    await dispose().catch(() => undefined);
                    throw cause;
                }
            })().catch((cause) => {
                throw signal.aborted ? cancelled() : cause;
            }).finally(() => clearTimeout(timer));
            return pending;
        },
    });
}

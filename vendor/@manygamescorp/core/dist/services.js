import { createCallContext } from './context.js';
import { requestError } from './bus-payload.js';
import { SDKError } from './error.js';
export function createModuleServices(manifest, container, options) {
    const { id } = manifest;
    const consumes = new Set(manifest.consumes ?? []);
    const dependencies = new Set([
        ...Object.keys(manifest.requires ?? {}), ...Object.keys(manifest.optional ?? {}),
    ]);
    const uses = new Set(manifest.sdk?.uses ?? []);
    const cache = new Map();
    let cacheGeneration = options.generation();
    const consumerActive = () => {
        const state = options.state(id);
        if (options.signal.aborted || !options.current(id)
            || (!['resolved', 'initialized', 'started'].includes(state ?? '')
                && !(state === 'stopped' && options.starting?.(id)))) {
            throw new SDKError('MODULE_NOT_ACTIVE', { module: id });
        }
    };
    const permitted = (capability) => {
        const provider = container.provider(capability)?.manifest.id;
        if (manifest.kind === 'game' ? !consumes.has(capability) || (provider && !uses.has(provider))
            : !consumes.has(capability) && !(provider && dependencies.has(provider))) {
            throw new SDKError('SDK_PERMISSION_DENIED', { module: id });
        }
        consumerActive();
        return provider;
    };
    const active = (provider) => {
        if (!options.current(provider) || options.state(provider) !== 'started'
            || options.available?.(provider) === false) {
            throw new SDKError('MODULE_NOT_ACTIVE', { module: provider });
        }
    };
    const get = (capability) => {
        const provider = permitted(capability);
        if (provider === undefined)
            return undefined;
        active(provider);
        const service = container.get(capability);
        if (service === undefined)
            return undefined;
        const generation = options.generation();
        if (cacheGeneration !== generation) {
            cache.clear();
            cacheGeneration = generation;
        }
        let proxy = cache.get(capability);
        if (!proxy) {
            proxy = methodProxy(service, id, provider, capability, () => {
                if (options.generation() !== generation) {
                    throw new SDKError('MODULE_NOT_ACTIVE', { module: id });
                }
                permitted(capability);
                active(provider);
            }, manifest.ui?.slots);
            cache.set(capability, proxy);
        }
        return proxy;
    };
    return Object.freeze({
        provide(capability, service) {
            if (!manifest.provides?.includes(capability)) {
                throw new SDKError('SDK_PERMISSION_DENIED', { module: id });
            }
            consumerActive();
            if (!['resolved', 'initialized'].includes(options.state(id) ?? '')) {
                throw new SDKError('SDK_MODULE_STATE_INVALID', { module: id });
            }
            if (typeof service !== 'object' || service === null || Array.isArray(service)) {
                throw new SDKError('MODULE_DEPENDENCY_FAILED', { module: id });
            }
            container.provide(id, capability, service);
        },
        get,
        require(capability) {
            const service = get(capability);
            if (service === undefined)
                throw new SDKError('MODULE_DEPENDENCY_FAILED', { module: id });
            return service;
        },
    });
}
function methodProxy(service, from, provider, capability, check, uiSlots) {
    const view = Object.create(null);
    const seen = new Set(['constructor', '__proto__', 'prototype', 'then', 'toJSON']);
    for (let owner = service; owner && owner !== Object.prototype; owner = Object.getPrototypeOf(owner)) {
        for (const [name, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(owner))) {
            if (seen.has(name))
                continue;
            seen.add(name);
            const method = descriptor.value;
            if (typeof method !== 'function')
                continue;
            view[name] = (...args) => {
                check();
                const context = Object.freeze({
                    ...createCallContext({ moduleId: provider, operation: `${capability}.${name}` }), from,
                    ...(uiSlots === undefined ? {} : { uiSlots }),
                });
                try {
                    const result = Reflect.apply(method, service, [context, ...args]);
                    if (result && (typeof result === 'object' || typeof result === 'function')
                        && typeof Reflect.get(result, 'then') === 'function') {
                        return Promise.resolve(result).then((value) => { check(); return value === service ? view : value; }, (error) => { check(); throw requestError(error, provider, context.rid); });
                    }
                    return result === service ? view : result;
                }
                catch (error) {
                    throw requestError(error, provider, context.rid);
                }
            };
        }
    }
    return Object.freeze(view);
}

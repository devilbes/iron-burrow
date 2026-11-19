import { scopeDiagnostics } from './diagnostics.js';
import { SDKError } from './error.js';
import { scopePoller } from './poller.js';
import { scopeDeviceGroup } from './device.js';
import { deviceOperation, invokeDeviceOperation } from './device-operation.js';
export function createModuleContext(manifest, ports, getModule) {
    const permissions = new Set(manifest.permissions);
    const { id, kind } = manifest;
    const context = {
        sdk: scopedSdk(manifest, getModule, kind === 'sink' && ports.diagnostics ? scopeDiagnostics(ports.diagnostics, ports.signal) : undefined),
        ...(ports.realtime ? { realtime: ports.realtime } : {}),
        bus: ports.bus, session: ports.session, services: ports.services,
        configs: ports.configs, filters: ports.filters, facts: ports.facts,
        ...(ports.strings ? { strings: Object.freeze({
                ...(ports.strings.t ? { t: (key, params) => {
                        if (ports.signal.aborted)
                            throw new SDKError('MODULE_NOT_ACTIVE', { module: id });
                        return ports.strings.t(key, params);
                    } } : {}),
                ...(ports.strings.locale ? { locale: () => ports.strings.locale() } : {}),
                registerDefaults(namespace, bundles) {
                    if (ports.signal.aborted)
                        throw new SDKError('MODULE_NOT_ACTIVE', { module: id });
                    ports.strings.registerDefaults(namespace, bundles);
                },
            }) } : {}),
        log: ports.log, config: ports.config, signal: ports.signal, time: ports.time,
        settings: ports.settings ?? Object.freeze({}),
        ...(ports.appVersion === undefined ? {} : { appVersion: ports.appVersion }),
        ...(ports.environment === undefined ? {} : { environment: ports.environment }),
        ...(kind !== 'ui' && id !== 'ui' && !id.startsWith('ui.') && ports.http
            && permissions.has(`http:${ports.http.service}`) ? { http: ports.http } : {}),
        ...(permissions.has('poller') && ports.poller
            ? { poller: scopePoller(ports.poller, ports.signal, id) } : {}),
        ...Object.fromEntries(['modules', 'storage', 'windows', 'actions', 'screens', 'analytics', 'platform']
            .filter((key) => permissions.has(key)
            && ports[key] !== undefined)
            .map((key) => [key, ports[key]])),
        ...(ports.device && manifest.permissions.some((p) => p.startsWith('device:'))
            ? { device: scopedDevice(id, permissions, ports.device, ports.signal) } : {}),
    };
    return Object.freeze(context);
}
function scopedDevice(id, permissions, device, signal) {
    const view = Object.create(null);
    const canRead = permissions.has('device:clipboard-read');
    const canWrite = permissions.has('device:info');
    let clipboardGranted = false;
    let clipboardRevision = 0;
    const denied = () => { throw new SDKError('SDK_PERMISSION_DENIED', { module: id }); };
    const permissionOperation = (method) => deviceOperation(async (scopes, permission) => {
        if (permission === 'clipboard-read' ? !canRead : !permissions.has('device:permissions')) {
            return denied();
        }
        if (!device.permissions)
            return undefined;
        const previousGrant = clipboardGranted;
        const revision = permission === 'clipboard-read' ? ++clipboardRevision : undefined;
        if (revision !== undefined)
            clipboardGranted = false;
        const result = await invokeDeviceOperation(device.permissions[method], device.permissions, [permission], scopes);
        if (signal.aborted || scopes.some((scope) => scope.aborted)) {
            throw new SDKError('SDK_MODULE_CANCELLED', { module: id });
        }
        if (revision !== undefined && revision === clipboardRevision) {
            clipboardGranted = (method === 'request' || previousGrant) && result === 'granted';
        }
        return result;
    });
    const groups = {
        info: ['info', 'capabilities', 'isSupported', 'screen', 'network', 'battery', 'performance', 'audio',
            'share', 'clipboard', 'store', 'links', 'app', 'motion', 'keyboard'],
        haptics: ['haptics'], geo: ['geo'],
        permissions: ['permissions', 'camera'], tracking: ['tracking', 'advertisingId'],
        'clipboard-read': ['clipboard', 'permissions', 'isSupported'],
    };
    for (const [group, keys] of Object.entries(groups)) {
        if (!permissions.has(`device:${group}`))
            continue;
        for (const key of keys) {
            if (!Object.hasOwn(device, key) || Object.hasOwn(view, key))
                continue;
            let cached;
            Object.defineProperty(view, key, { enumerable: true, get: () => {
                    const value = Reflect.get(device, key);
                    if (value === undefined)
                        return undefined;
                    if (key === 'capabilities')
                        return () => Object.freeze(Object.fromEntries(Object.entries(device.capabilities?.() ?? {}).filter(([name]) => Object.hasOwn(view, name))));
                    if (key === 'isSupported')
                        return (feature) => {
                            if (signal.aborted)
                                return false;
                            if (feature === 'clipboard.read')
                                return canRead && device.isSupported?.(feature) === true;
                            if (feature === 'clipboard.write')
                                return canWrite && device.isSupported?.(feature) === true;
                            return Object.hasOwn(view, feature) && device.isSupported?.(feature) === true;
                        };
                    if (key === 'advertisingId')
                        return async () => {
                            if (signal.aborted)
                                throw new SDKError('SDK_MODULE_CANCELLED', { module: id });
                            const result = await device.advertisingId?.();
                            if (signal.aborted)
                                throw new SDKError('SDK_MODULE_CANCELLED', { module: id });
                            return result;
                        };
                    let supplied = typeof value === 'function'
                        ? Object.assign(value.bind(device), value) : value;
                    if (key === 'clipboard') {
                        const clipboard = value;
                        supplied = { ...clipboard,
                            isSupported: (operation) => operation === 'read'
                                ? canRead && clipboard.isSupported('read') : operation === 'write'
                                ? canWrite && clipboard.isSupported('write')
                                : (canRead && clipboard.isSupported('read')) || (canWrite && clipboard.isSupported('write')),
                            read: deviceOperation(async (scopes) => {
                                if (!canRead || !clipboardGranted)
                                    return denied();
                                const revision = clipboardRevision;
                                const text = await invokeDeviceOperation(clipboard.read, clipboard, [], scopes);
                                if (!clipboardGranted || revision !== clipboardRevision)
                                    return denied();
                                return text;
                            }),
                            write: deviceOperation((scopes, text) => {
                                if (!canWrite)
                                    return Promise.reject(new SDKError('SDK_PERMISSION_DENIED', { module: id }));
                                return invokeDeviceOperation(clipboard.write, clipboard, [text], scopes);
                            }),
                        };
                    }
                    if (key === 'permissions')
                        supplied = { ...value,
                            query: permissionOperation('query'), request: permissionOperation('request'),
                            openSettings: async () => {
                                if (!permissions.has('device:permissions'))
                                    return denied();
                                return device.permissions.openSettings();
                            },
                        };
                    cached ??= scopeDeviceGroup(supplied, supplied, signal);
                    return cached;
                } });
        }
    }
    return guarded(id, view);
}
function scopedSdk(manifest, getModule, diagnostics) {
    const allowed = manifest.kind === 'game' ? manifest.sdk?.uses ?? []
        : [...Object.keys(manifest.requires ?? {}), ...Object.keys(manifest.optional ?? {})];
    const namespace = (prefix) => {
        const target = Object.create(null);
        if (prefix === '' && manifest.kind === 'sink' && diagnostics)
            target.diagnostics = diagnostics;
        const children = new Set(allowed.filter((id) => id.startsWith(prefix))
            .map((id) => id.slice(prefix.length).split('.')[0]));
        for (const child of children) {
            if (prefix === '' && child === 'diagnostics')
                continue;
            const id = prefix + child;
            if (allowed.includes(id)) {
                Object.defineProperty(target, child, { enumerable: true, get: () => getModule(id) });
            }
            else {
                target[child] = namespace(`${id}.`);
            }
        }
        return guarded(manifest.id, target);
    };
    return namespace('');
}
function guarded(id, target) {
    return new Proxy(Object.freeze(target), {
        get(object, key, receiver) {
            if (Object.hasOwn(object, key))
                return Reflect.get(object, key, receiver);
            if (typeof key === 'symbol' || key === 'then' || key === 'toJSON')
                return undefined;
            throw new SDKError('SDK_PERMISSION_DENIED', { module: id });
        },
    });
}

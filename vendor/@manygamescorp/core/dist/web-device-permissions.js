import { SDKError } from './error.js';
import { deviceOperation, invokeDeviceOperation, operationSignal, checkOperation } from './device-operation.js';
export const unsupported = () => { throw new SDKError('SDK_PLATFORM_UNSUPPORTED'); };
export function browserError(error) {
    if (error instanceof SDKError && ['SDK_PERMISSION_DENIED', 'SDK_MODULE_CANCELLED',
        'SDK_PLATFORM_UNSUPPORTED', 'VALIDATION_FAILED'].includes(error.code)) {
        return new SDKError(error.code);
    }
    const name = error && typeof error === 'object' ? Reflect.get(error, 'name') : undefined;
    return new SDKError(name === 'NotAllowedError' || name === 'SecurityError'
        ? 'SDK_PERMISSION_DENIED' : 'SDK_PLATFORM_UNSUPPORTED');
}
export function stopStream(stream) {
    for (const track of stream.getTracks()) {
        try {
            track.stop();
        }
        catch { }
    }
}
export function httpUrl(value) {
    let url;
    if (typeof value !== 'string' || value.length > 8192)
        throw new SDKError('VALIDATION_FAILED');
    try {
        url = new URL(value);
    }
    catch {
        throw new SDKError('VALIDATION_FAILED');
    }
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
        throw new SDKError('VALIDATION_FAILED');
    }
    return url.href;
}
const names = {
    location: 'geolocation', camera: 'camera', microphone: 'microphone',
    notifications: 'notifications',
};
const state = (value) => value === 'granted' || value === 'denied' || value === 'prompt' ? value : undefined;
export function webPermissions({ navigator: nav, window: win }, signal) {
    const lifetime = signal;
    const requested = new Map();
    const revisions = new Map();
    const wait = (promise, signal) => new Promise((resolve, reject) => {
        let settled = false;
        const finish = (action) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            signal.removeEventListener('abort', cancel);
            action();
        };
        const cancel = () => finish(() => reject(new SDKError('SDK_MODULE_CANCELLED')));
        const timer = setTimeout(() => finish(() => reject(new SDKError('SDK_PLATFORM_UNSUPPORTED'))), 60000);
        signal.addEventListener('abort', cancel, { once: true });
        promise.then((value) => finish(() => resolve(value)), (error) => finish(() => reject(browserError(error))));
        if (signal.aborted)
            cancel();
    });
    const query = deviceOperation(async (scopes, permission) => {
        const signal = operationSignal(lifetime, scopes);
        checkOperation(signal);
        const name = names[permission];
        if (permission === 'clipboard-read' && !nav?.clipboard?.readText)
            return undefined;
        if (permission === 'clipboard-read' && nav?.permissions) {
            try {
                return state((await wait(nav.permissions.query({
                    name: 'clipboard-read',
                }), signal)).state);
            }
            catch {
                checkOperation(signal);
                return requested.get(permission);
            }
        }
        if (permission === 'clipboard-read')
            return requested.get(permission);
        if (!name)
            return undefined;
        if (nav?.permissions) {
            try {
                return state((await wait(nav.permissions.query({ name }), signal)).state);
            }
            catch {
                checkOperation(signal);
                return undefined;
            }
        }
        if (permission === 'notifications' && win?.Notification) {
            return win.Notification.permission === 'default' ? 'prompt' : win.Notification.permission;
        }
        return requested.get(permission);
    });
    return {
        isSupported: () => !!(nav?.permissions || nav?.geolocation || nav?.mediaDevices
            || nav?.clipboard?.readText || win?.Notification), query,
        request: deviceOperation(async (scopes, permission) => {
            const signal = operationSignal(lifetime, scopes);
            if (signal.aborted)
                throw new SDKError('SDK_MODULE_CANCELLED');
            if (!names[permission] && permission !== 'clipboard-read')
                return undefined;
            const revision = (revisions.get(permission) ?? 0) + 1;
            revisions.set(permission, revision);
            requested.delete(permission);
            let result;
            try {
                if (permission === 'clipboard-read') {
                    if (!nav?.clipboard?.readText)
                        return undefined;
                    await wait(nav.clipboard.readText().then(() => undefined), signal);
                    result = 'granted';
                }
                else if (permission === 'notifications') {
                    const prompt = win?.Notification?.requestPermission() ?? Promise.resolve(undefined);
                    const value = await wait(prompt, signal);
                    result = value === 'default' ? 'prompt' : state(value);
                }
                else if (permission === 'location' && nav?.geolocation) {
                    result = await wait(new Promise((resolve) => {
                        nav.geolocation.getCurrentPosition(() => resolve('granted'), (error) => resolve(error.code === 1 ? 'denied' : undefined), { timeout: 10000, maximumAge: 0, enableHighAccuracy: false });
                    }), signal);
                }
                else if ((permission === 'camera' || permission === 'microphone') && nav?.mediaDevices) {
                    const acquiring = nav.mediaDevices.getUserMedia({
                        video: permission === 'camera', audio: permission === 'microphone',
                    });
                    void acquiring.then(stopStream, () => { }).catch(() => { });
                    await wait(acquiring, signal);
                    result = 'granted';
                }
                else
                    return await invokeDeviceOperation(query, undefined, [permission], scopes);
            }
            catch (error) {
                result = browserError(error).code === 'SDK_PERMISSION_DENIED' ? 'denied' : undefined;
            }
            if (signal.aborted)
                throw new SDKError('SDK_MODULE_CANCELLED');
            if (revision !== revisions.get(permission))
                return undefined;
            if (result)
                requested.set(permission, result);
            return result;
        }),
        openSettings: async () => unsupported(),
    };
}
function position(value) {
    const { latitude, longitude, accuracy, altitude } = value.coords;
    if (![latitude, longitude, accuracy, value.timestamp].every(Number.isFinite)
        || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || accuracy < 0)
        return undefined;
    return Object.freeze({ latitude, longitude, accuracy, timestamp: value.timestamp,
        ...(altitude !== null && Number.isFinite(altitude) ? { altitude } : {}) });
}
export function webGeo({ navigator: nav }, signal) {
    const lifetime = signal;
    return {
        isSupported: () => !!nav?.geolocation,
        country: () => undefined,
        position: deviceOperation(async (scopes, options) => {
            const signal = operationSignal(lifetime, scopes);
            checkOperation(signal);
            if (options?.accuracy !== undefined && !['coarse', 'fine'].includes(options.accuracy)) {
                throw new SDKError('VALIDATION_FAILED');
            }
            if (!nav?.geolocation)
                return undefined;
            return new Promise((resolve, reject) => {
                const cancel = () => { cleanup(); reject(new SDKError('SDK_MODULE_CANCELLED')); };
                const cleanup = () => signal.removeEventListener('abort', cancel);
                signal.addEventListener('abort', cancel, { once: true });
                try {
                    nav.geolocation.getCurrentPosition((value) => { cleanup(); resolve(position(value)); }, (error) => {
                        cleanup();
                        if (error.code === 1)
                            reject(new SDKError('SDK_PERMISSION_DENIED'));
                        else
                            resolve(undefined);
                    }, { enableHighAccuracy: options?.accuracy === 'fine', timeout: 10000, maximumAge: 0 });
                }
                catch {
                    cleanup();
                    resolve(undefined);
                }
            });
        }),
        watch(handler) {
            if (!nav?.geolocation)
                return () => { };
            let active = true;
            let id;
            const off = () => {
                if (!active)
                    return;
                active = false;
                signal.removeEventListener('abort', off);
                if (id !== undefined)
                    nav.geolocation.clearWatch(id);
            };
            signal.addEventListener('abort', off, { once: true });
            try {
                id = nav.geolocation.watchPosition((value) => {
                    const result = position(value);
                    if (active && result)
                        handler(result);
                }, (error) => { if (error.code === 1)
                    off(); }, { maximumAge: 0 });
                if (!active)
                    nav.geolocation.clearWatch(id);
            }
            catch {
                off();
            }
            return off;
        },
    };
}

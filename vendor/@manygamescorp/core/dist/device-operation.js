import { SDKError } from './error.js';
const invocations = new WeakMap();
export function registerDeviceOperation(fn, invoke) {
    invocations.set(fn, invoke);
    return fn;
}
export const hasDeviceOperation = (fn) => invocations.has(fn);
export function invokeDeviceOperation(fn, receiver, args, scopes) {
    const invoke = invocations.get(fn);
    return invoke ? invoke(receiver, args, scopes) : Reflect.apply(fn, receiver, args);
}
export function deviceOperation(run) {
    const fn = ((...args) => run([], ...args));
    return registerDeviceOperation(fn, (_receiver, args, scopes) => run(scopes, ...args));
}
export function operationSignal(lifetime, scopes) {
    return scopes.length ? AbortSignal.any([lifetime, ...scopes]) : lifetime;
}
export function checkOperation(signal) {
    if (signal.aborted)
        throw new SDKError('SDK_MODULE_CANCELLED');
}
export function waitDeviceOperation(promise, signal) {
    return new Promise((resolve, reject) => {
        const cancel = () => { cleanup(); reject(new SDKError('SDK_MODULE_CANCELLED')); };
        const cleanup = () => signal.removeEventListener('abort', cancel);
        signal.addEventListener('abort', cancel, { once: true });
        promise.then((value) => { cleanup(); resolve(value); }, (error) => { cleanup(); reject(error); });
        if (signal.aborted)
            cancel();
    });
}

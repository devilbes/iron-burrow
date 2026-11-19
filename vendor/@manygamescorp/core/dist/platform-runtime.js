export function hasCordovaRuntime() {
    return Boolean(Reflect.get(globalThis, 'cordova') || Reflect.get(globalThis.window ?? {}, 'cordova'));
}

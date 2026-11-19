import { SDKError } from './error.js';
import { hasCordovaRuntime } from './platform-runtime.js';
const factories = [];
export function registerPlatformFactory(factory) {
    const entry = { detect: factory.detect.bind(factory), create: factory.create.bind(factory) };
    factories.push(entry);
    return () => {
        const index = factories.indexOf(entry);
        if (index >= 0)
            factories.splice(index, 1);
    };
}
export function detectPlatform() {
    const nativeRuntime = hasCordovaRuntime();
    for (const factory of [...factories].reverse()) {
        if (factory.detect()) {
            const adapter = factory.create();
            if (nativeRuntime && adapter.id !== 'cordova')
                throw new SDKError('SDK_PLATFORM_UNSUPPORTED');
            return adapter;
        }
    }
    if (nativeRuntime)
        throw new SDKError('SDK_PLATFORM_UNSUPPORTED');
    return undefined;
}

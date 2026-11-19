import { webRuntime } from './web-runtime.js';
import { webDevice } from './web-device.js';
export function web(options = {}) {
    return { ...webRuntime(options), createDeviceApi: () => webDevice({ ...options,
            navigator: options.navigator ?? globalThis.navigator,
            window: options.window ?? globalThis.window,
            document: options.document ?? globalThis.document }) };
}

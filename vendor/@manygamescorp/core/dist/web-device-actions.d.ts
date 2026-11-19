import type { DeviceProvider } from './device-types.js';
import type { WebDeviceOptions } from './web-device-types.js';
export declare function webActions({ navigator: nav, window: win, document: doc, storeUrl }: WebDeviceOptions, images: ReadonlyMap<string, Blob>, signal: AbortSignal): DeviceProvider;
//# sourceMappingURL=web-device-actions.d.ts.map
import type { Camera } from './device-types.js';
import type { WebDeviceOptions } from './web-device-types.js';
export declare function webCamera({ navigator: nav, window: win, document: doc, imageFiles }: WebDeviceOptions, lifetime: AbortSignal, images: Map<string, Blob>): Camera;
//# sourceMappingURL=web-device-camera.d.ts.map
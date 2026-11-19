import type { Geo, Permissions } from './device-types.js';
import type { WebDeviceOptions } from './web-device-types.js';
import { SDKError } from './error.js';
export declare const unsupported: () => never;
export declare function browserError(error: unknown): SDKError;
export declare function stopStream(stream: MediaStream): void;
export declare function httpUrl(value: string): string;
export declare function webPermissions({ navigator: nav, window: win }: WebDeviceOptions, signal: AbortSignal): Permissions;
export declare function webGeo({ navigator: nav }: WebDeviceOptions, signal: AbortSignal): Geo;
//# sourceMappingURL=web-device-permissions.d.ts.map
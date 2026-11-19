import type { EventBus } from './bus-types.js';
import type { Device } from './device-types.js';
import type { FactsView } from './facts.js';
import type { PlatformAdapter } from './platform.js';
import type { ScopedStorage } from './storage/scoped.js';
export type * from './device-types.js';
export interface DeviceOptions {
    readonly platform: PlatformAdapter;
    readonly facts?: FactsView;
    readonly storage?: Pick<ScopedStorage, 'get' | 'set'>;
    readonly consent?: () => {
        readonly adId: boolean;
        readonly geo: boolean;
    };
    readonly bus?: Pick<EventBus, 'emit'>;
}
export interface DeviceRuntime {
    readonly device: Device;
    start(): void;
    dispose(): void;
}
export declare function normalizeDeviceId(value: unknown): string | null;
export declare function deviceIdFields(ids: Readonly<Record<string, unknown>>): Readonly<Record<string, string>>;
export declare function scopeDeviceGroup<T>(template: T, source: unknown, signal: AbortSignal): T;
export declare function createDevice(options: DeviceOptions): DeviceRuntime;
//# sourceMappingURL=device.d.ts.map
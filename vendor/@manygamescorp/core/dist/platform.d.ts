import type { SecureStore } from './storage/secure-store.js';
import type { BlobStore } from './storage/blob-store.js';
import type { DeviceProvider } from './device-types.js';
export type PlatformLifecycleEvent = 'pause' | 'resume' | 'online' | 'offline' | 'back';
export type PlatformUnsubscribe = () => void;
export interface PlatformLifecycle {
    readonly hidden?: boolean;
    on(event: PlatformLifecycleEvent, handler: () => void): PlatformUnsubscribe;
}
export interface DeviceInfo {
    readonly platform: string;
    readonly os?: string;
    readonly userAgent?: string;
    readonly language?: string;
    readonly online?: boolean;
}
export interface PlatformDevice {
    info(): DeviceInfo;
    vendorId(): Promise<string | undefined>;
}
export interface PlatformPlugins {
    has(name: string): boolean;
    get<T = unknown>(name: string): T | undefined;
}
export interface PlatformReadyOptions {
    readonly signal?: AbortSignal;
}
export interface PlatformAdapter {
    readonly id: string;
    ready(options?: PlatformReadyOptions): Promise<void>;
    readonly secureStore: SecureStore;
    readonly lifecycle: PlatformLifecycle;
    readonly device: PlatformDevice;
    readonly deviceApi?: DeviceProvider;
    readonly createDeviceApi?: () => DeviceProvider;
    readonly plugins: PlatformPlugins;
    openUrl(url: string, mode: 'system' | 'inapp'): Promise<void>;
    readonly blobStore?: BlobStore;
    readonly createStorage?: (namespace: string | undefined) => {
        readonly secureStore: SecureStore;
        readonly blobStore?: BlobStore;
    };
}
export interface PlatformDeviceView {
    info(): DeviceInfo;
    deviceId(): Promise<string>;
}
export interface PlatformView extends Pick<PlatformAdapter, 'id' | 'lifecycle' | 'plugins' | 'openUrl'> {
    readonly device: PlatformDeviceView;
}
export interface PlatformFactory {
    detect(): boolean;
    create(): PlatformAdapter;
}
export declare function registerPlatformFactory(factory: PlatformFactory): PlatformUnsubscribe;
export declare function detectPlatform(): PlatformAdapter | undefined;
//# sourceMappingURL=platform.d.ts.map
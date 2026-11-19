import type { Unsubscribe } from './bus-types.js';
export interface Supported {
    isSupported(): boolean;
}
export interface DeviceInfo {
    readonly platform: string;
    readonly os?: string;
    readonly osVersion?: string;
    readonly model?: string;
    readonly manufacturer?: string;
    readonly isVirtual?: boolean;
    readonly isTablet?: boolean;
    readonly appVersion?: string;
    readonly build?: string;
    readonly bundleId?: string;
    readonly installSource?: string;
    readonly firstInstallAt?: number;
    readonly locale?: string;
    readonly languages?: readonly string[];
    readonly timezone?: string;
    readonly region?: string;
}
export interface Info extends Supported {
    (): DeviceInfo;
}
export type Orientation = 'portrait' | 'landscape';
export interface ScreenState {
    readonly width: number;
    readonly height: number;
    readonly dpr: number;
    readonly orientation: Orientation;
    readonly safeArea?: Readonly<{
        top: number;
        right: number;
        bottom: number;
        left: number;
    }>;
    readonly notch?: boolean;
}
export interface Screen extends Supported {
    (): ScreenState | undefined;
    onChange(handler: (state: ScreenState) => void): Unsubscribe;
    lockOrientation(orientation: Orientation): Promise<void>;
    unlock(): Promise<void>;
    keepAwake(on: boolean): Promise<void>;
    setFullscreen(on: boolean): Promise<void>;
    immersive(on: boolean): Promise<void>;
    readonly statusBar: {
        show(): Promise<void>;
        hide(): Promise<void>;
        style(style: 'light' | 'dark'): Promise<void>;
    };
    readonly brightness: {
        get(): Promise<number | undefined>;
        set(value: number): Promise<void>;
    };
}
export interface Haptics extends Supported {
    impact(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
    notification(kind: 'success' | 'warning' | 'error'): void;
    selection(): void;
    vibrate(pattern: number | readonly number[]): void;
    setEnabled(enabled: boolean): void;
}
export interface Position {
    readonly latitude: number;
    readonly longitude: number;
    readonly accuracy: number;
    readonly timestamp: number;
    readonly altitude?: number;
}
export interface Geo extends Supported {
    country(): string | undefined;
    position(options?: {
        readonly accuracy?: 'coarse' | 'fine';
    }): Promise<Position | undefined>;
    watch(handler: (position: Position) => void): Unsubscribe;
}
export interface NetworkState {
    readonly online: boolean;
    readonly type?: 'wifi' | 'cellular' | 'ethernet' | 'none';
    readonly effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
    readonly metered?: boolean;
}
export interface Network extends Supported {
    status(): NetworkState | undefined;
    onChange(handler: (state: NetworkState) => void): Unsubscribe;
}
export interface BatteryState {
    readonly level: number;
    readonly charging: boolean;
    readonly lowPowerMode?: boolean;
}
export interface Battery extends Supported {
    (): BatteryState | undefined;
    onChange(handler: (state: BatteryState) => void): Unsubscribe;
}
export type PerfClass = 'low' | 'mid' | 'high';
export interface PerformanceState {
    readonly deviceMemory?: number;
    readonly cpuCores?: number;
    readonly perfClass?: PerfClass;
    readonly thermalState?: 'nominal' | 'fair' | 'serious' | 'critical';
}
export interface Performance extends Supported {
    (): PerformanceState | undefined;
    onMemoryWarning(handler: () => void): Unsubscribe;
}
export interface AudioState {
    readonly silent?: boolean;
    readonly volume?: number;
    readonly headphones?: boolean;
}
export interface Audio extends Supported {
    state(): AudioState | undefined;
    onChange(handler: (state: AudioState) => void): Unsubscribe;
    session(mode: 'ambient' | 'playback'): Promise<void>;
}
export type DevicePermission = 'notifications' | 'location' | 'camera' | 'microphone' | 'photos' | 'tracking' | 'clipboard-read';
export type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'restricted';
export interface Permissions extends Supported {
    query(permission: DevicePermission): Promise<PermissionStatus | undefined>;
    request(permission: DevicePermission): Promise<PermissionStatus | undefined>;
    openSettings(): Promise<void>;
}
export type TrackingStatus = 'notDetermined' | 'authorized' | 'denied' | 'restricted' | 'unavailable';
export interface Tracking extends Supported {
    status(): TrackingStatus;
    request(): Promise<TrackingStatus>;
}
export interface Share extends Supported {
    (data: {
        readonly text?: string;
        readonly url?: string;
        readonly image?: ImageRef;
    }): Promise<void>;
}
export interface Clipboard extends Supported {
    isSupported(operation?: 'read' | 'write'): boolean;
    write(text: string): Promise<void>;
    read(): Promise<string | undefined>;
}
export interface Store extends Supported {
    rateApp(): Promise<void>;
    openPage(): Promise<void>;
    checkUpdate(): Promise<{
        readonly available: boolean;
        readonly version?: string;
    } | undefined>;
}
export interface Links extends Supported {
    initial(): string | undefined;
    onOpen(handler: (url: string) => void): Unsubscribe;
    installReferrer(): Promise<string | undefined>;
}
export interface AppState {
    readonly visibility: 'foreground' | 'background';
    readonly start: 'cold' | 'warm';
}
export interface App extends Supported {
    state(): AppState | undefined;
    onBack(handler: () => void): Unsubscribe;
    exit(): Promise<void>;
    restart(): Promise<void>;
}
export interface Vector {
    readonly x: number;
    readonly y: number;
    readonly z: number;
}
export interface MotionOrientation {
    readonly alpha: number;
    readonly beta: number;
    readonly gamma: number;
    readonly quaternion?: readonly [number, number, number, number];
}
export interface Sensor<T> extends Supported {
    start(options: {
        readonly hz?: number;
    }, handler: (value: T) => void): Unsubscribe;
    stop(): void;
}
export interface Motion extends Supported {
    requestAccess(): Promise<PermissionStatus | undefined>;
    readonly accelerometer: Sensor<Vector>;
    readonly gyroscope: Sensor<Vector>;
    readonly magnetometer: Sensor<Vector>;
    readonly orientation: Sensor<MotionOrientation>;
    readonly gravity: Sensor<Vector>;
    readonly linearAcceleration: Sensor<Vector>;
    stop(): void;
    onShake(handler: () => void, options?: {
        readonly threshold?: number;
    }): Unsubscribe;
}
export interface ImageRef {
    readonly uri: string;
    readonly mimeType: string;
}
export interface Camera extends Supported {
    capture(options?: {
        readonly facing?: 'front' | 'back';
        readonly quality?: number;
        readonly maxSize?: number;
    }): Promise<ImageRef | undefined>;
    pickFromGallery(): Promise<ImageRef | undefined>;
    scanCode(options: {
        readonly formats: readonly string[];
    }): Promise<string | undefined>;
    readonly preview: {
        start(options?: {
            readonly facing?: 'front' | 'back';
        }): Promise<void>;
        stop(): Promise<void>;
    };
}
export interface Keyboard extends Supported {
    onShow(handler: (state: {
        readonly height: number;
    }) => void): Unsubscribe;
    onHide(handler: () => void): Unsubscribe;
    hide(): Promise<void>;
}
export interface Device {
    readonly info: Info;
    readonly screen: Screen;
    readonly haptics: Haptics;
    readonly geo: Geo;
    readonly network: Network;
    readonly battery: Battery;
    readonly performance: Performance;
    readonly audio: Audio;
    readonly permissions: Permissions;
    readonly tracking: Tracking;
    advertisingId(): Promise<string | null>;
    readonly share: Share;
    readonly clipboard: Clipboard;
    readonly store: Store;
    readonly links: Links;
    readonly app: App;
    readonly motion: Motion;
    readonly camera: Camera;
    readonly keyboard: Keyboard;
    capabilities(): Readonly<Record<DeviceGroup, boolean>>;
    isSupported(feature: DeviceGroup | 'clipboard.read' | 'clipboard.write'): boolean;
}
export type DeviceGroup = Exclude<keyof Device, 'advertisingId' | 'capabilities' | 'isSupported'>;
export type DeviceProvider = Partial<Omit<Device, 'capabilities' | 'isSupported'>> & {
    dispose?(): void;
};
//# sourceMappingURL=device-types.d.ts.map
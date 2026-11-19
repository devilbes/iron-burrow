import type { ImageRef } from './device-types.js';
export interface WebEvents {
    addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
}
export interface WebConnection extends WebEvents {
    readonly type?: string;
    readonly effectiveType?: string;
    readonly metered?: boolean;
}
export interface WebBattery extends WebEvents {
    readonly level: number;
    readonly charging: boolean;
}
export interface WebWakeLock extends WebEvents {
    readonly released: boolean;
    release(): Promise<void>;
}
export interface WebNavigator {
    readonly permissions?: Pick<Permissions, 'query'>;
    readonly geolocation?: Geolocation;
    readonly mediaDevices?: Pick<MediaDevices, 'getUserMedia'>;
    readonly clipboard?: Partial<Pick<Clipboard, 'readText' | 'writeText'>>;
    share?(data: ShareData): Promise<void>;
    canShare?(data: ShareData): boolean;
    readonly audioSession?: {
        type: string;
    };
    readonly userAgent?: string;
    readonly platform?: string;
    readonly language?: string;
    readonly languages?: readonly string[];
    readonly onLine?: boolean;
    readonly maxTouchPoints?: number;
    readonly userAgentData?: {
        readonly platform: string;
        readonly mobile: boolean;
    };
    readonly hardwareConcurrency?: number;
    readonly deviceMemory?: number;
    readonly connection?: WebConnection;
    vibrate?(pattern: number | number[]): boolean;
    getBattery?(): Promise<WebBattery>;
    readonly wakeLock?: {
        request(type: 'screen'): Promise<WebWakeLock>;
    };
}
export interface WebViewport extends WebEvents {
    readonly height: number;
    readonly offsetTop: number;
    readonly scale: number;
}
export interface WebOrientation extends WebEvents {
    readonly type: string;
    lock?(orientation: 'portrait' | 'landscape'): Promise<void>;
    unlock?(): void;
}
export interface WebWindow extends WebEvents {
    createImageBitmap?: Window['createImageBitmap'];
    readonly location?: Pick<Location, 'href' | 'reload'>;
    readonly Notification?: {
        readonly permission: NotificationPermission;
        requestPermission(): Promise<NotificationPermission>;
    };
    readonly DeviceMotionEvent?: WebMotionAccess;
    readonly DeviceOrientationEvent?: WebMotionAccess;
    readonly Accelerometer?: WebSensorConstructor;
    readonly Gyroscope?: WebSensorConstructor;
    readonly Magnetometer?: WebSensorConstructor;
    readonly GravitySensor?: WebSensorConstructor;
    readonly LinearAccelerationSensor?: WebSensorConstructor;
    readonly BarcodeDetector?: new (options: {
        formats: readonly string[];
    }) => {
        detect(source: HTMLVideoElement): Promise<readonly {
            rawValue: string;
        }[]>;
    };
    open?: Window['open'];
    getComputedStyle?: Window['getComputedStyle'];
    readonly innerWidth?: number;
    readonly innerHeight?: number;
    readonly devicePixelRatio?: number;
    readonly screen?: {
        readonly orientation?: WebOrientation;
    };
    readonly visualViewport?: WebViewport | null;
}
export interface WebDocument extends WebEvents {
    readonly visibilityState: DocumentVisibilityState;
    readonly documentElement?: {
        readonly clientWidth?: number;
        readonly clientHeight?: number;
        requestFullscreen?(): Promise<void>;
    };
    createElement?: Document['createElement'];
    readonly body?: Pick<HTMLElement, 'appendChild'>;
    readonly fullscreenElement?: unknown;
    readonly fullscreenEnabled?: boolean;
    exitFullscreen?(): Promise<void>;
    readonly activeElement?: {
        readonly tagName: string;
        readonly isContentEditable?: boolean;
        readonly type?: string;
        blur?(): void;
    } | null;
}
export interface WebDeviceOptions {
    readonly navigator?: WebNavigator;
    readonly window?: WebWindow;
    readonly document?: WebDocument;
    readonly storeUrl?: string;
    readonly imageFiles?: WebImageFiles;
}
export interface WebImageFiles {
    save(file: Blob): Promise<ImageRef>;
    release(image: ImageRef): void;
}
export interface WebMotionAccess {
    readonly prototype?: unknown;
    requestPermission?(): Promise<PermissionState>;
}
export interface WebSensor extends WebEvents {
    readonly x: number | null;
    readonly y: number | null;
    readonly z: number | null;
    start(): void;
    stop(): void;
}
export type WebSensorConstructor = new (options: {
    frequency: number;
}) => WebSensor;
//# sourceMappingURL=web-device-types.d.ts.map
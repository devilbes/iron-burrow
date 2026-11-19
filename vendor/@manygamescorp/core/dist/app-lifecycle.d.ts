import type { EventBus } from './bus-types.js';
import type { Network } from './device-types.js';
import type { PlatformAdapter } from './platform.js';
export declare const APP_LIFECYCLE_CHANGED = "app:lifecycle:changed";
export interface AppLifecycleState {
    readonly hidden: boolean;
    readonly online: boolean;
}
export declare function createAppLifecycle(platform: Pick<PlatformAdapter, 'lifecycle' | 'device'>, network: Pick<Network, 'isSupported' | 'status' | 'onChange'>, bus: Pick<EventBus, 'emit'>): {
    start(): void;
    dispose(): void;
    visibility(hidden: boolean): void;
};
//# sourceMappingURL=app-lifecycle.d.ts.map
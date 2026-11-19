import type { AuthAccountChange, AuthCodeResult, AuthIdentityChanged, AuthLinks, AuthProvider } from './auth.js';
import type { AppLifecycleState } from './app-lifecycle.js';
import type { ListenerErrorPayload } from './bus-types.js';
import type { TrackingStatus } from './device-types.js';
import type { CoreReady, ReloadRequired, SdkPlatform } from './kernel.js';
import type { ModuleStateChanged } from './lifecycle.js';
import type { ModuleFailed } from './loader.js';
import type { ConfigsSnapshotUpdated } from './configs.js';
import type { ContextChanged } from './filter-context.js';
import type { FullscreenChanged } from './ui-state.js';
import type { TimeOffsetChanged } from './time.js';
export type { ConfigsSnapshotUpdated } from './configs.js';
interface DeviceSupported {
    readonly supported: boolean;
}
export interface CoreEventPayloads {
    'sdk:realtime:status:changed': {
        readonly state: string;
    };
    'sdk:realtime:transport:changed': {
        readonly to: 'sse' | 'ws' | 'poll';
    };
    'app:lifecycle:changed': AppLifecycleState;
    'sdk:core:ready': CoreReady;
    'sdk:platform:ready': SdkPlatform;
    'sdk:core:listener-error': ListenerErrorPayload;
    'sdk:module:failed': ModuleFailed;
    'sdk:module:fallback': {
        readonly moduleId: string;
        readonly from: string;
        readonly to: string;
        readonly reason: string;
    };
    'sdk:module:override-ignored': {
        readonly moduleId: string;
        readonly configId: number;
        readonly path: string;
        readonly code: string;
    };
    'sdk:module:settings': {
        readonly moduleId: string;
        readonly overrides: readonly number[];
    };
    'sdk:overrides:unavailable': Record<string, never>;
    'sdk:reload:required': ReloadRequired;
    'sdk:facts:unknown-param': {
        readonly param: string;
    };
    'sdk:context:changed': ContextChanged;
    'sdk:ui:fullscreen-changed': FullscreenChanged;
    'sdk:ui:skin-failed': {
        readonly skin: string;
        readonly version: string;
        readonly code: 'LOAD_FAILED' | 'TIMEOUT';
    };
    'auth:identity:changed': AuthIdentityChanged;
    'auth:playerChanged': AuthIdentityChanged;
    'auth:account:changing': AuthAccountChange;
    'auth:account:changed': AuthAccountChange;
    'auth:signin:started': {
        readonly method: 'email';
    };
    'auth:code:sent': {
        readonly method: 'email';
        readonly resendAt: number;
    };
    'auth:signin:succeeded': Pick<AuthCodeResult, 'upgradeType' | 'pending' | 'conflict'>;
    'auth:signin:failed': {
        readonly method: string;
        readonly code: string;
    };
    'auth:links:changed': AuthLinks;
    'auth:email:required': {
        readonly provider: AuthProvider;
    };
    'time:offsetChanged': TimeOffsetChanged;
    'module:state:changed': ModuleStateChanged;
    'configs:snapshot:updated': ConfigsSnapshotUpdated;
    'device:tracking:changed': {
        readonly status: TrackingStatus;
    };
    'device:network:changed': DeviceSupported;
    'device:battery:changed': DeviceSupported;
    'device:screen:changed': DeviceSupported;
    'device:audio:changed': DeviceSupported;
    'device:links:changed': DeviceSupported;
    'device:keyboard:changed': DeviceSupported;
}
export type CoreEventName = keyof CoreEventPayloads;
//# sourceMappingURL=core-events.d.ts.map
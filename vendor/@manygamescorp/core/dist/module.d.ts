import type { StringTree } from '@manygamescorp/contracts-client/localization';
import { type UiSlot as UiZoneSlot } from '@manygamescorp/contracts-client/ui-slots';
import { type ModuleMechanicMetadata } from '@manygamescorp/contracts-client/module-mechanic';
import { type ModuleActions } from '@manygamescorp/contracts-client/actions';
import type { Diagnostics } from './diagnostics.js';
import type { ModuleSettingsSchema } from '@manygamescorp/contracts-client/module-settings';
import type { ModuleLoad, ModuleRef } from './module-ref.js';
export type { ModuleLoad } from './module-ref.js';
import type { RealtimeView } from './realtime-port.js';
import type { PlatformView } from './platform.js';
import type { Poller } from './poller.js';
export type { Poller } from './poller.js';
import type { ModuleFacts } from './facts.js';
import type { ServerTime } from './time.js';
import type { Device } from './device-types.js';
import type { ModuleWindow, QueuedWindow } from './window-triggers.js';
import type { ActionClient } from './triggers.js';
import type { ScopedHttp } from './scoped-http-types.js';
export type { ContextHold, FactsView, ModuleFacts } from './facts.js';
import type { ScopedBus } from './bus-types.js';
export type { ScopedBus } from './bus-types.js';
import type { CallContext } from './context.js';
import { type BuildTarget } from '@manygamescorp/contracts-client/module-targets';
export type { BuildTarget } from '@manygamescorp/contracts-client/module-targets';
export interface ServiceCallContext extends CallContext {
    readonly from: ModuleId;
    readonly uiSlots?: readonly UiZoneSlot[];
}
export type CapabilityService<T> = {
    [K in keyof T]: T[K] extends (...args: infer A) => infer R ? (context: ServiceCallContext, ...args: A) => R : never;
};
import type { ModuleId } from './module-id.js';
export type { ModuleId } from './module-id.js';
export type ModuleKind = 'service' | 'ui' | 'sink' | 'adapter' | 'game' | 'skin';
export type ModuleSource = 'local' | 'remote';
export type Permission = 'modules' | 'storage' | 'windows' | 'actions' | 'screens' | 'analytics' | 'poller' | 'platform' | 'secure:none' | `http:${string}` | 'device:info' | 'device:clipboard-read' | 'device:haptics' | 'device:geo' | 'device:permissions' | 'device:tracking';
export interface FilterExpr {
    readonly [path: string]: unknown;
}
export interface ModuleEvents {
    readonly emits: readonly string[];
    readonly listens?: readonly string[];
    readonly handles?: readonly string[];
}
export declare const UI_SLOTS: readonly ["topBar.left", "topBar.center", "topBar.right", "leftHandle", "rightHandle", "bottomBar.left", "bottomBar.center", "bottomBar.right", "screen", "overlay", "system", "reward", "settings"];
export type UiSlot = (typeof UI_SLOTS)[number];
export type UiKind = 'component' | 'route' | 'popup' | 'window' | 'hud';
export interface UiContribution {
    readonly id: string;
    readonly kind: UiKind;
    readonly slot?: UiSlot;
    readonly component: string;
    readonly title?: string;
    readonly icon?: string;
    readonly order?: number;
    readonly requiredServices?: readonly ModuleId[];
    readonly popupKind?: 'info' | 'content' | 'fullscreen';
}
export interface SdkModuleManifest extends ModuleMechanicMetadata {
    readonly actions?: ModuleActions;
    readonly settings?: ModuleSettingsSchema;
    readonly selection?: 'required' | 'optional';
    readonly status?: 'ready' | 'beta' | 'soon';
    readonly id: ModuleId;
    readonly version: string;
    readonly kind: ModuleKind;
    readonly compat?: {
        readonly 'ui-kit': string;
    };
    readonly engines: {
        readonly core: string;
        readonly adapter?: string;
    };
    readonly requires?: Readonly<Record<ModuleId, string>>;
    readonly optional?: Readonly<Record<ModuleId, string>>;
    readonly provides?: readonly string[];
    readonly permissions: readonly Permission[];
    readonly sdk?: {
        readonly uses: readonly ModuleId[];
    };
    readonly events: ModuleEvents;
    readonly realtime?: {
        readonly handles: readonly string[];
    };
    readonly consumes?: readonly string[];
    readonly load: ModuleLoad;
    readonly onEvent?: string | undefined;
    readonly onRoute?: string | undefined;
    readonly critical?: boolean;
    readonly source?: ModuleSource;
    readonly nativePlugins?: readonly string[];
    readonly targets: readonly BuildTarget[];
    readonly stores?: readonly string[];
    readonly skin?: {
        readonly closePosition?: 'head-right' | 'head-left' | 'corner-out';
        readonly css?: Readonly<Record<string, string>>;
        readonly assets?: Readonly<Record<string, string>>;
        readonly displayTitle?: {
            readonly arc?: number;
            readonly windows?: boolean;
        };
    };
    readonly ui?: {
        readonly contributes?: readonly UiContribution[];
        readonly slots?: readonly UiZoneSlot[];
        readonly windows?: readonly string[];
    };
    readonly entry: string;
}
export type ModuleState = 'registered' | 'resolved' | 'initialized' | 'started' | 'stopped' | 'disposed' | 'failed';
export type ModuleStopReason = 'hidden' | 'auth-change' | 'unload';
export type { ScopedHttp } from './scoped-http-types.js';
export interface SessionView {
    readonly clientAuthoritative?: boolean | undefined;
    readonly gid?: number | undefined;
}
export type ScopedStorage = object;
export interface WindowClient {
    register(windows: Readonly<Record<string, ModuleWindow>>): () => void;
    show(name: string, params?: Readonly<Record<string, unknown>>, options?: {
        readonly priority?: number;
        readonly context?: Readonly<Record<string, unknown>>;
    }): QueuedWindow;
}
export type ScreenClient = object;
export type Tracker = object;
export type ConfigsView = object;
export type Filters = object;
export type { PlatformDeviceView, PlatformView } from './platform.js';
export type DeviceView = Partial<Device>;
export interface ScopedSdk {
    readonly diagnostics?: Diagnostics;
    readonly [namespace: string]: unknown;
}
export type Logger = object;
export interface ModuleServices {
    provide<T extends object>(capability: string, service: T): void;
    get<T>(capability: string): T | undefined;
    require<T>(capability: string): T;
}
export interface ModuleHandle {
    readonly api: unknown;
    dispose(): Promise<void>;
}
export interface AdapterModules {
    load(ref: ModuleRef, local?: ModuleDefinition): Promise<ModuleHandle>;
}
export interface ModuleContext {
    readonly strings?: {
        t?(key: string, params?: Readonly<Record<string, string | number>>): string;
        locale?(): string;
        registerDefaults(namespace: string, bundles: Readonly<Record<string, StringTree>>): void;
    };
    readonly settings: Readonly<Record<string, unknown>>;
    readonly modules?: AdapterModules;
    readonly sdk: ScopedSdk;
    readonly http?: ScopedHttp;
    readonly realtime?: RealtimeView;
    readonly bus: ScopedBus;
    readonly session: SessionView;
    readonly storage?: ScopedStorage;
    readonly windows?: WindowClient;
    readonly actions?: ActionClient;
    readonly screens?: ScreenClient;
    readonly analytics?: Tracker;
    readonly poller?: Poller;
    readonly configs: ConfigsView;
    readonly filters: Filters;
    readonly facts: ModuleFacts;
    readonly platform?: PlatformView;
    readonly device?: DeviceView;
    readonly services: ModuleServices;
    readonly time: ServerTime;
    readonly log: Logger;
    readonly config: unknown;
    readonly appVersion?: string;
    readonly environment?: 'local' | 'dev' | 'test' | 'prod';
    readonly signal: AbortSignal;
}
export interface ModuleDefinition<Api = unknown> {
    readonly manifest: SdkModuleManifest;
    init(ctx: ModuleContext): Promise<void> | void;
    start?(ctx: ModuleContext): Promise<void>;
    stop?(reason: ModuleStopReason): Promise<void>;
    save?(signal: AbortSignal): Promise<readonly string[] | void>;
    dispose?(): Promise<void>;
    api(ctx: ModuleContext): Api;
}
export declare function defineModule<Api>(definition: ModuleDefinition<Api>): ModuleDefinition<Api>;
export declare function trackWrites(http: ScopedHttp): {
    readonly http: ScopedHttp;
    settle(signal?: AbortSignal): Promise<void>;
};
export declare const CORE_HTTP_SERVICES: readonly string[];
//# sourceMappingURL=module.d.ts.map
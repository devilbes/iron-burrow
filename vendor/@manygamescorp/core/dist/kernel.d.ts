import type { Analytics } from './analytics.js';
export type { Analytics, AnalyticsPayload, AnalyticsProvider } from './analytics.js';
import type { PortalGameUi } from './portal-domains.js';
import { type SkinSlot, type SkinSelection } from './skin-slot.js';
export type { SkinSlot, SkinSelection } from './skin-slot.js';
import { type UiState } from './ui-state.js';
import type { Profile } from './profile.js';
import { type Auth, type ProviderAuthAdapters } from './auth.js';
import type { EventBus, SdkDebug } from './bus-types.js';
import { type ConfigSelection, type Configs } from './configs.js';
import { type ContextChanged } from './filter-context.js';
import { type GameContext } from './facts.js';
import { type StorageBackend } from './storage/scoped.js';
import { type Assets } from './assets.js';
import { type Endpoints } from './endpoints.js';
import { type Filters } from './filters.js';
import { type ModuleLifecycleOptions } from './lifecycle.js';
import type { ModuleContext, ModuleDefinition, ModuleKind, ModuleState, SdkModuleManifest } from './module.js';
import { type PlatformAdapter } from './platform.js';
import { type ReliableHttpTransportOptions } from './transport.js';
import { type ServerTime } from './time.js';
import { type DeviceOptions } from './device.js';
import type { Device } from './device-types.js';
import { type ModuleStatus } from '@manygamescorp/contracts-client/module-composition';
import { type L10nNamespace } from './l10n.js';
import { type L10nRuntimeOptions } from './l10n/configs.js';
import { type ModuleWindow, type SdkUiWindows } from './window-triggers.js';
export { SDK_MODULE_FAILED, type ModuleFailed } from './loader.js';
export { CONTEXT_CHANGED, type ContextChanged } from './filter-context.js';
export { AUTH_PLAYER_CHANGED, type AuthPlayerChanged, AUTH_ACCOUNT_CHANGING, AUTH_ACCOUNT_CHANGED, type AuthAccountChange } from './auth.js';
export declare const SDK_FACTS_UNKNOWN_PARAM = "sdk:facts:unknown-param";
export interface SdkContext extends GameContext {
    on(listener: (event: ContextChanged) => void): () => void;
}
export declare const SDK_CORE_READY = "sdk:core:ready";
export declare const SDK_RELOAD_REQUIRED = "sdk:reload:required";
export interface ReloadRequired {
    readonly reason: 'logout' | 'revoked' | 'identity';
    readonly previousGid: number;
    readonly gid: number | null;
}
export type SdkState = 'created' | 'booting' | 'ready' | 'failed' | 'destroying' | 'destroyed';
export type KernelContext = Partial<Omit<ModuleContext, 'bus' | 'services' | 'signal' | 'platform' | 'config' | 'sdk' | 'modules' | 'time' | 'strings'>>;
export type { BusDebugRecord, SdkDebug } from './bus-types.js';
export interface SdkConfig {
    readonly portal?: object;
    readonly debug?: boolean;
    readonly modules: readonly ModuleDefinition[];
    readonly skin?: SkinSlot;
    readonly platformConfig?: unknown;
    readonly http?: Omit<ReliableHttpTransportOptions, 'endpoints' | 'authScope'>;
    readonly providerAdapters?: ProviderAuthAdapters;
    readonly storage?: StorageBackend;
    readonly configs?: ConfigSelection;
    readonly l10n?: Partial<Pick<L10nRuntimeOptions, 'defaultLocale'>> & Omit<L10nRuntimeOptions, 'defaultLocale'>;
    readonly platform?: PlatformAdapter | 'auto';
    readonly platformReadyTimeoutMs?: number;
    readonly device?: Omit<DeviceOptions, 'platform' | 'bus' | 'facts'>;
    readonly lifecycle?: ModuleLifecycleOptions;
    readonly moduleConfig?: Readonly<Record<string, unknown>>;
    readonly context?: (manifest: SdkModuleManifest) => KernelContext;
    readonly loader?: {
        readonly fetch?: typeof fetch;
        readonly import?: (url: string) => Promise<unknown>;
        readonly timeoutMs?: number;
        readonly localBase?: string;
        readonly indexTimeoutMs?: number;
        readonly overridesTimeoutMs?: number;
    };
}
export interface CoreReady {
    readonly modules: readonly string[];
    readonly failed: readonly string[];
}
export interface SdkL10n extends L10nNamespace {
    refresh(): Promise<void>;
}
export interface SdkModuleInfo {
    readonly id: string;
    readonly version: string;
    readonly kind: ModuleKind;
    readonly state: ModuleState;
    readonly source: 'local' | 'remote';
    readonly manifest: SdkModuleManifest;
}
export interface SdkPlatform {
    readonly id: string;
}
export interface Sdk {
    readonly [namespace: string]: unknown;
    readonly state: SdkState;
    readonly debug: SdkDebug;
    readonly analytics: Analytics;
    readonly bus: Pick<EventBus, 'on' | 'once' | 'off' | 'replay'>;
    readonly platform: SdkPlatform;
    readonly time: ServerTime;
    readonly device: Device;
    readonly endpoints: Endpoints | undefined;
    readonly assets: Assets;
    readonly auth?: Auth;
    readonly configs?: Configs;
    readonly profile?: Profile;
    readonly l10n: SdkL10n;
    readonly locale: {
        get(): string;
        on(event: 'changed', listener: (locale: string) => void): () => void;
    };
    readonly portal?: PortalGameUi;
    readonly context: SdkContext;
    readonly filters: Filters;
    readonly uiState: UiState;
    readonly ui: Omit<SdkUiWindows, 'register' | 'has' | 'enqueue' | 'resetSession'> & {
        elementAction(element: string, payload?: Readonly<Record<string, unknown>>): void;
    } & Readonly<Record<string, unknown>>;
    boot(): Promise<void>;
    destroy(): Promise<void>;
    getModule<Api = unknown>(id: string): Api;
    loadModule<Api = unknown>(id: string): Promise<Api>;
    modules: (() => readonly SdkModuleInfo[]) & {
        set(slot: 'skin', selection: SkinSelection | null): Promise<void>;
        register(module: string, options: {
            readonly windows: Readonly<Record<string, ModuleWindow>>;
        }): () => void;
    };
    moduleStatuses(): readonly ModuleStatus[];
}
export declare function createSdk(config: SdkConfig): Sdk;
//# sourceMappingURL=kernel.d.ts.map
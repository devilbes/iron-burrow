import { type ModuleOverride, type ModuleOverridesContext, type ModuleOverridesResult } from '@manygamescorp/contracts-client/module-settings';
import { type BuildSelection } from '@manygamescorp/contracts-client/module-targets';
import { type ModuleDefinition, type SdkModuleManifest } from './module.js';
export declare const SDK_MODULE_FAILED = "sdk:module:failed";
export interface ModuleFailed {
    readonly id: string | null;
    readonly version?: string;
    readonly source: 'local' | 'remote';
    readonly code: string;
}
export type { ModuleRef } from './module-ref.js';
import type { ModuleRef } from './module-ref.js';
export interface PackageVersion {
    readonly package: string;
    readonly version: string;
}
export interface SdkLock {
    readonly adapter?: PackageVersion;
    readonly modules: readonly ModuleRef[];
    readonly overrides?: {
        readonly scope: 'panel.sdk.overrides';
    };
}
export { parseModuleComposition, satisfies } from '@manygamescorp/contracts-client/module-composition';
export type { ModuleCompositionEntry, ModuleCompositionParse } from '@manygamescorp/contracts-client/module-composition';
export interface RemoteModuleManifest extends SdkModuleManifest {
    readonly package?: string;
    readonly files: {
        readonly scripts: readonly string[];
        readonly styles?: readonly string[];
        readonly assets?: readonly string[];
    };
}
export interface LoaderCache {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}
export interface ModuleLoaderOptions {
    readonly cdn: string;
    readonly coreVersion: string;
    readonly adapter?: PackageVersion;
    readonly build?: BuildSelection;
    readonly fetch?: typeof fetch;
    readonly import?: (url: string) => Promise<unknown>;
    readonly cache?: LoaderCache;
    readonly timeoutMs?: number;
    readonly localBase?: string;
    readonly indexTimeoutMs?: number;
    readonly modules?: readonly ModuleRef[];
    readonly localVersions?: Readonly<Record<string, string>>;
    readonly onFallback?: (event: {
        moduleId: string;
        from: string;
        to: string;
        reason: string;
    }) => void;
}
export declare const MAX_MANIFEST_BYTES: number;
export declare function parseSdkLock(platformConfig: unknown): SdkLock;
export interface ModulePlan {
    readonly local: readonly ModuleDefinition[];
    readonly remote: readonly ModuleRef[];
}
export declare function checkRequiredRef(manifest: Pick<SdkModuleManifest, 'id' | 'selection' | 'onEvent' | 'onRoute'> & {
    readonly load?: SdkModuleManifest['load'] | undefined;
}, ref: Pick<ModuleRef, 'source' | 'load' | 'onEvent' | 'onRoute'>): void;
export declare function planModules(input: {
    readonly local: readonly ModuleDefinition[];
    readonly lock: SdkLock;
}): ModulePlan;
export declare function resolveModuleSettings(manifest: Pick<SdkModuleManifest, 'id' | 'settings'>, ref: Pick<ModuleRef, 'settings'> | undefined, overrides?: readonly ModuleOverride[], context?: ModuleOverridesContext, report?: (result: ModuleOverridesResult) => void): Readonly<Record<string, unknown>>;
export declare function moduleBase(cdn: string, ref: Pick<ModuleRef, 'package' | 'version'>): URL;
export declare function checkRemoteManifest(value: unknown, ref: ModuleRef): SdkModuleManifest;
export declare function checkBuild(manifest: SdkModuleManifest, build: BuildSelection | undefined, remote?: boolean): void;
export declare function checkEngines(manifest: SdkModuleManifest, coreVersion: string, adapter: PackageVersion | undefined): void;
export declare function createModuleLoader(options: ModuleLoaderOptions): {
    load(ref: ModuleRef, signal?: AbortSignal, validate?: (manifest: SdkModuleManifest) => void): Promise<ModuleDefinition>;
    prepare(signal: AbortSignal): Promise<void>;
    retain(refs: readonly ModuleRef[]): void;
};
export interface RemoteModuleIndex {
    readonly coreVersion: string;
    readonly generatedAt: string;
    readonly modules: Readonly<Record<string, PackageVersion>>;
}
export declare function parseRemoteModuleIndex(value: unknown, coreVersion: string): RemoteModuleIndex | undefined;
export declare function readRemoteModuleIndex(options: {
    cdn: string;
    coreVersion: string;
    fetch?: typeof fetch;
    cache?: LoaderCache;
    timeoutMs?: number;
}, outer: AbortSignal): Promise<RemoteModuleIndex | undefined>;
//# sourceMappingURL=loader.d.ts.map
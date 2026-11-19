import { type BuildSelection, type BuildTarget } from './module-targets.js';
/** Build-owned module selection; runtime configuration cannot replace it. */
export interface ModuleCompositionEntry {
    readonly id: string;
    readonly package: string;
    readonly version: string;
    readonly source: 'local' | 'remote';
    readonly load: ModuleLoad;
    readonly onEvent?: string | undefined;
    readonly onRoute?: string | undefined;
    readonly settings?: Readonly<Record<string, unknown>>;
}
export interface ModuleCompositionParse {
    readonly modules: readonly ModuleCompositionEntry[];
    /** An invalid id is reported as null; rejected records never become operations. */
    readonly rejected: readonly (string | null)[];
    /** Only `undefined` means no config was supplied. An empty list is a present composition. */
    readonly present: boolean;
}
export declare const MAX_COMPOSITION_MODULES = 256;
export type ModuleLoad = 'eager' | 'on-demand' | 'lazy' | 'deferred' | 'on-event' | 'on-route';
export declare const MODULE_LOADS: readonly string[];
/** Validate an exact build trigger; unrelated trigger fields are rejected. */
export declare function validModuleLoading(value: {
    readonly load?: unknown;
    readonly onEvent?: unknown;
    readonly onRoute?: unknown;
}): boolean;
/** lazy is the explicit on-demand alias. */
export declare function normalizedModuleLoad(load: ModuleLoad): Exclude<ModuleLoad, 'lazy'>;
/** Parse untrusted config without interpreting legacy `add`/`disable`/`version` operations. */
export declare function parseModuleComposition(value: unknown): ModuleCompositionParse;
/** A strict semver subset: exact, comparison, caret, tilde, conjunction and `||`. */
export declare function satisfies(version: string, range: string): boolean;
/** Structural registry metadata; a core SdkModuleManifest with package metadata fits this shape. */
export interface ModuleCompositionManifest {
    readonly id: string;
    readonly package: string;
    readonly version: string;
    readonly requires?: Readonly<Record<string, string>>;
    readonly engines: {
        readonly core: string;
        readonly adapter?: string;
    };
    readonly targets: readonly BuildTarget[];
    readonly stores?: readonly string[];
    /** Runtime bridge capabilities, not npm installation requirements. */
    readonly nativePlugins?: readonly string[];
    readonly load?: ModuleCompositionEntry['load'];
    readonly onEvent?: string | undefined;
    readonly onRoute?: string | undefined;
    readonly selection?: 'required' | 'optional';
    readonly status?: 'ready' | 'beta' | 'soon';
}
export interface ModuleCompositionContext {
    readonly coreVersion: string;
    /** Selected platform adapter. Target/store metadata enables complete panel validation. */
    readonly adapter?: {
        readonly package: string;
        readonly version: string;
        readonly targets?: readonly BuildTarget[];
        readonly stores?: readonly string[];
    };
    readonly adapters?: Readonly<Partial<Record<SdkTarget, NonNullable<ModuleCompositionContext['adapter']>>>>;
    readonly build: BuildSelection;
    /** App goals; modules need to support at least one, and each dependency must fit its build. */
    readonly targets?: readonly SdkTarget[];
    readonly targetAdapters?: SdkTargetCatalog;
}
export interface ModuleCompositionError {
    readonly id: string;
    readonly reason: string;
    readonly code?: 'MODULE_NOT_READY' | 'MODULE_REMOTE_FORBIDDEN' | 'MODULE_TARGET_UNAVAILABLE';
}
/** Check the entire selected graph, reporting each transitive failure against its root module. */
export declare function checkModuleComposition(entries: readonly ModuleCompositionEntry[], manifests: readonly ModuleCompositionManifest[], context: ModuleCompositionContext): readonly ModuleCompositionError[];
export interface ModuleCompositionBuildInfo {
    /** Exact module versions and packages embedded in the current build. */
    readonly modules: readonly Pick<ModuleCompositionEntry, 'id' | 'package' | 'version'>[];
    /** Registry metadata for selected versions, including nativePlugins. */
    readonly manifests: readonly ModuleCompositionManifest[];
}
export type ModuleCompositionStatus = 'working' | 'failed' | 'pending-network';
export interface ModuleStatus {
    /** Module identifier in the build. */
    readonly id: string;
    /** Working artifact or isolated failure. */
    readonly status: ModuleCompositionStatus;
}
/** Availability of the immutable build selection. */
export declare function getModuleStatuses(composition: readonly ModuleCompositionEntry[], buildInfo: ModuleCompositionBuildInfo): readonly ModuleStatus[];
/** App goals are distinct from the runtime platform web/cordova. */
export type SdkTarget = string;
/** Published target-adapter catalog supplied by the build/panel, never inferred from an OS. */
export interface SdkTargetAdapter {
    readonly build: BuildSelection;
    readonly buildKit: string;
    readonly adapter: string;
    readonly modules?: readonly string[];
}
export type SdkTargetCatalog = Readonly<Record<SdkTarget, SdkTargetAdapter>>;
export declare function validSdkTargets(targets: readonly SdkTarget[], catalog?: SdkTargetCatalog): boolean;
export declare function sdkTargetBuild(target: SdkTarget, catalog: SdkTargetCatalog): BuildSelection;
export interface SdkRegistryVersion extends ModuleCompositionManifest {
    readonly kind: 'module' | 'ui-kit' | 'skin' | 'build-kit' | 'adapter';
    readonly state: 'published' | 'deprecated';
}
export interface SdkResolution {
    readonly modules: readonly SdkRegistryVersion[];
    readonly uiKit?: PackageVersionRef;
    /** Newest published skins compatible with core and every selected target. */
    readonly skins: readonly PackageVersionRef[];
    readonly buildKit: Readonly<Partial<Record<SdkTarget, PackageVersionRef>>>;
    readonly adapters: Readonly<Partial<Record<SdkTarget, PackageVersionRef>>>;
    readonly errors: readonly {
        readonly code: 'SDK_RESOLVE_FAILED';
        readonly package: string;
    }[];
}
interface PackageVersionRef {
    readonly package: string;
    readonly version: string;
}
/** Pure registry resolver: caller supplies the current published catalog, never network state. */
export declare function resolveSdk(coreVersion: string, targets: readonly SdkTarget[], registry: readonly SdkRegistryVersion[], targetAdapters: SdkTargetCatalog): SdkResolution;
export {};
//# sourceMappingURL=module-composition.d.ts.map
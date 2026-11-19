/**
 * Build target of a module (module.json `targets`/`stores`, client-sdk#239): which build
 * platform and which store a module implementation works under. Shared by the core manifest
 * check, the build-time lock resolver and the panel registry publication.
 */
export declare const BUILD_TARGETS: readonly ["web", "cordova"];
export type BuildTarget = (typeof BUILD_TARGETS)[number];
/** Known store ids; any id of this shape is accepted (platform.json `store`, E96). */
export declare const KNOWN_STORES: readonly ["google_play", "app_store"];
export declare const STORE_ID: RegExp;
export declare const MAX_STORES = 16;
/** The part of a module manifest that decides compatibility with a build. */
export interface ModuleTargets {
    readonly targets: readonly BuildTarget[];
    /** Store-bound modules (store adapters, native payments/ads): the build's store is listed. */
    readonly stores?: readonly string[];
}
/** Target of a build: platform.json `platform` and `store` (absent for plain web builds). */
export interface BuildSelection {
    readonly target: BuildTarget;
    readonly store?: string | undefined;
}
/** Problems of a `targets`/`stores` pair; empty when valid. Messages carry no rejected values. */
export declare function checkModuleTargets(targets: unknown, stores: unknown): string[];
/** The module fits the build: its target matches and, if store-bound, so does its store. */
export declare function supportsBuild(module: ModuleTargets, build: BuildSelection): boolean;
/** A feature of the composition (module or port) with every implementation the registry knows. */
export interface TargetFeature {
    /** Module id or capability name the build asks for. */
    readonly name: string;
    readonly implementations: readonly (ModuleTargets & {
        readonly id: string;
    })[];
}
/** Build error: an enabled feature has no implementation for the build's target and store. */
export declare class ModuleTargetError extends Error {
    readonly feature: string;
    readonly target: BuildTarget;
    readonly store: string | undefined;
    constructor(feature: string, build: BuildSelection);
}
export interface TargetResolution {
    /** Feature name → ids of the compatible implementations, in registry order. */
    readonly selected: ReadonlyMap<string, readonly string[]>;
    readonly errors: readonly ModuleTargetError[];
}
/** Keeps only implementations that fit the build; a feature left with none is an error. */
export declare function resolveForBuild(features: readonly TargetFeature[], build: BuildSelection): TargetResolution;
//# sourceMappingURL=module-targets.d.ts.map
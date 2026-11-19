/** Optional E185 discovery metadata; minigame is a label, not a runtime mode. */
export interface ModuleMechanicMetadata {
    /** Supported discovery modes. */
    readonly modes?: readonly ('core' | 'minigame')[];
    /** Search genre slugs. */
    readonly genres?: readonly string[];
    /** Independently reusable mechanic layers. */
    readonly layers?: {
        /** Deterministic engine entry and exact version. */
        readonly engine: {
            /** JavaScript entry relative to the artifact root. */
            readonly entry: string;
            /** Exact engine semver used by copied presentations. */
            readonly version: string;
        };
        /** Copyable renderer and its signed file patterns. */
        readonly presentation?: {
            /** JavaScript renderer entry relative to the artifact root. */
            readonly entry: string;
            /** Optional exact version of the reference presentation. */
            readonly version?: string;
            /** Safe file paths or whole-segment glob patterns resolved against signed files. */
            readonly files: readonly string[];
            /** Whether this presentation is offered for copying into a game. */
            readonly copyable: boolean;
        };
        /** Server verifier and configuration scopes; no server code is copied. */
        readonly server?: {
            /** Server verifier protocol and mechanic identifier. */
            readonly verifier: string;
            /** Config scope patterns owned by the mechanic. */
            readonly configScopes: readonly string[];
            /** Optional exact server layer version. */
            readonly version?: string;
        };
    };
    /** Named public extension points; these confer no runtime rights. */
    readonly extensionPoints?: readonly string[];
}
/** Exact, bounded semver for independent layer versions. */
export declare const mechanicVersion: (v: unknown) => v is string;
/** Normalize the package-relative ./ notation used in E185 source descriptors. */
export declare const mechanicPath: (v: string) => string;
/** Safe package path, optionally allowing whole-segment * and ** file patterns. */
export declare function validMechanicPath(v: unknown, pattern?: boolean): v is string;
/** Shared structural validation used by defineModule, publisher and loader. */
export declare function validateModuleMechanic(value: unknown): readonly string[];
/** Resolve copy patterns only against the signed file map, never the filesystem. */
export declare function mechanicCopyFiles(metadata: ModuleMechanicMetadata, files: readonly string[]): readonly string[];
/** Validate layer entries and copy patterns against the existing signed artifact file map. */
export declare function validateModuleMechanicFiles(value: unknown): readonly string[];
/** Rebase layer paths along with the existing runtime -> npm dist/ file map. */
export declare function rebaseModuleMechanic(metadata: ModuleMechanicMetadata, prefix: string): ModuleMechanicMetadata;
//# sourceMappingURL=module-mechanic.d.ts.map
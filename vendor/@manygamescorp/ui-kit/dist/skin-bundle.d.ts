import { type Skin, type SkinHandle, type UseSkinOptions } from './skin-spec.js';
import { parseSkinBundle, type SkinBundleSpec } from './skin-bundle-schema.js';
export interface SkinBundleModule {
    readonly id: string;
    readonly version: string;
    readonly kind: 'skin';
    readonly compat: Readonly<{
        'ui-kit': string;
    }>;
    readonly ui?: {
        readonly windows?: readonly string[];
    };
}
export interface SkinBundleRef {
    readonly manifest: SkinBundleModule;
    readonly baseURL: string;
}
export interface SkinBundleFallback {
    readonly skin: string;
    readonly fallback: 'neutral';
    readonly code: 'UI_SKIN_MISSING';
    readonly key?: string;
}
export interface SkinBundleOptions extends Pick<UseSkinOptions, 'document' | 'dev'> {
    readonly uiKitVersion: string;
    readonly satisfies: (version: string, range: string) => boolean;
    readonly fetch?: typeof fetch;
    readonly signal?: AbortSignal;
    readonly timeoutMs?: number;
    readonly resolve?: (id: string) => SkinBundleRef | undefined | Promise<SkinBundleRef | undefined>;
    readonly diagnostic?: (event: 'sdk:ui:skin-fallback', detail: SkinBundleFallback) => void;
}
export declare function loadSkinBundle(ref: SkinBundleRef, options: SkinBundleOptions): Promise<Skin>;
export declare function applySkinBundle(ref: SkinBundleRef | undefined, options: SkinBundleOptions): Promise<SkinHandle>;
export { parseSkinBundle };
export type { SkinBundleSpec };
//# sourceMappingURL=skin-bundle.d.ts.map
import { type Skin } from './skin-spec.js';
export interface SkinRef {
    readonly manifest: string;
    readonly sha256: string;
    readonly version: string;
}
export interface SkinsConfig {
    readonly skins: readonly (SkinRef & {
        readonly id: string;
    })[];
    readonly map: readonly {
        readonly scope: string;
        readonly skin: string;
        readonly when?: unknown;
    }[];
}
export interface SkinFailure {
    readonly scope: string;
    readonly skin: string;
    readonly code: string;
}
export interface SkinCache {
    read(sha256: string, signal: AbortSignal): Promise<Uint8Array | undefined>;
    write(sha256: string, bytes: Uint8Array, signal: AbortSignal): Promise<void>;
}
export interface SkinCatalogOptions {
    readonly assets: {
        url(key: string): string;
    };
    readonly fetch?: typeof fetch;
    readonly cache?: SkinCache;
    readonly document?: Document;
    readonly timeoutMs?: number;
    readonly preloadScopes?: readonly string[];
    readonly source?: {
        read(): SkinsConfig | undefined;
        subscribe(listener: () => void): () => void;
    };
    readonly windows?: {
        useSkinScopes(port: {
            preload(scope: string): Promise<unknown>;
            generation?(): unknown;
        }): () => void;
    };
    readonly match?: (filter: unknown) => boolean;
    readonly diagnostic?: (event: 'sdk:ui:skin-failed', detail: SkinFailure) => void;
}
export declare function registerSkin(id: string, ref: SkinRef): void;
export declare function loadSkin(id: string): Promise<Skin>;
export declare function resolveSkin(scope: string): {
    readonly skinId: string | undefined;
    readonly source: 'config' | 'game' | 'mechanic' | 'kit';
};
export declare function preloadSkinScope(scope: string): Promise<void>;
export declare function updateSkinsConfig(config: SkinsConfig): Promise<void>;
export declare function initSkins(options: SkinCatalogOptions): {
    update(config: SkinsConfig): Promise<void>;
    refresh(): Promise<void>;
    dispose(): void;
};
//# sourceMappingURL=skin-catalog.d.ts.map
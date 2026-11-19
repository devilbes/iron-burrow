export type { AssetRef } from '@manygamescorp/contracts-client/asset-ref';
export interface AssetResolveOptions {
    readonly assetUrl?: (id: string) => string;
    readonly skinAsset?: (key: string) => string | undefined;
    readonly allowedHosts?: readonly string[];
}
export type ResolvedAsset = {
    readonly kind: 'skin' | 'image';
    readonly url: string;
};
export declare function resolveAssetRef(ref: unknown, options?: AssetResolveOptions): ResolvedAsset | undefined;
//# sourceMappingURL=asset-ref.d.ts.map
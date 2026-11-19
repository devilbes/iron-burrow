import type { AssetResolveOptions } from './asset-ref.js';
export interface Assets {
    url(key: string): string;
    resolve(ref: string, options?: Pick<AssetResolveOptions, 'skinAsset'>): string;
}
export declare function createAssets(cdnBase?: string, allowedHosts?: readonly string[]): Assets;
//# sourceMappingURL=assets.d.ts.map
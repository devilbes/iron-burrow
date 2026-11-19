import { type AssetRef } from '@manygamescorp/contracts-client/asset-ref';
import { type ViewNode } from './core.js';
export interface AssetImageOptions {
    readonly assetUrl?: (ref: string) => string;
    readonly skinScope?: string;
    readonly lang?: string;
    readonly density?: number;
    readonly dev?: boolean;
}
export interface AssetImageProps extends AssetImageOptions {
    readonly ref: AssetRef;
    readonly alt?: string;
    readonly width?: number;
    readonly height?: number;
}
export declare function assetImageView(ref: unknown, options?: AssetImageOptions, attrs?: Record<string, string | number>): ViewNode;
export declare const ASSET_IMAGE_CSS = "\nimg[data-asset-kind],svg[data-asset-kind]{max-width:100%;object-fit:contain}\nimg[data-asset-kind][data-loading]{background:var(--kit-asset-placeholder,currentColor);opacity:.2}\n[data-part=asset-placeholder]{display:inline-block;min-width:1em;min-height:1em}\n";
export declare const AssetImage: import("./core.js").KitComponent<AssetImageProps>;
//# sourceMappingURL=asset-image.d.ts.map
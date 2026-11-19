import { onSkinChange, type ClosePosition, type DisplayTitleSpec, type SkinLevel, type WindowTemplate } from './skin-layer.js';
import { type FeatureProps } from './features/shared.js';
import { displayTitleView } from './features/display-title.js';
import { type Skin } from './skin-spec.js';
export { defineSkin, useSkin, skinSheetsOf } from './skin-spec.js';
export type { Skin, SkinSpec, SkinFont, SkinHandle, UseSkinOptions } from './skin-spec.js';
export type { ClosePosition, DisplayTitleSpec, SkinLevel, WindowTemplate, WindowLayout } from './skin-layer.js';
export { onSkinChange };
export declare function activeSkins(): readonly {
    readonly id: string;
    readonly level: SkinLevel;
    readonly scope?: string;
}[];
export declare function skinAssetUrl(key: string, options?: {
    readonly scope?: string;
}): string | undefined;
export declare function withSkinAssets(assetUrl?: (key: string) => string): (key: string) => string;
export declare function adoptSkin(root: ShadowRoot | Document, name?: string, options?: (() => void) | {
    readonly scope?: string;
    readonly redraw?: () => void;
}): () => void;
export interface ManifestSkin {
    readonly css?: Readonly<Record<string, string>>;
    readonly assets?: Readonly<Record<string, string>>;
    readonly displayTitle?: DisplayTitleSpec;
    readonly closePosition?: ClosePosition;
    readonly windows?: Readonly<Record<string, WindowTemplate>>;
}
export declare function skinFromManifest(id: string, skin: ManifestSkin, moduleBase: string): Skin;
export interface DisplayTitleProps extends FeatureProps {
    readonly text: string;
    readonly arc?: number;
}
export declare const displayTitle: import("./core.js").KitComponent<DisplayTitleProps>;
export { displayTitleView };
export { registerSkin, loadSkin, resolveSkin, initSkins, updateSkinsConfig, preloadSkinScope } from './skin-catalog.js';
export type { SkinRef, SkinsConfig, SkinCache, SkinCatalogOptions, SkinFailure } from './skin-catalog.js';
export { parseSkinBundle, loadSkinBundle, applySkinBundle } from './skin-bundle.js';
export type { SkinBundleSpec, SkinBundleModule, SkinBundleRef, SkinBundleOptions, SkinBundleFallback } from './skin-bundle.js';
export type { SkinWindowOverride } from './skin-bundle-schema.js';
export type { SkinLayout } from './skin-layer.js';
export declare function renderWithSkin<T>(skin: Skin, render: () => T): T;
export { createSkinSlot } from './skin-slot.js';
//# sourceMappingURL=skin.d.ts.map
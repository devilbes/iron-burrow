import type { AssetVariant } from '@manygamescorp/contracts-client/asset-ref';
import type { WindowOrientation } from './window-layout.js';
export type SkinLevel = 'kit' | 'mechanic' | 'game' | 'scope';
export interface SkinSheetText {
    readonly target: string;
    readonly text: string;
    readonly baseURL?: string;
}
export interface DisplayTitleSpec {
    readonly arc?: number;
    readonly windows?: boolean;
}
export type ClosePosition = 'head-right' | 'head-left' | 'corner-out';
export type SkinLayout = {
    readonly slot: string;
} | {
    readonly tag: 'div' | 'section' | 'article' | 'header' | 'footer' | 'aside' | 'main';
    readonly class?: string;
    readonly children: readonly SkinLayout[];
};
export interface WindowLayout {
    readonly mode: 'centered' | 'fullscreen';
    readonly slots?: readonly string[];
    readonly layout?: SkinLayout;
    readonly heading?: Readonly<{
        ru: string;
        en: string;
    }>;
}
export interface WindowTemplate extends WindowLayout {
    readonly portrait?: WindowLayout;
    readonly landscape?: WindowLayout;
}
export interface SkinLayer {
    readonly id: string;
    readonly level: SkinLevel;
    readonly scope?: string | undefined;
    readonly sheets: readonly SkinSheetText[];
    readonly assets: Readonly<Record<string, string>>;
    readonly assetVariants?: Readonly<Record<string, readonly AssetVariant[]>> | undefined;
    readonly displayTitle?: DisplayTitleSpec;
    readonly closePosition?: ClosePosition;
    readonly windows?: Readonly<Record<string, WindowTemplate>>;
    readonly missing?: (key: string) => void;
    readonly neutralBase?: boolean;
}
export interface SkinTarget {
    readonly root: ShadowRoot;
    readonly name: string | undefined;
    readonly scope?: string | undefined;
    readonly redraw: () => void;
}
export declare function skinLayers(): readonly SkinLayer[];
export declare function skinSheets(doc: Document, targets: readonly string[], scope?: string, source?: readonly SkinLayer[]): CSSStyleSheet[];
export declare function followSkin(target: SkinTarget): () => void;
export declare function adoptSkinInto(root: ShadowRoot | Document, name?: string, redraw?: () => void, scope?: string): () => void;
export declare function addSkinLayer(layer: SkinLayer, doc?: Document): () => void;
export declare function assetOfLayer(layer: SkinLayer, key: string, locale?: string, density?: number): string | undefined;
export declare function skinAssetOf(key: string, scope?: string, locale?: string, density?: number): string | undefined;
export declare function displayTitleOf(scope?: string): DisplayTitleSpec | undefined;
export declare function windowTemplateOf(target: string, scope?: string, orientation?: WindowOrientation): WindowLayout | undefined;
export declare function closePositionOf(): ClosePosition | undefined;
export declare function onSkinChange(listener: () => void): () => void;
export declare function validSkinScope(scope: string): boolean;
export declare function useScopePreloader(preload: (scope: string) => Promise<unknown>): () => void;
export declare function renderingSkinScope(): string | undefined;
export declare function withRenderingSkinScope<T>(scope: string | undefined, render: () => T): T;
export declare function renderingSkinLayer(): SkinLayer | undefined;
export declare function withRenderingSkinLayer<T>(layer: SkinLayer | undefined, render: () => T): T;
export declare function beginSkinBundle(): () => boolean;
//# sourceMappingURL=skin-layer.d.ts.map
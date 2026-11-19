import type { AssetVariant } from '@manygamescorp/contracts-client/asset-ref';
import { type ClosePosition, type DisplayTitleSpec, type SkinLevel, type WindowTemplate, type SkinSheetText } from './skin-layer.js';
export interface SkinFont {
    readonly family: string;
    readonly url: string;
    readonly weight?: number | string;
    readonly style?: 'normal' | 'italic';
    readonly unicodeRange?: string;
}
export interface SkinSpec {
    readonly extends?: Skin | 'neutral';
    readonly id: string;
    readonly base?: string;
    readonly tokens?: Readonly<Record<string, string>>;
    readonly css?: Readonly<Record<string, string | URL>>;
    readonly assets?: Readonly<Record<string, string>>;
    readonly assetVariants?: Readonly<Record<string, readonly AssetVariant[]>>;
    readonly fonts?: readonly SkinFont[];
    readonly displayTitle?: DisplayTitleSpec | true;
    readonly closePosition?: ClosePosition;
    readonly windows?: Readonly<Record<string, WindowTemplate>>;
}
export interface Skin {
    readonly extends?: string;
    readonly id: string;
    readonly base: string;
    readonly tokens: Readonly<Record<string, string>>;
    readonly css: Readonly<Record<string, {
        readonly text: string;
        readonly baseURL?: string;
    } | {
        readonly url: string;
    }>>;
    readonly assets: Readonly<Record<string, string>>;
    readonly assetVariants?: Readonly<Record<string, readonly AssetVariant[]>>;
    readonly fonts: readonly SkinFont[];
    readonly displayTitle?: DisplayTitleSpec;
    readonly closePosition?: ClosePosition;
    readonly windows?: Readonly<Record<string, WindowTemplate>>;
}
export interface UseSkinOptions {
    readonly level?: SkinLevel;
    readonly scope?: string;
    readonly document?: Document;
    readonly missing?: (key: string) => void;
    readonly neutralBase?: boolean;
    readonly dev?: boolean;
    readonly fetch?: (url: string, init?: RequestInit) => Promise<{
        readonly ok: boolean;
        text(): Promise<string>;
    }>;
    readonly signal?: AbortSignal;
}
export interface SkinHandle {
    readonly id: string;
    readonly level: SkinLevel;
    readonly scope?: string;
    remove(): void;
}
export declare const TARGET: RegExp;
export declare function invalid(why: string): never;
export declare function pageBase(): string;
export declare function absolute(value: unknown, base: string, why: string): string;
export declare function defineSkin(spec: SkinSpec): Skin;
export declare function skinSheetsOf(skin: Skin, fetcher?: UseSkinOptions['fetch'], signal?: AbortSignal): Promise<SkinSheetText[]>;
export declare function useSkin(skin: Skin, options?: UseSkinOptions): Promise<SkinHandle>;
export declare function prepareSkin(skin: Skin, options?: UseSkinOptions): Promise<() => SkinHandle>;
//# sourceMappingURL=skin-spec.d.ts.map
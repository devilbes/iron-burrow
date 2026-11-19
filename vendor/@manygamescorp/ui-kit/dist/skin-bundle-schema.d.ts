import { type SkinFont } from './skin-spec.js';
import type { ClosePosition, DisplayTitleSpec, WindowTemplate } from './skin-layer.js';
export interface SkinWindowOverride {
    readonly component: string;
    readonly template: string;
    readonly css?: string;
}
export interface SkinBundleSpec {
    readonly id: string;
    readonly version: string;
    readonly kind: 'skin';
    readonly extends?: string;
    readonly compat: Readonly<{
        'ui-kit': string;
    }>;
    readonly tokens?: Readonly<Record<string, string>>;
    readonly fonts?: readonly SkinFont[];
    readonly displayTitle?: DisplayTitleSpec | true;
    readonly closePosition?: ClosePosition;
    readonly overrides?: Readonly<Record<string, string | SkinWindowOverride>>;
    readonly locales?: Readonly<Record<string, string>>;
    readonly integrity: 'integrity.json';
}
export declare function bundlePath(value: unknown): string;
export declare function bundleAssetPath(value: unknown): {
    path: string;
    fragment: string;
};
export declare function object(value: unknown): Record<string, unknown>;
export declare function parseSkinBundle(value: unknown): SkinBundleSpec;
export declare function parseSkinTemplate(value: unknown, window: string): WindowTemplate;
//# sourceMappingURL=skin-bundle-schema.d.ts.map
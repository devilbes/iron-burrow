import type { KitComponent } from '../core.js';
import type { HudItemSpec } from '../services/hud-contract.js';
import type { BottomMenuItemSpec } from '../services/bottommenu.js';
import type { TopBarItemSpec } from '../services/topbar.js';
export interface PreviewContext {
    readonly lang: 'ru' | 'en';
    readonly now: number;
    readonly t: (ru: string, en: string) => string;
}
export interface PreviewWindow {
    readonly title: string;
    readonly component: KitComponent<never>;
    readonly props: Readonly<Record<string, unknown>>;
}
export interface PreviewParts {
    readonly hud?: readonly HudItemSpec[];
    readonly bottomMenu?: readonly BottomMenuItemSpec[];
    readonly topBar?: readonly TopBarItemSpec[];
    readonly windows?: Readonly<Record<string, PreviewWindow>>;
}
export interface PreviewModuleDef {
    parts(settings: Readonly<Record<string, unknown>>, ctx: PreviewContext): PreviewParts;
}
export declare const NOT_PREVIEWED: (id: string) => boolean;
export declare const PREVIEW_MODULES: Readonly<Record<string, PreviewModuleDef>>;
//# sourceMappingURL=modules.d.ts.map
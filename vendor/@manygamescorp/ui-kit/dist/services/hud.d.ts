import type { ViewNode } from '../core.js';
import { type FeatureProps } from '../features/shared.js';
export interface HudViewItem {
    readonly id: string;
    readonly icon: string;
    readonly label: string;
    readonly value?: string | number;
    readonly change?: {
        readonly direction: 'up' | 'down';
        readonly revision: number;
        readonly from?: number;
    };
    readonly add?: {
        readonly id: string;
        readonly label: string;
    };
    readonly progress?: number;
    readonly state?: 'active' | 'locked';
    readonly current?: boolean;
    readonly timer?: {
        readonly remainingMs: number;
    };
    readonly badge?: {
        readonly kind: 'dot' | 'count';
        readonly value?: number;
    };
}
export interface HudProps extends FeatureProps {
    readonly slot: 'left' | 'right' | 'top' | 'menu';
    readonly group?: 'left' | 'center' | 'right';
    readonly ariaLabel?: string;
    readonly items: readonly HudViewItem[];
}
export declare function formatRemaining(ms: number): string;
export declare function formatBadgeRemaining(ms: number, lang: string, l10n?: FeatureProps['l10n']): string;
export declare function formatMenuRemaining(ms: number, lang: string, l10n?: FeatureProps['l10n']): string;
export declare const TICK_UP_DELAY_MS = 700;
export declare function tickUpValues(root: ParentNode): void;
export declare function hudView(p: HudProps): ViewNode;
export declare function hudItemView(p: HudProps, item: HudViewItem, presentation?: 'hud' | 'bottommenu'): ViewNode;
export declare const hud: import("../core.js").KitComponent<HudProps>;
//# sourceMappingURL=hud.d.ts.map
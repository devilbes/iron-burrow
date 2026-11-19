import { type ProgressReadProps } from './progress-status.js';
import { type FeatureProps } from './shared.js';
export interface DailyRewardExtra {
    readonly icon: string;
    readonly amount: string | number;
    readonly art?: string;
}
export interface DailyRewardDay {
    readonly key: string;
    readonly title: string;
    readonly amount: string | number;
    readonly icon: string;
    readonly status: 'locked' | 'available' | 'claimed' | 'pending' | 'failed';
    readonly art?: string;
    readonly wide?: boolean;
    readonly caption?: string;
    readonly extra?: readonly DailyRewardExtra[];
    readonly operationId?: string;
}
export interface DailyRewardProps extends FeatureProps, ProgressReadProps {
    readonly title?: string;
    readonly subtitle?: string;
    readonly trackKey: string;
    readonly days: readonly DailyRewardDay[];
    readonly retryClaim?: boolean;
    readonly nextInMs?: number;
    readonly l10n?: (key: string) => string;
}
export declare const DAILY_STRINGS: Readonly<Record<'ru' | 'en', Readonly<Record<string, string>>>>;
type DailyText = (key: string, params?: Readonly<Record<string, string | number>>) => string;
export declare function dailyText(p: Pick<DailyRewardProps, 'lang' | 'l10n'>): DailyText;
export declare function dailyRewardView(p: DailyRewardProps): import("../view-types.js").ViewNode;
export declare const dailyReward: import("../core.js").KitComponent<DailyRewardProps>;
export {};
//# sourceMappingURL=daily-reward-window.d.ts.map
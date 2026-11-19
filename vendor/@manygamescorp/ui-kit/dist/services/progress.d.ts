import { type FeatureProps, type Outcome } from '../features/shared.js';
import { type DailyRewardDay } from '../features/daily-reward-window.js';
export { dailyReward, dailyRewardView, DAILY_STRINGS, type DailyRewardDay, type DailyRewardExtra, type DailyRewardProps } from '../features/daily-reward-window.js';
export interface LevelCard {
    readonly key: string;
    readonly n: number;
    readonly title: string;
    readonly stars?: number;
    readonly locked?: boolean;
}
export interface PuzzleView {
    readonly cells: readonly number[];
    readonly special: readonly number[];
    readonly objective: unknown;
    readonly hand: readonly ({
        readonly cells: readonly (readonly number[])[];
        readonly w: number;
        readonly h: number;
    } | null)[];
    readonly selectedSlot: number;
    readonly remainingMs: number;
    readonly frozenMs: number;
    readonly moves: number;
    readonly won?: boolean | undefined;
    readonly hint?: {
        readonly slot: number;
        readonly r: number;
        readonly c: number;
    } | null;
    readonly quantities: Readonly<Record<string, number>>;
    readonly pendingSpend?: string | undefined;
    readonly pendingReward?: string | undefined;
    readonly verified?: boolean | undefined;
    readonly rewarded: readonly string[];
}
export interface ProgressProps extends FeatureProps {
    readonly levels: readonly LevelCard[];
    readonly result?: Outcome;
    readonly puzzle?: PuzzleView;
}
export declare function progressView(p: ProgressProps): import("../view-types.js").ViewNode;
export declare const progress: import("../core.js").KitComponent<ProgressProps>;
export interface RetentionTrack {
    readonly key: string;
    readonly title: string;
    readonly category: string;
    readonly dailyDays?: readonly DailyRewardDay[];
    readonly status: 'active' | 'completed' | 'unavailable';
    readonly endsAt: string | null;
    readonly steps: readonly {
        readonly key: string;
        readonly title: string;
        readonly status: 'locked' | 'available' | 'completed';
        readonly availableAt: string | null;
        readonly conditions: readonly {
            readonly value: number;
            readonly target: number;
            readonly completed: boolean;
        }[];
    }[];
    readonly groups: readonly {
        readonly title: string;
        readonly completed: boolean;
    }[];
    readonly rewards: readonly {
        readonly operationId: string;
        readonly status: 'available' | 'issued' | 'failed';
        readonly claimMode: 'auto' | 'manual';
        readonly items: readonly {
            readonly name: string;
            readonly quantity: number;
        }[];
    }[];
}
export interface RetentionProps extends FeatureProps {
    readonly tracks: readonly RetentionTrack[];
    readonly retryClaim?: boolean;
    readonly pending?: boolean;
    readonly loginSent?: boolean;
    readonly result?: Outcome;
}
export declare function retentionView(p: RetentionProps): import("../view-types.js").ViewNode;
export declare const retention: import("../core.js").KitComponent<RetentionProps>;
//# sourceMappingURL=progress.d.ts.map
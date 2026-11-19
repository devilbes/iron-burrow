import { type FeatureProps } from '../features/shared.js';
import type { ViewNode } from '../core.js';
import type { DailyRewardDay } from '../features/daily-reward-window.js';
export type DailyStatus = 'claimed' | 'available' | 'locked';
export interface DailyItem {
    readonly icon: string;
    readonly amount: string | number;
}
export interface BoardDay {
    readonly key: string;
    readonly title: string;
    readonly status: DailyStatus;
    readonly items: readonly DailyItem[];
}
export interface BoardPrize {
    readonly title: string;
    readonly caption: string;
    readonly items?: readonly DailyItem[];
    readonly art?: string;
    readonly locked?: boolean;
}
export interface DailyBoardProps extends FeatureProps {
    readonly trackKey: string;
    readonly title?: string;
    readonly subtitle?: string;
    readonly days: readonly BoardDay[];
    readonly prize?: BoardPrize;
    readonly operationId?: string;
    readonly claim?: DailyItem;
    readonly claimDouble?: DailyItem;
    readonly doubleAvailable?: boolean;
    readonly retryClaim?: boolean;
    readonly nextInMs?: number;
}
export declare function dailyBoardView(p: DailyBoardProps): ViewNode;
export declare const dailyBoard: import("../core.js").KitComponent<DailyBoardProps>;
export interface CalendarGame {
    readonly id: string;
    readonly name: string;
    readonly tone: 'mint' | 'coral' | 'violet' | 'gold';
}
export interface CalendarDay {
    readonly key: string;
    readonly title: string;
    readonly status: 'claimed' | 'today' | 'upcoming';
    readonly icon: string;
    readonly played?: readonly string[];
    readonly pending?: readonly string[];
    readonly doubled?: boolean;
}
export interface DailyCalendarProps extends FeatureProps {
    readonly trackKey: string;
    readonly title?: string;
    readonly intro?: string;
    readonly days: readonly CalendarDay[];
    readonly games: readonly CalendarGame[];
    readonly chest?: {
        readonly title: string;
        readonly icon?: string;
    };
    readonly bonus?: {
        readonly gameId: string;
        readonly text: string;
    };
    readonly operationId?: string;
    readonly claimLabel?: string;
    readonly claimIcon?: string;
}
export declare function dailyCalendarView(p: DailyCalendarProps): ViewNode;
export declare const dailyCalendar: import("../core.js").KitComponent<DailyCalendarProps>;
export interface DailyGiftProps extends FeatureProps {
    readonly title?: string;
    readonly contents: readonly {
        readonly icon?: string;
        readonly label: string;
        readonly amount?: string | number;
    }[];
    readonly surprise?: boolean;
    readonly adRequired?: boolean;
    readonly operationId?: string;
}
export declare function dailyGiftView(p: DailyGiftProps): ViewNode;
export declare const dailyGift: import("../core.js").KitComponent<DailyGiftProps>;
export interface PlanDay {
    readonly day: number;
    readonly reward: readonly {
        readonly id: string;
        readonly amount: number;
    }[];
}
export interface PlanDaysState {
    readonly claimed: number;
    readonly operationId?: string;
    readonly icons?: Readonly<Record<string, string>>;
}
export declare function planBoardDays(days: readonly PlanDay[], s: PlanDaysState): readonly BoardDay[];
export declare function planWeekDays(days: readonly PlanDay[], s: PlanDaysState): readonly DailyRewardDay[];
//# sourceMappingURL=daily-rewards.d.ts.map
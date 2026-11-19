import { type ProgressReadProps } from '../features/progress-status.js';
export type { ProgressReadProps } from '../features/progress-status.js';
import { type FeatureProps } from '../features/shared.js';
import { type PopupKind, type ViewNode } from '../core.js';
export interface Reward {
    readonly label: string;
    readonly value: string | number;
}
export interface Task {
    readonly id: string;
    readonly title: string;
    readonly value: number;
    readonly target: number;
    readonly reward?: string | number;
    readonly rewardLabel?: string;
    readonly rewardIcon?: string;
    readonly rewardIconUrl?: string;
    readonly state?: 'progress' | 'claimable' | 'claimed' | 'done' | 'locked';
    readonly lock?: {
        readonly label: string;
        readonly badge: string;
    };
    readonly icon?: string;
}
export interface Achievement {
    readonly id: string;
    readonly title: string;
    readonly state: 'claimed' | 'claimable' | 'progress';
    readonly value?: number;
    readonly target?: number;
    readonly icon?: string;
}
export interface Cross {
    readonly game: string;
    readonly name: string;
    readonly title: string;
    readonly text: string;
    readonly cta: string;
}
export interface LevelMapProps extends FeatureProps {
    readonly title?: string;
    readonly subtitle?: string;
    readonly description?: string;
    readonly starsTotal: number;
    readonly starsMax: number;
    readonly levels: readonly {
        readonly key: string;
        readonly n: number;
        readonly state: 'done' | 'current' | 'locked';
        readonly stars?: number;
        readonly goal?: string;
    }[];
}
export declare const levelMap: Readonly<{
    view: (p: LevelMapProps) => ViewNode;
    presentation?: "fullscreen";
    popupKind?: PopupKind;
    mount(container: HTMLElement, props: LevelMapProps): void;
    update(container: HTMLElement, props: LevelMapProps): void;
    unmount(container: HTMLElement): void;
}>;
export interface WinReward extends Reward {
    readonly icon?: string;
    readonly art?: string;
    readonly accent?: boolean;
}
export interface LevelWinProps extends FeatureProps {
    readonly level: number;
    readonly stars: number;
    readonly rewards: readonly WinReward[];
    readonly rank?: number;
    readonly canDouble?: boolean;
}
export declare const levelWin: Readonly<{
    view: (p: LevelWinProps) => ViewNode;
    presentation?: "fullscreen";
    popupKind?: PopupKind;
    mount(container: HTMLElement, props: LevelWinProps): void;
    update(container: HTMLElement, props: LevelWinProps): void;
    unmount(container: HTMLElement): void;
}>;
export interface LevelLoseProps extends FeatureProps {
    readonly level: number;
    readonly score: number;
    readonly target: number;
    readonly reason: 'time' | 'moves' | 'blocked';
    readonly goalUnit?: 'points' | 'lines';
    readonly summary?: string;
    readonly canExtend?: boolean;
    readonly stats?: {
        readonly seconds: number;
        readonly moves: number;
    };
}
export declare const levelLose: Readonly<{
    view: (p: LevelLoseProps) => ViewNode;
    presentation?: "fullscreen";
    popupKind?: PopupKind;
    mount(container: HTMLElement, props: LevelLoseProps): void;
    update(container: HTMLElement, props: LevelLoseProps): void;
    unmount(container: HTMLElement): void;
}>;
export interface LevelFailProps extends FeatureProps {
    readonly level: number;
    readonly attempts: number;
    readonly promo?: Cross;
    readonly games?: readonly string[];
}
export declare const levelFail: Readonly<{
    view: (p: LevelFailProps) => ViewNode;
    presentation?: "fullscreen";
    popupKind?: PopupKind;
    mount(container: HTMLElement, props: LevelFailProps): void;
    update(container: HTMLElement, props: LevelFailProps): void;
    unmount(container: HTMLElement): void;
}>;
export interface PointsProps extends FeatureProps {
    readonly level: number;
    readonly stars: number;
    readonly reward: number;
    readonly bonus?: number;
    readonly balance: number;
    readonly games?: readonly string[];
}
export declare const points: Readonly<{
    view: (p: PointsProps) => ViewNode;
    presentation?: "fullscreen";
    popupKind?: PopupKind;
    mount(container: HTMLElement, props: PointsProps): void;
    update(container: HTMLElement, props: PointsProps): void;
    unmount(container: HTMLElement): void;
}>;
export interface QuestsProps extends FeatureProps, ProgressReadProps {
    readonly title?: string;
    readonly variant?: 'board';
    readonly periods: readonly {
        readonly id: string;
        readonly label: string;
        readonly badge?: number;
        readonly reward?: boolean;
    }[];
    readonly period: string;
    readonly periodsLabel?: string;
    readonly section?: string;
    readonly tasks: readonly Task[];
    readonly taskBarLabel?: string;
    readonly resets?: {
        readonly value: string;
        readonly lead?: string;
        readonly aria?: string;
    };
    readonly help?: boolean;
    readonly track?: {
        readonly value: number;
        readonly target: number;
        readonly label?: string;
        readonly milestones?: readonly {
            readonly at: number;
            readonly open: boolean;
        }[];
    };
}
export interface AchievementsProps extends FeatureProps, ProgressReadProps {
    readonly title?: string;
    readonly done: number;
    readonly total: number;
    readonly items: readonly Achievement[];
}
export declare const quests: Readonly<{
    view: (p: QuestsProps) => ViewNode;
    presentation?: "fullscreen";
    popupKind?: PopupKind;
    mount(container: HTMLElement, props: QuestsProps): void;
    update(container: HTMLElement, props: QuestsProps): void;
    unmount(container: HTMLElement): void;
}>;
export declare const achievements: Readonly<{
    view: (p: AchievementsProps) => ViewNode;
    presentation?: "fullscreen";
    popupKind?: PopupKind;
    mount(container: HTMLElement, props: AchievementsProps): void;
    update(container: HTMLElement, props: AchievementsProps): void;
    unmount(container: HTMLElement): void;
}>;
export interface CrossQuestProps extends FeatureProps {
    readonly game: string;
    readonly tasks: readonly Task[];
    readonly foreign: Task & {
        readonly game: string;
        readonly name: string;
        readonly cta: string;
    };
    readonly after?: readonly Task[];
}
export declare const crossQuest: Readonly<{
    view: (p: CrossQuestProps) => ViewNode;
    presentation?: "fullscreen";
    popupKind?: PopupKind;
    mount(container: HTMLElement, props: CrossQuestProps): void;
    update(container: HTMLElement, props: CrossQuestProps): void;
    unmount(container: HTMLElement): void;
}>;
export interface SeasonProps extends FeatureProps {
    readonly name: string;
    readonly description?: string;
    readonly daysLeft: number;
    readonly step: number;
    readonly steps: number;
    readonly tasks: readonly (Task & {
        readonly game: string;
    })[];
    readonly cta?: {
        readonly game: string;
        readonly label: string;
    };
}
export declare const season: Readonly<{
    view: (p: SeasonProps) => ViewNode;
    presentation?: "fullscreen";
    popupKind?: PopupKind;
    mount(container: HTMLElement, props: SeasonProps): void;
    update(container: HTMLElement, props: SeasonProps): void;
    unmount(container: HTMLElement): void;
}>;
export interface ContentEndProps extends FeatureProps {
    readonly game: string;
    readonly total: number;
    readonly daysLeft: number;
    readonly promo?: Cross;
    readonly games?: readonly string[];
}
export declare const contentEnd: Readonly<{
    view: (p: ContentEndProps) => ViewNode;
    presentation?: "fullscreen";
    popupKind?: PopupKind;
    mount(container: HTMLElement, props: ContentEndProps): void;
    update(container: HTMLElement, props: ContentEndProps): void;
    unmount(container: HTMLElement): void;
}>;
export interface ContinueProps extends FeatureProps {
    readonly game: string;
    readonly account: string;
    readonly playing?: string;
}
export declare const continueAs: Readonly<{
    view: (p: ContinueProps) => ViewNode;
    presentation?: "fullscreen";
    popupKind?: PopupKind;
    mount(container: HTMLElement, props: ContinueProps): void;
    update(container: HTMLElement, props: ContinueProps): void;
    unmount(container: HTMLElement): void;
}>;
export interface EndlessEntryProps extends FeatureProps {
    readonly record: number;
    readonly runsLeft: number;
    readonly runsMax: number;
    readonly nextRunIn?: string;
    readonly resetsIn?: string;
    readonly perks?: readonly string[];
    readonly milestones: readonly {
        readonly id: string;
        readonly label: string;
        readonly reward: string;
        readonly state: 'locked' | 'claimable' | 'claimed';
    }[];
    readonly bestToday?: number;
    readonly nextAt?: number;
    readonly weekRank?: number;
    readonly rankHint?: string;
    readonly canWatchAd?: boolean;
}
export declare const endlessEntry: Readonly<{
    view: (p: EndlessEntryProps) => ViewNode;
    presentation?: "fullscreen";
    popupKind?: PopupKind;
    mount(container: HTMLElement, props: EndlessEntryProps): void;
    update(container: HTMLElement, props: EndlessEntryProps): void;
    unmount(container: HTMLElement): void;
}>;
export interface EndlessHudProps extends FeatureProps {
    readonly record: number;
    readonly score: number;
    readonly multiplier: number;
    readonly fever?: boolean;
    readonly coins: number;
    readonly revives: number;
    readonly shield?: number;
    readonly waiting?: boolean;
    readonly chest: {
        readonly value: number;
        readonly target: number;
        readonly stages?: readonly ('done' | 'next' | 'locked')[];
    };
}
export declare const endlessHud: Readonly<{
    view: (p: EndlessHudProps) => ViewNode;
    presentation?: "fullscreen";
    popupKind?: PopupKind;
    mount(container: HTMLElement, props: EndlessHudProps): void;
    update(container: HTMLElement, props: EndlessHudProps): void;
    unmount(container: HTMLElement): void;
}>;
export interface EndlessReviveProps extends FeatureProps {
    readonly score: number;
    readonly multiplier: number;
    readonly coins: number;
    readonly countdown?: number;
    readonly freeLeft: number;
    readonly price: number;
}
export declare const endlessRevive: Readonly<{
    view: (p: EndlessReviveProps) => ViewNode;
    presentation?: "fullscreen";
    popupKind?: PopupKind;
    mount(container: HTMLElement, props: EndlessReviveProps): void;
    update(container: HTMLElement, props: EndlessReviveProps): void;
    unmount(container: HTMLElement): void;
}>;
export interface EndlessResultProps extends FeatureProps {
    readonly score: number;
    readonly previousRecord?: number;
    readonly newRecord?: boolean;
    readonly coins: number;
    readonly maxFever: number;
    readonly distance: string;
    readonly milestones?: readonly {
        readonly at: string;
        readonly state: 'done' | 'reward' | 'locked';
        readonly reward?: string;
    }[];
    readonly newMilestones: number;
    readonly rankBefore?: number;
    readonly rankAfter?: number;
    readonly runsLeft: number;
    readonly runsMax: number;
    readonly canDouble?: boolean;
}
export declare const endlessResult: Readonly<{
    view: (p: EndlessResultProps) => ViewNode;
    presentation?: "fullscreen";
    popupKind?: PopupKind;
    mount(container: HTMLElement, props: EndlessResultProps): void;
    update(container: HTMLElement, props: EndlessResultProps): void;
    unmount(container: HTMLElement): void;
}>;
export declare const PROGRESS_WINDOWS: Readonly<{
    readonly 'level-map': Readonly<{
        view: (p: LevelMapProps) => ViewNode;
        presentation?: "fullscreen";
        popupKind?: PopupKind;
        mount(container: HTMLElement, props: LevelMapProps): void;
        update(container: HTMLElement, props: LevelMapProps): void;
        unmount(container: HTMLElement): void;
    }>;
    readonly win: Readonly<{
        view: (p: LevelWinProps) => ViewNode;
        presentation?: "fullscreen";
        popupKind?: PopupKind;
        mount(container: HTMLElement, props: LevelWinProps): void;
        update(container: HTMLElement, props: LevelWinProps): void;
        unmount(container: HTMLElement): void;
    }>;
    readonly lose: Readonly<{
        view: (p: LevelLoseProps) => ViewNode;
        presentation?: "fullscreen";
        popupKind?: PopupKind;
        mount(container: HTMLElement, props: LevelLoseProps): void;
        update(container: HTMLElement, props: LevelLoseProps): void;
        unmount(container: HTMLElement): void;
    }>;
    readonly 'level-fail': Readonly<{
        view: (p: LevelFailProps) => ViewNode;
        presentation?: "fullscreen";
        popupKind?: PopupKind;
        mount(container: HTMLElement, props: LevelFailProps): void;
        update(container: HTMLElement, props: LevelFailProps): void;
        unmount(container: HTMLElement): void;
    }>;
    readonly points: Readonly<{
        view: (p: PointsProps) => ViewNode;
        presentation?: "fullscreen";
        popupKind?: PopupKind;
        mount(container: HTMLElement, props: PointsProps): void;
        update(container: HTMLElement, props: PointsProps): void;
        unmount(container: HTMLElement): void;
    }>;
    readonly quests: Readonly<{
        view: (p: QuestsProps) => ViewNode;
        presentation?: "fullscreen";
        popupKind?: PopupKind;
        mount(container: HTMLElement, props: QuestsProps): void;
        update(container: HTMLElement, props: QuestsProps): void;
        unmount(container: HTMLElement): void;
    }>;
    readonly achievements: Readonly<{
        view: (p: AchievementsProps) => ViewNode;
        presentation?: "fullscreen";
        popupKind?: PopupKind;
        mount(container: HTMLElement, props: AchievementsProps): void;
        update(container: HTMLElement, props: AchievementsProps): void;
        unmount(container: HTMLElement): void;
    }>;
    readonly 'cross-quest': Readonly<{
        view: (p: CrossQuestProps) => ViewNode;
        presentation?: "fullscreen";
        popupKind?: PopupKind;
        mount(container: HTMLElement, props: CrossQuestProps): void;
        update(container: HTMLElement, props: CrossQuestProps): void;
        unmount(container: HTMLElement): void;
    }>;
    readonly season: Readonly<{
        view: (p: SeasonProps) => ViewNode;
        presentation?: "fullscreen";
        popupKind?: PopupKind;
        mount(container: HTMLElement, props: SeasonProps): void;
        update(container: HTMLElement, props: SeasonProps): void;
        unmount(container: HTMLElement): void;
    }>;
    readonly 'content-end': Readonly<{
        view: (p: ContentEndProps) => ViewNode;
        presentation?: "fullscreen";
        popupKind?: PopupKind;
        mount(container: HTMLElement, props: ContentEndProps): void;
        update(container: HTMLElement, props: ContentEndProps): void;
        unmount(container: HTMLElement): void;
    }>;
    readonly continue: Readonly<{
        view: (p: ContinueProps) => ViewNode;
        presentation?: "fullscreen";
        popupKind?: PopupKind;
        mount(container: HTMLElement, props: ContinueProps): void;
        update(container: HTMLElement, props: ContinueProps): void;
        unmount(container: HTMLElement): void;
    }>;
    readonly endless: Readonly<{
        view: (p: EndlessHudProps) => ViewNode;
        presentation?: "fullscreen";
        popupKind?: PopupKind;
        mount(container: HTMLElement, props: EndlessHudProps): void;
        update(container: HTMLElement, props: EndlessHudProps): void;
        unmount(container: HTMLElement): void;
    }>;
    readonly 'endless-entry': Readonly<{
        view: (p: EndlessEntryProps) => ViewNode;
        presentation?: "fullscreen";
        popupKind?: PopupKind;
        mount(container: HTMLElement, props: EndlessEntryProps): void;
        update(container: HTMLElement, props: EndlessEntryProps): void;
        unmount(container: HTMLElement): void;
    }>;
    readonly 'endless-revive': Readonly<{
        view: (p: EndlessReviveProps) => ViewNode;
        presentation?: "fullscreen";
        popupKind?: PopupKind;
        mount(container: HTMLElement, props: EndlessReviveProps): void;
        update(container: HTMLElement, props: EndlessReviveProps): void;
        unmount(container: HTMLElement): void;
    }>;
    readonly 'endless-result': Readonly<{
        view: (p: EndlessResultProps) => ViewNode;
        presentation?: "fullscreen";
        popupKind?: PopupKind;
        mount(container: HTMLElement, props: EndlessResultProps): void;
        update(container: HTMLElement, props: EndlessResultProps): void;
        unmount(container: HTMLElement): void;
    }>;
}>;
//# sourceMappingURL=progress-windows.d.ts.map
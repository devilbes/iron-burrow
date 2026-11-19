import type { ViewNode } from '../core.js';
import { type FeatureProps } from '../features/shared.js';
import type { ShellModule, ShellProps, ShellTicket } from '../shell.js';
export type RewardKind = 'soft_currency' | 'hard_currency' | 'item' | 'instance';
export interface RewardChest {
    readonly state: 'closed' | 'opening' | 'opened' | 'claimed';
    readonly contents?: readonly RewardLine[] | null;
    readonly result?: readonly RewardLine[];
}
export interface RewardLine {
    readonly id: string;
    readonly quantity: number;
    readonly kind?: RewardKind;
    readonly name?: string;
    readonly icon?: string;
    readonly tooltip?: string;
    readonly chest?: RewardChest;
    readonly random?: {
        readonly contents?: readonly RewardLine[] | null;
    };
    readonly chance?: number;
    readonly range?: {
        readonly min: number;
        readonly max: number;
    };
}
export interface RewardWindowProps extends FeatureProps {
    readonly items: readonly RewardLine[];
    readonly title?: string;
    readonly hero?: string;
    readonly source?: string;
    readonly target?: (line: RewardLine) => Element | null | undefined;
    readonly info?: boolean;
    readonly contentsUnavailable?: boolean;
}
export declare const MAX_REWARD_LINES = 50;
export declare function aggregateRewards(items: unknown): RewardLine[];
export declare function rewardCategoryIcon(line: RewardLine): string;
export declare function rewardName(p: FeatureProps, line: RewardLine): string;
export declare function rewardChestArt(_p: FeatureProps): ViewNode;
export interface RewardViewOptions {
    readonly okTestid?: string;
    readonly art?: (line: RewardLine, size: number) => ViewNode;
    readonly info?: boolean;
    readonly pendingChestIds?: ReadonlySet<string>;
}
export declare const MAX_CHEST_DEPTH = 8;
export declare function rewardItemsView(p: FeatureProps, items: readonly RewardLine[], options?: RewardViewOptions, path?: readonly number[]): ViewNode;
export declare function rewardLinesView(p: Omit<RewardWindowProps, 'items'>, items: readonly RewardLine[], options?: RewardViewOptions): ViewNode;
export declare function rewardWindowView(p: RewardWindowProps): ViewNode;
export declare function findHudCapsule(id: string, root?: Document | ShadowRoot | undefined): HTMLElement | null;
export declare function playRewardVfx(root: ShadowRoot, p: Pick<RewardWindowProps, 'items' | 'target'>): void;
export declare function wholeLinesHeight(visible: number, bottoms: readonly number[]): number | undefined;
export declare function listCapRule(cap: number | undefined, visible?: number): string;
export interface CapsuleBox {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
}
export declare function litCapsuleRules(boxes: readonly CapsuleBox[]): string;
export declare function fitRewardList(root: ShadowRoot): void;
export declare function lightRewardCapsules(root: ShadowRoot, p: Pick<RewardWindowProps, 'items' | 'target'>): void;
export declare const rewardWindow: import("../core.js").KitComponent<RewardWindowProps>;
export declare const REWARD_WINDOW = "ui.reward";
export declare const REWARD_ELEMENT = "reward";
export declare const DEFAULT_REWARD_TRIGGER: Readonly<{
    id: "reward-on-grant";
    on: Readonly<{
        event: "inventory:items:granted";
    }>;
    priority: 20;
    do: readonly Readonly<{
        module: "ui.reward";
        action: "main";
    }>[];
}>;
export interface RewardWindowModule extends ShellModule {
    readonly elementId: string;
}
export interface RewardWindowModuleOptions {
    readonly assetUrl?: (key: string) => string;
    readonly intent?: (intent: 'chest-open' | 'chest-claim', payload: ShellProps) => void;
}
export declare function rewardWindowModule(options?: RewardWindowModuleOptions): RewardWindowModule;
export type RewardDescribe = (line: RewardLine) => {
    readonly name?: string;
    readonly icon?: string;
} | undefined;
export interface RewardWindowsPort {
    register(module: string, windows: Readonly<Record<string, {
        canShow(context: Readonly<Record<string, unknown>>): boolean | Promise<boolean>;
        open(params?: Readonly<Record<string, unknown>>, context?: Readonly<Record<string, unknown>>): {
            readonly closed: Promise<unknown>;
            close(): void;
        };
    }>>): () => void;
}
export interface RewardWindowShell {
    open(elementId: string, props?: ShellProps): ShellTicket;
}
export declare function registerRewardWindow(windows: RewardWindowsPort, shell: RewardWindowShell, options?: {
    readonly describe?: RewardDescribe;
}): () => void;
//# sourceMappingURL=reward-window.d.ts.map
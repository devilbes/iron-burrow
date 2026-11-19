import { type ViewNode, type ViewChild } from '../core.js';
import { type FeatureProps } from './shared.js';
export interface RewardGridItem {
    readonly id: string;
    readonly name?: string | undefined;
    readonly amount?: string | number;
    readonly icon?: string;
    readonly gold?: boolean | undefined;
    readonly testid?: string;
}
export interface RewardGridOptions {
    readonly label?: string;
    readonly className?: string;
    readonly art?: (item: RewardGridItem, size: number, index: number) => ViewNode;
    readonly entry?: (item: RewardGridItem, index: number, entry: ViewNode) => ViewNode;
    readonly details?: (item: RewardGridItem, index: number) => ViewChild;
}
export declare function rewardGrid(p: FeatureProps, items: readonly RewardGridItem[], options?: RewardGridOptions): ViewNode;
//# sourceMappingURL=reward-grid.d.ts.map
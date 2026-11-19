import { type FeatureProps } from '../features/shared.js';
import { type RewardWindowProps } from './reward-window.js';
export type RewardProps = RewardWindowProps;
export declare const reward: import("../core.js").KitComponent<RewardWindowProps>;
export interface LevelCompleteProps extends FeatureProps {
    readonly level: string | number;
    readonly items: readonly {
        readonly name: string;
        readonly quantity: number;
        readonly icon?: string;
    }[];
    readonly stars?: number;
    readonly doubleAvailable?: boolean;
}
export declare function levelCompleteView(p: LevelCompleteProps): import("../view-types.js").ViewNode;
export declare const levelComplete: import("../core.js").KitComponent<LevelCompleteProps>;
//# sourceMappingURL=reward.d.ts.map
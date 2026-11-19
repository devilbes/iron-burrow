import type { ViewNode } from '../core.js';
import { type FeatureProps } from '../features/shared.js';
export declare function meterPercent(value: number, target: number): number;
export interface KitMeterOptions {
    readonly label?: string;
    readonly valueText?: string;
    readonly decorative?: boolean;
}
export declare function kitMeter(value: number, target: number, options?: KitMeterOptions): ViewNode;
export interface CollectionTile {
    readonly id: string;
    readonly name: string;
    readonly imageKey?: string;
    readonly owned: number;
    readonly total: number;
}
export interface CollectionTilesProps extends FeatureProps {
    readonly tiles: readonly CollectionTile[];
    readonly title?: string;
    readonly columns?: 3 | 4;
}
export declare function collectionTilesView(p: CollectionTilesProps): ViewNode;
export declare const collectionTiles: import("../core.js").KitComponent<CollectionTilesProps>;
export interface MiniEventBannerProps extends FeatureProps {
    readonly title: string;
    readonly logoKey?: string;
    readonly tokenKey?: string;
    readonly value: number;
    readonly target: number;
    readonly goalKey?: string;
    readonly goalLabel?: string;
    readonly timer?: string;
}
export declare function miniEventBannerView(p: MiniEventBannerProps): ViewNode;
export declare const miniEventBanner: import("../core.js").KitComponent<MiniEventBannerProps>;
export interface PartyMember {
    readonly name: string;
    readonly avatarKey?: string;
}
export interface PartySlotsSpec {
    readonly slots: readonly (PartyMember | null)[];
    readonly rewardKey?: string;
    readonly rewardLabel?: string;
    readonly label?: string;
}
export declare function partySlotsView(p: FeatureProps, spec: PartySlotsSpec): ViewNode;
export interface PartySlotsProps extends FeatureProps, PartySlotsSpec {
}
export declare const partySlots: import("../core.js").KitComponent<PartySlotsProps>;
//# sourceMappingURL=game-widgets.d.ts.map
import { type FeatureProps, type Outcome } from '../features/shared.js';
export interface NoLivesProps extends FeatureProps {
    readonly remainingMs: number;
    readonly refillPrice: string;
    readonly refillIcon?: string;
    readonly refillAvailable: boolean;
    readonly videoAvailable: boolean;
}
export declare function noLivesView(p: NoLivesProps): import("../view-types.js").ViewNode;
export declare const noLives: import("../core.js").KitComponent<NoLivesProps>;
export interface AdsPoint {
    readonly id: string;
    readonly available: boolean;
    readonly quantity: number;
    readonly reason?: string;
}
export interface AdsProps extends FeatureProps {
    readonly available: boolean;
    readonly quantity?: number;
    readonly result?: Outcome;
    readonly bannerVisible?: boolean;
    readonly points?: readonly AdsPoint[];
    readonly interstitial?: {
        readonly available: boolean;
        readonly reason?: string;
    };
    readonly bannerAvailable?: boolean;
    readonly decisions?: unknown;
}
export declare const ads: import("../core.js").KitComponent<AdsProps>;
export interface VideoUnavailableProps extends FeatureProps {
    readonly reason?: string;
}
export declare const videoUnavailable: import("../core.js").KitComponent<VideoUnavailableProps>;
//# sourceMappingURL=ads.d.ts.map
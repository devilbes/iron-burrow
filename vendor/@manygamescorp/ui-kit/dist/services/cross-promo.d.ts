import { type FeatureProps } from '../features/shared.js';
export interface PromoGame {
    readonly name: string;
    readonly genre?: string;
    readonly rating?: string;
    readonly studio?: string;
    readonly icon?: string;
}
export interface PromoSlotProps extends FeatureProps {
    readonly game: PromoGame;
    readonly skipInSec: number;
    readonly progress: number;
    readonly description?: string;
}
export declare function promoSlotView(p: PromoSlotProps): import("../view-types.js").ViewNode;
export declare const promoSlot: import("../core.js").KitComponent<PromoSlotProps>;
export interface PromoGiftItem {
    readonly id: string;
    readonly label: string;
    readonly amount: string;
    readonly icon?: string;
}
export interface PromoBonusProps extends FeatureProps {
    readonly game: PromoGame;
    readonly points: number;
    readonly gifts: readonly PromoGiftItem[];
}
export declare const promoBonusView: (p: PromoBonusProps) => import("../view-types.js").ViewNode;
export declare const promoBonus: import("../core.js").KitComponent<PromoBonusProps>;
export interface PromoLivesProps extends FeatureProps {
    readonly remainingMs: number;
    readonly game: PromoGame;
    readonly badge?: string;
    readonly videoAvailable: boolean;
}
export declare const promoLivesView: (p: PromoLivesProps) => import("../view-types.js").ViewNode;
export declare const promoLives: import("../core.js").KitComponent<PromoLivesProps>;
//# sourceMappingURL=cross-promo.d.ts.map
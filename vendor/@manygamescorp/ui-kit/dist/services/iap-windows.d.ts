import { type FeatureProps, type Outcome } from '../features/shared.js';
import { type ErrorL10n } from './error.js';
import { type PurchaseProcessingProps, type ShopOffer } from './shop.js';
export declare const SHOP_SECTIONS: readonly ["shop_special", "shop_soft", "shop_hard", "shop_bundles", "shop_ads", "shop_other"];
export type ShopSection = typeof SHOP_SECTIONS[number];
export declare function shopSection(offer: ShopOffer): ShopSection | undefined;
export interface ShopWindowProps extends FeatureProps, PurchaseProcessingProps {
    readonly offers: readonly ShopOffer[];
    readonly purchase?: Outcome;
    readonly now: number;
    readonly title?: string;
    readonly subtitle?: string;
    readonly countdownLabel?: string;
    readonly currencies?: readonly {
        readonly name: string;
        readonly quantity: number;
    }[];
    readonly error?: {
        readonly code: string;
        readonly retry?: boolean;
    };
    readonly l10n?: ErrorL10n;
    readonly layout?: 'auto' | 'landscape';
}
export declare const shopWindowView: (p: ShopWindowProps) => import("../view-types.js").ViewNode;
export declare const shopWindow: import("../core.js").KitComponent<ShopWindowProps>;
export type ChainStepState = 'done' | 'current' | 'locked';
export interface ChainStep {
    readonly id: string;
    readonly kind: 'free' | 'ad' | 'purchase';
    readonly state: ChainStepState;
    readonly reward: {
        readonly id: string;
        readonly amount: number;
        readonly label?: string;
    };
    readonly priceText?: string;
    readonly badge?: string;
}
export interface OfferChainProps extends FeatureProps {
    readonly title: string;
    readonly endsAt?: string;
    readonly now: number;
    readonly steps: readonly ChainStep[];
    readonly final?: ChainStep['reward'];
}
export declare const offerChainView: (p: OfferChainProps) => import("../view-types.js").ViewNode;
export declare const offerChain: import("../core.js").KitComponent<OfferChainProps>;
//# sourceMappingURL=iap-windows.d.ts.map
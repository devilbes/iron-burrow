import type { ShopOffer } from './shop.js';
import { type FeatureProps } from '../features/shared.js';
export interface AdPlayerProps extends FeatureProps {
    readonly remaining: number;
    readonly rewarded: boolean;
    readonly closable: boolean;
}
export declare const adPlayer: import("../core.js").KitComponent<AdPlayerProps>;
export interface PaymentProps extends FeatureProps {
    readonly title: string;
    readonly priceText: string;
    readonly offer?: Pick<ShopOffer, 'key' | 'iconUrl' | 'variant'>;
}
export declare const paymentView: (p: PaymentProps) => import("../view-types.js").ViewNode;
export declare const payment: import("../core.js").KitComponent<PaymentProps>;
export interface BannerProps extends FeatureProps {
    readonly position: 'top' | 'bottom';
    readonly height: number;
}
export declare const banner: import("../core.js").KitComponent<BannerProps>;
//# sourceMappingURL=media.d.ts.map
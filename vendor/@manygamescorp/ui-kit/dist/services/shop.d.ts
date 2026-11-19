import { type FeatureProps, type Outcome } from '../features/shared.js';
import type { ViewContext } from '../core.js';
export interface ShopOffer {
    readonly key: string;
    readonly name: string;
    readonly kind: string;
    readonly available: boolean;
    readonly endsAt?: string;
    readonly availableAt?: string;
    readonly description?: string;
    readonly priceText?: string;
    readonly reason?: string;
    readonly placement?: string;
    readonly iconUrl?: string;
    readonly ui?: unknown;
    readonly product?: {
        readonly price?: number | null;
        readonly currency?: string | null;
        readonly priceText?: string;
        readonly store?: {
            readonly priceText: string;
        };
    };
    readonly variant: {
        readonly key: string;
        readonly entities: readonly {
            readonly id: string;
            readonly name?: string;
            readonly amount: number;
            readonly iconUrl?: string;
        }[];
    };
}
export interface PurchaseProcessingProps {
    readonly purchasingOfferKeys?: readonly string[];
    readonly processing?: boolean;
    readonly processingLabel?: string;
    readonly processingCloseLabel?: string;
}
export declare function purchaseProcessing(p: FeatureProps & PurchaseProcessingProps): import("../view-types.js").ViewNode | null;
export interface ShopProps extends FeatureProps {
    readonly offers: readonly ShopOffer[];
    readonly purchase?: Outcome;
    readonly currencies?: readonly {
        readonly name: string;
        readonly quantity: number;
    }[];
    readonly balance?: Outcome;
    readonly balanceReady?: boolean;
    readonly products?: Outcome;
    readonly orders?: Outcome;
    readonly catalog?: Outcome;
    readonly now: number;
}
export declare function uiText(ui: unknown, ...names: string[]): string | undefined;
export declare function offerText(p: FeatureProps, ui: unknown, ...names: string[]): string | undefined;
export declare function formatPrice(lang: string, amount: number, currency: string): string;
export declare function offerPrice(p: FeatureProps, o: ShopOffer): string;
export declare function isPendingPurchase(value: unknown): boolean;
export declare function offerCountdown(endsAt: string | undefined, now: number, lang?: string, l10n?: FeatureProps['l10n']): string | undefined;
export declare const available: (o: ShopOffer, now: number) => boolean;
export declare const shopView: (p: ShopProps, d: Record<string, string>, ctx: ViewContext<Record<string, string>>) => import("../view-types.js").ViewNode;
export declare const shop: import("../core.js").KitComponent<ShopProps>;
export interface LimitedOfferProps extends FeatureProps, PurchaseProcessingProps {
    readonly offer?: ShopOffer;
    readonly purchase?: Outcome;
    readonly now: number;
    readonly amountLabels?: Readonly<Record<string, string>>;
    readonly previousPriceText?: string;
    readonly layout?: OfferLayout;
}
export type OfferLayout = 'tiles' | 'list';
type RewardEntity = ShopOffer['variant']['entities'][number];
export declare function offerRewardGrid(p: LimitedOfferProps | FeatureProps, items: readonly RewardEntity[]): import("../view-types.js").ViewNode;
export declare function rewardTile(p: FeatureProps & {
    readonly amountLabels?: Readonly<Record<string, string>>;
}, item: RewardEntity, _size?: number): import("../view-types.js").ViewNode;
export declare const limitedOfferView: (p: LimitedOfferProps) => import("../view-types.js").ViewNode;
export declare const limitedOffer: import("../core.js").KitComponent<LimitedOfferProps>;
export {};
//# sourceMappingURL=shop.d.ts.map
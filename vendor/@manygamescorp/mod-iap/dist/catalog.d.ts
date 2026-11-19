import { type ProductType, type StoreKey, type StoreProduct, type StoreBinding } from './store.js';
export declare const OFFERS_SCOPE = "iap.offers";
export declare const PLACEMENTS_SCOPE = "iap.placements";
export declare const PRODUCTS_SCOPE = "iap.settings.products";
export type OfferKind = 'paid' | 'free' | 'ad';
export type AdFormat = 'rewarded' | 'rewarded_interstitial';
export interface OfferEntity {
    readonly id: string;
    readonly amount: number;
}
export interface OfferVariant {
    readonly key: string;
    readonly description?: string;
    readonly productKey?: string;
    readonly entities: readonly OfferEntity[];
    readonly custom: unknown;
    readonly ui?: unknown;
}
export interface OfferLimits {
    readonly perSession?: number;
    readonly perHour?: number;
    readonly perDay?: number;
    readonly total?: number;
}
export interface OfferState {
    readonly cooldownUntil: string | null;
    readonly remaining?: {
        readonly hour?: number;
        readonly day?: number;
        readonly total?: number;
    };
}
export interface Usage {
    readonly session: number;
    readonly recent: readonly number[];
    readonly total: number;
    readonly lastAt: number | null;
}
export declare const NO_USAGE: Usage;
export type UnavailableReason = 'cooldown' | 'limit_offer' | 'limit_placement' | 'schedule' | 'no_product' | 'store_unavailable';
export interface OfferProduct {
    readonly productKey: string;
    readonly type: ProductType;
    readonly name: string;
    readonly sku?: string;
    readonly binding?: StoreBinding;
    readonly entities: readonly OfferEntity[];
    readonly store?: StoreProduct;
}
export interface Offer {
    readonly key: string;
    readonly kind: OfferKind;
    readonly format?: AdFormat;
    readonly name: string;
    readonly description?: string;
    readonly iconUrl?: string;
    readonly customs?: unknown;
    readonly ui?: unknown;
    readonly placement: string;
    readonly applied: string | null;
    readonly scopeVersion: number | null;
    readonly variant: OfferVariant;
    readonly variants: readonly OfferVariant[];
    readonly limits: OfferLimits;
    readonly cooldownSec: number;
    readonly product?: OfferProduct;
    readonly available: boolean;
    readonly reason?: UnavailableReason;
    readonly availableAt?: string;
    readonly endsAt?: string;
}
export interface ShowcaseInput {
    readonly placement: string;
    readonly offers: Readonly<Record<string, unknown>>;
    readonly placements: Readonly<Record<string, unknown>>;
    readonly products: Readonly<Record<string, unknown>>;
    readonly applied?: Readonly<Record<string, string | null>>;
    readonly scopeVersion?: number;
    readonly offerState?: Readonly<Record<string, OfferState>>;
    readonly usage?: (offerKey: string) => Usage;
    readonly placementUsage?: (placement: string) => Usage;
    readonly storeKey: StoreKey | null;
    readonly prices?: ReadonlyMap<string, StoreProduct>;
    readonly now: number;
}
interface OfferData {
    readonly name: string;
    readonly description?: string;
    readonly kind: OfferKind;
    readonly format?: AdFormat;
    readonly limits: OfferLimits;
    readonly cooldownSec: number;
    readonly durationSec: number | null;
    readonly schedule: string | null;
    readonly variants: readonly OfferVariant[];
    readonly iconUrl?: string;
    readonly customs?: unknown;
    readonly ui?: unknown;
}
export declare function parseOffer(value: unknown): OfferData | undefined;
export declare function placementOfferKeys(value: unknown): readonly string[];
export declare function parseProduct(productKey: string, value: unknown, storeKey: StoreKey | null, prices?: ReadonlyMap<string, StoreProduct>): OfferProduct | undefined;
export declare function scheduleWindow(schedule: string | null, durationSec: number | null): {
    readonly from: number;
    readonly until: number;
} | null | undefined;
export declare function showcase(input: ShowcaseInput): Offer[];
export declare function offerWithVariant(key: string, variantKey: string, input: ShowcaseInput): Offer | undefined;
export declare function offerOf(key: string, input: ShowcaseInput, placementLimits?: OfferLimits, variantKey?: string): Offer | undefined;
export declare function addUsage(usage: Usage, now: number): Usage;
export {};
//# sourceMappingURL=catalog.d.ts.map
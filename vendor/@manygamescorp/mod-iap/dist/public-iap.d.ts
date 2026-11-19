import { SDKError } from '@manygamescorp/core/error';
import type { Offer, OfferProduct } from './catalog.js';
import type { AdapterAdOrder, AdapterClaimResult, AdapterIap, AdapterIapState, AdapterOrderView as OrderView, AdOrderInput, CancelReason, Entitlement, OrderStatus, OrdersQuery, PurchaseInput, WaitOptions } from './contract.js';
export type GameOrder = Omit<OrderView, 'storeKey' | 'sku' | 'storeAccountToken' | 'confirmation'>;
export type Product = Omit<OfferProduct, 'sku' | 'store' | 'binding'> & {
    readonly title?: string;
    readonly price: number | null;
    readonly currency: string | null;
    readonly priceText: string;
};
export type GameOffer = Omit<Offer, 'product'> & {
    readonly product?: Product;
};
export type IapErrorCode = 'SDK_IAP_NOT_AVAILABLE' | 'SDK_IAP_ALREADY_OWNED' | 'SDK_IAP_CANCELED' | 'SDK_IAP_PENDING' | 'SDK_IAP_STORE_ERROR' | 'SDK_IAP_VALIDATION_FAILED' | 'SDK_IAP_NETWORK_ERROR' | 'SDK_IAP_FAILED';
export interface PurchaseOutcome {
    readonly orderId: string | null;
    readonly status: 'purchased' | 'pending' | 'canceled' | 'failed' | 'already_owned' | 'not_available';
    readonly order?: GameOrder;
    readonly code?: IapErrorCode;
}
export declare function iapErrorCode(error: unknown): IapErrorCode;
export declare function iapError(error: unknown): SDKError;
export interface IapProductPrice {
    readonly productKey: string;
    readonly title: string;
    readonly price: number | null;
    readonly currency: string | null;
    readonly priceText: string;
}
export type IapState = Omit<AdapterIapState, 'pendingOrders' | 'entitlements'> & {
    readonly pendingOrders: readonly GameOrder[];
    readonly entitlements: readonly Entitlement[];
};
export type GameAdOrder = GameOrder & {
    readonly ads?: NonNullable<AdapterAdOrder['ads']>;
};
export type GameClaimResult = Omit<AdapterClaimResult, 'order'> & {
    readonly order: GameOrder;
};
export interface IapRestoreResult {
    readonly restored: number;
    readonly orders: readonly {
        readonly orderId: string;
        readonly status: OrderStatus;
    }[];
    readonly entitlements: readonly Entitlement[];
    readonly conflicts: readonly {
        readonly code: 'SDK_IAP_ALREADY_OWNED';
    }[];
}
export interface Iap {
    load(options?: {
        readonly force?: boolean;
    }): Promise<IapState>;
    state(): IapState | undefined;
    offers(input: {
        readonly placement: string;
    }): GameOffer[];
    offer(input: {
        readonly offerKey: string;
        readonly placement?: string;
    }): GameOffer | undefined;
    products(options?: {
        readonly force?: boolean;
    }): Promise<IapProductPrice[]>;
    purchase(input: PurchaseInput): Promise<PurchaseOutcome>;
    createAdOrder(input: AdOrderInput): Promise<GameAdOrder>;
    claim(id: string): Promise<GameClaimResult>;
    cancelOrder(orderId: string, reason: CancelReason): Promise<GameOrder>;
    order(orderId: string, options?: {
        readonly signal?: AbortSignal;
    }): Promise<GameOrder>;
    waitOrder(orderId: string, options?: WaitOptions): Promise<GameOrder>;
    orders(query?: OrdersQuery): Promise<{
        readonly items: GameOrder[];
        readonly nextCursor: string | null;
    }>;
    pendingOrders(): Promise<GameOrder[]>;
    entitlements(options?: {
        readonly force?: boolean;
    }): Promise<Entitlement[]>;
    subscriptions(options?: {
        readonly force?: boolean;
    }): Promise<Entitlement[]>;
    openSubscriptionManagement(): Promise<void>;
    restore(): Promise<IapRestoreResult>;
    dispose(): void;
}
export type GameState = Awaited<ReturnType<Iap['load']>>;
export declare function publicIap(raw: AdapterIap): Iap;
//# sourceMappingURL=public-iap.d.ts.map
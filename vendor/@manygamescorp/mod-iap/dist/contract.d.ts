import type { Offer, OfferEntity, OfferState } from './catalog.js';
import type { StoreKey, StoreProduct } from './store.js';
export type OrderStatus = 'created' | 'pending_store' | 'pending_validation' | 'validated' | 'granted' | 'failed' | 'canceled' | 'expired' | 'refunded' | 'revoked' | 'not_rewarded' | 'granted_advance' | 'advance_unconfirmed' | 'confirmed';
export interface AdapterOrderView {
    readonly orderId: string;
    readonly confirmation?: {
        readonly type: 'redirect';
        readonly url: string;
    };
    readonly offerKey: string;
    readonly variantKey: string;
    readonly placementKey: string | null;
    readonly productKey: string | null;
    readonly productType: 'purchase' | 'subscription' | 'free' | 'ad';
    readonly consumable: boolean;
    readonly entities: readonly OfferEntity[];
    readonly storeKey: StoreKey | null;
    readonly sku: string | null;
    readonly storeAccountToken: string | null;
    readonly status: OrderStatus;
    readonly grantStatus: 'none' | 'pending' | 'granted' | 'rejected' | 'revoked';
    readonly environment: 'sandbox' | 'production' | null;
    readonly price: number | null;
    readonly currency: string | null;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly expiresAt: string | null;
    readonly validatedAt: string | null;
    readonly grantedAt: string | null;
}
export interface AdsAdvance {
    readonly advanceOutstanding: number;
    readonly advanceMax: number | null;
}
export interface Entitlement {
    readonly productKey: string;
    readonly orderId: string;
    readonly kind: 'non_consumable' | 'subscription';
    readonly state: 'active' | 'grace' | 'on_hold' | 'paused' | 'canceled' | 'expired' | 'revoked' | 'refunded';
    readonly autoRenew: boolean | null;
    readonly expiresAt: string | null;
}
export interface AdapterIapState {
    readonly pendingOrders: readonly AdapterOrderView[];
    readonly entitlements: readonly Entitlement[];
    readonly offerState: Readonly<Record<string, OfferState>>;
    readonly ads: AdsAdvance;
}
export interface PurchaseInput {
    readonly txId?: string;
    readonly offerKey?: string;
    readonly productKey?: string;
    readonly variantKey?: string;
    readonly placement?: string;
    readonly payload?: Readonly<Record<string, unknown>>;
}
export interface AdapterPurchaseResult {
    readonly orderId: string | null;
    readonly status: 'granted' | 'pending' | 'failed' | 'cancelled';
    readonly order?: AdapterOrderView;
    readonly code?: string;
}
export interface AdOrderInput {
    readonly txId?: string;
    readonly offerKey: string;
    readonly variantKey?: string;
    readonly placement: string;
    readonly applied?: string | null;
    readonly scopeVersion?: number;
}
export interface AdapterAdOrder extends AdapterOrderView {
    readonly ads?: {
        readonly advanceOutstanding: number;
        readonly advanceMax: number;
    };
}
export interface AdapterClaimResult {
    readonly order: AdapterOrderView;
    readonly reward: 'granted' | 'pending';
    readonly advance?: true;
    readonly advanceOutstanding: number;
    readonly advanceMax: number;
}
export type CancelReason = 'user_cancelled' | 'store_error' | 'not_shown' | 'not_rewarded';
export interface AdapterRestoreResult {
    readonly restored: number;
    readonly orders: readonly {
        readonly orderId: string;
        readonly status: OrderStatus;
    }[];
    readonly entitlements: readonly Entitlement[];
    readonly conflicts: readonly {
        readonly sku: string;
        readonly reason: string;
    }[];
}
export interface OrdersQuery {
    readonly status?: readonly OrderStatus[];
    readonly cursor?: string;
    readonly limit?: number;
}
export interface WaitOptions {
    readonly timeoutMs?: number;
    readonly signal?: AbortSignal;
}
export interface AdapterIap {
    load(options?: {
        readonly force?: boolean;
    }): Promise<AdapterIapState>;
    state(): AdapterIapState | undefined;
    offers(input: {
        readonly placement: string;
    }): Offer[];
    offer(input: {
        readonly offerKey: string;
        readonly placement?: string;
    }): Offer | undefined;
    products(options?: {
        readonly force?: boolean;
    }): Promise<readonly StoreProduct[]>;
    purchase(input: PurchaseInput): Promise<AdapterPurchaseResult>;
    createAdOrder(input: AdOrderInput): Promise<AdapterAdOrder>;
    claim(orderId: string): Promise<AdapterClaimResult>;
    cancelOrder(orderId: string, reason: CancelReason): Promise<AdapterOrderView>;
    order(orderId: string, options?: {
        readonly signal?: AbortSignal;
    }): Promise<AdapterOrderView>;
    waitOrder(orderId: string, options?: WaitOptions): Promise<AdapterOrderView>;
    orders(query?: OrdersQuery): Promise<{
        readonly items: readonly AdapterOrderView[];
        readonly nextCursor: string | null;
    }>;
    pendingOrders(): Promise<readonly AdapterOrderView[]>;
    entitlements(options?: {
        readonly force?: boolean;
    }): Promise<readonly Entitlement[]>;
    openSubscriptionManagement(): Promise<void>;
    restore(): Promise<AdapterRestoreResult>;
    dispose(): void;
}
export type IapEvent = {
    readonly name: 'iap:offers:updated';
    readonly payload: {
        readonly placement: string;
    };
} | {
    readonly name: 'iap:order:created';
    readonly payload: {
        readonly orderId: string;
        readonly offerKey: string;
    };
} | {
    readonly name: 'iap:store:purchase-started';
    readonly payload: {
        readonly orderId: string;
    };
} | {
    readonly name: 'iap:store:purchase-cancelled';
    readonly payload: {
        readonly orderId: string;
    };
} | {
    readonly name: 'iap:store:purchase-failed';
    readonly payload: {
        readonly orderId: string;
        readonly code: string;
    };
} | {
    readonly name: 'iap:order:validated';
    readonly payload: {
        readonly orderId: string;
    };
} | {
    readonly name: 'iap:order:granted';
    readonly payload: {
        readonly orderId: string;
        readonly offerKey: string;
    };
} | {
    readonly name: 'iap:order:pending';
    readonly payload: {
        readonly orderId: string;
    };
} | {
    readonly name: 'iap:order:failed';
    readonly payload: {
        readonly orderId: string;
        readonly code: string;
    };
} | {
    readonly name: 'iap:restore:completed';
    readonly payload: {
        readonly restored: number;
    };
} | {
    readonly name: 'iap:entitlement:changed';
    readonly payload: {
        readonly ids: readonly string[];
    };
};
//# sourceMappingURL=contract.d.ts.map
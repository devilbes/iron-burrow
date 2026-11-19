import type { ScopedHttp } from '@manygamescorp/core/scoped-http';
export type StoreKey = string;
export type ProductType = 'consumable' | 'non_consumable' | 'subscription';
export interface StoreProductRequest {
    readonly productKey: string;
    readonly sku: string;
    readonly binding: StoreBinding;
    readonly type: ProductType;
    readonly name: string;
}
export interface StoreProduct {
    readonly productKey: string;
    readonly sku: string;
    readonly title: string;
    readonly price: number | null;
    readonly currency: string | null;
    readonly priceText: string;
}
export interface StorePurchaseRequest {
    readonly orderId: string;
    readonly confirmation?: unknown;
    readonly productKey: string;
    readonly sku: string;
    readonly binding: StoreBinding;
    readonly type: ProductType;
    readonly accountToken: string;
    readonly offer?: {
        readonly key: string;
        readonly iconUrl?: string;
        readonly variant: {
            readonly key: string;
            readonly entities: readonly {
                readonly id: string;
                readonly amount: number;
            }[];
        };
    };
    readonly product?: StoreProduct;
}
export interface StoreTransaction {
    readonly orderId: string | null;
    readonly transactionId: string;
    readonly productRef: StoreBinding & {
        readonly productKey: string;
    };
    readonly proof: {
        readonly type: 'token' | 'receipt';
        readonly value: string;
    };
}
export type StorePurchaseResult = {
    readonly status: 'purchased';
    readonly transaction: StoreTransaction;
} | {
    readonly status: 'pending';
} | {
    readonly status: 'canceled';
} | {
    readonly status: 'already_owned';
} | {
    readonly status: 'not_available';
} | {
    readonly status: 'failed';
    readonly code: string;
};
export interface StoreAdapter {
    readonly id: string;
    readonly confirmation?: 'redirect';
    readonly provider: string;
    readonly storeKey: StoreKey;
    readonly subscriptionManagementUrl?: string;
    readonly fake?: boolean;
    init(signal: AbortSignal, context?: {
        readonly http: Pick<ScopedHttp, 'request'>;
    }): Promise<void>;
    products(products: readonly StoreProductRequest[], signal?: AbortSignal): Promise<readonly StoreProduct[]>;
    purchase(request: StorePurchaseRequest, signal?: AbortSignal): Promise<StorePurchaseResult>;
    finish(transaction: StoreTransaction, signal?: AbortSignal): Promise<void>;
    restore(signal?: AbortSignal): Promise<readonly StoreTransaction[]>;
    subscriptions(): Promise<readonly {
        readonly productKey: string;
        readonly state: 'active' | 'expired';
    }[]>;
    onTransaction(handler: (transaction: StoreTransaction) => void): () => void;
}
export declare function own(value: unknown, key: string): unknown;
export declare function productionBuild(): boolean;
export declare function fakeAllowed(environment: string | undefined): boolean;
export interface StoreBinding {
    readonly productId: string;
    readonly basePlanId?: string;
    readonly offerId?: string;
}
export declare function storeBinding(bindings: unknown, storeKey: StoreKey): StoreBinding | undefined;
export declare function isStoreAdapter(value: unknown): value is StoreAdapter;
//# sourceMappingURL=store.d.ts.map
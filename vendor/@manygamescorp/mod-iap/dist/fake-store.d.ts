import { type ProductType, type StoreAdapter, type StoreKey, type StorePurchaseRequest, type StoreTransaction } from './store.js';
export type FakeOutcome = 'success' | 'cancel' | 'error' | 'pending';
export interface FakeSheet {
    readonly orderId: string;
    readonly productKey: string;
    readonly sku: string;
    readonly type: ProductType;
    readonly offer?: StorePurchaseRequest['offer'];
    readonly title: string;
    readonly priceText: string;
    readonly price?: number | null;
    readonly currency?: string | null;
}
export interface FakeStoreOptions {
    readonly storeKey?: StoreKey;
    readonly outcome?: FakeOutcome | 'ask';
    readonly ask?: (sheet: FakeSheet) => Promise<FakeOutcome>;
    readonly state?: FakeStoreState;
}
export interface FakeStore extends StoreAdapter {
    readonly fake: true;
    settle(orderId: string, outcome: 'success' | 'cancel'): void;
}
export declare function fakeReceipt(orderId: string, transactionId: string, productId: string): string;
interface Owned {
    readonly transaction: StoreTransaction;
    readonly productKey: string;
    readonly type: ProductType;
    finished: boolean;
}
export interface FakeStoreState {
    readonly owned: Map<string, Owned>;
    readonly deferred: Map<string, StorePurchaseRequest>;
}
export declare const fakeStoreState: () => FakeStoreState;
export declare function fakeStore(options?: FakeStoreOptions): FakeStore;
export {};
//# sourceMappingURL=fake-store.d.ts.map
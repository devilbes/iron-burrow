import type { ScopedHttp } from '@manygamescorp/core/scoped-http';
import { type StoreKey, type StoreProduct, type StoreProductRequest } from './store.js';
export declare function storePrices(http: Pick<ScopedHttp, 'request'>, provider: string, storeKey: StoreKey, requests: readonly StoreProductRequest[], signal?: AbortSignal): Promise<readonly StoreProduct[]>;
export declare function formatStorePrice(price: number | null, currency: string | null): string;
//# sourceMappingURL=store-prices.d.ts.map
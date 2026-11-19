import { type SecureStore } from './secure-store.js';
export interface InsecureWebSecureStoreOptions {
    readonly idb?: IDBFactory | null;
    readonly dbName?: string;
    readonly openTimeoutMs?: number;
}
export declare function createInsecureWebSecureStore(options?: InsecureWebSecureStoreOptions): SecureStore;
//# sourceMappingURL=web-secure-store.d.ts.map
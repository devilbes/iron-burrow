import { type BlobStore } from './blob-store.js';
export interface WebBlobStoreOptions {
    readonly idb?: IDBFactory | null;
    readonly dbName?: string;
    readonly openTimeoutMs?: number;
}
export declare function createWebBlobStore(options?: WebBlobStoreOptions): BlobStore;
//# sourceMappingURL=web-blob-store.d.ts.map
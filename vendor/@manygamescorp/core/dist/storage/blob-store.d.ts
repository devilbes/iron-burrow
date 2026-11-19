export interface BlobInfo {
    readonly key: string;
    readonly size: number;
    readonly accessedAt: number;
}
export interface BlobStore {
    get(key: string): Promise<Uint8Array | undefined>;
    put(key: string, value: Uint8Array): Promise<void>;
    remove(key: string): Promise<void>;
    list(prefix: string): Promise<readonly BlobInfo[]>;
}
export declare function assertBlobKey(key: unknown): asserts key is string;
export declare function assertBlobPrefix(prefix: unknown): asserts prefix is string;
export declare function assertBlobValue(value: unknown): asserts value is Uint8Array;
export declare function createMemoryBlobStore(): BlobStore;
export declare function purgeBlobs(store: BlobStore, prefix: string, keep?: string | readonly string[]): Promise<number>;
//# sourceMappingURL=blob-store.d.ts.map
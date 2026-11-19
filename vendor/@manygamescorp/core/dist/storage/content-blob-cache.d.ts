import { type BlobCacheOptions, type ContentRef } from './blob-cache.js';
export declare function createContentBlobCache(options: Omit<BlobCacheOptions<Readonly<Record<string, ContentRef>>>, 'references'> & {
    readonly currentGid: () => string;
}): {
    read(sha256: string, signal: AbortSignal): Promise<Uint8Array | undefined>;
    write(sha256: string, bytes: Uint8Array, signal: AbortSignal): Promise<void>;
};
//# sourceMappingURL=content-blob-cache.d.ts.map
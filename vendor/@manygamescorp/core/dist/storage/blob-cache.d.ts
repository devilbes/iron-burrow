import type { BlobStore } from './blob-store.js';
import type { StorageRoot } from './scoped.js';
export interface ContentRef {
    readonly sha256: string;
    readonly version: number;
}
export interface BlobCacheOptions<Pointer> {
    readonly storage: StorageRoot;
    readonly blobs: BlobStore;
    readonly namespace: string;
    readonly maxBytes: number;
    readonly references: (pointer: Pointer) => Readonly<Record<string, ContentRef>>;
}
export interface BlobCacheWrite<Pointer> {
    readonly gid: string;
    readonly currentGid: () => string;
    readonly signal: AbortSignal;
    readonly pointer: Pointer;
    readonly bodies: Readonly<Record<string, Uint8Array>>;
}
export declare const ORPHAN_GRACE_MS: number;
export declare function blobDigest(bytes: Uint8Array): Promise<string>;
export declare class VersionedBlobCache<Pointer> {
    #private;
    constructor(options: BlobCacheOptions<Pointer>);
    pointer(gid: string): Pointer | undefined;
    read(gid: string, ref: ContentRef, signal?: AbortSignal): Promise<Uint8Array | undefined>;
    write(write: BlobCacheWrite<Pointer>): Promise<void>;
    clean(): Promise<void>;
}
//# sourceMappingURL=blob-cache.d.ts.map
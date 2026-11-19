import type { Facts } from '@manygamescorp/contracts-client/filters';
import type { BlobStore } from './storage/blob-store.js';
import type { StorageRoot } from './storage/scoped.js';
import type { L10nIndex, L10nLoadRequest, L10nLoadResult, L10nSource } from './l10n.js';
export interface L10nTransport {
    request(request: {
        readonly method: 'POST' | 'GET';
        readonly url: string;
        readonly headers: Readonly<Record<string, string>>;
        readonly body?: unknown;
        readonly signal: AbortSignal;
        readonly auth: 'player' | 'none';
    }): Promise<{
        readonly status: number;
        readonly headers: {
            get(name: string): string | null;
        };
        json(): Promise<unknown>;
        readonly body: ReadableStream<Uint8Array> | null;
    }>;
}
export interface ConfigsL10nSourceOptions {
    readonly transport: L10nTransport;
    readonly onIntegrityFailure?: (tag: string) => void;
    readonly facts?: () => Facts;
}
export declare function recordTree(value: unknown, facts: Facts): unknown;
export declare function configRecord(value: unknown): value is {
    data?: unknown;
    conditionals: unknown[];
    conditionalsMode: 'merge' | 'replace';
};
export declare function validIndex(value: unknown): value is L10nIndex;
export interface L10nCacheOptions {
    readonly appCode: string;
    readonly gid: () => string;
    readonly storage: StorageRoot;
    readonly blobs: BlobStore;
    readonly source: L10nSource;
    readonly maxBytes?: number;
    readonly facts?: () => Facts;
}
export { blobDigest as l10nDigest } from './storage/blob-cache.js';
export declare class CachedL10nSource implements L10nSource {
    #private;
    readonly origin: 'cache' | 'network';
    constructor(options: L10nCacheOptions);
    readCache(request: L10nLoadRequest, complete?: boolean): Promise<L10nLoadResult | undefined>;
    load(request: L10nLoadRequest): Promise<L10nLoadResult>;
    clean(): Promise<void>;
}
export declare class ConfigsL10nSource implements L10nSource {
    #private;
    readonly origin = "network";
    constructor(options: ConfigsL10nSourceOptions);
    readCache({ chain, prev, signal }: L10nLoadRequest): Promise<L10nLoadResult | undefined>;
    load({ chain, prev, signal }: L10nLoadRequest): Promise<L10nLoadResult>;
}
//# sourceMappingURL=l10n-sources.d.ts.map
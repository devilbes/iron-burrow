export interface ConfigUrl {
    readonly url: string;
    readonly sha256: string;
    readonly version: number;
    readonly expiresAt: string;
}
export declare function readConfigBlob(link: ConfigUrl, signal: AbortSignal, fetcher?: typeof fetch, now?: () => number): Promise<unknown>;
//# sourceMappingURL=configs-blob.d.ts.map
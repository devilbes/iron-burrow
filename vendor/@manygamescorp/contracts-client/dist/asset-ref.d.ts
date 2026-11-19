/** Graphic reference syntax. Ownership, host policy and existence are checked by the server. */
export type AssetRef = `skin:${string}` | `asset:${string}` | `https://${string}`;
export declare const ASSET_REF_SCHEMA: Readonly<{
    $schema: string;
    title: string;
    type: string;
    format: string;
    maxLength: number;
    pattern: string;
}>;
export declare const ASSET_REF_PATTERN: string;
/** No I/O or authorization. HTTPS must already be canonical, without credentials. */
export declare function isAssetRef(value: unknown): value is AssetRef;
/** Exact host[:port], supplied by the environment. No wildcards, paths or credentials. */
export declare function isAssetHost(value: unknown): value is string;
export interface AssetVariant {
    readonly url: string;
    readonly locale?: string;
    readonly density?: number;
}
//# sourceMappingURL=asset-ref.d.ts.map
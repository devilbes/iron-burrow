export type Json = null | boolean | number | string | Json[] | {
    [key: string]: Json;
};
export type JsonObject = {
    [key: string]: Json;
};
export declare function invalidData(): never;
export declare function record(value: unknown): value is Record<string, unknown>;
export declare function safeName(key: string): boolean;
export declare function jsonCopy<T>(value: T, maxBytes?: number, maxDepth?: number): T;
export declare function onlyKeys(value: unknown, keys: readonly string[]): Record<string, unknown>;
export declare function versionHeader(version: number | undefined, min?: number): string | undefined;
export declare function gidValue(gid: unknown): number;
export declare function mutationKey(key: string | undefined): string;
//# sourceMappingURL=data-validation.d.ts.map
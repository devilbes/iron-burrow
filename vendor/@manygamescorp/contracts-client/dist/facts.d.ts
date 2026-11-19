export type FactValue = string | number | boolean | null;
/** `string[]` is an array fact (`$segment`, E96): computed by core, never written by an owner. */
export type FactType = 'string' | 'number' | 'boolean' | 'scalar' | 'string[]';
export interface FactDefinition {
    readonly name: string;
    readonly type: FactType;
    readonly owner: string;
    /** `$uid`/`$gid` (E96): only `$eq $ne $in $nin` (≤ 1000 integers) and `$mod`. */
    readonly identifier?: true;
}
/** Exact names override wildcard namespaces; unlisted names are not writable. */
export declare const FACT_CATALOG: readonly FactDefinition[];
/** Catalog entry for a fact name: an exact name first, then a `prefix.*` namespace. */
export declare function factDefinition(name: string): FactDefinition | undefined;
//# sourceMappingURL=facts.d.ts.map
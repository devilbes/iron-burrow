import { type FilterParameters } from './filter-values.js';
export { FilterValidationError, compareFilterVersions, parseFilterVersion, parseFilterDate, filterParameter, filterValueFits, filterTypeOperators, } from './filter-values.js';
export type { FilterParameter, FilterParameters } from './filter-values.js';
export type FilterScalar = string | number | boolean | null;
export interface FilterOperators {
    readonly $eq?: FilterScalar;
    readonly $ne?: FilterScalar;
    readonly $gt?: string | number;
    readonly $gte?: string | number;
    readonly $lt?: string | number;
    readonly $lte?: string | number;
    readonly $in?: readonly FilterScalar[];
    readonly $nin?: readonly FilterScalar[];
    readonly $exists?: boolean;
    /** `[N, r]`: integer field with `field % N === r`, 2 ≤ N ≤ 10000, 0 ≤ r < N. */
    readonly $mod?: readonly [number, number];
    readonly $startsWith?: string;
    readonly $endsWith?: string;
    readonly $contains?: string;
    readonly caseInsensitive?: boolean;
    readonly $not?: FilterOperators;
}
/**
 * D-MATCH (E96): `$name` in a field position is a native fact of the catalog (`$country` reads
 * `country`); a name without `$` is a project parameter stored as `custom.<name>`.
 */
export interface FilterExpr {
    readonly [key: string]: FilterScalar | FilterOperators | FilterExpr | readonly FilterExpr[] | undefined;
    readonly $and?: readonly FilterExpr[];
    readonly $or?: readonly FilterExpr[];
    readonly $nor?: readonly FilterExpr[];
    readonly $not?: FilterExpr;
}
/** Flat named facts or nested records; an exact dotted key takes precedence over traversal. */
export type Facts = Readonly<Record<string, unknown>>;
/** Closed operator list (E96). Any other `$name` in a field position is a native fact name. */
export declare const FILTER_OPERATORS: readonly string[];
type RecordNode = Record<string, unknown>;
interface Field {
    readonly path: string;
    readonly kind: 'value' | 'array' | 'identifier';
}
/** `$X` → catalog fact `X`; `k` → `custom.k`. Unknown native names are invalid. */
export declare function filterField(key: string): Field | undefined;
export declare function prepareFilter(filter: unknown): {
    json: string;
    value: RecordNode;
};
/** Syntax, catalog names and limits; the same check runs before every evaluation. */
export declare function isValidFilter(filter: unknown): boolean;
/** Bounded write canonicalization. Preserves literal representations, never mutates its input. */
export declare function canonicalizeFilter(filter: unknown, params?: FilterParameters): RecordNode;
//# sourceMappingURL=filter-syntax.d.ts.map
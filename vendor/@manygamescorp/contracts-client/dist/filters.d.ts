import { type Facts } from './filter-syntax.js';
import { type FilterParameters } from './filter-values.js';
export type { Facts };
export type CompiledFilter = (facts: Facts) => boolean;
/** Invalid filters compile to false. A retained predicate captures a validated snapshot. */
export declare function compileFilter(filter: unknown, params?: FilterParameters): CompiledFilter;
export declare function matchFilter(filter: unknown, facts?: Facts, params?: FilterParameters): boolean;
export { FILTER_OPERATORS, isValidFilter, canonicalizeFilter, FilterValidationError, compareFilterVersions, parseFilterVersion, parseFilterDate, filterParameter, filterValueFits, filterTypeOperators } from './filter-syntax.js';
export type { FilterExpr, FilterOperators, FilterScalar, FilterParameters, FilterParameter } from './filter-syntax.js';
//# sourceMappingURL=filters.d.ts.map
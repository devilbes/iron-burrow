/** E108 / CFG-CANON. Portable value rules; this source also ships in contracts-client. */
import type { FilterParameter } from './filter-parameter.js';
export type { FilterParameter } from './filter-parameter.js';
export type FilterParameters = Readonly<Record<string, FilterParameter>>;
export declare class FilterValidationError extends Error {
    readonly kind: 'invalid' | 'type';
    readonly pointer: string;
    constructor(kind: 'invalid' | 'type', pointer: string);
}
interface Version {
    parts: string[];
    pre: string[];
}
export declare function parseFilterVersion(value: unknown): Version | undefined;
export declare function compareFilterVersions(a: unknown, b: unknown): number | undefined;
/** Strict ISO calendar validation before Date.parse; offset-less datetimes are UTC. */
export declare function parseFilterDate(value: unknown): number | undefined;
/** Native definitions override caller definitions, preventing games from retyping trusted facts. */
export declare function filterParameter(key: string, params?: FilterParameters): FilterParameter | undefined;
export declare function filterValueFits(param: FilterParameter, value: unknown): boolean;
export declare function filterTypeOperators(type: string): readonly string[] | undefined;
//# sourceMappingURL=filter-values.d.ts.map
import { type CompiledFilter, type Facts, type FilterParameters } from '@manygamescorp/contracts-client/filters';
import { SDKError } from './error.js';
export type { CompiledFilter, Facts, FilterExpr, FilterOperators, FilterScalar, } from '@manygamescorp/contracts-client/filters';
export type FilterValidation = {
    readonly ok: true;
} | {
    readonly ok: false;
    readonly error: SDKError;
};
export interface Filters {
    match(filter: unknown, facts?: Facts): boolean;
    validate(filter: unknown): FilterValidation;
    compile(filter: unknown): CompiledFilter;
    canonicalize(filter: unknown): Readonly<Record<string, unknown>>;
}
export declare function validate(filter: unknown): FilterValidation;
export declare function compile(filter: unknown): CompiledFilter;
export declare function match(filter: unknown, facts?: Facts): boolean;
export declare function createFilters(readFacts?: () => Facts, readParameters?: () => FilterParameters): Filters;
//# sourceMappingURL=filters.d.ts.map
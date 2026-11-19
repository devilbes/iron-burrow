import { type Facts, type FilterParameters } from './filters.js';
export type ConditionalMode = 'merge' | 'replace';
export type ConditionalSide = 'server' | 'client';
/** E94: a config record override; `filters` is D-MATCH, `side` defaults to `client`. */
export interface Conditional {
    readonly label?: string;
    readonly filters: unknown;
    readonly data: unknown;
    readonly mode?: ConditionalMode;
    readonly side?: ConditionalSide;
    /** Default `true`; a disabled conditional is skipped when looking for the first match. */
    readonly enabled?: boolean;
}
export interface ResolveOptions {
    readonly parameters?: FilterParameters;
    /** The record's `conditionalsMode`: the mode of a conditional without its own `mode`. */
    readonly conditionalsMode?: ConditionalMode;
    /** Conditionals evaluated here; the SDK evaluates `['client']` (default). */
    readonly sides?: readonly ConditionalSide[];
}
export interface Resolved {
    readonly data: unknown;
    /** `label` of the applied conditional, `#<index>` (0-based) without a label, `null` if none. */
    readonly applied: string | null;
}
/**
 * E94 / configs spec §3.6: the first matching conditional of `opts.sides` (in list order) is
 * applied, the rest are not evaluated. A conditional with `enabled: false` is skipped (never
 * applied, never reported in `applied`). A malformed conditional or invalid filter never applies.
 */
export declare function resolve(base: unknown, conditionals: readonly unknown[], facts: Facts, opts?: ResolveOptions): Resolved;
//# sourceMappingURL=resolve.d.ts.map
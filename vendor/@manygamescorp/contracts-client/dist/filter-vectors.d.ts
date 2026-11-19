/** Shared conformance cases; the upstream configs bytes/SHA are pinned in test/fixtures/configs.
 * valid=false requires expected=false, including runtime rejection of invalid filters.
 */
export interface FilterVector {
    readonly name: string;
    readonly filter: unknown;
    readonly facts: Readonly<Record<string, unknown>>;
    readonly expected: boolean;
    readonly valid: boolean;
}
export declare const FILTER_VECTORS: readonly FilterVector[];
//# sourceMappingURL=filter-vectors.d.ts.map
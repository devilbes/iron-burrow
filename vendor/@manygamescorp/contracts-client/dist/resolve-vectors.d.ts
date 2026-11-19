import type { ResolveOptions } from './resolve.js';
/** Shared resolve cases (E94); contracts-server keeps a byte copy pinned by SHA-256. */
export interface ResolveVector {
    readonly name: string;
    readonly base: unknown;
    readonly conditionals: readonly unknown[];
    readonly facts: Readonly<Record<string, unknown>>;
    readonly opts?: ResolveOptions;
    readonly expected: {
        readonly data: unknown;
        readonly applied: string | null;
    };
}
export declare const RESOLVE_VECTORS: readonly ResolveVector[];
//# sourceMappingURL=resolve-vectors.d.ts.map
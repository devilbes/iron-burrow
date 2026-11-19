import { type Random } from './random.js';
/** Client or server entry points tested against the same published CM-72 vectors. */
export interface RandomImplementation {
    /** Creates a stream from a server-issued seed. */
    createRandom(seed: string): Random;
    /** Resumes a serialized continuation state. */
    restoreRandom(snapshot: unknown): Random;
}
/** Throws on any golden-vector mismatch; defaults to the portable server implementation. */
export declare function assertRandomConformance(api?: RandomImplementation): void;
//# sourceMappingURL=random-conformance.d.ts.map
/** Portable ASCII seed shared by levels and mechanics. */
export declare const SEED_PATTERN: RegExp;
/** Tests the seed format without coercion. */
export declare function isSeed(value: unknown): value is string;
/** 128 cryptographically random bits encoded as 22 unpadded base64url characters. */
export declare function createSeed(): string;
/** JSON-safe CM-72 continuation state; restore with restoreRandom. */
export interface RandomSnapshot {
    /** Snapshot format version; unknown versions are rejected. */
    readonly version: 1;
    /** Identifies the stream algorithm and word ordering. */
    readonly algorithm: 'CM-72';
    /** xoshiro128** words s0 … s3 as unsigned integers; not all zero. */
    readonly state: readonly [number, number, number, number];
}
/** Stateful FNV-1a64 → SplitMix64 → xoshiro128** stream (CM-72). */
export interface Random {
    /** Detached immutable state of the next draw; does not advance the stream. */
    snapshot(): RandomSnapshot;
    /** Next unsigned 32-bit word. */
    nextUint32(): number;
    /** Next value in [0, 1). */
    next(): number;
    /** Unbiased integer in the inclusive safe-integer bounds; span at most 2^32. */
    int(min: number, max: number): number;
    /** Selects one item; empty arrays raise RANDOM_RANGE_INVALID. */
    pick<T>(items: readonly T[]): T;
    /** Returns a shuffled copy, using descending Fisher–Yates. */
    shuffle<T>(items: readonly T[]): T[];
}
/** Stable validation codes; inputs are never included in errors. */
export type RandomErrorCode = 'RANDOM_SEED_INVALID' | 'RANDOM_RANGE_INVALID' | 'RANDOM_STATE_INVALID';
/** Adapter hook for the host's error type; must throw. */
export type RandomFailure = (code: RandomErrorCode) => never;
/** Creates a deterministic stream; seed case and every ASCII byte are significant. */
export declare function createRandom(seed: string, invalid?: RandomFailure): Random;
/** Restores a detached stream; malformed or unsupported snapshots raise RANDOM_STATE_INVALID. */
export declare function restoreRandom(snapshot: unknown, invalid?: RandomFailure): Random;
//# sourceMappingURL=random.d.ts.map
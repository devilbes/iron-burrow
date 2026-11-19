export { SEED_PATTERN, isSeed, createSeed } from '@manygamescorp/contracts-client/random';
export interface RandomSnapshot {
    readonly version: 1;
    readonly algorithm: 'CM-72';
    readonly state: readonly [number, number, number, number];
}
export interface Random {
    snapshot(): RandomSnapshot;
    nextUint32(): number;
    next(): number;
    int(min: number, max: number): number;
    pick<T>(items: readonly T[]): T;
    shuffle<T>(items: readonly T[]): T[];
}
export declare function createRandom(seed: string): Random;
export declare function restoreRandom(snapshot: unknown): Random;
//# sourceMappingURL=random.d.ts.map
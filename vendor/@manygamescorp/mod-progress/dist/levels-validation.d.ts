export interface RangeIndex {
    readonly key: string;
    readonly first: number;
    readonly last: number | null;
}
export interface SetIndex {
    readonly first: number;
    readonly last: number | null;
    readonly ranges: readonly RangeIndex[];
}
export declare function fail(code?: string): never;
export declare function object(value: unknown): value is Record<string, unknown>;
export declare function integer(value: unknown, min?: number, max?: number): value is number;
export declare function levelNumber(n: number): void;
export declare function rangeIndex(value: unknown): RangeIndex;
export declare function readIndex(value: unknown): SetIndex;
export declare function select(index: SetIndex, n: number): RangeIndex;
export declare function copyRecord(value: unknown): Readonly<Record<string, unknown>>;
export declare function recordValue<T>(record: Readonly<Record<string, T>> | undefined, key: string): T | undefined;
//# sourceMappingURL=levels-validation.d.ts.map
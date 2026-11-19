export declare function fail(code: string, safeParams?: Readonly<Record<string, string | number>>): never;
export declare function plain(value: unknown): value is Record<string, unknown>;
export declare function integer(value: unknown, min: number, max: number): value is number;
export declare function level(value: unknown): asserts value is number;
export declare function freeze<T>(value: T): T;
export declare function json<T>(value: T, code: string, path?: string, maxBytes?: number, maxDepth?: number): T;
export declare function canonical(value: unknown): string;
export declare function wait<T>(promise: Promise<T>, signal: AbortSignal): Promise<T>;
//# sourceMappingURL=mechanic-validation.d.ts.map
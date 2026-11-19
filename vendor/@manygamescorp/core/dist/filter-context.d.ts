import { type ContextHold, type FactSnapshot } from './facts.js';
export declare const CONTEXT_CHANGED = "sdk:context:changed";
export interface ContextChanged {
    readonly keys: readonly string[];
    readonly segmentsChanged: boolean;
}
export declare const PROVIDER_ORDER: readonly string[];
export interface ContextEngineOptions {
    readonly emit: (event: string, payload: unknown) => void;
    readonly recompute: (keys: ReadonlySet<string>, purchase: boolean) => boolean;
    readonly timeDependent: () => boolean;
    readonly snapshot: () => FactSnapshot;
    readonly batchMs?: number;
    readonly tickMs?: number;
    readonly maxHoldMs?: number;
}
export interface ContextEngine {
    changed(keys: readonly string[]): void;
    purchase(): void;
    hold(): ContextHold;
    sync(): void;
    flush(): void;
    discard(): void;
    reset(): void;
    dispose(): void;
}
export declare function createContextEngine(options: ContextEngineOptions): ContextEngine;
//# sourceMappingURL=filter-context.d.ts.map
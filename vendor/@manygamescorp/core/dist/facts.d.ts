import { type FactValue } from '@manygamescorp/contracts-client/facts';
import { type FilterParameter, type FilterParameters, type Facts } from '@manygamescorp/contracts-client/filters';
import { type Filters } from './filters.js';
import type { StorageRoot } from './storage/scoped.js';
export type { FactValue } from '@manygamescorp/contracts-client/facts';
export type ContextValue = FactValue | readonly string[];
export type FactSnapshot = Readonly<Record<string, ContextValue>>;
export interface FactsView {
    get(key: string): ContextValue | undefined;
    snapshot(): FactSnapshot;
    set(facts: Readonly<Record<string, FactValue>>): void;
}
export interface ContextHold {
    readonly facts: FactSnapshot;
    release(): void;
}
export interface ModuleFacts extends FactsView {
    hold(): ContextHold;
    purchase(): void;
}
export interface GameContext {
    get(name: string): ContextValue | undefined;
    set(params: Readonly<Record<string, FactValue>>): void;
    snapshot(): FactSnapshot;
}
export type FilterParam = FilterParameter;
export type FilterParams = FilterParameters;
export interface FactsStore {
    readonly gid: string;
    readonly context: GameContext;
    readonly filters: Filters;
    view(owner: string): FactsView;
    snapshot(): FactSnapshot;
    facts(): Facts;
    segments(keys: readonly string[]): boolean;
    ab(values: Readonly<Record<string, string>>): void;
    params(registry: FilterParams | undefined): void;
    filterParameters(): FilterParams;
    subscribe(listener: (keys: readonly string[]) => void): () => void;
}
export interface FactsOptions {
    readonly storage?: StorageRoot;
    readonly gid: string;
    readonly platform: string;
    readonly appVersion?: string;
    readonly store?: string;
    readonly identity?: {
        readonly uid: number;
        readonly gid: number;
    };
    readonly onUnknownParam?: (name: string) => void;
    readonly now?: () => number;
}
export declare const CUSTOM = "custom.";
export declare function parseFilterParams(data: unknown): FilterParams | undefined;
export declare function filterName(key: string): string;
export declare function createFacts(options: FactsOptions): FactsStore;
//# sourceMappingURL=facts.d.ts.map
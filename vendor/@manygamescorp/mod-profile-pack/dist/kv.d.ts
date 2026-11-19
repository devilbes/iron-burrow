import { type DataHttp } from './data-module.js';
import { type Json } from '@manygamescorp/core/data-validation';
import type { ModuleDefinition } from '@manygamescorp/core/module';
export interface PlayerData {
    readonly data: Readonly<Record<string, Json>>;
    readonly updatedAt: string | null;
}
export interface KvOptions {
    readonly scope?: string;
    readonly signal?: AbortSignal;
}
export interface KvMutationOptions extends KvOptions {
    readonly idempotencyKey?: string;
}
export interface Kv {
    get(key: string, options?: KvOptions): Promise<PlayerData>;
    list(options?: KvOptions): Promise<PlayerData>;
    query(keys: readonly string[], options?: KvOptions): Promise<PlayerData>;
    set(key: string, value: Json, options?: KvMutationOptions): Promise<PlayerData>;
    delete(key: string, options?: KvMutationOptions): Promise<void>;
    dispose(): void;
}
export declare function createKv(http: DataHttp, signal?: AbortSignal): Kv;
export declare function kvModule(): ModuleDefinition<Kv>;
export type { Json } from '@manygamescorp/core/data-validation';
//# sourceMappingURL=kv.d.ts.map
import { type Facts } from '@manygamescorp/contracts-client/filters';
import type { EventBus, ScopedBus } from './bus-types.js';
import type { ScopedStorage } from './storage/scoped.js';
import type { HttpTransport } from './transport.js';
import { type ConfigUrl } from './configs-blob.js';
export declare const CONFIGS_UPDATED = "configs:snapshot:updated";
export interface ConfigSelection {
    readonly scopes?: readonly string[];
    readonly keys?: readonly string[];
    readonly values?: Readonly<Record<string, string | number | boolean | null>>;
}
export interface ConfigFetchOptions {
    readonly signal?: AbortSignal;
    readonly raw?: boolean;
    readonly ifNoneMatch?: string | undefined;
}
export interface UnconditionalConfigFetchOptions extends ConfigFetchOptions {
    readonly ifNoneMatch?: undefined;
}
export interface ConditionalConfigFetchOptions extends ConfigFetchOptions {
    readonly ifNoneMatch: string;
}
export type { ConfigUrl } from './configs-blob.js';
export interface ConfigRecord {
    readonly data?: unknown;
    readonly filters?: Readonly<Record<string, unknown>>;
    readonly minVersion?: string | null;
    readonly maxVersion?: string | null;
    readonly priority?: number;
    readonly conditionalsMode: 'merge' | 'replace';
    readonly conditionals: readonly unknown[];
    readonly version?: number;
    readonly contentHash?: string;
}
export interface ConfigPayload {
    readonly configs: Readonly<Record<string, Readonly<Record<string, ConfigRecord>>>>;
    readonly configsURL?: Readonly<Record<string, ConfigUrl>>;
    readonly version: Readonly<Record<string, number>>;
    readonly ts: string;
}
export interface LevelConfigMetadata {
    readonly version: number;
    readonly contentHash: string;
}
export interface ConfigSnapshot {
    readonly etag?: string;
    readonly raw?: ConfigPayload;
    readonly levels?: Readonly<Record<string, Readonly<Record<string, LevelConfigMetadata>>>>;
    readonly configs: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
    readonly applied: Readonly<Record<string, Readonly<Record<string, string | null>>>>;
    readonly segments: readonly string[];
    readonly configsURL?: Readonly<Record<string, ConfigUrl>>;
    readonly version: Readonly<Record<string, number>>;
    readonly ts: string;
}
export interface ConfigInit extends Partial<Omit<ConfigSnapshot, 'ts' | 'etag' | 'raw'>> {
    readonly ab: string | null;
    readonly abg: string | null;
    readonly abExp: number | null;
    readonly abs: readonly {
        readonly ab: string;
        readonly abg: string;
        readonly abExp: number | null;
    }[];
    readonly minVersion: string | null;
    readonly maxVersion: string | null;
    readonly ts: string;
}
export interface ConfigsSnapshotUpdated {
    readonly scopes: readonly string[];
    readonly version: Readonly<Record<string, number>>;
    readonly reason: 'fetch' | 'context';
}
export interface ConfigPoller {
    register(task: {
        readonly id: 'configs:refresh';
        readonly intervalMs: number;
        readonly visibleAfterMs: number | false;
        readonly pauseWhenHidden: true;
        readonly runOnRegister: false;
        readonly run: () => Promise<void>;
    }): () => void;
}
export interface ConfigsContext {
    facts(): Facts;
    segments(keys: readonly string[]): boolean;
    ab(values: Readonly<Record<string, string>>): void;
    params(data: unknown): void;
    resolved?(): void;
}
export interface ConfigsDeps {
    readonly transport: HttpTransport;
    readonly storage: () => ScopedStorage;
    readonly bus: Pick<EventBus | ScopedBus, 'on' | 'emit'>;
    readonly context?: ConfigsContext;
    readonly poller?: ConfigPoller;
    readonly signal?: AbortSignal;
    readonly blobFetch?: typeof fetch;
    readonly now?: () => number;
}
export interface Configs {
    init(selection?: ConfigSelection): Promise<ConfigInit>;
    fetch(selection: ConfigSelection | undefined, options: ConditionalConfigFetchOptions): Promise<ConfigSnapshot | undefined>;
    fetch(selection?: ConfigSelection, options?: UnconditionalConfigFetchOptions): Promise<ConfigSnapshot>;
    refresh(): Promise<ConfigSnapshot>;
    resolveSnapshot(payload: ConfigPayload): ConfigSnapshot;
    snapshot(): ConfigSnapshot | undefined;
    getScope(scope: string): Readonly<Record<string, unknown>>;
    get<T = unknown>(scope: string, key: string): T | undefined;
    resolve<T = unknown>(scope: string, key: string): Promise<T | undefined>;
    dispose(): void;
}
export interface ConfigsController extends Configs {
    recompute(keys: ReadonlySet<string>, purchase?: boolean): boolean;
    timeDependent(): boolean;
}
export declare function createConfigs(deps: ConfigsDeps, initial?: ConfigSelection): ConfigsController;
//# sourceMappingURL=configs.d.ts.map
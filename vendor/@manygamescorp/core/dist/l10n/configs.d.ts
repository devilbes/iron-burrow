import type { Facts } from '@manygamescorp/contracts-client/filters';
import { type L10nDeps, type L10nEngine, type L10nOptions, type L10nSource } from '../l10n.js';
import { type L10nTransport } from '../l10n-sources.js';
import type { ModuleServices } from '../module.js';
import type { PlatformAdapter } from '../platform.js';
import type { StorageRoot } from '../storage/scoped.js';
export interface L10nPoller {
    register(task: {
        readonly id: 'l10n:refresh';
        readonly intervalMs: number;
        readonly visibleAfterMs: number | false;
        readonly pauseWhenHidden: true;
        readonly runOnRegister: boolean;
        readonly run: () => Promise<void>;
    }): () => void;
}
export interface L10nRuntimeDeps extends Omit<L10nDeps, 'source'> {
    readonly transport: L10nTransport;
    readonly now: () => number;
    readonly profileStorage: StorageRoot;
    readonly gid: () => string;
    readonly platform: PlatformAdapter;
    readonly services?: Pick<ModuleServices, 'get'>;
    readonly source?: L10nSource;
    readonly poller?: L10nPoller;
    readonly context?: () => Facts;
}
export interface L10nRuntimeOptions extends L10nOptions {
    readonly refresh?: 'poller' | 'start-only';
}
export interface L10nRuntime extends L10nEngine {
    idle(): Promise<void>;
}
export declare function createL10nRuntime(options: L10nRuntimeOptions, deps: L10nRuntimeDeps): L10nRuntime;
export { ConfigsL10nSource } from '../l10n-sources.js';
export type { ConfigsL10nSourceOptions, L10nTransport } from '../l10n-sources.js';
//# sourceMappingURL=configs.d.ts.map
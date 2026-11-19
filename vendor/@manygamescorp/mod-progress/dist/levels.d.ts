import type { Configs } from '@manygamescorp/core/configs';
import { type ModuleDefinition } from '@manygamescorp/core/module';
import type { Progress, LevelEndData, LevelEndAck, ActionOptions } from './progress-types.js';
import type { ScopedStorage } from '@manygamescorp/core/storage/scoped';
export type LevelResult = Pick<LevelEndData, 'moves' | 'durationMs' | 'score' | 'won' | 'seed' | 'objectives'>;
export interface AppliedLevel {
    readonly set: string;
    readonly n: number;
    readonly key: string;
    readonly levelId?: string;
    readonly configVersion: number;
    readonly contentHash: string;
    readonly entry?: unknown;
    readonly range: Readonly<Record<string, unknown>>;
}
export interface LevelLoadOptions {
    readonly signal?: AbortSignal;
}
export interface LevelOpenOptions extends LevelLoadOptions {
    readonly key?: string;
}
export interface LevelHandle {
    get(n: number, options?: LevelLoadOptions): Promise<AppliedLevel>;
    prefetch(n: number, options?: LevelLoadOptions): Promise<void>;
    has(n: number): boolean;
    levelEnd(level: AppliedLevel, result: LevelResult, options: ActionOptions): Promise<LevelEndAck>;
    dispose(): void;
}
export interface Levels {
    open(set: string, options?: LevelOpenOptions): Promise<LevelHandle>;
    dispose(): void;
}
export interface LevelRangeLoaded {
    readonly set: string;
    readonly keys: readonly string[];
    readonly scopeVer: number;
    readonly loadedAt: number;
}
export interface LevelsDeps {
    readonly configs: Pick<Configs, 'fetch' | 'resolveSnapshot'>;
    readonly storage?: ScopedStorage | undefined;
    readonly progress: Pick<Progress, 'levelEnd'>;
    readonly time: {
        now(): number;
    };
    readonly signal?: AbortSignal;
    readonly settings?: Readonly<Record<string, unknown>>;
    readonly publish?: (payload: LevelRangeLoaded) => void;
}
interface LevelsController extends Levels {
    invalidate(): void;
}
export declare function createLevels(deps: LevelsDeps): LevelsController;
export declare function levelsModule(): ModuleDefinition<Levels>;
export {};
//# sourceMappingURL=levels.d.ts.map
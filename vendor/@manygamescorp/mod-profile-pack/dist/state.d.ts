import { type DataHttp } from './data-module.js';
import { type JsonObject } from '@manygamescorp/core/data-validation';
import type { ModuleDefinition } from '@manygamescorp/core/module';
export interface GameState {
    readonly version: number;
    readonly data: JsonObject;
    readonly publicData: JsonObject | null;
    readonly updatedAt: string | null;
    readonly ts: number | null;
}
export interface GameStateWrite {
    readonly version: number;
    readonly updatedAt: string;
    readonly ts: number;
}
export interface GameStateMutationOptions {
    readonly signal?: AbortSignal;
    readonly idempotencyKey?: string;
}
export interface GameStateSetOptions extends GameStateMutationOptions {
    readonly version: number;
    readonly publicData?: JsonObject | null;
}
export interface GameStateClearOptions extends GameStateMutationOptions {
    readonly version?: number;
}
export interface GameStateApi {
    get(options?: {
        readonly signal?: AbortSignal;
    }): Promise<GameState>;
    set(data: JsonObject, options: GameStateSetOptions): Promise<GameStateWrite>;
    clear(options?: GameStateClearOptions): Promise<GameStateWrite>;
    dispose(): void;
}
export declare const GAME_STATE_MAX_BYTES = 1048576;
export declare const GAME_STATE_PUBLIC_MAX_BYTES = 8192;
export declare function createGameState(http: DataHttp, signal?: AbortSignal): GameStateApi;
export declare function gameStateModule(): ModuleDefinition<GameStateApi>;
//# sourceMappingURL=state.d.ts.map
import { type ModuleDefinition } from '@manygamescorp/core/module';
import { type Leaderboards, type ProfilePort } from './client.js';
export * from './client.js';
export interface LeaderboardsOptions {
    readonly profile?: ProfilePort;
}
export interface LeaderboardsWindowOpenPayload {
    readonly view: string;
    readonly tab: string | null;
}
export declare const LEADERBOARDS_WINDOWS: readonly ["main"];
export declare function leaderboardsModule(options?: LeaderboardsOptions): ModuleDefinition<Leaderboards>;
//# sourceMappingURL=leaderboards.d.ts.map
import type { MechanicCallOptions, SecondaryAttempts } from './mechanic-types.js';
export interface GameStatePort {
    get(options?: MechanicCallOptions): Promise<{
        version: number;
        data: Record<string, unknown>;
    }>;
    set(data: Record<string, unknown>, options: {
        version: number;
        idempotencyKey: string;
        signal: AbortSignal;
    }): Promise<unknown>;
}
export declare function secondaryAttempts(deps: {
    id: string;
    cooldownSec: number;
    now(): number;
    signal: AbortSignal;
    active(options?: MechanicCallOptions): AbortSignal;
    port(): GameStatePort;
    seed(input: {
        eventId: string;
        playerLevel: number;
        params: unknown;
    }, signal: AbortSignal): Promise<string>;
    notify(action: 'started' | 'finished', attemptId: string, won?: boolean, reward?: number): void;
}): SecondaryAttempts;
//# sourceMappingURL=mechanic-attempts.d.ts.map
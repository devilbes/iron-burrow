import type { ScopedHttp } from '@manygamescorp/core/scoped-http';
export interface ProgressState {
    readonly key: string;
    readonly status: 'active' | 'completed' | 'unavailable';
    readonly periodKey: string | null;
    readonly attemptId: string | null;
    readonly endsAt: string | null;
    readonly selectedStepKeys: readonly string[];
    readonly steps: Readonly<Record<string, ProgressStep>>;
    readonly groups: Readonly<Record<string, ProgressGroup>>;
    readonly rewards: readonly ProgressReward[];
}
export interface ProgressGroup {
    readonly completed: boolean;
}
export interface ProgressStep {
    readonly status: 'locked' | 'available' | 'completed';
    readonly availableAt: string | null;
    readonly conditions: Readonly<Record<string, {
        readonly value: number;
        readonly completed: boolean;
    }>>;
}
export interface ProgressReward {
    readonly operationId: string;
    readonly attemptId: string;
    readonly targetKey: string;
    readonly claimMode: 'auto' | 'manual';
    readonly status: 'available' | 'issued' | 'failed';
    readonly reward: readonly {
        readonly id: string;
        readonly amount: number;
    }[];
}
export interface ProgressInitOptions {
    readonly force?: boolean;
    readonly signal?: AbortSignal;
}
export interface LevelEndData {
    readonly set: string;
    readonly n: number;
    readonly key: string;
    readonly levelId?: string;
    readonly configVersion: number;
    readonly contentHash: string;
    readonly seed?: string;
    readonly moves: number;
    readonly durationMs: number;
    readonly score: number;
    readonly won: boolean;
    readonly objectives?: readonly string[];
}
export interface ActionInput {
    readonly eventId: string;
    readonly type: string;
    readonly data: Readonly<Record<string, unknown>> | LevelEndData;
}
export interface ActionOptions {
    readonly eventId: string;
    readonly signal?: AbortSignal;
}
export interface LevelVerification {
    readonly reason?: string;
    readonly stars: number;
    readonly verified: boolean;
}
export interface ActionAck {
    readonly acceptedAt: string;
    readonly duplicate: boolean;
    readonly eventId: string;
    readonly level?: LevelVerification;
    readonly status: 'accepted';
}
export interface LevelEndAck extends ActionAck {
    readonly level: LevelVerification;
}
export type AttemptSeedInput = {
    readonly mechanic: string;
    readonly eventId: string;
    readonly mode: 'core';
    readonly level: Pick<LevelEndData, 'set' | 'n' | 'key' | 'levelId' | 'configVersion' | 'contentHash'>;
} | {
    readonly mechanic: string;
    readonly eventId: string;
    readonly mode: 'secondary';
    readonly playerLevel: number;
    readonly params: unknown;
};
export interface AttemptSeed {
    readonly attemptId: string;
    readonly seed: string;
}
export interface Progress {
    beginAttempt(input: AttemptSeedInput, options?: ProgressInitOptions): Promise<AttemptSeed>;
    init(keys?: readonly string[], options?: ProgressInitOptions): Promise<readonly ProgressState[]>;
    init(keys: string, options?: ProgressInitOptions): Promise<ProgressState>;
    init(keys?: string | readonly string[], options?: ProgressInitOptions): Promise<ProgressState | readonly ProgressState[]>;
    send(action: ActionInput): Promise<ActionAck>;
    levelEnd(data: LevelEndData, options: ActionOptions): Promise<LevelEndAck>;
    dispose(): void;
}
export interface ActionAcceptedPayload {
    readonly eventId: string;
    readonly type: string;
    readonly duplicate: boolean;
}
export interface ProgressDeps {
    readonly revision?: () => number;
    readonly now?: () => number;
    readonly http: Pick<ScopedHttp, 'request'>;
    readonly signal?: AbortSignal;
    readonly publish?: (payload: ActionAcceptedPayload) => void;
}
//# sourceMappingURL=progress-types.d.ts.map
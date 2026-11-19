import type { AppliedLevel } from './levels.js';
import type { LevelEndAck } from './progress-types.js';
import type { Curve, LoadedCurve } from './mechanic-curve.js';
import type { MechanicMode, MechanicSettings } from './mechanic-settings.js';
export interface MechanicCallOptions {
    readonly signal?: AbortSignal;
}
export interface MechanicOptions {
    readonly id: string;
    readonly modes: readonly MechanicMode[];
}
export interface LevelResult {
    readonly moves: number;
    readonly score: number;
    readonly won: boolean;
    readonly objectives?: readonly string[];
}
export interface CoreAttempt {
    readonly eventId: string;
    readonly attemptId: string;
    readonly applied: AppliedLevel;
    readonly seed: string;
    readonly startedAt: number;
}
export interface CoreAdapter {
    currentStep(options?: MechanicCallOptions): Promise<{
        n: number;
        stepKey: string;
    }>;
    load(n: number, options?: MechanicCallOptions): Promise<AppliedLevel>;
    begin(applied: AppliedLevel): Promise<CoreAttempt>;
    levelEnd(attempt: CoreAttempt, result: LevelResult, options?: MechanicCallOptions): Promise<LevelEndAck>;
}
export interface Attempt<P> {
    readonly id: string;
    readonly seed: string;
    readonly playerLevel: number;
    readonly params: P;
    readonly startedAt: number;
}
export interface AttemptResult {
    readonly won: boolean;
    readonly score: number;
    readonly moves: number;
    readonly reward: number;
}
export interface FinishedAttempt<R> {
    readonly attempt: Attempt<unknown>;
    readonly result: R;
    readonly durationMs: number;
    readonly finishedAt: number;
}
export interface AttemptState {
    readonly active: Attempt<unknown> | null;
    readonly last: FinishedAttempt<AttemptResult> | null;
    readonly cooldownUntil: number;
    readonly attempts: number;
    readonly wins: number;
}
export interface SecondaryAttempts {
    restore(options?: MechanicCallOptions): Promise<AttemptState>;
    begin<P>(input: {
        playerLevel: number;
        params: P;
    }, options?: MechanicCallOptions): Promise<Attempt<P>>;
    finish<R extends AttemptResult>(attemptId: string, result: R, options?: MechanicCallOptions): Promise<FinishedAttempt<R>>;
    reset(options?: MechanicCallOptions): Promise<AttemptState>;
}
export interface MechanicHandle {
    readonly settings: MechanicSettings;
    ready(options?: MechanicCallOptions): Promise<MechanicMode>;
    playerLevel(options?: MechanicCallOptions): Promise<number>;
    loadCurve<P extends string>(curve: Curve<P>, options?: MechanicCallOptions): Promise<LoadedCurve<P>>;
    readonly core: CoreAdapter;
    readonly attempts: SecondaryAttempts;
    dispose(): void;
}
export interface MechanicReady {
    readonly mode: MechanicMode;
}
export interface MechanicAttemptStarted {
    readonly attemptId: string;
    readonly mode: MechanicMode;
    readonly n: number | null;
}
export interface MechanicAttemptFinished {
    readonly attemptId: string;
    readonly mode: MechanicMode;
    readonly won: boolean;
    readonly verified: boolean | null;
    readonly reward: number | null;
}
//# sourceMappingURL=mechanic-types.d.ts.map
export interface PollTask {
    readonly id: string;
    readonly intervalMs: number;
    readonly jitter?: number;
    readonly backoffBaseMs?: number;
    readonly backoffMaxMs?: number;
    readonly pauseWhenHidden?: boolean;
    readonly visibleAfterMs?: number | false;
    readonly runOnRegister?: boolean;
    readonly signal?: AbortSignal;
    readonly run: (signal: AbortSignal) => void | Promise<void>;
}
export interface Poller {
    register(task: PollTask): () => void;
}
export declare function scopePoller(poller: Poller, signal: AbortSignal, namespace?: string): Poller;
//# sourceMappingURL=poller.d.ts.map
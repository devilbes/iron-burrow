export declare const TIME_OFFSET_CHANGED = "time:offsetChanged";
export interface TimeOffsetChanged {
    readonly offset: number;
    readonly previous: number;
    readonly synced: boolean;
}
export interface ServerTime {
    now(): number;
    offset(): number;
    synced(): boolean;
}
export interface ServerClock extends ServerTime {
    sample(header: string | null, sentAt: number, receivedAt: number): void;
    onChange(listener: (change: TimeOffsetChanged) => void): () => void;
    readonly view: ServerTime;
}
export interface ServerClockOptions {
    readonly local?: () => number;
}
export declare const OFFSET_NOTICE_MS = 1000;
export declare function parseServerTime(header: string | null): number | undefined;
export declare function createServerClock(options?: ServerClockOptions): ServerClock;
//# sourceMappingURL=time.d.ts.map
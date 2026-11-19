/** Standard realtime command payloads, corresponding to contracts-server/events/broadcast v1. */
export declare const BROADCAST_TYPES: readonly ["configs.reload", "app.reload", "panel.announcement", "app.maintenance", "app.update.required"];
export type BroadcastType = (typeof BROADCAST_TYPES)[number];
export interface Announcement {
    readonly title: string;
    readonly text: string;
    readonly imageUrl?: string;
    readonly linkUrl?: string;
    readonly displaySeconds: number;
    readonly translations?: readonly {
        readonly locale: string;
        readonly title: string;
        readonly text: string;
    }[];
}
export type BroadcastCommand = {
    readonly type: 'configs.reload';
    readonly payload: Record<string, never>;
} | {
    readonly type: 'app.reload';
    readonly payload: {
        readonly delayMs: number;
        readonly jitterMs: number;
    };
} | {
    readonly type: 'panel.announcement';
    readonly payload: Announcement;
} | {
    readonly type: 'app.maintenance';
    readonly payload: {
        readonly startsAt: string;
        readonly endsAt: string;
        readonly message: string;
    };
} | {
    readonly type: 'app.update.required';
    readonly payload: {
        readonly minVersion: string;
        readonly message: string;
        readonly linkUrl?: string;
    };
};
export declare function broadcastHttps(value: unknown): value is string;
export declare function isBroadcastCommand(value: unknown): value is BroadcastCommand;
export declare function needsBroadcastUpdate(current: string | undefined, minimum: string): boolean;
//# sourceMappingURL=broadcast.d.ts.map
export interface RealtimeEnvelope {
    readonly v: 1;
    readonly id: string;
    readonly type: string;
    readonly schemaVersion: number;
    readonly sender: string;
    readonly sentAt: string;
    readonly expiresAt: string;
    readonly delivery: 'guaranteed' | 'fire_and_forget' | 'broadcast';
    readonly priority: 'low' | 'normal' | 'high' | 'critical';
    readonly to: {
        readonly kind: 'player' | 'session' | 'app' | 'topic';
        readonly topic?: string;
    };
    readonly seq?: number;
    readonly epoch?: string;
    readonly collapseKey?: string;
    readonly rid?: string;
    readonly causationId?: string;
    readonly filter?: unknown;
    readonly ref?: {
        readonly resource: string;
        readonly version?: string;
    };
    readonly payload: Readonly<Record<string, unknown>>;
}
export declare const REALTIME_TYPE: RegExp;
export declare const HEX24: RegExp;
export declare function realtimeType(value: unknown): value is string;
export declare function record(value: unknown): value is Record<string, unknown>;
/** Strict client projection: no appId/gid/session, credentials or server-only metadata. */
export declare function isRealtimeEnvelope(v: unknown): v is RealtimeEnvelope;
//# sourceMappingURL=realtime.d.ts.map
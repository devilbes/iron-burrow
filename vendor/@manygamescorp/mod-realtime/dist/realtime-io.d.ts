import type { SessionChannel } from '@manygamescorp/core/session-transport';
import type { RealtimeConnection, RealtimeCursor, RealtimeTransport } from '@manygamescorp/core/realtime-port';
export interface RealtimeIoOptions {
    readonly channel: SessionChannel;
    readonly signal: AbortSignal;
}
export declare function realtimeAvailable(kind: RealtimeTransport, channel: SessionChannel): boolean;
export declare function connectRealtime(options: RealtimeIoOptions, kind: RealtimeTransport, cursor: () => RealtimeCursor, caller: AbortSignal, receive: (value: unknown) => void, disconnected: (delayMs?: number) => void, activity: () => void): RealtimeConnection;
//# sourceMappingURL=realtime-io.d.ts.map
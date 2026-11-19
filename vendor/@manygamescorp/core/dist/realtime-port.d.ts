import type { RealtimeEnvelope } from '@manygamescorp/contracts-client/realtime';
export type { RealtimeEnvelope } from '@manygamescorp/contracts-client/realtime';
export type RealtimeTransport = 'sse' | 'ws' | 'poll';
export interface RealtimeCursor {
    readonly epoch?: string;
    readonly lastSeq: number;
    readonly sessionId?: string;
}
export interface RealtimeConnection {
    send(frame: Readonly<Record<string, unknown>>): Promise<void>;
    close(): void;
}
export type RealtimeHandler = (message: RealtimeEnvelope, context: {
    readonly signal: AbortSignal;
}) => unknown;
export interface RealtimeView {
    connected?(): boolean;
    on(type: string, handler: (message: RealtimeEnvelope) => unknown): () => void;
    handle(type: string, handler: RealtimeHandler): () => void;
}
export interface RealtimePort extends RealtimeDelivery {
    available(transport: RealtimeTransport): boolean;
    connect(transport: RealtimeTransport, cursor: () => RealtimeCursor, signal: AbortSignal, frame: (value: unknown) => void, closed: (delayMs?: number) => void, activity: () => void): RealtimeConnection;
}
export declare const REALTIME_DELIVERY = "realtime.delivery@1";
export interface RealtimeDelivery extends RealtimeView {
    publish(message: RealtimeEnvelope): void;
    critical(message: RealtimeEnvelope): Promise<void>;
    register(module: string, type: string, handler: RealtimeHandler): () => void;
    session(value?: string): void;
    state(state: string, transport?: RealtimeTransport): void;
}
export interface RealtimeHandlers {
    handle(type: string, handler: RealtimeHandler): () => void;
}
//# sourceMappingURL=realtime-port.d.ts.map
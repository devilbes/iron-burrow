import { type BroadcastNotice, type BroadcastOptions } from './broadcast.js';
import { type ModuleDefinition } from '@manygamescorp/core/module';
import type { RealtimePort, RealtimeTransport } from '@manygamescorp/core/realtime-port';
import type { ScopedStorage } from '@manygamescorp/core/storage/scoped';
import type { PlatformView } from '@manygamescorp/core/platform';
import type { Filters } from '@manygamescorp/core/filters';
export type { RealtimeEnvelope } from '@manygamescorp/contracts-client/realtime';
export type { RealtimeHandler, RealtimeHandlers, RealtimeTransport } from '@manygamescorp/core/realtime-port';
export interface RealtimeStatus {
    readonly state: 'connecting' | 'open' | 'offline' | 'stopped';
    readonly transport?: RealtimeTransport;
}
export interface RealtimeConnectedPayload {
    readonly state: 'open';
}
export interface RealtimeResyncPayload {
    readonly reason: 'epoch' | 'sequence_gap';
}
export interface RealtimeDisconnectedPayload {
    readonly state: RealtimeStatus['state'];
}
export interface RealtimeTransportPayload {
    readonly transport: RealtimeTransport;
}
export interface RealtimeMetrics {
    readonly received: number;
    readonly duplicates: number;
    readonly invalid: number;
    readonly expired: number;
    readonly acknowledged: number;
    readonly reconnects: number;
}
export interface RealtimeAcknowledgement {
    readonly id: string;
    readonly epoch?: string;
    readonly seq?: number;
}
export interface RealtimeNamespace {
    ack(message: RealtimeAcknowledgement): Promise<void>;
    notice(): BroadcastNotice | undefined;
    status(): RealtimeStatus;
    metrics(): RealtimeMetrics;
    reconnect(): Promise<void>;
}
export interface RealtimeOptions {
    readonly autoAck?: boolean;
    readonly broadcast?: BroadcastOptions;
    readonly transports?: readonly RealtimeTransport[];
    readonly upgradeEveryMs?: number;
}
interface Runtime extends RealtimeNamespace {
    dispose(): void;
}
export declare function createRealtime(port: RealtimePort, storage: Pick<ScopedStorage, 'get' | 'set'>, signal: AbortSignal, now: () => number, options?: RealtimeOptions, platform?: PlatformView, filters?: Filters, changed?: (status: RealtimeStatus) => void, resync?: (reason: RealtimeResyncPayload['reason']) => void): Runtime;
export declare function realtime(options?: RealtimeOptions): ModuleDefinition<RealtimeNamespace>;
export declare const realtimeModule: typeof realtime;
//# sourceMappingURL=realtime.d.ts.map
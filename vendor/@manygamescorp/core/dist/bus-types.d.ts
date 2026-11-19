import type { Logger } from './logger.js';
export interface BusTrace {
    readonly from: string;
    readonly rid: string;
}
export type Listener<P = unknown> = (payload: P, event: string, trace: BusTrace) => unknown;
export interface RequestOptions {
    readonly signal?: AbortSignal;
    readonly timeoutMs: number;
}
export interface RequestContext extends BusTrace {
    readonly signal: AbortSignal;
}
export type RequestHandler<Req = unknown, Res = unknown> = (request: Req, context: RequestContext) => Res | PromiseLike<Res>;
export type Unsubscribe = () => void;
export interface OnOptions {
    readonly once?: boolean;
    readonly signal?: AbortSignal;
}
export interface ListenerErrorPayload {
    readonly event: string;
}
export interface StickyRecord<P = unknown> {
    readonly payload: P;
    readonly trace: BusTrace;
}
export interface BusDebugRecord extends BusTrace {
    readonly type: 'event' | 'request' | 'response' | 'error';
    readonly name: string;
    readonly timestamp: number;
    readonly to?: string;
    readonly code?: string;
    readonly payload?: unknown;
}
export interface SdkDebug {
    bus(): readonly BusDebugRecord[];
}
export interface BusOptions {
    readonly onDiagnostic?: (record: Omit<BusDebugRecord, 'payload'>, payload: unknown) => void;
    readonly debug?: boolean;
    readonly mode?: 'development' | 'test' | 'production';
    readonly sticky?: readonly string[];
    readonly onListenerError?: (error: unknown, event: string) => void;
    readonly logger?: Logger;
}
export interface ScopedBusOptions {
    readonly signal?: AbortSignal;
}
export interface HandleOptions {
    readonly module?: string;
    readonly signal?: AbortSignal;
}
export interface ScopedBus {
    dispose(): void;
    on<P = unknown>(pattern: string, listener: Listener<P>, options?: OnOptions): Unsubscribe;
    once<P = unknown>(pattern: string, listener: Listener<P>, options?: OnOptions): Unsubscribe;
    off<P = unknown>(pattern: string, listener: Listener<P>): void;
    emit(event: string, payload?: unknown): void;
    request<Req = unknown, Res = unknown>(topic: string, request: Req, options: RequestOptions): Promise<Res>;
    handle<Req = unknown, Res = unknown>(topic: string, handler: RequestHandler<Req, Res>): Unsubscribe;
    replay<P = unknown>(event: string): StickyRecord<P> | undefined;
}
export interface EventBus extends Omit<ScopedBus, 'dispose'> {
    handle<Req = unknown, Res = unknown>(topic: string, handler: RequestHandler<Req, Res>, options?: HandleOptions): Unsubscribe;
    emit(event: string, payload?: unknown, trace?: BusTrace): void;
    request<Req = unknown, Res = unknown>(topic: string, request: Req, options: RequestOptions, trace?: BusTrace): Promise<Res>;
}
export interface DebugEventBus extends EventBus {
    debug(): readonly BusDebugRecord[];
    forget(event: string): void;
}
//# sourceMappingURL=bus-types.d.ts.map
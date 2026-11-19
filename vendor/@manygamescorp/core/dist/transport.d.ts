import type { NetworkDiagnostic } from './diagnostics.js';
import type { CallContext } from './context.js';
import type { Endpoints } from './endpoints.js';
import type { Logger } from './logger.js';
import type { ModuleId } from './module-id.js';
import type { ServerClock } from './time.js';
export interface RequestSpec<TBody = unknown> {
    readonly module: ModuleId;
    readonly method: 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    readonly path: `/v1/${string}`;
    readonly query?: Readonly<Record<string, string | number | boolean | undefined>>;
    readonly body?: TBody;
    readonly idempotencyKey?: string;
    readonly rid?: string;
    readonly idempotent?: boolean;
    readonly ifMatch?: string;
    readonly ifNoneMatch?: string;
    readonly acceptNotModified?: boolean;
    readonly onResponse?: (response: {
        readonly status: number;
        readonly etag: string | null;
    }) => void;
    readonly auth?: 'required' | 'none';
    readonly credentials?: 'include';
    readonly timeoutMs?: number;
    readonly maxResponseBytes?: number;
    readonly signal?: AbortSignal;
    readonly context?: CallContext;
}
export interface HttpTransport {
    request<TRes, TBody = unknown>(spec: RequestSpec<TBody>): Promise<TRes>;
}
export declare function isIdempotencyKey(value: unknown): value is string;
export interface HttpTransportOptions {
    readonly onDiagnostic?: (record: NetworkDiagnostic) => void;
    readonly endpoints: Endpoints | Readonly<Record<ModuleId, string>>;
    readonly token?: () => string | undefined;
    readonly realtimeSession?: () => string | undefined;
    readonly onUnauthorized?: (token: string) => void;
    readonly appId?: number;
    readonly appVersion?: string;
    readonly os?: string | number;
    readonly region?: string;
    readonly sdkContext?: Readonly<Record<string, string | number | boolean>>;
    readonly timeoutMs?: number;
    readonly maxResponseBytes?: number;
    readonly fetch?: typeof globalThis.fetch;
    readonly online?: () => boolean;
    readonly logger?: Logger;
    readonly clock?: Pick<ServerClock, 'sample' | 'now'>;
}
export interface RetryOptions {
    readonly maxRetries?: number;
    readonly baseDelayMs?: number;
    readonly maxDelayMs?: number;
}
export interface CircuitBreakerOptions {
    readonly failureThreshold?: number;
    readonly resetTimeoutMs?: number;
}
export interface ReliableHttpTransportOptions extends HttpTransportOptions {
    readonly retry?: RetryOptions;
    readonly breaker?: CircuitBreakerOptions;
    readonly authScope: () => string | undefined;
    readonly onlineEvents?: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;
}
export declare function createReliableHttpTransport(options: ReliableHttpTransportOptions): HttpTransport;
export declare function createHttpTransport(options: HttpTransportOptions): HttpTransport;
//# sourceMappingURL=transport.d.ts.map
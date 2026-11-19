import type { Logger, LogRecord } from './logger.js';
export interface DiagnosticOptions {
    readonly logs?: boolean;
    readonly network?: boolean;
    readonly errors?: boolean;
    readonly bus?: boolean;
    readonly busPayload?: boolean;
}
export interface NetworkDiagnostic {
    readonly method: string;
    readonly path: string;
    readonly status: number;
    readonly durationMs: number;
    readonly rid: string;
    readonly errorCode?: string;
}
export interface DiagnosticRecord {
    readonly kind: 'logs' | 'network' | 'errors' | 'bus';
    readonly time: number;
    readonly data: unknown;
}
export interface Diagnostics {
    subscribe(options: DiagnosticOptions, handler: (record: DiagnosticRecord) => unknown): () => void;
}
export declare function createDiagnostics(target?: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>): {
    api: Diagnostics;
    publish: (kind: DiagnosticRecord["kind"], data: unknown, payload?: unknown) => void;
    dispose(): void;
};
export declare function scopeDiagnostics(api: Diagnostics, signal: AbortSignal): Diagnostics;
export declare function diagnosticLogger(logger: Logger, publish: (record: LogRecord) => void): Logger;
export { diagnosticPath } from './diagnostic-path.js';
//# sourceMappingURL=diagnostics.d.ts.map
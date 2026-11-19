import { type CallContext } from './context.js';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogThreshold = LogLevel | 'silent';
export interface LogRecord {
    readonly level: LogLevel;
    readonly msg: string;
    readonly time: number;
    readonly moduleId?: string;
    readonly rid?: string;
    readonly operation?: string;
    readonly parentRid?: string;
    readonly data?: unknown;
}
export type LogSink = (record: LogRecord) => void;
export interface Logger {
    readonly level: LogThreshold;
    isEnabled(level: LogLevel): boolean;
    debug(msg: string, data?: unknown): void;
    info(msg: string, data?: unknown): void;
    warn(msg: string, data?: unknown): void;
    error(msg: string, data?: unknown): void;
    with(context: Partial<CallContext>): Logger;
    child(moduleId: string): Logger;
}
export interface LoggerOptions {
    readonly level?: LogThreshold;
    readonly sink?: LogSink;
    readonly context?: Partial<CallContext>;
    readonly now?: () => number;
}
export declare function createLogger(options?: LoggerOptions): Logger;
export declare const consoleSink: LogSink;
//# sourceMappingURL=logger.d.ts.map
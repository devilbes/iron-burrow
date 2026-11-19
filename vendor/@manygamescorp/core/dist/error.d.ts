import type { ErrorCode } from '@manygamescorp/contracts-client/errors';
export type HttpErrorCode = `HTTP_${number}`;
export type SDKErrorCode = ErrorCode | HttpErrorCode | (string & {});
export type SDKErrorSafeParams = Readonly<Record<string, string | number>>;
export interface SDKErrorOptions {
    readonly message?: string;
    readonly httpStatus?: number;
    readonly rid?: string;
    readonly details?: Readonly<Record<string, unknown>>;
    readonly safeParams?: SDKErrorSafeParams;
    readonly module?: string;
    readonly retryable?: boolean;
    readonly retryAfterMs?: number;
    readonly cause?: unknown;
}
export declare class SDKError extends Error {
    readonly name = "SDKError";
    readonly code: SDKErrorCode;
    readonly httpStatus?: number;
    readonly rid?: string;
    readonly details?: Readonly<Record<string, unknown>>;
    readonly safeParams?: SDKErrorSafeParams;
    readonly module?: string;
    readonly retryable: boolean;
    readonly retryAfterMs?: number;
    constructor(code: SDKErrorCode, options?: SDKErrorOptions);
    toJSON(): Record<string, unknown>;
}
export declare function isRetryableCode(code: string, httpStatus?: number): boolean;
//# sourceMappingURL=error.d.ts.map
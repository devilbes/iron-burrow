import type { CallContext } from './context.js';
import { SDKError, type SDKErrorCode, type SDKErrorOptions } from './error.js';
export { SDKError, isRetryableCode } from './error.js';
export type { HttpErrorCode, SDKErrorCode, SDKErrorOptions, SDKErrorSafeParams, } from './error.js';
export declare function isSDKError(value: unknown): value is SDKError;
export declare function toSDKError(value: unknown, fallbackCode: SDKErrorCode, context?: Pick<CallContext, 'rid' | 'moduleId'>): SDKError;
export declare function sdkErrorFromResponse(httpStatus: number, body: unknown, requestRid?: string): SDKError;
export interface ModuleErrorCodeInfo {
    readonly httpStatus?: number;
    readonly retryable?: boolean;
}
export interface RegisteredErrorCode extends ModuleErrorCodeInfo {
    readonly code: string;
    readonly module?: string;
}
export declare class ErrorCodeRegistry {
    private readonly modules;
    registerErrorCodes(moduleId: string, codes: Readonly<Record<string, ModuleErrorCodeInfo>>): void;
    lookup(code: string): RegisteredErrorCode | undefined;
    isKnown(code: string): boolean;
    create(code: SDKErrorCode, options?: SDKErrorOptions): SDKError;
    codesOf(moduleId: string): readonly string[];
}
//# sourceMappingURL=errors.d.ts.map
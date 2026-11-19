import { SDKError } from './error.js';
export declare function responseError(httpStatus: number, data: unknown, rid?: string, options?: {
    readonly module?: string;
    readonly retryAfterMs?: number | undefined;
}): SDKError;
//# sourceMappingURL=response-error.d.ts.map
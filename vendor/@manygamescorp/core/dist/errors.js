import { ERROR_CATALOG, ERROR_CODE_PATTERN, isErrorCode, } from '@manygamescorp/contracts-client/errors';
import { responseError } from './response-error.js';
import { SDKError } from './error.js';
export { SDKError, isRetryableCode } from './error.js';
export function isSDKError(value) {
    return value instanceof SDKError;
}
export function toSDKError(value, fallbackCode, context) {
    if (value instanceof SDKError)
        return value;
    const message = value instanceof Error ? value.message : undefined;
    return new SDKError(fallbackCode, {
        ...(message === undefined || message === '' ? {} : { message }),
        ...(context === undefined ? {} : { rid: context.rid, module: context.moduleId }),
        cause: value,
    });
}
const HTTP_PREFIX = 'HTTP_';
export function sdkErrorFromResponse(httpStatus, body, requestRid) {
    return responseError(httpStatus, body, requestRid);
}
const MODULE_ID_PATTERN = /^[a-z][a-z0-9-]{0,63}$/;
export class ErrorCodeRegistry {
    modules = new Map();
    registerErrorCodes(moduleId, codes) {
        if (!MODULE_ID_PATTERN.test(moduleId)) {
            throw new TypeError(`invalid module id for error codes: ${JSON.stringify(moduleId)}`);
        }
        const pending = [];
        for (const [code, info] of Object.entries(codes)) {
            if (!ERROR_CODE_PATTERN.test(code) || code.startsWith(HTTP_PREFIX)) {
                throw new TypeError(`error code ${code} of ${moduleId}: expected 3+ UPPER_SNAKE segments`);
            }
            if (isErrorCode(code)) {
                throw new TypeError(`error code ${code} of ${moduleId} is in the common catalog`);
            }
            validateInfo(moduleId, code, info);
            const existing = this.modules.get(code);
            if (existing !== undefined) {
                if (existing.module !== moduleId || !sameInfo(existing, info)) {
                    throw new TypeError(`error code ${code} of ${moduleId} is already registered by ${String(existing.module)}`);
                }
                continue;
            }
            pending.push({
                code,
                module: moduleId,
                ...(info.httpStatus === undefined ? {} : { httpStatus: info.httpStatus }),
                ...(info.retryable === undefined ? {} : { retryable: info.retryable }),
            });
        }
        for (const entry of pending)
            this.modules.set(entry.code, Object.freeze(entry));
    }
    lookup(code) {
        if (isErrorCode(code)) {
            const info = ERROR_CATALOG[code];
            return info.httpStatus === undefined ? { code } : { code, httpStatus: info.httpStatus };
        }
        return this.modules.get(code);
    }
    isKnown(code) {
        return this.lookup(code) !== undefined;
    }
    create(code, options = {}) {
        const entry = this.lookup(code);
        if (entry === undefined)
            throw new TypeError(`unregistered error code ${code}`);
        return new SDKError(code, {
            ...(entry.module === undefined ? {} : { module: entry.module }),
            ...(entry.retryable === undefined ? {} : { retryable: entry.retryable }),
            ...options,
        });
    }
    codesOf(moduleId) {
        const out = [];
        for (const entry of this.modules.values())
            if (entry.module === moduleId)
                out.push(entry.code);
        return out.sort();
    }
}
function validateInfo(moduleId, code, info) {
    if (typeof info !== 'object' || info === null) {
        throw new TypeError(`error code ${code} of ${moduleId}: info must be an object`);
    }
    const { httpStatus, retryable } = info;
    if (httpStatus !== undefined
        && !(Number.isInteger(httpStatus) && httpStatus >= 400 && httpStatus <= 599)) {
        throw new TypeError(`error code ${code} of ${moduleId}: httpStatus must be 400..599`);
    }
    if (retryable !== undefined && typeof retryable !== 'boolean') {
        throw new TypeError(`error code ${code} of ${moduleId}: retryable must be boolean`);
    }
}
function sameInfo(a, b) {
    return a.httpStatus === b.httpStatus && a.retryable === b.retryable;
}

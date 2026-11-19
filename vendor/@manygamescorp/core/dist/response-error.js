import { ERROR_CATALOG, isErrorCode } from '@manygamescorp/contracts-client/errors';
import { SDKError } from './error.js';
export function responseError(httpStatus, data, rid, options = {}) {
    const status = Number.isInteger(httpStatus) && httpStatus >= 100 && httpStatus <= 599
        ? httpStatus : 0;
    const object = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)
        && [Object.prototype, null].includes(Object.getPrototypeOf(value));
    const known = object(data) && typeof data.code === 'string'
        && /^[A-Z][A-Z0-9_]{0,127}$/.test(data.code) && typeof data.msg === 'string'
        && (!isErrorCode(data.code)
            || ERROR_CATALOG[data.code].emittedBy.some((origin) => origin === 'server'));
    const responseRid = known && typeof data.rid === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(data.rid)
        ? data.rid : rid;
    return new SDKError(known ? data.code : `HTTP_${status}`, {
        message: known ? data.msg.slice(0, 1024) : 'Unexpected HTTP response',
        ...(status === 0 ? {} : { httpStatus: status }),
        ...(responseRid === undefined ? {} : { rid: responseRid }),
        ...(known && object(data.details) ? { details: boundedDetails(data.details) } : {}),
        ...(options.module === undefined ? {} : { module: options.module }),
        ...(options.retryAfterMs === undefined ? {} : { retryAfterMs: options.retryAfterMs }),
    });
}
function boundedDetails(details) {
    try {
        if (new TextEncoder().encode(JSON.stringify(details)).byteLength <= 4096)
            return details;
    }
    catch { }
    return { truncated: true };
}

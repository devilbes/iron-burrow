import { SDKError } from './error.js';
import { redact } from './redact.js';
export function requestError(error, module, rid) {
    try {
        return new SDKError(error instanceof SDKError ? safeCode(error.code) : 'INTERNAL', {
            ...(error instanceof SDKError ? safeOptions(error) : {}), module, rid,
        });
    }
    catch {
        return new SDKError('INTERNAL', { module, rid });
    }
}
function safeCode(code) {
    return /^[A-Z][A-Z0-9_]{0,63}$/.test(code) ? code : 'INTERNAL';
}
function safeOptions(error) {
    const safeParams = redact(error.safeParams);
    return {
        ...(error.httpStatus === undefined ? {} : { httpStatus: error.httpStatus }),
        ...(typeof safeParams !== 'object' || safeParams === null ? {} : {
            safeParams: safeParams,
        }),
        retryable: error.retryable,
    };
}
export function snapshotError(source) {
    const details = redact(source.details);
    return new SDKError(safeCode(source.code), {
        ...safeOptions(source),
        ...(source.module === undefined ? {} : { module: source.module }),
        ...(source.rid === undefined ? {} : { rid: source.rid }),
        ...(typeof details === 'object' && details !== null ? {
            details: details,
        } : {}),
    });
}
function prepare(value, seen = new Map()) {
    if (typeof value !== 'object' || value === null)
        return value;
    if (seen.has(value))
        return seen.get(value);
    if (value instanceof SDKError) {
        const error = snapshotError(value);
        seen.set(value, error);
        return error;
    }
    if (value instanceof Map) {
        const copy = new Map();
        seen.set(value, copy);
        for (const [key, item] of value)
            copy.set(prepare(key, seen), prepare(item, seen));
        return copy;
    }
    if (value instanceof Set) {
        const copy = new Set();
        seen.set(value, copy);
        for (const item of value)
            copy.add(prepare(item, seen));
        return copy;
    }
    if (Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype
        || Object.getPrototypeOf(value) === null) {
        const copy = Array.isArray(value) ? new Array(value.length) : {};
        seen.set(value, copy);
        for (const key of Object.keys(value)) {
            Object.defineProperty(copy, key, {
                value: prepare(value[key], seen),
                enumerable: true, configurable: true, writable: true,
            });
        }
        return copy;
    }
    return value;
}
export function cloneBusPayload(value) {
    const prepared = prepare(value);
    const cloned = structuredClone(prepared);
    const seen = new Map();
    function restore(source, copy) {
        if (typeof source !== 'object' || source === null)
            return copy;
        if (seen.has(source))
            return seen.get(source);
        if (source instanceof SDKError) {
            const error = snapshotError(source);
            seen.set(source, error);
            return error;
        }
        seen.set(source, copy);
        if (source instanceof Map && copy instanceof Map) {
            const entries = [...copy];
            copy.clear();
            let i = 0;
            for (const [key, item] of source) {
                const [copyKey, copyItem] = entries[i++];
                copy.set(restore(key, copyKey), restore(item, copyItem));
            }
        }
        else if (source instanceof Set && copy instanceof Set) {
            const items = [...copy];
            copy.clear();
            let i = 0;
            for (const item of source)
                copy.add(restore(item, items[i++]));
        }
        else if (typeof copy === 'object' && copy !== null
            && (Array.isArray(copy) || Object.getPrototypeOf(copy) === Object.prototype)) {
            for (const key of Object.keys(copy)) {
                Object.defineProperty(copy, key, {
                    value: restore(source[key], copy[key]),
                    enumerable: true, configurable: true, writable: true,
                });
            }
        }
        return copy;
    }
    return restore(prepared, cloned);
}

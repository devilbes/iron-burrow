import { recordValue } from './levels-validation.js';
import { SDKError } from '@manygamescorp/core/error';
export function fail(code, safeParams) {
    throw new SDKError(code, { module: 'mechanic', retryable: code === 'MECHANIC_ATTEMPT_CONFLICT',
        ...(safeParams ? { safeParams } : {}) });
}
export function plain(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
        && [Object.prototype, null].includes(Object.getPrototypeOf(value));
}
export function integer(value, min, max) {
    return Number.isSafeInteger(value) && value >= min && value <= max;
}
export function level(value) {
    if (!integer(value, 1, 1_000_000))
        fail('MECHANIC_LEVEL_INVALID');
}
export function freeze(value) {
    if (value && typeof value === 'object') {
        Object.freeze(value);
        for (const child of Object.values(value))
            freeze(child);
    }
    return value;
}
export function json(value, code, path = '', maxBytes = 16_384, maxDepth = 64) {
    const parents = new Set();
    const visit = (v, p, depth) => {
        const bad = () => fail(code, { path: p });
        if (depth > maxDepth)
            bad();
        if (v === null || typeof v === 'boolean' || typeof v === 'string')
            return v;
        if (typeof v === 'number')
            return Number.isFinite(v) ? v : bad();
        if ((!Array.isArray(v) && !plain(v)) || parents.has(v))
            return bad();
        parents.add(v);
        const entries = Object.entries(Object.getOwnPropertyDescriptors(v));
        if (entries.some(([k, d]) => !('value' in d) || (/[$.]/.test(k) || k.includes('\0'))
            || ['__proto__', 'constructor', 'prototype', '_bsontype'].includes(k)))
            bad();
        let out;
        if (Array.isArray(v)) {
            if (Object.keys(v).length !== v.length)
                bad();
            out = Array.from(v, (item, i) => visit(item, `${p}[${i}]`, depth + 1));
        }
        else
            out = Object.fromEntries(Object.entries(v)
                .map(([key, item]) => [key, visit(item, p ? `${p}.${key}` : key, depth + 1)]));
        parents.delete(v);
        return out;
    };
    const copy = visit(value, path, 0);
    if (new TextEncoder().encode(JSON.stringify(copy)).length > maxBytes)
        fail(code, { path });
    return copy;
}
export function canonical(value) {
    if (Array.isArray(value))
        return `[${value.map(canonical).join(',')}]`;
    if (plain(value))
        return `{${Object.keys(value).sort()
            .map(k => `${JSON.stringify(k)}:${canonical(recordValue(value, k))}`).join(',')}}`;
    return JSON.stringify(value);
}
export function wait(promise, signal) {
    if (signal.aborted)
        return Promise.reject(new SDKError('MODULE_NOT_ACTIVE', { module: 'mechanic' }));
    return new Promise((resolve, reject) => {
        const abort = () => {
            cleanup();
            reject(new SDKError('MODULE_NOT_ACTIVE', { module: 'mechanic' }));
        };
        const cleanup = () => signal.removeEventListener('abort', abort);
        signal.addEventListener('abort', abort, { once: true });
        promise.then(value => { cleanup(); if (signal.aborted)
            abort();
        else
            resolve(value); }, error => { cleanup(); reject(error); });
    });
}

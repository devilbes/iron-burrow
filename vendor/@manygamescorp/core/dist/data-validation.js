import { randomUuid } from './context.js';
import { SDKError } from './error.js';
export function invalidData() {
    throw new SDKError('VALIDATION_FAILED', { message: 'Invalid SDK data request' });
}
export function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        && [Object.prototype, null].includes(Object.getPrototypeOf(value));
}
export function safeName(key) {
    return key !== '' && !['__proto__', 'constructor', 'prototype', '_bsontype'].includes(key)
        && !key.startsWith('$') && !key.includes('.') && !key.includes('\0');
}
export function jsonCopy(value, maxBytes = 262_144, maxDepth = 6) {
    const seen = new Set();
    const visit = (node, depth) => {
        if (depth > maxDepth)
            invalidData();
        if (node === null || typeof node === 'boolean' || typeof node === 'string')
            return;
        if (typeof node === 'number' && Number.isFinite(node))
            return;
        if (!(Array.isArray(node) || record(node)) || seen.has(node))
            invalidData();
        seen.add(node);
        if (Array.isArray(node)) {
            for (const item of node)
                visit(item, depth + 1);
        }
        else {
            for (const [key, item] of Object.entries(node)) {
                if (!safeName(key))
                    invalidData();
                visit(item, depth + 1);
            }
        }
        seen.delete(node);
    };
    visit(value, 0);
    const text = JSON.stringify(value);
    if (new TextEncoder().encode(text).byteLength > maxBytes)
        invalidData();
    return JSON.parse(text);
}
export function onlyKeys(value, keys) {
    if (!record(value) || Object.keys(value).some((key) => !keys.includes(key)))
        invalidData();
    return value;
}
export function versionHeader(version, min = 1) {
    if (version === undefined)
        return undefined;
    if (!Number.isSafeInteger(version) || version < min)
        invalidData();
    return `"${version}"`;
}
export function gidValue(gid) {
    if (typeof gid !== 'number' || !Number.isSafeInteger(gid) || gid < 1)
        invalidData();
    return gid;
}
export function mutationKey(key) {
    const value = key ?? randomUuid();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
        invalidData();
    }
    return value;
}

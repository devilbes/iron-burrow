export class PortalBusError extends Error {
    code;
    retryable;
    constructor(code, retryable = false) {
        super(code);
        this.code = code;
        this.retryable = retryable;
        this.name = 'PortalBusError';
    }
}
export const PORTAL_MAX_BYTES = 32 * 1024;
export const PORTAL_RATE = 20;
export const portalUuid = (value) => typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export const portalName = (value) => typeof value === 'string'
    && /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(value) && value.length <= 100
    && !['__proto__', 'prototype', 'constructor'].includes(value);
export function portalRecord(value) {
    if (value === null || typeof value !== 'object' || Array.isArray(value))
        return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}
export function portalJson(value) {
    let nodes = 0;
    let characters = 0;
    function visit(item, depth) {
        if (++nodes > PORTAL_MAX_BYTES || depth > 32)
            return false;
        if (typeof item === 'string') {
            characters += item.length;
            return characters <= PORTAL_MAX_BYTES;
        }
        if (item === null || typeof item === 'boolean')
            return true;
        if (typeof item === 'number')
            return Number.isFinite(item);
        if (Array.isArray(item))
            return item.length <= PORTAL_MAX_BYTES
                && item.every((entry) => visit(entry, depth + 1));
        if (!portalRecord(item))
            return false;
        const keys = Object.keys(item);
        if (keys.length > PORTAL_MAX_BYTES)
            return false;
        for (const key of keys) {
            characters += key.length;
            if (characters > PORTAL_MAX_BYTES || key === '__proto__'
                || key === 'constructor' || key === 'prototype' || !visit(item[key], depth + 1))
                return false;
        }
        return true;
    }
    return visit(value, 0);
}
export function parsePortalEnvelope(value) {
    try {
        if (!portalRecord(value) || !portalJson(value))
            return;
        const json = JSON.stringify(value);
        if (new TextEncoder().encode(json).byteLength > PORTAL_MAX_BYTES)
            return;
        if (value.mpg !== 'bus' || value.v !== 1 || !portalUuid(value.id)
            || !['request', 'response', 'event', 'subscribe', 'unsubscribe'].includes(String(value.kind))
            || !portalName(value.ns) || !portalName(value.type)
            || typeof value.ts !== 'number' || !Number.isFinite(value.ts)
            || !Object.hasOwn(value, 'payload'))
            return;
        if (value.kind === 'response' ? !portalUuid(value.correlationId)
            : value.correlationId !== null)
            return;
        if (value.error !== undefined) {
            if (value.kind !== 'response' || !portalRecord(value.error)
                || typeof value.error.code !== 'string' || value.error.code.length > 150
                || typeof value.error.message !== 'string' || value.error.message.length > 500
                || typeof value.error.retryable !== 'boolean'
                || !portalRecord(value.payload) || Object.keys(value.payload).length !== 0)
                return;
        }
        return JSON.parse(json);
    }
    catch {
        return;
    }
}

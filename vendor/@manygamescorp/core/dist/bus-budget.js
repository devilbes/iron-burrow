import { SDKError } from './error.js';
import { snapshotError } from './bus-payload.js';
const MAX_BYTES = 65_536;
const MAX_DEPTH = 32;
const MAX_ELEMENTS = 4096;
export function checkBusPayload(payload, module) {
    let bytes = 0;
    let elements = 0;
    const seen = new Set();
    const fail = () => {
        throw new SDKError('VALIDATION_FAILED', { module, details: { operation: 'bus.payload' } });
    };
    function add(size) {
        bytes += size;
        if (bytes > MAX_BYTES)
            fail();
    }
    function string(value) {
        for (let i = 0; i < value.length; i++) {
            const code = value.charCodeAt(i);
            if (code >= 0xd800 && code <= 0xdbff && i + 1 < value.length
                && value.charCodeAt(i + 1) >= 0xdc00 && value.charCodeAt(i + 1) <= 0xdfff) {
                add(4);
                i++;
            }
            else
                add(code < 0x80 ? 1 : code < 0x800 ? 2 : 3);
        }
    }
    function visit(value, depth) {
        if (++elements > MAX_ELEMENTS || depth > MAX_DEPTH)
            fail();
        if (typeof value === 'string') {
            string(value);
            return;
        }
        if (typeof value === 'bigint' || typeof value === 'function' || typeof value === 'symbol')
            fail();
        if (typeof value !== 'object' || value === null) {
            add(8);
            return;
        }
        add(8);
        if (seen.has(value))
            return;
        seen.add(value);
        if (value instanceof SDKError) {
            visit(snapshotError(value).toJSON(), depth + 1);
            return;
        }
        if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
            add(value.byteLength);
            return;
        }
        if (value instanceof Date)
            return;
        if (value instanceof Map) {
            if (value.size * 2 > MAX_ELEMENTS - elements)
                fail();
            for (const [key, item] of value) {
                visit(key, depth + 1);
                visit(item, depth + 1);
            }
            return;
        }
        if (value instanceof Set) {
            if (value.size > MAX_ELEMENTS - elements)
                fail();
            for (const item of value)
                visit(item, depth + 1);
            return;
        }
        if (Array.isArray(value)) {
            if (value.length > MAX_ELEMENTS)
                fail();
        }
        else if (Object.getPrototypeOf(value) !== Object.prototype
            && Object.getPrototypeOf(value) !== null)
            fail();
        for (const key in value) {
            if (!Object.hasOwn(value, key))
                continue;
            string(key);
            const descriptor = Object.getOwnPropertyDescriptor(value, key);
            if (!descriptor || !('value' in descriptor))
                return fail();
            visit(descriptor.value, depth + 1);
        }
    }
    try {
        visit(payload, 0);
    }
    catch {
        fail();
    }
}
export function createScopeBudget(module) {
    let tokens = 100;
    let last = performance.now();
    return {
        accept(payload) {
            checkBusPayload(payload, module);
            const now = performance.now();
            tokens = Math.min(100, tokens + Math.max(0, now - last) / 10);
            last = now;
            if (tokens < 1)
                throw new SDKError('RATE_LIMITED', {
                    module, retryable: true, retryAfterMs: Math.ceil((1 - tokens) * 10),
                    details: { operation: 'bus.rate' },
                });
            tokens--;
        },
        clear() { tokens = 0; last = 0; },
    };
}

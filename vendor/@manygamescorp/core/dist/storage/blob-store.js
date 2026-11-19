import { SDKError } from '../error.js';
const KEY = /^[A-Za-z0-9][A-Za-z0-9:._-]{0,255}$/;
export function assertBlobKey(key) {
    if (typeof key !== 'string' || !KEY.test(key)) {
        throw new SDKError('SDK_STORAGE_KEY_INVALID', { message: 'blob store key is invalid' });
    }
}
export function assertBlobPrefix(prefix) {
    if (typeof prefix !== 'string' || (prefix !== '' && !KEY.test(prefix))) {
        throw new SDKError('SDK_STORAGE_KEY_INVALID', { message: 'blob store prefix is invalid' });
    }
}
export function assertBlobValue(value) {
    if (!(value instanceof Uint8Array)) {
        throw new SDKError('SDK_STORAGE_VALUE_INVALID', { message: 'blob store value must be bytes' });
    }
}
export function createMemoryBlobStore() {
    const entries = new Map();
    return {
        async get(key) {
            assertBlobKey(key);
            const entry = entries.get(key);
            if (entry === undefined)
                return undefined;
            entry.accessedAt = Date.now();
            return entry.value.slice();
        },
        async put(key, value) {
            assertBlobKey(key);
            assertBlobValue(value);
            entries.set(key, { value: value.slice(), accessedAt: Date.now() });
        },
        async remove(key) {
            assertBlobKey(key);
            entries.delete(key);
        },
        async list(prefix) {
            assertBlobPrefix(prefix);
            return [...entries].filter(([key]) => key.startsWith(prefix)).map(([key, entry]) => ({
                key,
                size: entry.value.byteLength,
                accessedAt: entry.accessedAt,
            }));
        },
    };
}
export async function purgeBlobs(store, prefix, keep) {
    const kept = keep === undefined ? [] : typeof keep === 'string' ? [keep] : keep;
    let error;
    let count = 0;
    for (const { key } of await store.list(prefix)) {
        if (!key.startsWith(prefix) || kept.some((other) => key.startsWith(other)))
            continue;
        try {
            await store.remove(key);
            count += 1;
        }
        catch (cause) {
            error ??= cause;
        }
    }
    if (error !== undefined)
        throw error;
    return count;
}

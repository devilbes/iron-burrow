import { SDKError } from '../error.js';
const ROOT = 'mpg:app';
export const DEVICE = 'device';
const SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const MAX_KEY = 256;
const CONTROL = /[\u0000-\u001f\u007f]/;
function quote(value) {
    return JSON.stringify(value.length > 64 ? `${value.slice(0, 64)}…` : value);
}
function segment(name, value) {
    if (typeof value !== 'string' || !SEGMENT.test(value) || (name === 'gid' && value === DEVICE)) {
        const shown = typeof value === 'string' ? quote(value) : typeof value;
        throw new SDKError('SDK_STORAGE_KEY_INVALID', {
            message: `storage ${name} ${shown} is invalid`,
            details: { field: name },
        });
    }
    return value;
}
function userKey(key) {
    if (typeof key !== 'string' || key.length === 0 || key.length > MAX_KEY || CONTROL.test(key)) {
        const shown = typeof key === 'string' ? quote(key) : typeof key;
        throw new SDKError('SDK_STORAGE_KEY_INVALID', {
            message: `storage key ${shown} is invalid`,
            details: { field: 'key' },
        });
    }
    return key;
}
export function createMemoryBackend() {
    const items = new Map();
    return {
        get length() {
            return items.size;
        },
        key: (index) => [...items.keys()][index] ?? null,
        getItem: (key) => items.get(key) ?? null,
        setItem: (key, value) => {
            items.set(key, String(value));
        },
        removeItem: (key) => {
            items.delete(key);
        },
    };
}
function browserBackend(probeKey) {
    try {
        const storage = globalThis.localStorage;
        if (storage === undefined || storage === null)
            return undefined;
        storage.getItem(probeKey);
        return storage;
    }
    catch {
        return undefined;
    }
}
export function localBackend(probeKey) {
    return browserBackend(probeKey) ?? createMemoryBackend();
}
export function originTag(api) {
    const origin = new URL(api).origin;
    let h1 = 0x811c9dc5;
    let h2 = 0x050c5d1f;
    for (let i = 0; i < origin.length; i += 1) {
        h1 = Math.imul(h1 ^ origin.charCodeAt(i), 0x01000193);
        h2 = Math.imul(h2 ^ origin.charCodeAt(i), 0x5bd1e995);
    }
    return `${(h1 >>> 0).toString(36)}.${(h2 >>> 0).toString(36)}`;
}
export function storagePrefix(appId, api) {
    if (!Number.isSafeInteger(appId) || appId < 1) {
        throw new SDKError('SDK_STORAGE_KEY_INVALID', { details: { field: 'appId' } });
    }
    return `${ROOT}:${appId}:${originTag(api)}:`;
}
function keysWithPrefix(backend, prefix) {
    const found = [];
    for (let i = 0; i < backend.length; i += 1) {
        const key = backend.key(i);
        if (key !== null && key.startsWith(prefix))
            found.push(key);
    }
    return found;
}
function purge(backend, prefix, except) {
    let error;
    let count = 0;
    for (const key of keysWithPrefix(backend, prefix)) {
        if (except?.includes(key))
            continue;
        try {
            backend.removeItem(key);
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
function scoped(backend, prefix) {
    return Object.freeze({
        prefix,
        get(key) {
            const raw = backend.getItem(prefix + userKey(key));
            if (raw === null)
                return undefined;
            try {
                return JSON.parse(raw);
            }
            catch {
                return undefined;
            }
        },
        set(key, value) {
            const full = prefix + userKey(key);
            let raw;
            try {
                raw = JSON.stringify(value);
            }
            catch (cause) {
                throw new SDKError('SDK_STORAGE_VALUE_INVALID', {
                    message: 'storage value is not JSON-serializable',
                    cause,
                });
            }
            if (raw === undefined) {
                throw new SDKError('SDK_STORAGE_VALUE_INVALID', { message: 'storage value is not JSON-serializable' });
            }
            try {
                backend.setItem(full, raw);
            }
            catch (cause) {
                throw new SDKError('SDK_STORAGE_WRITE_FAILED', { message: 'storage write failed', cause });
            }
        },
        remove(key) {
            backend.removeItem(prefix + userKey(key));
        },
        keys() {
            return keysWithPrefix(backend, prefix).map((key) => key.slice(prefix.length));
        },
        clear() {
            purge(backend, prefix);
        },
    });
}
export function createStorage(options) {
    const appCode = segment('appCode', options.appCode);
    const root = options.appId === undefined ? `mpg:local:${appCode}:${originTag(options.api)}:`
        : storagePrefix(options.appId, options.api);
    const device = `${root}${DEVICE}:`;
    const browser = options.appId === undefined ? undefined
        : options.backend ?? browserBackend(`${device}probe`);
    const backend = browser ?? createMemoryBackend();
    return Object.freeze({
        appCode,
        prefix: root,
        persistent: browser !== undefined,
        gids() {
            return [...new Set(keysWithPrefix(backend, root)
                    .map((key) => key.slice(root.length).split(':')[0]))]
                .filter((gid) => gid !== DEVICE);
        },
        scope(gid, moduleId) {
            return scoped(backend, `${root}${segment('gid', gid)}:${segment('moduleId', moduleId)}:`);
        },
        device: () => Object.freeze({
            getItem: (key) => backend.getItem(device + userKey(key)),
            setItem: (key, value) => backend.setItem(device + userKey(key), value),
            removeItem: (key) => backend.removeItem(device + userKey(key)),
        }),
        clearGid: (gid, except) => purge(backend, `${root}${segment('gid', gid)}:`, except),
        purgePrefix(prefix) {
            if (typeof prefix !== 'string' || !prefix.startsWith(root) || CONTROL.test(prefix)) {
                throw new SDKError('SDK_STORAGE_KEY_INVALID', {
                    message: 'storage prefix is invalid', details: { field: 'prefix' },
                });
            }
            return purge(backend, prefix);
        },
    });
}
export function lockStorage(backend, name, run) {
    const locks = browserBackend(`${name}probe`) === backend ? globalThis.navigator?.locks : undefined;
    return locks ? locks.request(name, run) : run();
}
export function watchStorage(backend, keys, changed) {
    const listener = (event) => {
        if ((event.storageArea === null || event.storageArea === backend)
            && (event.key === null || keys.includes(event.key)))
            changed();
    };
    globalThis.addEventListener?.('storage', listener);
    return () => globalThis.removeEventListener?.('storage', listener);
}

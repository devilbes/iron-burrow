import { SDKError } from '../error.js';
import { assertSecureKey, assertSecureValue } from './secure-store.js';
const STORE = 'kv';
function failed(operation, cause) {
    return new SDKError('SDK_SECURE_STORE_FAILED', {
        message: `secure store ${operation} failed`,
        details: { kind: 'insecure-web', operation },
        ...(cause === undefined ? {} : { cause }),
    });
}
function defaultIdb() {
    try {
        return globalThis.indexedDB ?? null;
    }
    catch {
        return null;
    }
}
export function createInsecureWebSecureStore(options = {}) {
    if (options.dbName !== undefined && (typeof options.dbName !== 'string'
        || !options.dbName.trim()))
        throw new SDKError('SDK_STORAGE_KEY_INVALID');
    const dbName = options.dbName;
    const idb = dbName === undefined ? null
        : options.idb === undefined ? defaultIdb() : options.idb;
    const openTimeoutMs = options.openTimeoutMs ?? 5000;
    const memory = new Map();
    let opening;
    function open(factory) {
        opening ??= new Promise((resolve, reject) => {
            let settled = false;
            const timer = setTimeout(() => {
                settled = true;
                reject(failed('open', new Error('timeout')));
            }, openTimeoutMs);
            const done = (fn) => {
                clearTimeout(timer);
                if (!settled) {
                    settled = true;
                    fn();
                }
            };
            let request;
            try {
                request = factory.open(dbName, 1);
            }
            catch (cause) {
                done(() => reject(failed('open', cause)));
                return;
            }
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE))
                    db.createObjectStore(STORE);
            };
            request.onsuccess = () => {
                const db = request.result;
                if (settled) {
                    db.close();
                    return;
                }
                db.onversionchange = () => {
                    db.close();
                    opening = undefined;
                };
                done(() => resolve(db));
            };
            request.onerror = () => done(() => reject(failed('open', request.error)));
            request.onblocked = () => done(() => reject(failed('open', new Error('blocked'))));
        });
        const current = opening;
        current.catch(() => {
            if (opening === current)
                opening = undefined;
        });
        return current;
    }
    async function run(operation, mode, factory, action) {
        const db = await open(factory);
        return new Promise((resolve, reject) => {
            let result;
            try {
                const tx = db.transaction(STORE, mode);
                const request = action(tx.objectStore(STORE));
                request.onsuccess = () => {
                    result = request.result;
                };
                tx.oncomplete = () => resolve(result);
                tx.onerror = () => reject(failed(operation, tx.error ?? request.error));
                tx.onabort = () => reject(failed(operation, tx.error));
            }
            catch (cause) {
                if (opening !== undefined)
                    opening = undefined;
                reject(failed(operation, cause));
            }
        });
    }
    return Object.freeze({
        kind: 'insecure-web',
        isAvailable: () => false,
        async get(key) {
            assertSecureKey(key);
            if (idb === null)
                return memory.get(key);
            const value = await run('get', 'readonly', idb, (store) => store.get(key));
            return typeof value === 'string' ? value : undefined;
        },
        async set(key, value) {
            assertSecureKey(key);
            assertSecureValue(value);
            if (idb === null) {
                memory.set(key, value);
                return;
            }
            await run('set', 'readwrite', idb, (store) => store.put(value, key));
        },
        async delete(key) {
            assertSecureKey(key);
            if (idb === null) {
                memory.delete(key);
                return;
            }
            await run('delete', 'readwrite', idb, (store) => store.delete(key));
        },
    });
}

import { SDKError } from '../error.js';
import { assertBlobKey, assertBlobPrefix, assertBlobValue, createMemoryBlobStore, } from './blob-store.js';
const STORE = 'blobs';
const META = 'meta';
const VERSION = 2;
function defaultIdb() {
    try {
        return globalThis.indexedDB ?? null;
    }
    catch {
        return null;
    }
}
function failed(operation, cause) {
    return new SDKError('SDK_STORAGE_WRITE_FAILED', {
        message: `blob store ${operation} failed`,
        details: { kind: 'indexeddb', operation },
        cause,
    });
}
const pageStores = new WeakMap();
export function createWebBlobStore(options = {}) {
    const { dbName } = options;
    if (dbName !== undefined && (typeof dbName !== 'string'
        || !dbName.trim()))
        throw new SDKError('SDK_STORAGE_KEY_INVALID');
    if (dbName === undefined)
        return createMemoryBlobStore();
    const idb = options.idb === undefined ? defaultIdb() : options.idb;
    if (idb === null)
        return createMemoryBlobStore();
    if (options.idb !== undefined || options.openTimeoutMs !== undefined) {
        return openWebBlobStore(idb, options);
    }
    const stores = pageStores.get(idb) ?? new Map();
    pageStores.set(idb, stores);
    const store = stores.get(dbName) ?? openWebBlobStore(idb, options);
    stores.set(dbName, store);
    return store;
}
function openWebBlobStore(idb, { dbName, openTimeoutMs = 5000 }) {
    let opening;
    function open() {
        opening ??= new Promise((resolve, reject) => {
            let settled = false;
            const timer = setTimeout(() => finish(() => reject(failed('open', new Error('timeout')))), openTimeoutMs);
            const finish = (action) => {
                if (settled)
                    return;
                settled = true;
                clearTimeout(timer);
                action();
            };
            let request;
            try {
                request = idb.open(dbName, VERSION);
            }
            catch (cause) {
                finish(() => reject(failed('open', cause)));
                return;
            }
            request.onupgradeneeded = () => {
                const db = request.result;
                for (const name of [STORE, META]) {
                    if (db.objectStoreNames.contains(name))
                        db.deleteObjectStore(name);
                    db.createObjectStore(name);
                }
            };
            request.onsuccess = () => {
                if (settled) {
                    request.result.close();
                    return;
                }
                const db = request.result;
                db.onversionchange = () => {
                    db.close();
                    opening = undefined;
                };
                finish(() => resolve(db));
            };
            request.onerror = () => finish(() => reject(failed('open', request.error)));
            request.onblocked = () => finish(() => reject(failed('open', new Error('blocked'))));
        });
        const current = opening;
        current.catch(() => {
            if (opening === current)
                opening = undefined;
        });
        return current;
    }
    async function run(operation, mode, stores, action) {
        const db = await open();
        return new Promise((resolve, reject) => {
            let value;
            try {
                const tx = db.transaction([...stores], mode);
                action(tx, (result) => { value = result; });
                tx.oncomplete = () => resolve(value);
                tx.onerror = tx.onabort = () => reject(failed(operation, tx.error));
            }
            catch (cause) {
                reject(failed(operation, cause));
            }
        });
    }
    return {
        async get(key) {
            assertBlobKey(key);
            const value = await run('get', 'readwrite', [STORE, META], (tx, result) => {
                const request = tx.objectStore(STORE).get(key);
                request.onsuccess = () => {
                    const found = request.result;
                    result(found);
                    if (found === undefined)
                        return;
                    const meta = { size: found.byteLength, accessedAt: Date.now() };
                    tx.objectStore(META).put(meta, key);
                };
            });
            return value === undefined ? undefined : new Uint8Array(value.slice(0));
        },
        async put(key, value) {
            assertBlobKey(key);
            assertBlobValue(value);
            const bytes = Uint8Array.from(value).buffer;
            await run('put', 'readwrite', [STORE, META], (tx) => {
                const meta = { size: bytes.byteLength, accessedAt: Date.now() };
                tx.objectStore(STORE).put(bytes, key);
                tx.objectStore(META).put(meta, key);
            });
        },
        async remove(key) {
            assertBlobKey(key);
            await run('remove', 'readwrite', [STORE, META], (tx) => {
                tx.objectStore(STORE).delete(key);
                tx.objectStore(META).delete(key);
            });
        },
        async list(prefix) {
            assertBlobPrefix(prefix);
            return run('list', 'readonly', [META], (tx, result) => {
                const store = tx.objectStore(META);
                const range = prefix && typeof IDBKeyRange !== 'undefined'
                    ? IDBKeyRange.bound(prefix, `${prefix}\uffff`) : undefined;
                const keys = store.getAllKeys(range);
                const values = store.getAll(range);
                const collect = () => {
                    if (keys.readyState !== 'done' || values.readyState !== 'done')
                        return;
                    const records = values.result;
                    result(keys.result.flatMap((key, index) => {
                        const record = records[index];
                        return key.startsWith(prefix) && record !== undefined
                            ? [{ key, size: record.size, accessedAt: record.accessedAt }]
                            : [];
                    }));
                };
                values.onsuccess = collect;
                keys.onsuccess = collect;
            });
        },
    };
}

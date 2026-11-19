import { SDKError } from '../error.js';
import { assertSecureKey, assertSecureValue, } from '../storage/secure-store.js';
export function createFakeSecureStore(options = {}) {
    const items = options.backing ?? new Map();
    const available = options.available ?? true;
    const failOn = new Set(options.failOn ?? []);
    const fail = (operation) => {
        if (failOn.has(operation)) {
            throw new SDKError('SDK_SECURE_STORE_FAILED', {
                message: `secure store ${operation} failed`,
                details: { kind: options.kind ?? 'memory', operation },
            });
        }
    };
    return Object.freeze({
        kind: options.kind ?? 'memory',
        isAvailable: () => available,
        get(key) {
            return Promise.resolve().then(() => {
                assertSecureKey(key);
                fail('get');
                return items.get(key);
            });
        },
        set(key, value) {
            return Promise.resolve().then(() => {
                assertSecureKey(key);
                assertSecureValue(value);
                fail('set');
                items.set(key, value);
            });
        },
        delete(key) {
            return Promise.resolve().then(() => {
                assertSecureKey(key);
                fail('delete');
                items.delete(key);
            });
        },
    });
}
function check(condition, message) {
    if (!condition)
        throw new Error(`SecureStore contract: ${message}`);
}
async function rejectsWith(promise, code, what) {
    try {
        await promise;
    }
    catch (err) {
        check(err instanceof SDKError && err.code === code, `${what}: expected ${code}`);
        return;
    }
    check(false, `${what}: expected rejection ${code}`);
}
const KEY = 'mpg:demo:tk:100';
const OTHER = 'mpg:demo:tk:200';
export const secureStoreContract = Object.freeze([
    {
        name: 'describes itself: known kind, boolean isAvailable()',
        run: (create) => {
            const store = create();
            check(['keystore', 'insecure-web', 'memory'].includes(store.kind), 'unknown kind');
            check(typeof store.isAvailable() === 'boolean', 'isAvailable() is not boolean');
            return Promise.resolve();
        },
    },
    {
        name: 'missing key reads as undefined',
        run: async (create) => {
            check((await create().get(KEY)) === undefined, 'missing key is not undefined');
        },
    },
    {
        name: 'set then get returns the value; set overwrites',
        run: async (create) => {
            const store = create();
            await store.set(KEY, 'first');
            check((await store.get(KEY)) === 'first', 'value not read back');
            await store.set(KEY, 'second');
            check((await store.get(KEY)) === 'second', 'value not overwritten');
        },
    },
    {
        name: 'keeps unicode, empty and long values as is',
        run: async (create) => {
            const store = create();
            const long = 'x'.repeat(16 * 1024);
            for (const value of ['', 'тк ✓ 🎮', long]) {
                await store.set(KEY, value);
                check((await store.get(KEY)) === value, 'value changed on round trip');
            }
        },
    },
    {
        name: 'keys are independent',
        run: async (create) => {
            const store = create();
            await store.set(KEY, 'a');
            await store.set(OTHER, 'b');
            await store.delete(KEY);
            check((await store.get(KEY)) === undefined, 'deleted key still readable');
            check((await store.get(OTHER)) === 'b', 'delete touched another key');
        },
    },
    {
        name: 'delete removes the value; deleting a missing key resolves',
        run: async (create) => {
            const store = create();
            await store.delete(KEY);
            await store.set(KEY, 'v');
            await store.delete(KEY);
            check((await store.get(KEY)) === undefined, 'value survived delete');
        },
    },
    {
        name: 'a new instance over the same storage sees writes and deletes (restart)',
        run: async (create) => {
            await create().set(KEY, 'persisted');
            check((await create().get(KEY)) === 'persisted', 'write not visible after restart');
            await create().delete(KEY);
            check((await create().get(KEY)) === undefined, 'deleted value resurrected after restart');
        },
    },
    {
        name: 'invalid key rejects with SDK_STORAGE_KEY_INVALID',
        run: async (create) => {
            const store = create();
            for (const key of ['', ' aig', 'aig demo', 'a\nb', 'x'.repeat(300)]) {
                await rejectsWith(store.get(key), 'SDK_STORAGE_KEY_INVALID', `get(${JSON.stringify(key)})`);
                await rejectsWith(store.set(key, 'v'), 'SDK_STORAGE_KEY_INVALID', 'set(invalid key)');
                await rejectsWith(store.delete(key), 'SDK_STORAGE_KEY_INVALID', 'delete(invalid key)');
            }
            await rejectsWith(store.get(42), 'SDK_STORAGE_KEY_INVALID', 'get(non-string key)');
        },
    },
    {
        name: 'non-string value rejects with SDK_STORAGE_VALUE_INVALID and stores nothing',
        run: async (create) => {
            const store = create();
            for (const value of [undefined, null, 1, { tk: 'x' }]) {
                await rejectsWith(store.set(KEY, value), 'SDK_STORAGE_VALUE_INVALID', 'set(non-string value)');
            }
            check((await store.get(KEY)) === undefined, 'invalid value was stored');
        },
    },
]);

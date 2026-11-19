import { createFakeSecureStore } from './secure-store.js';
export function createFakePlatform() {
    const listeners = new Map();
    const opened = [];
    return {
        id: 'fake', ready: async () => { }, secureStore: createFakeSecureStore(),
        lifecycle: { on(event, handler) {
                let set = listeners.get(event);
                if (!set) {
                    set = new Set();
                    listeners.set(event, set);
                }
                set.add(handler);
                return () => set.delete(handler);
            } },
        device: { info: () => ({ platform: 'fake' }), vendorId: async () => undefined },
        plugins: { has: () => false, get: () => undefined },
        openUrl: async (url, mode) => { opened.push({ url, mode }); },
        opened,
        emit: (event) => { for (const handler of [...listeners.get(event) ?? []])
            handler(); },
    };
}
function check(value, message) {
    if (!value)
        throw new Error(`PlatformAdapter contract: ${message}`);
}
export const platformContractCases = [
    { name: 'readiness is repeatable', run: async ({ adapter }) => {
            check(adapter.id.length > 0, 'missing identity');
            await Promise.all([adapter.ready(), adapter.ready()]);
            await adapter.ready();
        } },
    { name: 'secure store round trip keeps application keys independent', run: async ({ adapter }) => {
            const store = adapter.secureStore;
            const a = 'mpg:contract-a:session';
            const b = 'mpg:contract-b:session';
            try {
                await store.set(a, 'a');
                await store.set(b, 'b');
                await store.delete(a);
                check(await store.get(a) === undefined, 'deleted value survived');
                check(await store.get(b) === 'b', 'another application key changed');
            }
            finally {
                await store.delete(a);
                await store.delete(b);
            }
        } },
    { name: 'lifecycle subscriptions detach independently and idempotently', run: async (harness) => {
            let a = 0;
            let b = 0;
            const offA = harness.adapter.lifecycle.on('online', () => { a++; });
            const offB = harness.adapter.lifecycle.on('online', () => { b++; });
            try {
                harness.emit('online');
                offA();
                offA();
                harness.emit('online');
                check(a === 1 && b === 2, 'unsubscribe affected another listener');
                offB();
                harness.emit('online');
                check(b === 2, 'listener leaked');
            }
            finally {
                offA();
                offB();
            }
        } },
    { name: 'device and missing plugins are safe', run: async ({ adapter }) => {
            check(typeof adapter.device.info().platform === 'string', 'missing device info');
            const vendor = await adapter.device.vendorId();
            check(vendor === undefined || typeof vendor === 'string', 'invalid vendor identifier');
            check(!adapter.plugins.has('missing-contract-plugin'), 'unexpected plugin');
            check(adapter.plugins.get('missing-contract-plugin') === undefined, 'missing plugin returned a value');
        } },
    { name: 'openUrl forwards both supported modes', run: async (harness) => {
            const before = harness.opened();
            const view = harness.adapter;
            await view.openUrl('https://example.test/privacy', 'system');
            await view.openUrl('https://example.test/store', 'inapp');
            check(harness.opened() === before + 2, 'URL was not opened');
        } },
];

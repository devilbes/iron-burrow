import { PRODUCTS_SCOPE, parseProduct } from './catalog.js';
import { parseSdkLock } from '@manygamescorp/core/loader';
import { fakeAllowed, isStoreAdapter, own } from './store.js';
import { VERSION } from './version.js';
export async function loadStoreAdapter(ctx) {
    const selection = own(ctx.config, 'storeAdapter');
    if (selection === undefined || selection === null || !ctx.modules)
        return {};
    const id = typeof selection === 'string' ? selection : own(selection, 'adapter');
    if (typeof id !== 'string' || !/^[a-z][a-z0-9_]{0,31}$/.test(id))
        return {};
    if ((id === 'fake' || id === 'test') && !fakeAllowed(ctx.environment))
        return {};
    const storeKey = id === 'fake' || id === 'test' ? 'google_play' : id;
    const catalog = ctx.configs.getScope(PRODUCTS_SCOPE);
    if (!Object.entries(catalog).some(([key, value]) => parseProduct(key, value, storeKey)?.binding !== undefined))
        return {};
    if (id === 'google_play' && ctx.platform?.id !== 'cordova')
        return {};
    if (id === 'app_store')
        return {};
    let ref;
    let local;
    try {
        if (typeof selection === 'object') {
            ref = parseSdkLock({ sdk: { modules: [own(selection, 'module')] } }).modules.at(0);
            if (ref.source !== 'remote')
                return {};
        }
        else if (id === 'fake' || id === 'test') {
            const { fakeStoreModule } = await import('./fake-module.js');
            local = fakeStoreModule();
            ref = { id: 'store-fake', package: '@manygamescorp/mod-iap', version: VERSION,
                source: 'local', load: 'eager' };
        }
        else
            return {};
        ctx.signal.throwIfAborted();
        const handle = await ctx.modules.load(ref, local);
        const store = handle.api;
        if (!isStoreAdapter(store) || ((store.fake || store.provider === 'fake_store') && !fakeAllowed(ctx.environment))
            || ((id === 'fake' || id === 'test') ? store.fake !== true : store.id !== id)
            || (id === 'google_play' && (store.fake || store.provider !== id || store.storeKey !== id))) {
            await handle.dispose();
            return {};
        }
        ctx.signal.throwIfAborted();
        return { store, handle };
    }
    catch {
        ctx.signal.throwIfAborted();
        return {};
    }
}

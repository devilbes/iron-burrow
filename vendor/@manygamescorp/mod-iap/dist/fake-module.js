import { defineModule } from '@manygamescorp/core/module';
import { fakeStore } from './fake-store.js';
import { fakeAllowed } from './store.js';
import { VERSION } from './version.js';
export function fakeStoreModule(options = {}) {
    const adapters = new WeakMap();
    return defineModule({
        manifest: { id: 'store-fake', kind: 'adapter', version: VERSION, engines: { core: '^1.0.0' }, targets: ['web', 'cordova'],
            permissions: [], consumes: ['ui.slots@1'], events: { emits: [] }, load: 'eager', entry: 'fake-module.js' },
        init(ctx) {
            if (!fakeAllowed(ctx.environment))
                return;
            const ui = options.ask ? undefined : ctx.services?.get('ui.slots@1');
            const ask = options.ask ?? (ui ? (sheet) => ui.fakePaymentSheet(sheet, ctx.signal) : undefined);
            adapters.set(ctx.signal, fakeStore({ ...options, ...(ask ? { ask } : {}) }));
        },
        api: (ctx) => adapters.get(ctx.signal),
    });
}
export default fakeStoreModule();

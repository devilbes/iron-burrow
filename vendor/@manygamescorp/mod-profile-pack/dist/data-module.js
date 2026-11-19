import { SDKError } from '@manygamescorp/core/error';
import { hudItems } from '@manygamescorp/core/hud';
import { defineModule, trackWrites } from '@manygamescorp/core/module';
import {} from '@manygamescorp/core/data-client';
export { dataClient } from '@manygamescorp/core/data-client';
export function dataModule(manifest, create, hud = []) {
    const { id } = manifest;
    let api;
    let items;
    let writes;
    const close = () => {
        items?.dispose();
        items = undefined;
        api?.dispose();
        api = undefined;
        writes = undefined;
    };
    return defineModule({
        manifest,
        init() { },
        async start(ctx) {
            if (!ctx.http)
                throw new SDKError('SDK_PERMISSION_DENIED', { module: id });
            close();
            const tracked = trackWrites(ctx.http);
            writes = tracked;
            api = create(tracked.http, ctx.signal);
            if (hud.length > 0)
                items = hudItems(ctx.services, hud);
        },
        async stop() { close(); },
        async save(signal) { await writes?.settle(signal); },
        api() {
            if (!api)
                throw new SDKError('MODULE_NOT_ACTIVE', { module: id });
            return api;
        },
        async dispose() { close(); },
    });
}

import { defineModule } from '@manygamescorp/core/module';
import { hudItem, HUD_CAPABILITY } from '@manygamescorp/core/hud';
export function hudModule() {
    let api;
    const offs = [];
    const close = () => {
        for (const off of offs.splice(0))
            off();
        for (const h of handles)
            h.dispose();
        handles.clear();
    };
    const handles = new Set();
    return defineModule({
        manifest: { id: 'hud', version: '1.0.0', kind: 'service', engines: { core: '^1.0.0' },
            settings: { schemaVersion: 1, fields: [{ ref: 'availability' }] },
            targets: ['web', 'cordova'], permissions: [], entry: 'hud.js', load: 'eager',
            consumes: ['ui.slots@1', HUD_CAPABILITY], requires: { 'ui-kit': '^1.0.0' },
            events: { emits: ['hud:items:changed', 'hud:item:opened'], listens: [] } },
        init() { },
        async start(ctx) {
            const client = ctx.services.require(HUD_CAPABILITY);
            offs.push(client.onChange((change) => ctx.bus.emit('hud:items:changed', change)), client.onOpen((id) => {
                const event = { id };
                ctx.bus.emit('hud:item:opened', event);
            }));
            api = Object.freeze({
                register: (spec) => {
                    const h = hudItem(ctx.services, spec);
                    const owned = Object.freeze({ ...h, get active() { return h.active; },
                        dispose: () => { handles.delete(owned); h.dispose(); } });
                    handles.add(owned);
                    return owned;
                },
                items: () => client.items(),
                slot: (slot) => (client.items()).filter((item) => item.visible &&
                    item.slot === slot),
                open: (id) => client.open(id),
            });
        },
        async stop() { close(); },
        async dispose() { close(); },
        api: () => api,
    });
}

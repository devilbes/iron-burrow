import ui from './ui.json' with { type: 'json' };
import { SDKError } from '@manygamescorp/core/error';
import { hudItems } from '@manygamescorp/core/hud';
import { defineModule, trackWrites } from '@manygamescorp/core/module';
import { PROGRESS_SETTINGS } from './levels-settings.js';
import { progressWindows } from './windows.js';
import { createProgress } from './client.js';
export { createProgress } from './client.js';
export const PROGRESS_HUD_TYPES = Object.freeze(['progress.daily_reward.ready',
    'progress.reward.claimable', 'progress.task.completed']);
export function progressModule() {
    let api;
    let hud;
    let writes;
    let offs = [];
    let offWindows;
    const close = () => {
        for (const off of offs)
            off();
        offs = [];
        offWindows?.();
        offWindows = undefined;
        hud?.dispose();
        hud = undefined;
        api?.dispose();
        api = undefined;
        writes = undefined;
    };
    return defineModule({
        manifest: {
            ui: ui, id: 'progress', version: '1.0.0', kind: 'service', engines: { core: '^1.0.0' }, targets: ['web', 'cordova'],
            permissions: ['http:progress', 'windows'], load: 'eager', entry: 'progress.js',
            settings: PROGRESS_SETTINGS,
            consumes: ['ui.slots@1', 'hud.registry@1'], optional: { 'ui-kit': '^1.0.0', 'hud-ui': '^1.0.0' },
            events: { emits: ['actions:action:accepted', 'progress:window:open', 'progress:window:close'],
                listens: [...PROGRESS_HUD_TYPES.map((type) => `realtime:${type}`), 'progress:window:closed',
                    'realtime:connection:resync'] },
            realtime: { handles: PROGRESS_HUD_TYPES },
        },
        init() { },
        async start(ctx) {
            if (!ctx.http)
                throw new SDKError('SDK_PERMISSION_DENIED', { module: 'progress' });
            close();
            const items = hudItems(ctx.services, [{ id: 'progress', icon: 'star', label: 'sdk.hud.progress',
                    slot: 'right', order: 50, clearOnOpen: true }]);
            hud = items;
            offWindows = ctx.windows?.register(progressWindows({
                signal: ctx.signal,
                open: (payload) => ctx.bus.emit('progress:window:open', payload),
                close: (payload) => ctx.bus.emit('progress:window:close', payload),
                onClosed: (listener) => ctx.bus.on('progress:window:closed', listener),
            }));
            const own = (message) => message.ref?.resource === 'progress.me'
                && ['player', 'session'].includes(message.to.kind);
            let revision = 0;
            offs = (ctx.realtime ? PROGRESS_HUD_TYPES : []).map((type) => ctx.realtime.on(type, (message) => { if (own(message)) {
                revision++;
                items.setBadge('progress', { kind: 'dot' });
            } }));
            offs.push(ctx.bus.on('realtime:connection:resync', () => { revision++; }));
            const tracked = trackWrites(ctx.http);
            writes = tracked;
            api = createProgress({ http: tracked.http, signal: ctx.signal,
                revision: () => revision, now: ctx.time.now,
                publish(payload) { revision++; ctx.bus.emit('actions:action:accepted', payload); } });
        },
        async stop() { close(); },
        async save(signal) { await writes?.settle(signal); },
        api() {
            if (!api)
                throw new SDKError('MODULE_NOT_ACTIVE', { module: 'progress' });
            return api;
        },
        async dispose() { close(); },
    });
}

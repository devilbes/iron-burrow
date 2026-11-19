import ui from './ui.json' with { type: 'json' };
import { registerModuleWindow } from '@manygamescorp/core/window-triggers';
import { SDKError } from '@manygamescorp/core/error';
import { hudItems } from '@manygamescorp/core/hud';
import { defineModule } from '@manygamescorp/core/module';
import { createLeaderboards } from './client.js';
export * from './client.js';
function object(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export const LEADERBOARDS_WINDOWS = ['main'];
export function leaderboardsModule(options = {}) {
    let api;
    let hud;
    let offWindows;
    const close = () => {
        offWindows?.();
        offWindows = undefined;
        hud?.dispose();
        hud = undefined;
        api?.dispose();
        api = undefined;
    };
    return defineModule({
        manifest: {
            settings: { schemaVersion: 1, fields: [{ ref: 'availability' }] },
            ui: ui, id: 'leaderboards', version: '1.0.0', kind: 'service', engines: { core: '^1.0.0' }, targets: ['web', 'cordova'],
            optional: { 'ui-kit': '^1.0.0', profile: '^1.0.0', 'hud-ui': '^1.0.0' }, consumes: ['ui.slots@1', 'hud.registry@1'],
            permissions: ['http:leaderboards', 'windows'],
            load: 'eager', entry: 'leaderboards.js',
            events: { emits: ['leaderboards:board:fetched', 'leaderboards:rank:changed',
                    'leaderboards:window:open', 'leaderboards:window:close'], listens: ['leaderboards:window:closed'] },
        },
        init() { },
        async start(ctx) {
            if (!ctx.http)
                throw new SDKError('SDK_PERMISSION_DENIED', { module: 'leaderboards' });
            close();
            const profile = options.profile ?? {
                query(request, queryOptions) {
                    const candidate = ctx.sdk.profile;
                    if (!object(candidate) || typeof candidate.query !== 'function') {
                        return Promise.resolve({ items: [] });
                    }
                    return candidate.query(request, queryOptions);
                },
            };
            const items = hudItems(ctx.services, [{ id: 'leaderboards', icon: 'trophy', label: 'sdk.hud.leaderboards',
                    slot: 'right', order: 40, clearOnOpen: true }]);
            hud = items;
            offWindows = ctx.windows?.register(registerModuleWindow({
                module: 'leaderboards', signal: ctx.signal,
                open: ({ name, params }) => ctx.bus.emit('leaderboards:window:open', { view: name, tab: typeof params['tab'] === 'string' ? params['tab'] : null }),
                close: ({ name }) => ctx.bus.emit('leaderboards:window:close', { view: name }),
                onClosed: (listener) => ctx.bus.on('leaderboards:window:closed', ({ view }) => listener({ name: view })),
            }, LEADERBOARDS_WINDOWS));
            api = createLeaderboards({ http: ctx.http, signal: ctx.signal,
                clientAuthoritative: () => ctx.session.clientAuthoritative === true,
                profile,
                publish(event) {
                    if (event.name === 'leaderboards:board:fetched') {
                        ctx.bus.emit('leaderboards:board:fetched', event.payload);
                    }
                    else {
                        ctx.bus.emit('leaderboards:rank:changed', event.payload);
                        const { rank, previousRank } = event.payload;
                        if (typeof rank === 'number' && typeof previousRank === 'number' && rank < previousRank) {
                            items.setBadge('leaderboards', { kind: 'dot' });
                        }
                    }
                } });
        },
        async stop() { close(); },
        api() {
            if (!api)
                throw new SDKError('MODULE_NOT_ACTIVE', { module: 'leaderboards' });
            return api;
        },
        async dispose() { close(); },
    });
}

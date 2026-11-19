import { SDKError } from './error.js';
import { createProfile } from './profile.js';
import { defineModule, trackWrites } from './module.js';
export function baseProfile() {
    let api;
    let writes;
    const close = () => { api?.dispose(); api = undefined; writes = undefined; };
    return defineModule({
        manifest: {
            id: 'profile', version: '1.0.0', kind: 'service', engines: { core: '^1.0.0' },
            targets: ['web', 'cordova'], permissions: ['http:profiles'], load: 'eager', entry: 'profile.js',
            provides: ['profile.read@1'],
            events: { emits: ['profile:level:changed'], listens: [] },
        },
        init(ctx) {
            ctx.services.provide('profile.read@1', { get: () => {
                    if (!api)
                        throw new SDKError('MODULE_NOT_ACTIVE', { module: 'profile' });
                    return api.get();
                } });
        },
        async start(ctx) {
            close();
            if (!ctx.http)
                throw new SDKError('SDK_PERMISSION_DENIED', { module: 'profile' });
            writes = trackWrites(ctx.http);
            let previous;
            api = createProfile(writes.http, ctx.time.now, ctx.signal, ({ level }) => {
                if (!Number.isSafeInteger(level) || level === previous)
                    return;
                const before = previous;
                previous = level;
                if (before !== undefined)
                    ctx.bus.emit('profile:level:changed', { level, previous: before });
            });
        },
        async stop() { close(); },
        async save(signal) { await writes?.settle(signal); },
        api() {
            if (!api)
                throw new SDKError('MODULE_NOT_ACTIVE', { module: 'profile' });
            return api;
        },
        async dispose() { close(); },
    });
}

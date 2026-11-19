import ui from './ui.json' with { type: 'json' };
import { PROFILE_PRESENTATION } from '@manygamescorp/contracts-client/profile-presentation';
import { defineModule } from '@manygamescorp/core/module';
export function profileUiModule() {
    let presentation;
    let off;
    const close = () => {
        off?.();
        off = undefined;
        presentation?.dispose();
        presentation = undefined;
    };
    return defineModule({
        manifest: {
            id: 'profile-ui', version: '1.0.0', kind: 'ui', engines: { core: '^1.0.0' },
            targets: ['web', 'cordova'], load: 'eager', entry: 'ui.js', ui: ui,
            requires: { profile: '^1.0.0' }, permissions: [],
            consumes: ['profile.read@1', PROFILE_PRESENTATION],
            optional: { 'ui-kit': '^1.0.0' },
            events: { emits: [], listens: ['profile:level:changed'] },
        },
        init() { },
        api() { return Object.freeze({}); },
        async start(ctx) {
            close();
            const handle = ctx.services.get(PROFILE_PRESENTATION)?.attach();
            presentation = handle;
            off = ctx.bus.on('profile:level:changed', (value) => {
                handle?.update(value.level);
            });
            if (handle?.active) {
                const profile = ctx.services.require('profile.read@1');
                void profile.get().then((value) => {
                    if (!ctx.signal.aborted && presentation === handle)
                        handle.update(value.level);
                }).catch(() => undefined);
            }
        },
        async stop() { close(); },
        async dispose() { close(); },
    });
}

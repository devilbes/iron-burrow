import { UI_STRINGS } from './strings.js';
import { profilePresentation } from './services/profile-presentation.js';
import { adapterViews } from './adapter-views.js';
import { fakePaymentSheet } from './services/fake-payment.js';
import { attachWindowQueue } from './window-port.js';
import { createUiZones } from './zones.js';
import { topBarModule } from './services/topbar.js';
import { hudRegistryModule } from './services/hud-registry.js';
import { bottomMenuModule } from './services/bottommenu.js';
import schema from './module-settings.schema.json' with { type: 'json' };
export function uiKitModule(supplied = undefined) {
    let time;
    const zones = supplied ?? createUiZones({ now: () => time?.now() ?? 0 });
    let offQueue;
    let offSkipped;
    const hudProvider = hudRegistryModule(zones.hudRegistry);
    const providers = [topBarModule(zones.topBarRegistry), hudProvider,
        bottomMenuModule(zones.bottomMenuRegistry)];
    return {
        manifest: { id: 'ui-kit', selection: 'required', version: '1.0.0', kind: 'ui',
            engines: { core: '^1.0.0' }, targets: ['web', 'cordova'],
            settings: schema, permissions: ['windows'], entry: 'module.js', load: 'eager',
            provides: ['ui.slots@1', 'topbar.registry@1', 'hud.registry@1', 'bottommenu.registry@1', 'profile.presentation@1'],
            events: { emits: ['hud:layout:ignored'], listens: ['configs:snapshot:updated', 'l10n:locale:changed', 'l10n:strings:updated'] } },
        init(ctx) {
            time = ctx.time;
            const localization = {
                locale: () => ctx.strings?.locale?.() ?? 'en',
                t: (key, params) => ctx.strings?.t?.(key, params) ?? key,
                subscribe: refresh => {
                    const off = [ctx.bus.on('l10n:locale:changed', refresh),
                        ctx.bus.on('l10n:strings:updated', refresh)];
                    return () => { for (const release of off)
                        release(); };
                },
            };
            ctx.strings?.registerDefaults('sdk', UI_STRINGS);
            ctx.services.provide('profile.presentation@1', profilePresentation(zones));
            offSkipped?.();
            offSkipped = zones.onSkipped(event => {
                const log = ctx.log;
                log?.debug?.('ui:slot:skipped', event);
            });
            zones.configure(ctx.settings);
            for (const provider of providers)
                provider.init(ctx);
            ctx.services.provide('ui.slots@1', {
                forAdapter: (_call, signal) => adapterViews(signal, localization),
                fakePaymentSheet: (_call, sheet, signal) => fakePaymentSheet(sheet, signal, localization),
                automaticEnabled: () => zones.settings().windowQueue !== false,
                enqueue: (call, request) => zones.windows.enqueue({ ...request, moduleId: call.from }),
                registerSlot: (call, zone, spec) => {
                    const slotId = spec.slotId ?? (zone === 'topbar' ? 'counters' : 'entry');
                    const declaration = call.uiSlots?.find(slot => slot.id === slotId);
                    const registration = { ...spec, moduleId: call.from,
                        ...(declaration ? { declaration } : {}) };
                    if (zone === 'topbar')
                        return zones.topbar.register(registration);
                    if (zone === 'bottomMenu')
                        return zones.bottomMenu.register(registration);
                    return zones.hud.register(registration);
                },
            });
        },
        async start(ctx) {
            offQueue?.();
            offQueue = ctx.windows ? attachWindowQueue(zones, ctx.windows) : undefined;
            zones.configure(ctx.settings);
            await hudProvider.start(ctx);
        },
        async stop() {
            offQueue?.();
            offQueue = undefined;
            zones.reset();
            for (const provider of providers)
                await provider.stop();
        },
        async dispose() {
            offQueue?.();
            offSkipped?.();
            for (const provider of providers)
                await provider.dispose();
            zones.dispose();
        },
        api: () => zones,
    };
}
export { createUiZones };

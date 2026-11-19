import ui from './ui.json' with { type: 'json' };
import { hudItem } from '@manygamescorp/core/hud';
import { bottomMenuItem } from '@manygamescorp/core/bottommenu';
import { defineModule } from '@manygamescorp/core/module';
import { registerModuleWindow } from '@manygamescorp/core/window-triggers';
import { DAILY_REWARDS_SETTINGS } from './settings.js';
export { DAILY_REWARDS_SETTINGS } from './settings.js';
const HUD_ORDER = 40;
export function dailyPlan(settings) {
    const length = typeof settings.cycleLength === 'number' ? settings.cycleLength : 7;
    const list = Array.isArray(settings.days) ? settings.days : [];
    const w = new Map(Object.entries(settings)).get('window');
    const variant = w === 'board' || w === 'calendar' || w === 'gift' ? w : 'week';
    const label = (v) => (typeof v === 'object' && v !== null
        ? v : undefined);
    const title = label(settings.title), subtitle = label(settings.subtitle);
    return Object.freeze({ track: typeof settings.track === 'string' ? settings.track : 'daily',
        window: variant, cycleLength: length, onMiss: settings.onMiss !== false,
        days: Object.freeze(Array.from({ length }, (_, i) => Object.freeze({ day: i + 1,
            reward: (Array.isArray(list.at(i)?.reward)
                ? list.at(i).reward : []),
        }))),
        ...(title ? { title } : {}), ...(subtitle ? { subtitle } : {}) });
}
export function dailyRewardsModule() {
    let item;
    let off;
    let offWindow;
    let api;
    let automatic;
    let autoOpened = false;
    const close = () => {
        automatic?.dispose();
        automatic = undefined;
        off?.();
        off = undefined;
        offWindow?.();
        offWindow = undefined;
        item?.dispose();
        item = undefined;
        api = undefined;
    };
    return defineModule({
        manifest: {
            ui: ui, id: 'daily-rewards', version: '1.0.0', kind: 'service', engines: { core: '^1.0.0' },
            targets: ['web', 'cordova'], permissions: ['windows'], entry: 'daily-rewards.js', load: 'eager',
            requires: { progress: '^1.0.0' }, optional: { 'ui-kit': '^1.0.0', 'hud-ui': '^1.0.0', bottommenu: '^1.0.0' },
            consumes: ['ui.slots@1', 'hud.registry@1', 'bottommenu.registry@1'],
            events: { emits: ['daily-rewards:calendar:open', 'daily-rewards:board:open',
                    'daily-rewards:month:open', 'daily-rewards:gift:open',
                    'daily-rewards:reward:open', 'daily-rewards:window:close'], listens: ['realtime:progress.daily_reward.ready', 'daily-rewards:window:closed'] },
            realtime: { handles: ['progress.daily_reward.ready'] }, settings: DAILY_REWARDS_SETTINGS,
        },
        init() { },
        async start(ctx) {
            close();
            const names = ['main', 'board', 'month', 'gift', 'reward'];
            const windows = registerModuleWindow({
                module: 'daily-rewards', signal: ctx.signal,
                open: ({ name }) => {
                    switch (name) {
                        case 'main':
                            ctx.bus.emit('daily-rewards:calendar:open', {});
                            break;
                        case 'board':
                            ctx.bus.emit('daily-rewards:board:open', {});
                            break;
                        case 'month':
                            ctx.bus.emit('daily-rewards:month:open', {});
                            break;
                        case 'gift':
                            ctx.bus.emit('daily-rewards:gift:open', {});
                            break;
                        case 'reward':
                            ctx.bus.emit('daily-rewards:reward:open', {});
                            break;
                    }
                },
                close: ({ name }) => {
                    const event = { name };
                    ctx.bus.emit('daily-rewards:window:close', event);
                },
                onClosed: listener => ctx.bus.on('daily-rewards:window:closed', listener),
            }, names);
            offWindow = ctx.windows?.register(windows);
            const settings = ctx.settings;
            const autoOpen = settings.autoOpen !== false;
            const maybeAutoOpen = (claimable) => {
                if (!autoOpen || !claimable || autoOpened)
                    return;
                autoOpened = true;
                const ui = ctx.services.get('ui.slots@1');
                automatic = ui?.enqueue?.({ id: 'calendar', automatic: true, open() {
                        switch (new Map(Object.entries(plan)).get('window')) {
                            case 'board': return windows.board.open();
                            case 'calendar': return windows['month'].open();
                            case 'gift': return windows.gift.open();
                            default: return windows.main.open();
                        }
                    } });
            };
            const plan = dailyPlan(settings);
            api = Object.freeze({ plan: () => plan,
                open: () => {
                    switch (new Map(Object.entries(plan)).get('window')) {
                        case 'board':
                            ctx.bus.emit('daily-rewards:board:open', {});
                            break;
                        case 'calendar':
                            ctx.bus.emit('daily-rewards:month:open', {});
                            break;
                        case 'gift':
                            ctx.bus.emit('daily-rewards:gift:open', {});
                            break;
                        default: ctx.bus.emit('daily-rewards:calendar:open', {});
                    }
                },
                setNextRewardAt: (endsAt) => {
                    item?.setBadge(null);
                    item?.setTimer(endsAt);
                    maybeAutoOpen(endsAt !== null && endsAt <= ctx.time.now());
                } });
            const hudSide = settings.hudSide === 'left' ? 'left' : 'right';
            const spec = { id: 'daily-rewards', icon: typeof settings.icon === 'string' ?
                    settings.icon : 'gift',
                label: 'sdk.hud.daily-rewards', onClick: () => { item?.setBadge(null); api?.open(); } };
            item = settings.entry === 'bottomMenu'
                ? bottomMenuItem(ctx.services, { ...spec, slot: 'center' })
                : hudItem(ctx.services, { ...spec, slot: hudSide, order: HUD_ORDER,
                    clearOnOpen: true });
            if ((settings.badge || autoOpen) && ctx.realtime)
                off =
                    ctx.realtime.on('progress.daily_reward.ready', (message) => {
                        if (message.ref?.resource === 'progress.me' && ['player',
                            'session'].includes(message.to.kind)) {
                            if (settings.badge) {
                                item?.setTimer(null);
                                item?.setBadge({ kind: 'dot' });
                            }
                            maybeAutoOpen(true);
                        }
                    });
        },
        async stop() { close(); }, async dispose() { close(); }, api: () => api,
    });
}

import { nameComponents } from '../core.js';
import { assetImage, component, h, moduleImage, text } from '../features/shared.js';
import { hudView, tickUpValues } from './hud.js';
import { hudRegistryView } from './hud-registry.js';
import { topBarView } from './topbar.js';
import { bottomMenuView } from './bottommenu.js';
import { standardActions } from './error.js';
export function lobbyIntents(registries, fallback) {
    return (intent, payload) => {
        const id = payload?.['id'];
        if (intent === 'open' && typeof id === 'string') {
            const zone = payload?.['zone'];
            if (zone === 'topbar')
                registries.topBar?.click(id);
            else if (zone === 'hud')
                registries.hud?.open(id);
            else if (zone === 'bottom')
                registries.bottomMenu?.click(id);
            return;
        }
        fallback?.(intent, payload);
    };
}
export function lobbyProps(base, registries, t = (key) => key) {
    const top = (slot) => registries.topBar ? topBarView(registries.topBar, t, undefined, slot) : [];
    const side = (slot) => registries.hud ? hudRegistryView(registries.hud, slot, t, base.lang) : [];
    return { ...base, text: t, topBar: { left: top('left'), center: top('center'), right: top('right') },
        hud: { left: side('left'), right: side('right') },
        bottomMenu: registries.bottomMenu?.slots() ?? [] };
}
function zoneProps(p, zone, items, slot, group) {
    return { elementId: `${p.elementId}.${zone}${group ? `.${group}` : slot === 'top' ? '' : `.${slot}`}`,
        lang: p.lang, slot, ...(group ? { group } : {}), items,
        ...(p.assetUrl ? { assetUrl: p.assetUrl } : {}),
        ...(p.busy === undefined ? {} : { busy: p.busy }),
        emitIntent: (intent, payload) => {
            if (intent === 'open')
                p.emitIntent('open', { ...payload, zone });
        } };
}
export function lobbyView(p) {
    const orientation = p.orientation ?? 'portrait';
    const centerItems = p.topBar.center;
    return h('div', { class: 'lobby', 'data-part': 'lobby', 'data-orientation': orientation,
        'data-testid': p.elementId }, h('header', { class: 'lobby-top', 'data-part': 'topbar' }, hudView(zoneProps(p, 'topbar', p.topBar.left, 'top', 'left')), centerItems.length ? hudView(zoneProps(p, 'topbar', centerItems, 'top', 'center'))
        : (p.title ? h('span', { class: 'lobby-title', 'data-part': 'title' }, p.title) : null), hudView(zoneProps(p, 'topbar', p.topBar.right, 'top', 'right'))), h('section', { class: 'lobby-stage', 'data-part': 'stage' }, hudView(zoneProps(p, 'hud', p.hud.left, 'left')), h('div', { class: 'lobby-scene', 'data-part': 'scene' }, p.hero ? h('div', { class: 'lobby-hero-box' }, lobbyHeroView({ lang: p.lang, ...p.hero })) : null, p.title ? h('h1', {}, p.title) : null, p.stage?.subtitle ? h('p', { class: 'hint' }, p.stage.subtitle) : null, p.stage?.actions?.length ? standardActions(p, p.stage.actions, text(p, 'kit.lobby.play')) : null), hudView(zoneProps(p, 'hud', p.hud.right, 'right'))), p.bottomMenu.length === 3 || p.bottomMenu.length === 5
        ? h('footer', { class: 'lobby-bottom', 'data-part': 'bottommenu' }, bottomMenuView({
            ...zoneProps(p, 'bottom', [], 'top'), items: p.bottomMenu, text: p.text, orientation,
            ...(p.current === undefined ? {} : { current: p.current })
        })) : null);
}
export function createLobbyHeroSlot() {
    let image;
    const listeners = new Set();
    return {
        set(next) {
            image = next ? Object.freeze({ ...next }) : undefined;
            for (const l of listeners)
                l();
        },
        get: () => image,
        onChange(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    };
}
export function lobbyLevelProgress(level, total = 5) {
    const n = Math.max(1, Math.floor(level));
    return { done: ((n - 1) % total) + 1, total };
}
export function lobbyHeroView(p) {
    const testId = p.testId ?? 'lobby.hero';
    const art = p.image
        ? (moduleImage(p.image.src, { class: 'lobby-hero-art', alt: p.image.alt ?? '' })
            ?? assetImage(p, p.image.src, { class: 'lobby-hero-art', alt: p.image.alt ?? '' }))
        : null;
    if (art) {
        return h('div', { class: 'lobby-hero', 'data-part': 'lobby-hero', 'data-kind': 'image',
            'data-testid': testId }, art);
    }
    if (p.level === undefined) {
        return h('div', { class: 'lobby-hero', 'data-part': 'lobby-hero', 'data-kind': 'empty',
            'data-testid': testId });
    }
    const level = Math.max(1, Math.floor(p.level));
    const progress = p.progress ?? lobbyLevelProgress(level);
    const label = p.label ?? text(p, 'kit.lobby.level', { level });
    const dots = Array.from({ length: Math.max(0, progress.total) }, (_, i) => h('span', { class: 'lobby-hero-dot', 'data-done': i < progress.done ? 'true' : 'false' }));
    return h('div', { class: 'lobby-hero', 'data-part': 'lobby-hero', 'data-kind': 'level',
        'data-testid': testId, 'data-level': String(level) }, h('div', { class: 'lobby-hero-card', 'data-part': 'lobby-hero-card', role: 'img',
        'aria-label': label }, h('span', { class: 'lobby-hero-number', 'data-testid': `${testId}.number` }, String(level))), h('div', { class: 'lobby-hero-label', 'data-testid': `${testId}.label` }, label), h('div', { class: 'lobby-hero-dots', 'data-testid': `${testId}.dots`,
        'aria-label': `${progress.done}/${progress.total}` }, ...dots));
}
export const lobby = component(lobbyView, { presentation: 'fullscreen',
    rendered: (_p, ctx) => { tickUpValues(ctx.root); } });
nameComponents({ lobby });

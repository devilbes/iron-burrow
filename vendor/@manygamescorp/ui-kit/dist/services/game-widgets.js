import { icon } from '../icon.js';
import { nameComponents } from '../core.js';
import { component, h, text, assetImage } from '../features/shared.js';
import { skinAssetOf } from '../skin-layer.js';
export function meterPercent(value, target) {
    if (!Number.isFinite(value) || !Number.isFinite(target) || target <= 0)
        return 0;
    return Math.round(Math.min(1, Math.max(0, value / target)) * 100);
}
export function kitMeter(value, target, options = {}) {
    const pct = meterPercent(value, target);
    const art = [skinAssetOf('skin:bar-track') ? 'track' : '', skinAssetOf('skin:bar-fill') ? 'fill' : '']
        .filter(Boolean).join(' ');
    const a11y = options.decorative ? { 'aria-hidden': 'true' } : { role: 'progressbar',
        'aria-label': options.label, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct,
        'aria-valuetext': options.valueText };
    return h('span', { class: 'kit-meter', 'data-part': 'progress', 'data-progress': pct,
        'data-art': art || undefined, ...a11y }, h('span', { 'data-part': 'track' }), h('span', { 'data-part': 'fill' }));
}
const letter = (name) => h('span', { class: 'kit-letter', 'aria-hidden': 'true' }, [...name][0]?.toUpperCase() ?? '');
export function collectionTilesView(p) {
    return h('section', { class: 'kit-tiles', 'data-part': 'collection-tiles',
        'data-columns': p.columns === 4 ? 4 : 3, 'aria-label': p.title ?? text(p, 'kit.game-widgets.collection') }, p.title ? h('h3', { class: 'kit-tiles-title', 'data-part': 'title' }, p.title) : null, h('ul', { class: 'kit-tiles-grid' }, ...p.tiles.slice(0, 60).map((tile) => {
        const done = tile.total > 0 && tile.owned >= tile.total;
        const count = `${Math.max(0, tile.owned)}/${Math.max(0, tile.total)}`;
        return h('li', { class: 'kit-tile', 'data-part': 'tile', 'data-progress': meterPercent(tile.owned, tile.total),
            'data-state': done ? 'done' : tile.owned > 0 ? 'progress' : 'empty' }, h('button', { type: 'button', class: 'kit-tile-open', 'data-testid': `${p.elementId}.open.${tile.id}`,
            'aria-label': `${tile.name}: ${count}${done ? `, ${text(p, 'kit.game-widgets.collected')}` : ''}`,
            disabled: p.busy, onClick: () => { if (!p.busy)
                p.emitIntent('open', { setId: tile.id }); } }, h('span', { class: 'kit-tile-ring', 'data-part': 'ring' }, assetImage(p, tile.imageKey, { alt: '', loading: 'lazy' }) ?? letter(tile.name)), done ? h('span', { class: 'kit-tile-done', 'data-part': 'done', 'aria-hidden': 'true' }, icon('check')) : null, h('span', { class: 'kit-tile-name', 'data-part': 'name' }, tile.name), h('span', { class: 'kit-tile-count', 'data-part': 'count' }, count), kitMeter(tile.owned, tile.total, { decorative: true })));
    })));
}
export const collectionTiles = component(collectionTilesView, {});
export function miniEventBannerView(p) {
    const asset = (key, part, alt = '') => {
        const img = assetImage(p, key, { alt, loading: 'lazy' });
        return img ? h('span', { class: `kit-me-${part}`, 'data-part': part }, img) : null;
    };
    return h('section', { class: 'kit-mini-event', 'data-part': 'mini-event' }, h('button', { type: 'button', class: 'kit-me-open', 'data-testid': `${p.elementId}.open`,
        disabled: p.busy, onClick: () => { if (!p.busy)
            p.emitIntent('open'); } }, asset(p.logoKey, 'logo'), h('span', { class: 'kit-me-body' }, h('strong', { class: 'kit-me-title', 'data-part': 'title' }, p.title), h('span', { class: 'kit-me-row' }, asset(p.tokenKey, 'token'), kitMeter(p.value, p.target, { decorative: true }), h('span', { class: 'kit-me-count', 'data-part': 'count' }, `${p.value}/${p.target}`))), p.goalKey || p.goalLabel ? h('span', { class: 'kit-me-goal', 'data-part': 'goal' }, assetImage(p, p.goalKey, { alt: '', loading: 'lazy' }), p.goalLabel ? h('span', {}, p.goalLabel) : null) : null, p.timer ? h('span', { class: 'kit-me-timer', 'data-part': 'timer' }, h('span', { class: 'mp-sr-only' }, text(p, 'kit.game-widgets.time-left')), p.timer) : null));
}
export const miniEventBanner = component(miniEventBannerView, {});
export function partySlotsView(p, spec) {
    return h('div', { class: 'kit-party', 'data-part': 'party', role: 'group',
        'aria-label': spec.label ?? text(p, 'kit.game-widgets.party') }, h('ul', { class: 'kit-party-slots' }, ...spec.slots.slice(0, 8).map((member, index) => h('li', {
        class: 'kit-party-slot', 'data-part': 'party-slot', 'data-state': member ? 'member' : 'free'
    }, h('button', { type: 'button', 'data-testid': `${p.elementId}.slot.${index}`, disabled: p.busy,
        'aria-label': member ? member.name
            : text(p, 'kit.game-widgets.invite-to-slot', { index1: index + 1 }),
        onClick: () => { if (!p.busy)
            p.emitIntent('slot', { index }); } }, member ? assetImage(p, member.avatarKey, { alt: '', loading: 'lazy' }) ?? letter(member.name)
        : h('span', { class: 'kit-party-plus', 'aria-hidden': 'true' }, '+'))))), spec.rewardKey || spec.rewardLabel ? h('span', { class: 'kit-party-reward', 'data-part': 'party-reward' }, assetImage(p, spec.rewardKey, { alt: '', loading: 'lazy' }), spec.rewardLabel ? h('span', {}, spec.rewardLabel) : null) : null);
}
export const partySlots = component((p) => partySlotsView(p, p), {});
nameComponents({ collectionTiles, miniEventBanner, partySlots });

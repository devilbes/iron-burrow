import { rewardGrid } from '../features/reward-grid.js';
import { icon as registryIcon } from '../icon.js';
import { nameComponents } from '../core.js';
import { component, h, text, button, titledDialog, assetImage, windowSlots } from '../features/shared.js';
import { formatRemaining } from './hud.js';
const promoIcon = (p, game, size) => h('span', { class: 'promo-icon',
    role: 'img', 'aria-label': text(p, 'kit.cross-promo.game-icon', { name: game.name }),
    'data-size': size }, assetImage(p, game.icon, { width: size, height: size }) ?? [...game.name][0]?.toUpperCase() ?? '');
const downloadIcon = () => registryIcon('download', 20);
const networkLabel = (p) => h('span', { class: 'promo-network',
    'data-part': 'promo-network' }, text(p, 'kit.cross-promo.manyplay-games'));
export function promoSlotView(p) {
    const pct = Math.round(Math.min(1, Math.max(0, p.progress)) * 100);
    const wait = Math.max(0, Math.ceil(p.skipInSec));
    return h('section', { class: 'promo-slot', role: 'dialog', 'aria-modal': 'true',
        'aria-label': p.game.name, 'data-testid': `${p.elementId}.slot` }, h('div', { class: 'promo-stage' }, h('div', { class: 'promo-video', 'data-part': 'promo-video' }), h('div', { class: 'promo-progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100,
        'aria-valuenow': pct }, h('svg', { viewBox: '0 0 100 1', preserveAspectRatio: 'none',
        'aria-hidden': 'true' }, h('rect', { width: pct, height: 1 }))), h('div', { class: 'promo-bar' }, h('span', { class: 'promo-tag' }, text(p, 'kit.cross-promo.manyplay-game')), h('button', { type: 'button', class: 'promo-skip', 'data-variant': 'ghost',
        'data-testid': `${p.elementId}.skip`, disabled: wait > 0 || p.busy === true,
        'aria-label': wait > 0 ? text(p, 'kit.cross-promo.skip-in-s', { wait: wait })
            : text(p, 'kit.cross-promo.skip'),
        onClick: () => { if (!p.busy && wait === 0)
            p.emitIntent('skip'); } }, ...(wait > 0 ? [text(p, 'kit.cross-promo.skip-in'), h('b', {}, String(wait))]
        : [text(p, 'kit.cross-promo.skip')])))), h('div', { class: 'promo-panel' }, h('div', { class: 'promo-game' }, promoIcon(p, p.game, 56), h('span', { class: 'promo-meta' }, h('strong', {}, p.game.name), p.game.rating ? h('span', { class: 'promo-rate' }, h('span', { width: 16, height: 16, viewBox: '0 0 24 24', 'aria-hidden': 'true' }, registryIcon('cross-promo-promo-slot-view-1', 16)), h('b', {}, p.game.rating), p.game.genre ? ` · ${p.game.genre}` : '')
        : p.game.genre ? h('small', {}, p.game.genre) : null, p.game.studio ? h('small', {}, p.game.studio) : null)), h('p', { class: 'promo-text' }, p.description ?? text(p, 'kit.cross-promo.our-own-game-instead-of-a-regular-ad-a-gift-for-new-players')), button(text(p, 'kit.cross-promo.install'), 'install', p, { className: 'promo-cta',
        suffix: downloadIcon() })));
}
export const promoSlot = component(promoSlotView, { presentation: 'fullscreen', popupKind: 'content' });
export const promoBonusView = (p) => titledDialog(p, text(p, 'kit.cross-promo.a-gift-in', { name: p.game.name }), text(p, 'kit.cross-promo.cross-promo'), () => p.emitIntent('close'), h('div', { class: 'promo-bonus' }, h('div', { class: 'promo-lead' }, promoIcon(p, p.game, 72), h('strong', {}, text(p, 'kit.cross-promo.your'), h('span', { class: 'promo-points' }, text(p, 'kit.cross-promo.points', { points: p.points })), text(p, 'kit.cross-promo.are-waiting'))), h('p', { class: 'promo-text' }, text(p, 'kit.cross-promo.points-from-this-game-turn-into-rewards-in-claim-your-starte', { name: p.game.name }))), ...windowSlots(p, 'promoBonus', { rewards: rewardGrid(p, p.gifts.slice(0, 50).map(gift => ({
        id: gift.id, name: gift.label, amount: gift.amount,
        ...(gift.icon ? { icon: gift.icon } : {}), testid: `${p.elementId}.gift.${gift.id}`,
    }))) }), h('div', { class: 'window-actions' }, button(text(p, 'kit.cross-promo.install-and-claim'), 'install', p, { disabled: !p.ready || p.busy, suffix: downloadIcon() }), button(text(p, 'kit.cross-promo.later'), 'close', p, { ghost: true, className: 'promo-decline' })), networkLabel(p));
export const promoBonus = component(promoBonusView, {});
export const promoLivesView = (p) => titledDialog(p, text(p, 'kit.cross-promo.out-of-lives'), undefined, () => p.emitIntent('close'), h('div', { class: 'promo-lives-cols' }, h('div', { class: 'promo-lives-left' }, h('div', { class: 'promo-lives-status' }, h('span', { class: 'promo-lives-art', role: 'img', 'aria-label': text(p, 'kit.cross-promo.lives-0') }, registryIcon('heart', 40)), h('span', { class: 'promo-lives-timer', role: 'timer' }, h('span', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    'stroke-width': 2, 'stroke-linecap': 'round', 'aria-hidden': 'true' }, registryIcon('cross-promo-promo-lives-view-2', 16)), h('span', {}, text(p, 'kit.cross-promo.next-life-in')), h('b', {}, formatRemaining(p.remainingMs)))), button(text(p, 'kit.cross-promo.life-for-an-ad'), 'reward-life', p, { ghost: true,
    className: 'promo-ad', disabled: !p.ready || p.busy || !p.videoAvailable })), h('div', { class: 'promo-lives-right' }, h('div', { class: 'promo-card' }, h('div', { class: 'promo-lead' }, promoIcon(p, p.game, 56), h('span', { class: 'promo-meta' }, h('strong', {}, text(p, 'kit.cross-promo.while-you-wait', { name: p.game.name })), p.game.genre ? h('small', {}, p.game.genre) : null, p.badge ? h('span', { class: 'promo-badge' }, p.badge) : null)), button(text(p, 'kit.cross-promo.install-2', { name: p.game.name }), 'install', p, { className: 'promo-install', disabled: !p.ready || p.busy, suffix: downloadIcon() })), h('div', { class: 'promo-lives-foot' }, button(text(p, 'kit.cross-promo.no-thanks'), 'close', p, { ghost: true,
    className: 'promo-decline' }), networkLabel(p)))));
export const promoLives = component(promoLivesView, {});
nameComponents({ promoSlot, promoBonus, promoLives });

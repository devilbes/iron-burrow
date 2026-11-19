import { rewardGrid } from '../features/reward-grid.js';
import { icon as registryIcon } from '../icon.js';
import { nameComponents } from '../core.js';
import { component, h, text, button, windowDialog, windowSlots, assetImage } from '../features/shared.js';
import { iconOr, checkIcon, lockIcon, videoIcon, clockText } from '../features/daily-parts.js';
function iconButton(p, intent, disabled, className, payload, ...children) {
    return h('button', { type: 'button', class: className, disabled, 'data-testid': `${p.elementId}.${intent}`,
        onClick: () => { if (!disabled)
            p.emitIntent(intent, payload()); } }, ...children);
}
const stackOf = (item) => item?.icon !== 'coins'
    || typeof item.amount !== 'number' ? 1 : item.amount >= 500 ? 3 : item.amount >= 200 ? 2 : 1;
const amountOf = (item) => typeof item.amount === 'number' ? `×${item.amount}`
    : item.amount;
export function dailyBoardView(p) {
    const days = p.days.slice(0, 9);
    const blocked = !p.ready || p.busy || p.retryClaim || !p.operationId;
    const payload = () => ({ key: p.trackKey, operationId: p.operationId });
    const open = days.some(day => day.status === 'available');
    const prize = p.prize;
    return windowDialog(p, { title: p.title ?? text(p, 'kit.daily-rewards.daily-rewards'),
        subtitle: p.subtitle }, () => p.emitIntent('close'), h('div', { class: 'board-days', 'data-part': 'board-days', role: 'list',
        'aria-label': text(p, 'kit.daily-rewards.rewards-by-day') }, ...days.map(day => h('div', { class: 'dr-tile board-day', role: 'listitem', 'data-part': 'board-day', 'data-state': day.status,
        'aria-current': day.status === 'available' ? 'date' : undefined,
        'aria-label': `${day.title}, ${day.items.map(item => `${item.amount} ${item.icon}`).join(', ')}, ${day.status === 'claimed' ? text(p, 'kit.daily-rewards.claimed') : day.status === 'available'
            ? text(p, 'kit.daily-rewards.today') : text(p, 'kit.daily-rewards.upcoming')}` }, h('span', { class: 'dr-title' }, day.status === 'available' ? text(p, 'kit.daily-rewards.today-2') : day.title), h('span', { class: 'dr-art', 'data-stack': stackOf(day.items[0]) }, ...Array.from({ length: stackOf(day.items[0]) }, () => iconOr(day.items[0]?.icon ?? '', stackOf(day.items[0]) > 1 ? 24 : 28)), ...day.items.slice(1, 3).map(item => iconOr(item.icon, 28))), h('span', { class: 'dr-amount' }, day.items[0] ? amountOf(day.items[0]) : ''), day.status === 'claimed' ? h('span', { class: 'dr-badge dr-badge--ok', role: 'img',
        'aria-label': text(p, 'kit.daily-rewards.claimed-2') }, checkIcon(12)) : null))), prize ? h('div', { class: 'board-prize', 'data-part': 'board-prize',
        'aria-label': `${prize.caption}: ${prize.title}${prize.locked ? `, ${text(p, 'kit.daily-rewards.not-available-yet')}` : ''}` }, h('span', { class: 'board-prize-art' }, assetImage(p, prize.art) ?? iconOr('gift', 40)), h('span', { class: 'board-prize-text' }, h('span', { class: 'dr-title' }, prize.caption), h('strong', {}, prize.title), ...(prize.items ?? []).slice(0, 3).map(item => h('span', { class: 'board-prize-extra' }, '+', iconOr(item.icon, 16), String(item.amount)))), prize.locked ? h('span', { class: 'dr-badge dr-badge--lock', role: 'img',
        'aria-label': text(p, 'kit.daily-rewards.locked') }, lockIcon(16)) : null) : null, open || p.claim ? h('div', { class: 'dr-actions' }, p.doubleAvailable ? iconButton(p, 'claim-double', blocked, 'dr-cta dr-cta--big', payload, videoIcon(24), h('span', {}, text(p, 'kit.daily-rewards.claim-2'), h('small', {}, text(p, 'kit.daily-rewards.for-watching-an-ad'))), p.claimDouble ? h('span', { class: 'dr-chip' }, iconOr(p.claimDouble.icon, 16), String(p.claimDouble.amount)) : null) : null, button(text(p, 'kit.daily-rewards.claim'), 'claim', p, { disabled: blocked, ghost: p.doubleAvailable === true,
        className: 'dr-cta', payload, suffix: p.claim ? h('span', { class: 'dr-art' }, iconOr(p.claim.icon, 16), String(p.claim.amount)) : undefined })) : null, p.nextInMs === undefined ? null : h('p', { class: 'dr-note', role: 'timer' }, text(p, 'kit.daily-rewards.next-reward-in'), h('b', {}, clockText(p.nextInMs))));
}
export const dailyBoard = component(dailyBoardView, { presentation: 'fullscreen', popupKind: 'content' });
const logo = () => registryIcon('daily-logo', 20);
export function dailyCalendarView(p) {
    const days = p.days.slice(0, 7);
    const games = new Map(p.games.map(game => [game.id, game]));
    const mark = (id, pending) => {
        const game = games.get(id);
        return game ? h('span', { class: 'cal-mark', role: 'img', title: game.name, 'data-tone': game.tone,
            'data-pending': pending || undefined, 'aria-label': pending
                ? `${game.name} — ${text(p, 'kit.daily-rewards.not-played-yet')}` : game.name }) : null;
    };
    const bonusGame = p.bonus ? games.get(p.bonus.gameId) : undefined;
    const blocked = !p.ready || p.busy || !p.operationId;
    return windowDialog(p, { title: p.title ?? text(p, 'kit.daily-rewards.manyplay-calendar'),
        eyebrow: logo() }, () => p.emitIntent('close'), p.intro ? h('p', { class: 'cal-intro' }, p.intro) : null, h('div', { class: 'cal-wrap' }, h('div', { class: 'cal-days', 'data-part': 'cal-days', role: 'list',
        'aria-label': text(p, 'kit.daily-rewards.calendar-days') }, ...days.map(day => h('div', { class: 'dr-tile cal-day', role: 'listitem', 'data-part': 'cal-day', 'data-state': day.status,
        'aria-current': day.status === 'today' ? 'date' : undefined }, h('span', { class: 'dr-title' }, day.title), h('span', { class: 'dr-art cal-art' }, iconOr(day.icon, 28), day.doubled ? h('span', { class: 'cal-x2' }, '×2') : null), h('span', { class: 'cal-marks' }, ...(day.played ?? []).map(id => mark(id, false)), ...(day.pending ?? []).map(id => mark(id, true))), day.status === 'claimed' ? h('span', { class: 'dr-badge dr-badge--ok', role: 'img',
        'aria-label': text(p, 'kit.daily-rewards.claimed-2') }, checkIcon(12)) : null)), p.chest ? h('div', { class: 'dr-tile cal-chest', role: 'listitem', 'data-part': 'cal-chest' }, h('span', { class: 'dr-art' }, iconOr(p.chest.icon ?? 'gift', 40)), h('span', { class: 'dr-title' }, p.chest.title)) : null), h('div', { class: 'cal-legend', 'data-part': 'cal-legend' }, ...p.games.slice(0, 8).map(game => h('span', {}, h('span', { class: 'cal-mark', 'data-tone': game.tone }), game.name)))), p.bonus && bonusGame ? h('div', { class: 'dr-card cal-bonus', 'data-part': 'cal-bonus' }, h('span', { class: 'cal-bonus-icon', role: 'img',
        'aria-label': `${text(p, 'kit.daily-rewards.game-icon')} ${bonusGame.name}` }, bonusGame.name.slice(0, 1)), h('span', { class: 'cal-bonus-text' }, h('strong', {}, text(p, 'kit.daily-rewards.today-3'), h('em', {}, '×2')), p.bonus.text), button(text(p, 'kit.daily-rewards.play'), 'play-game', p, { ghost: true, className: 'cal-play',
        disabled: !p.ready || p.busy, payload: () => ({ gameId: bonusGame.id }),
        testid: `${p.elementId}.play.${bonusGame.id}` })) : null, p.claimLabel ? h('div', { class: 'dr-actions' }, iconButton(p, 'claim', blocked, 'dr-cta cal-claim', () => ({ key: p.trackKey, operationId: p.operationId }), p.claimIcon ? iconOr(p.claimIcon, 24) : null, p.claimLabel)) : null);
}
export const dailyCalendar = component(dailyCalendarView, { presentation: 'fullscreen', popupKind: 'content' });
const giftArt = () => registryIcon('daily-gift', 144);
export function dailyGiftView(p) {
    const blocked = !p.ready || p.busy || !p.operationId;
    const ad = p.adRequired !== false;
    return windowDialog(p, { title: p.title ?? text(p, 'kit.daily-rewards.special-gift') }, () => p.emitIntent('close'), h('div', { class: 'gift-art', 'data-part': 'gift-art' }, giftArt(), ad ? h('small', { class: 'gift-ad' }, text(p, 'kit.daily-rewards.opens-after-a-short-ad')) : null), h('div', { class: 'dr-card gift-box', 'data-part': 'gift-contents' }, h('p', { class: 'dr-sub' }, text(p, 'kit.daily-rewards.what-is-inside')), ...windowSlots(p, 'dailyGift', { rewards: rewardGrid(p, p.contents.slice(0, 50).map((item, i) => ({
            id: `gift-${i}`, name: item.label, ...(item.icon ? { icon: item.icon } : {}),
            ...(item.amount !== undefined ? { amount: item.amount } : {}),
        }))) }), p.surprise ? h('div', { class: 'gift-chip', 'data-surprise': true }, h('span', { width: 16,
        height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2.2,
        'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, registryIcon('daily-rewards-daily-gift-view-1', 16)), text(p, 'kit.daily-rewards.surprise')) : null), h('div', { class: 'dr-actions' }, iconButton(p, 'open', blocked, 'dr-cta dr-cta--gift', () => ({ operationId: p.operationId }), ad ? videoIcon(24) : null, text(p, 'kit.daily-rewards.open')), ad ? h('p', { class: 'dr-note' }, text(p, 'kit.daily-rewards.after-a-short-ad')) : null, button(text(p, 'kit.daily-rewards.no-thanks'), 'close', p, { className: 'dr-link', ghost: true })));
}
export const dailyGift = component(dailyGiftView, { presentation: 'fullscreen', popupKind: 'content' });
nameComponents({ dailyBoard, dailyCalendar, dailyGift });
const planStatus = (index, s) => index < s.claimed ? 'claimed'
    : index === s.claimed && s.operationId ? 'available' : 'locked';
const planItems = (d, s) => d.reward.map(r => ({ icon: s.icons?.[r.id] ?? r.id, amount: r.amount }));
export function planBoardDays(days, s) {
    return days.slice(0, 9).map((d, i) => ({ key: `day${d.day}`, title: `${d.day}`,
        status: planStatus(i, s), items: planItems(d, s) }));
}
export function planWeekDays(days, s) {
    const shown = days.slice(0, 7);
    return shown.map((d, i) => {
        const [first, ...rest] = planItems(d, s);
        const status = planStatus(i, s);
        return { key: `day${d.day}`, title: `${d.day}`, amount: first?.amount ?? '', icon: first?.icon ?? 'gift',
            status, ...(i === shown.length - 1 && shown.length > 1 ? { wide: true, extra: rest } : {}),
            ...(status === 'available' ? { operationId: s.operationId } : {}) };
    });
}

import { icon as registryIcon } from '../icon.js';
import { icon } from '../icon.js';
import { nameComponents } from '../core.js';
import { component, h, assetImage, moduleImage, text } from '../features/shared.js';
import { skinIcon } from '../icon.js';
import { stopwatchIcon } from '../features/daily-parts.js';
export function formatRemaining(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = String(total % 60).padStart(2, '0');
    return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
}
export function formatBadgeRemaining(ms, lang, l10n) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const [count, unit] = total >= 86_400 ? [Math.floor(total / 86_400), 'day']
        : total >= 3600 ? [Math.floor(total / 3600), 'hour']
            : total >= 60 ? [Math.floor(total / 60), 'minute'] : [total, 'second'];
    return text({ lang, ...(l10n ? { l10n } : {}) }, `kit.time.badge-${unit}`, { count });
}
export function formatMenuRemaining(ms, lang, l10n) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    if (total < 3600)
        return formatBadgeRemaining(ms, lang, l10n);
    const [major, minor, units] = total >= 86_400
        ? [Math.floor(total / 86_400), Math.floor((total % 86_400) / 3600),
            ['day', 'hour']]
        : [Math.floor(total / 3600), Math.floor((total % 3600) / 60), ['hour', 'minute']];
    const p = { lang, ...(l10n ? { l10n } : {}) };
    return `${major}${text(p, `kit.time.${units[0]}`)} ${minor}${text(p, `kit.time.${units[1]}`)}`;
}
export const TICK_UP_DELAY_MS = 700;
const TICK_UP_MS = 900;
const ticking = new WeakMap();
export function tickUpValues(root) {
    const view = root.ownerDocument?.defaultView;
    const reduced = view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true;
    for (const value of root.querySelectorAll('.hud-value[data-from]')) {
        const from = Number(value.getAttribute('data-from'));
        const node = value.firstChild;
        const to = Number(node?.nodeValue);
        const key = `${value.getAttribute('data-phase')}:${to}`;
        const state = ticking.get(value);
        if (state?.key === key)
            continue;
        if (state?.frame !== undefined)
            view?.cancelAnimationFrame(state.frame);
        const next = { key };
        ticking.set(value, next);
        if (reduced || !view?.requestAnimationFrame || !node || !Number.isSafeInteger(from)
            || !Number.isSafeInteger(to) || to <= from)
            continue;
        let start;
        const step = (time) => {
            start ??= time;
            const t = Math.min(1, Math.max(0, (time - start) / TICK_UP_MS));
            if (ticking.get(value) !== next || value.firstChild !== node)
                return;
            node.nodeValue = String(Math.round(from + (to - from) * (1 - (1 - t) ** 3)));
            next.frame = t < 1 ? view.requestAnimationFrame(step) : undefined;
        };
        node.nodeValue = String(from);
        next.frame = view.requestAnimationFrame(step);
    }
}
function badgeLabel(p, badge) {
    if (badge.kind === 'dot')
        return text(p, 'kit.hud.new');
    if (badge.kind === 'count')
        return String(badge.value ?? 0);
    return '';
}
export function hudView(p) {
    return h('nav', { class: 'hud', 'data-slot': p.slot, 'data-testid': `hud.${p.slot}`,
        'aria-label': p.ariaLabel ?? (p.slot === 'top'
            ? `${text(p, 'kit.hud.top-bar')} ${p.group === 'left'
                ? text(p, 'kit.hud.left') : p.group === 'center'
                ? text(p, 'kit.hud.center') : text(p, 'kit.hud.right')}`
            : p.slot === 'left' ? text(p, 'kit.hud.left-quick-actions')
                : p.slot === 'right' ? text(p, 'kit.hud.right-quick-actions')
                    : text(p, 'kit.hud.menu')) }, ...p.items.slice(0, 64).map((item) => hudItemView(p, item)));
}
export function hudItemView(p, item, presentation = 'hud') {
    const badge = item.badge;
    const countdown = item.timer;
    const shown = badge === undefined ? null
        : badge.kind === 'dot' ? ''
            : ((badge.value ?? 0) > 99 ? '99+' : String(badge.value ?? 0));
    const capsule = item.value !== undefined;
    const side = p.slot === 'left' || p.slot === 'right';
    const locked = item.state === 'locked';
    const progress = item.progress === undefined ? undefined
        : Math.round(Math.max(0, Math.min(1, item.progress)) * 100);
    const menu = presentation === 'bottommenu';
    const itemButton = h('button', { type: 'button', class: 'hud-item', 'data-part': 'item', title: '', 'data-variant': 'ghost',
        'data-capsule': capsule, 'data-state': locked ? 'locked' : undefined,
        'data-timer': menu && countdown ? 'on' : undefined,
        'aria-current': menu && item.current ? 'page' : undefined,
        disabled: p.busy, 'aria-disabled': locked ? 'true' : undefined,
        'data-testid': `hud.${item.id}`, 'data-badge': badge?.kind,
        'aria-label': `${item.label}${capsule ? `: ${item.value}` : ''}${progress === undefined
            ? '' : `, ${text(p, 'kit.hud.progress')} ${progress}%`}${locked
            ? `, ${text(p, 'kit.hud.locked')}` : ''}${badge ?
            `, ${badgeLabel(p, badge)}` : ''}${countdown ? `, ${text(p, 'kit.hud.ends-in')}${(menu || side ? formatMenuRemaining
            : formatBadgeRemaining)(countdown.remainingMs, p.lang, p.l10n)}` : ''}`,
        onClick: () => { if (!p.busy)
            p.emitIntent('open', { id: item.id }); } }, h('span', { class: 'hud-glyph', 'aria-hidden': 'true' }, skinIcon(item.icon, side ? 40 : 24, { scope: p.skinScope })
        ?? moduleImage(item.icon, { width: side ? 40 : 24, height: side ? 40 : 24 })
        ?? assetImage(p, item.icon, { width: side ? 40 : 24, height: side ? 40 : 24 })
        ?? icon(item.icon, side ? 40 : 24, { scope: p.skinScope }), menu && locked ? h('span', { class: 'hud-lock', 'data-testid': `hud.${item.id}.lock` }, icon('lock')) : null), capsule ? h('span', { class: 'hud-value', 'data-testid': `hud.${item.id}.value`,
        'data-change': item.change?.direction,
        'data-from': item.change?.direction === 'up' && typeof item.value === 'number'
            ? item.change.from : undefined,
        'data-phase': item.change ? String(item.change.revision % 2) : undefined }, item.value) : null, side || menu ? h('span', { class: 'hud-label' }, item.label) : null, item.progress !== undefined ? h('span', { class: 'hud-progress', 'aria-hidden': 'true',
        'data-testid': `hud.${item.id}.progress` }, h('span', { 'data-step': Math.round(Math.max(0, Math.min(1, item.progress)) * 10) })) : null, countdown ? h('span', { class: 'hud-badge', 'data-kind': 'timer',
        'data-testid': `hud.${item.id}.timer` }, ...(side ? [stopwatchIcon(12, true)] : []), (menu || side ? formatMenuRemaining
        : formatBadgeRemaining)(countdown.remainingMs, p.lang, p.l10n)) : null, badge ? h('span', { class: 'hud-badge', 'data-kind': badge.kind, 'aria-hidden': 'true',
        'data-testid': `hud.${item.id}.badge` }, shown) : null);
    return capsule && item.add ? h('div', { class: 'hud-capsule' }, itemButton, h('button', { class: 'hud-add', type: 'button', 'data-part': 'add', title: '', disabled: p.busy,
        'aria-label': item.add.label, 'data-testid': `hud.${item.id}.add`,
        onClick: () => { if (!p.busy)
            p.emitIntent('open', { id: item.add.id }); } }, h('span', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none',
        stroke: 'currentColor', 'stroke-width': 2.6, 'stroke-linecap': 'round', 'aria-hidden': 'true' }, registryIcon('hud-hud-item-view-1', 16)))) : itemButton;
}
export const hud = component(hudView, {
    rendered: (_p, ctx) => { tickUpValues(ctx.root); }
});
nameComponents({ hud });

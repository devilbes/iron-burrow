import {} from '../core.js';
import { icon, skinIcon } from '../icon.js';
import { h, assetImage, moduleImage, text } from './shared.js';
export function rewardGrid(p, items, options = {}) {
    const shown = items.slice(0, 50);
    return h('ul', { class: `reward-grid ${options.className ?? ''}`.trim(),
        'data-part': 'reward-grid', 'data-count': shown.length,
        'aria-label': options.label ?? text(p, 'kit.reward-grid.rewards') }, ...shown.map((item, index) => {
        const name = item.name ?? text(p, 'kit.reward-grid.reward');
        const amount = typeof item.amount === 'number'
            ? new Intl.NumberFormat(p.lang).format(item.amount) : item.amount;
        const size = 40;
        const attrs = { width: size, height: size };
        const art = options.art?.(item, size, index)
            ?? (item.icon ? skinIcon(item.icon, size, { scope: p.skinScope })
                ?? moduleImage(item.icon, attrs) ?? assetImage(p, item.icon, attrs) : null)
            ?? skinIcon(item.id, size, { scope: p.skinScope })
            ?? icon('gift', size, { scope: p.skinScope });
        const entry = h('button', { type: 'button', class: 'reward-grid-entry', 'data-part': 'reward-grid-entry',
            'data-variant': 'ghost',
            'aria-label': amount === undefined ? name : `${name}: ${amount}`, title: name,
            onClick: event => { event.currentTarget.focus({ preventScroll: true }); } }, h('span', { class: 'reward-art', 'aria-hidden': 'true' }, art), amount === undefined ? null : h('strong', { class: 'reward-amount', 'aria-hidden': 'true' }, amount), h('span', { class: 'reward-name', 'aria-hidden': 'true' }, name));
        return h('li', { class: 'reward-grid-item', 'data-reward-id': item.id,
            'data-gold': item.gold || undefined, 'data-testid': item.testid }, options.entry?.(item, index, entry) ?? entry, options.details?.(item, index) ?? null);
    }));
}

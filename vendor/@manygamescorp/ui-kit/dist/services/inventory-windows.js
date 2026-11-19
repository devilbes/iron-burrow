import { rewardGrid } from '../features/reward-grid.js';
import { icon as registryIcon } from '../icon.js';
import { nameComponents } from '../core.js';
import { component, h, text, button, titledDialog, assetImage, windowSlots } from '../features/shared.js';
import {} from '../core.js';
const art = (p, icon, label, size) => assetImage(p, icon, { width: size, height: size })
    ?? h('span', { class: 'inv-glyph', 'aria-hidden': 'true', 'data-size': size }, [...label][0]?.toUpperCase() ?? '');
const MAX_CELLS = 200;
const longName = (name) => [...name].length > 18
    || name.split(/\s+/).some((word) => [...word].length > 9);
const amount = (p, n) => new Intl.NumberFormat(p.lang).format(Math.max(0, Math.trunc(n)));
const cellAmount = (p, n) => {
    const whole = Math.max(0, Math.trunc(n));
    if (whole < 100_000)
        return amount(p, whole);
    const divisor = whole < 1_000_000 ? 1_000 : 1_000_000;
    const short = Math.floor(whole / divisor * 10) / 10;
    const value = new Intl.NumberFormat(p.lang, { useGrouping: false }).format(short >= 100 ? Math.floor(short) : short);
    return text(p, divisor === 1_000 ? 'kit.inventory.amount-thousand' : 'kit.inventory.amount-million', { value });
};
export const inventoryWindowView = (p) => {
    const list = (p.tab === 'currency' ? p.currencies : p.items).slice(0, MAX_CELLS);
    const selected = list.find((e) => e.id === p.selectedId) ?? list[0];
    const tab = (id, label, count) => h('button', { type: 'button',
        role: 'tab', 'aria-selected': String(p.tab === id), 'data-testid': `${p.elementId}.tab.${id}`,
        disabled: p.busy, onClick: () => { if (!p.busy && p.tab !== id)
            p.emitIntent('tab', { tab: id }); } }, id === 'currency' ? registryIcon('coins', 16) : null, label, id === 'items' ? h('span', { class: 'inv-count' }, String(count)) : null);
    const usable = !!selected && selected.consumable === true && selected.quantity > 0;
    const body = (selected ? [
        h('article', { class: 'inv-detail', 'aria-label': text(p, 'kit.inventory-windows.selected-item') }, h('div', { class: 'inv-detail-head' }, h('span', { class: 'inv-detail-art' }, art(p, selected.icon, selected.name, 56)), h('div', { class: 'inv-detail-meta' }, h('h3', {}, selected.name), selected.rarity ? h('span', { class: 'inv-rarity' }, text(p, 'kit.inventory-windows.rarity', { rarity: selected.rarity })) : null, h('span', { class: 'inv-have' }, text(p, 'kit.inventory-windows.in-stock'), h('b', {}, amount(p, selected.quantity))))), selected.description ? h('p', { class: 'inv-desc' }, selected.description) : null),
        h('div', { class: 'window-actions' }, p.tab === 'items' ? button(text(p, 'kit.inventory-windows.use'), 'use', p, { testid: `${p.elementId}.use`,
            disabled: !p.ready || p.busy || !usable,
            payload: () => ({ itemId: selected.id, qty: 1 }) }) : null, selected.exchangeable ? button('', 'exchange', p, { ghost: true, className: 'inv-exchange',
            disabled: !p.ready || p.busy, payload: () => ({ itemId: selected.id }),
            ariaLabel: text(p, 'kit.inventory-windows.exchange'),
            prefix: registryIcon('inventory-windows-body-1', 16),
            suffix: h('span', { class: 'inv-exchange-label', 'aria-hidden': 'true' }, text(p, 'kit.inventory-windows.exchange')) }) : null)
    ] : [
        h('p', { class: 'inv-empty', role: 'status' }, text(p, 'kit.inventory-windows.nothing-here-yet'))
    ]);
    return titledDialog(p, text(p, 'kit.inventory-windows.inventory'), undefined, () => p.emitIntent('close'), h('div', { class: 'inv-tabs', role: 'tablist', 'aria-label': text(p, 'kit.inventory-windows.inventory-sections') }, tab('currency', text(p, 'kit.inventory-windows.currency'), p.currencies.length), tab('items', text(p, 'kit.inventory-windows.items'), p.items.length)), h('div', { class: 'inv-grid', role: 'tabpanel',
        'aria-label': p.tab === 'currency' ? text(p, 'kit.inventory-windows.currency') : text(p, 'kit.inventory-windows.items') }, ...list.map((entry) => h('button', { type: 'button', class: 'inv-cell', title: entry.name,
        'aria-pressed': String(selected?.id === entry.id), 'data-empty': entry.quantity < 1 ? 'true' : undefined,
        'data-wide-qty': entry.quantity >= 100 ? 'true' : undefined,
        'data-long-name': longName(entry.name) ? 'true' : undefined,
        'data-testid': `${p.elementId}.cell.${entry.id}`, disabled: p.busy,
        'aria-label': `${entry.name}, ${entry.quantity < 1 ? text(p, 'kit.inventory-windows.out-of-stock')
            : text(p, 'kit.inventory-windows.pcs', { quantity: amount(p, entry.quantity) })}${entry.isNew ? text(p, 'kit.inventory-windows.new') : ''}`,
        onClick: () => { if (!p.busy)
            p.emitIntent('select', { itemId: entry.id }); } }, art(p, entry.icon, entry.name, 40), h('span', { class: 'inv-name' }, entry.name), h('span', { class: 'inv-qty' }, `×${cellAmount(p, entry.quantity)}`), entry.isNew ? h('span', { class: 'inv-new', 'aria-hidden': 'true' }) : null))), h('div', { class: 'inv-side' }, ...body));
};
export const inventoryWindow = component(inventoryWindowView, { presentation: 'fullscreen', popupKind: 'content' });
const chestArt = (tone, size) => registryIcon(`chest-${tone ?? 'bronze'}`, size);
const openChestArt = (tone) => registryIcon(`chest-open-${tone ?? 'bronze'}`, 78);
const waitLabel = (p, ms) => {
    const total = Math.max(1, Math.ceil(Math.max(0, ms) / 60000));
    if (total >= 1440) {
        const hours = Math.ceil(total / 60);
        const d = Math.floor(hours / 24);
        const hrs = hours % 24;
        return hrs === 0 ? { short: text(p, 'kit.inventory-windows.d', { d: d }), aria: text(p, 'kit.inventory-windows.d-2', { d: d }) }
            : { short: text(p, 'kit.inventory-windows.d-h', { d: d, hrs: hrs }), aria: text(p, 'kit.inventory-windows.d-h-2', { d: d, hrs: hrs }) };
    }
    const hrs = Math.floor(total / 60);
    const min = total % 60;
    if (hrs === 0)
        return { short: text(p, 'kit.inventory-windows.min', { min: min }), aria: text(p, 'kit.inventory-windows.min', { min: min }) };
    return min === 0 ? { short: text(p, 'kit.inventory-windows.h', { hrs: hrs }), aria: text(p, 'kit.inventory-windows.h-2', { hrs: hrs }) }
        : { short: text(p, 'kit.inventory-windows.h-m', { hrs: hrs, min: min }),
            aria: text(p, 'kit.inventory-windows.h-min', { hrs: hrs, min: min }) };
};
const playIcon = () => registryIcon('inventory-windows-play-icon-4', 16);
const chestAction = (p, chest) => {
    if (chest.status === 'cooldown') {
        const left = waitLabel(p, chest.remainingMs ?? 0);
        return h('span', { class: 'chest-action chest-wait', role: 'timer',
            'aria-label': text(p, 'kit.inventory-windows.next-chest-in', { aria: left.aria }) }, registryIcon('inventory-windows-chest-action-5', 16), text(p, 'kit.inventory-windows.in', { short: left.short }));
    }
    const priced = chest.status === 'price';
    return button(priced ? (chest.price ?? '') : text(p, 'kit.inventory-windows.open'), 'open', p, {
        className: 'chest-action', ghost: priced, testid: `${p.elementId}.open.${chest.id}`,
        disabled: p.ready !== true || p.busy, payload: () => ({ chestId: chest.id }),
        prefix: priced ? (chest.priceIcon ? registryIcon(chest.priceIcon, 20) : null) : playIcon(),
        ...(priced ? { ariaLabel: text(p, 'kit.inventory-windows.open-for', { price: chest.price ?? '' }) } : {})
    });
};
export const chestsWindowView = (p) => titledDialog(p, text(p, 'kit.inventory-windows.chests'), undefined, () => p.emitIntent('close'), p.chests.length ? null : h('div', { class: 'inv-empty chest-empty', role: 'status', 'data-part': 'chests-empty' }, chestArt('bronze', 96), h('p', {}, text(p, 'kit.inventory-windows.no-chests-yet-complete-levels-and-quests-to-earn-them'))), h('ul', { class: 'chest-list' }, ...p.chests.slice(0, 20).map((chest) => h('li', { class: 'chest-row',
    'data-status': chest.status, 'data-testid': `${p.elementId}.chest.${chest.id}` }, assetImage(p, chest.icon, { width: 48, height: 48 }) ?? chestArt(chest.tone, 48), h('span', { class: 'chest-meta' }, h('strong', {}, chest.title), chest.note ? h('small', {}, chest.note) : null), chestAction(p, chest)))));
export const chestsWindow = component(chestsWindowView, { presentation: 'fullscreen', popupKind: 'content' });
export const chestOpenedView = (p) => titledDialog(p, text(p, 'kit.inventory-windows.chest-opened'), undefined, () => p.emitIntent('close'), h('div', { class: 'chest-opened' }, openChestArt(p.tone), h('p', {}, p.caption)), ...windowSlots(p, 'chestOpened', { rewards: rewardGrid(p, p.rewards.slice(0, 50).map(reward => ({
        id: reward.id, name: reward.label, amount: reward.amount, gold: reward.gold,
        ...(reward.icon ? { icon: reward.icon } : {}),
        testid: `${p.elementId}.reward.${reward.id}`,
    })), { label: text(p, 'kit.inventory-windows.chest-contents') }) }), h('div', { class: 'window-actions' }, button(text(p, 'kit.inventory-windows.collect'), 'claim', p, { disabled: !p.ready || p.busy })));
export const chestOpened = component(chestOpenedView, { presentation: 'fullscreen' });
export const skinDetailView = (p) => {
    const ad = p.adProgress;
    const pct = ad && ad.total > 0
        ? Math.round(Math.min(1, Math.max(0, ad.done / ad.total)) * 100) : 0;
    const nav = (dir) => h('button', { type: 'button', class: `skin-nav skin-${dir}`,
        'data-variant': 'ghost', 'data-testid': `${p.elementId}.${dir}`, disabled: p.busy,
        'aria-label': dir === 'prev' ? text(p, 'kit.inventory-windows.previous-skin') : text(p, 'kit.inventory-windows.next-skin'),
        onClick: () => { if (!p.busy)
            p.emitIntent(dir); } }, registryIcon(dir === 'prev' ? 'back' : 'right', 24));
    return h('section', { class: 'skin-page', role: 'dialog', 'aria-modal': 'true',
        'aria-label': text(p, 'kit.inventory-windows.skins'), 'data-testid': `${p.elementId}.skin` }, h('header', { class: 'skin-head' }, h('button', { type: 'button', class: 'skin-back', 'data-variant': 'ghost', disabled: p.busy,
        'data-testid': `${p.elementId}.back`, 'aria-label': text(p, 'kit.inventory-windows.back'),
        onClick: () => { if (!p.busy)
            p.emitIntent('back'); } }, registryIcon('inventory-windows-skin-detail-view-7', 20)), h('h3', {}, text(p, 'kit.inventory-windows.skins')), p.rarity ? h('span', { class: 'skin-rarity' }, p.rarity) : null, h('span', { class: 'skin-index' }, `${p.index} / ${p.total}`)), h('div', { class: 'skin-stage' }, h('div', { class: 'skin-preview-card' }, nav('prev'), h('div', { class: 'skin-preview', role: 'img', 'aria-label': p.name }, assetImage(p, p.preview) ?? null), nav('next'), h('h2', { class: 'skin-name' }, p.name), p.perk ? h('span', { class: 'skin-perk' }, p.perkIcon ? art(p, p.perkIcon, p.perk, 16) : null, p.perk) : null), h('div', { class: 'skin-side' }, h('div', { class: 'skin-variants', role: 'group', 'aria-label': text(p, 'kit.inventory-windows.variants') }, ...p.variants.slice(0, 12).map((variant) => {
        const open = variant.state === 'unlocked';
        return h('button', { type: 'button', class: 'skin-variant', 'data-state': variant.state,
            'data-tone': variant.tone, 'aria-pressed': String(open && variant.id === p.selectedVariantId),
            'data-testid': `${p.elementId}.variant.${variant.id}`, disabled: p.busy || !open,
            'aria-label': open ? variant.id : variant.state === 'locked'
                ? text(p, 'kit.inventory-windows.locked') : text(p, 'kit.inventory-windows.unknown'),
            onClick: () => { if (!p.busy && open)
                p.emitIntent('select', { variantId: variant.id }); } }, open ? (variant.icon ? art(p, variant.icon, variant.id, 24) : h('span', { class: 'skin-dot',
            'aria-hidden': 'true' }))
            : variant.state === 'locked' ? registryIcon('inventory-windows-skin-detail-view-8', 16) : h('b', { 'aria-hidden': 'true' }, '?'));
    })), h('div', { class: 'skin-unlock' }, ad ? h('div', { class: 'skin-ad' }, h('div', { class: 'skin-ad-line' }, h('span', {}, text(p, 'kit.inventory-windows.unlock-with-ads')), h('b', {}, `${ad.done} / ${ad.total}`)), h('div', { class: 'skin-bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100,
        'aria-valuenow': pct }, h('svg', { viewBox: '0 0 100 1', preserveAspectRatio: 'none',
        'aria-hidden': 'true' }, h('rect', { width: pct, height: 1 })))) : null, h('div', { class: 'skin-actions' }, h('button', { type: 'button', class: 'skin-watch', 'data-testid': `${p.elementId}.watch-ad`,
        disabled: !p.ready || p.busy || p.videoAvailable === false || ad === undefined,
        onClick: () => { if (p.ready && !p.busy && p.videoAvailable !== false && ad)
            p.emitIntent('watch-ad'); } }, h('span', { class: 'skin-long' }, text(p, 'kit.inventory-windows.watch-an-ad-1')), h('span', { class: 'skin-short' }, text(p, 'kit.inventory-windows.ad-1')), registryIcon('inventory-windows-skin-detail-view-9', 20)), p.price ? button(text(p, 'kit.inventory-windows.buy-for'), 'buy', p, { ghost: true,
        className: 'skin-buy', testid: `${p.elementId}.buy`,
        disabled: !p.ready || p.busy || p.canBuy === false,
        suffix: h('span', { class: 'skin-price' }, p.priceIcon ? registryIcon(p.priceIcon, 20) : null, p.price) }) : null)))));
};
export const skinDetail = component(skinDetailView, { presentation: 'fullscreen', popupKind: 'content' });
nameComponents({ inventoryWindow, chestsWindow, chestOpened, skinDetail });

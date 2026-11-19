import { rewardGrid } from '../features/reward-grid.js';
import { offerArt, itemArt } from './offer-art.js';
import { icon } from '../icon.js';
import { nameComponents } from '../core.js';
import { component, h, assetImage, text, heading, button, details, outcome, record, dialog, windowSlots } from '../features/shared.js';
import { skinIcon } from '../icon.js';
import { stopwatchIcon } from '../features/daily-parts.js';
export function purchaseProcessing(p) {
    if (!p.processing)
        return null;
    const label = p.processingLabel
        ?? text(p, 'kit.iap.processing');
    return h('div', { 'data-part': 'purchase-processing' }, h('p', { role: 'status' }, label), h('progress', { max: 100, 'aria-label': label }), button(p.processingCloseLabel ?? text(p, 'kit.iap.close'), 'dismiss-processing', p, { disabled: false, ghost: true }));
}
export function uiText(ui, ...names) {
    const root = record(ui);
    for (const r of [root, record(root['texts']), record(root['assets'])]) {
        for (const name of names) {
            if (Object.hasOwn(r, name) && typeof r[name] === 'string' && r[name])
                return r[name];
        }
    }
    return undefined;
}
export function offerText(p, ui, ...names) {
    const root = record(ui);
    for (const source of [root, record(root['texts'])]) {
        for (const name of names) {
            const value = source[name];
            if (typeof value === 'string' && value)
                return value;
            const localized = record(value);
            const key = localized['key'] ?? localized['l10n'];
            if (typeof key === 'string') {
                const translated = p.l10n?.(key);
                if (translated && translated !== key)
                    return translated;
            }
            const values = record(localized['values'] ?? localized);
            const translated = values[p.lang];
            if (typeof translated === 'string' && translated)
                return translated;
        }
    }
    return undefined;
}
export function formatPrice(lang, amount, currency) {
    try {
        return new Intl.NumberFormat(lang, { style: 'currency', currency }).format(amount);
    }
    catch {
        return `${amount} ${currency}`;
    }
}
function storePrice(p, o, amount) {
    return o.product?.currency ? formatPrice(p.lang, amount, o.product.currency) : undefined;
}
export function offerPrice(p, o) {
    if (o.priceText)
        return o.priceText;
    if (o.kind === 'free')
        return text(p, 'kit.shop.free');
    if (o.kind === 'ad')
        return text(p, 'kit.shop.watch-video');
    if (o.kind === 'ingame')
        return text(p, 'kit.shop.use-tickets');
    if (typeof o.product?.price === 'number' && Number.isFinite(o.product.price)
        && o.product.price >= 0) {
        const formatted = storePrice(p, o, o.product.price);
        if (formatted)
            return formatted;
    }
    return o.product?.priceText || o.product?.store?.priceText || '—';
}
export function isPendingPurchase(value) {
    const result = record(value);
    return ['pending', 'pending_store', 'pending_validation', 'pending_grant', 'created', 'validated']
        .includes(String(result['status'])) || result['reward'] === 'pending';
}
export function offerCountdown(endsAt, now, lang = 'en', l10n) {
    if (!endsAt)
        return undefined;
    const end = Date.parse(endsAt);
    if (!Number.isFinite(end))
        return undefined;
    const seconds = Math.max(0, Math.ceil((end - now) / 1000));
    const hours = Math.floor(seconds / 3600);
    if (hours >= 24) {
        const p = { lang, ...(l10n ? { l10n } : {}) };
        return `${Math.floor(hours / 24)}${text(p, 'kit.time.day')} ${hours % 24}${text(p, 'kit.time.hour')}`;
    }
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(Math.floor(seconds % 3600 / 60))}:${pad(seconds % 60)}`;
}
export const available = (o, now) => o.available
    && (!o.endsAt || Date.parse(o.endsAt) > now);
export const shopView = (p, d, ctx) => {
    if (d['confirming'] && !p.busy && p.purchase?.value) {
        d['_focus'] = `iap.buy.${d['selected']}`;
        delete d['selected'];
        delete d['confirming'];
    }
    const selected = p.offers.find((o) => o.key === d['selected']);
    const result = record(p.purchase?.value);
    const granted = ['purchased', 'granted'].includes(String(result['status'])) || result['reward'] === 'granted';
    const close = () => {
        const key = d['selected'];
        delete d['selected'];
        if (key)
            d['_focus'] = `iap.buy.${key}`;
        ctx.refresh();
    };
    return h('section', { 'data-testid': 'iap' }, heading(p, text(p, 'kit.shop.adventure-shop'), text(p, 'kit.shop.get-ready-for-your-next-level')), h('div', { class: 'row' }, button(text(p, 'kit.shop.refresh-offers'), 'offers', p, { disabled: !p.ready || p.busy }), button(text(p, 'kit.shop.refresh-balance'), 'balance', p, { disabled: !p.balanceReady || p.busy, ghost: true }), button(text(p, 'kit.shop.my-purchases'), 'orders', p, { disabled: !p.ready || p.busy }), button(text(p, 'kit.shop.special-offers'), 'offer-placement', p, { disabled: !p.ready || p.busy, payload: () => ({ trigger: 'shop' }) }), button(text(p, 'kit.shop.store-prices'), 'products', p, { disabled: !p.ready || p.busy })), h('div', { class: 'row', 'data-part': 'balance' }, ...p.currencies?.slice(0, 20).map((c) => h('span', { class: 'badge' }, icon('currency'), `${c.name}: ${c.quantity}`)) ?? []), h('div', { class: 'grid' }, ...p.offers.slice(0, 100).map((o) => h('article', {
        class: 'card hero', 'data-testid': `iap.offer.${o.key}`, 'data-offer-key': o.key,
    }, h('span', { class: 'badge' }, offerPrice(p, o)), h('div', { class: 'icon', 'aria-hidden': 'true' }, offerArt(p, o, 72)
        ?? (o.variant.entities[0] ? itemArt(p, o.variant.entities[0], 72) : null) ?? icon('gift')), h('h3', {}, offerText(p, o.ui, 'title') ?? o.name), offerText(p, o.ui, 'badge') ? h('span', { class: 'badge' }, offerText(p, o.ui, 'badge')) : null, offerText(p, o.ui, 'description') ?? o.description
        ? h('p', { class: 'hint' }, offerText(p, o.ui, 'description') ?? o.description) : null, o.endsAt ? h('span', { class: 'badge', 'data-part': 'offer-timer' }, offerCountdown(o.endsAt, p.now, p.lang, p.l10n)) : null, ...windowSlots(p, 'shop', { rewards: offerRewardGrid(p, o.variant.entities) }), button(offerText(p, o.ui, 'cta') ?? offerPrice(p, o), 'select-offer', p, {
        disabled: !p.ready || p.busy || !available(o, p.now) || isPendingPurchase(p.purchase?.value), testid: `iap.buy.${o.key}`,
        click: () => { d['selected'] = o.key; ctx.refresh(); },
    }), !available(o, p.now) ? h('p', { class: 'hint' }, text(p, 'kit.shop.currently-unavailable'), o.availableAt ? ` · ${o.availableAt}` : '') : null))), p.offers.length ? null : h('p', { class: 'empty' }, text(p, 'kit.shop.no-offers-yet-refresh-the-shop')), selected ? dialog(p, text(p, 'kit.shop.confirm-purchase'), close, h('p', {}, offerText(p, selected.ui, 'title') ?? selected.name), h('p', { class: 'balance' }, offerPrice(p, selected)), h('div', { class: 'row' }, button(text(p, 'kit.shop.confirm'), 'purchase', p, { disabled: p.busy || !p.ready || !available(selected, p.now)
            || isPendingPurchase(p.purchase?.value),
        testid: 'iap.confirm', click: () => {
            d['confirming'] = '1';
            p.emitIntent('purchase', { offerKey: selected.key,
                variantKey: selected.variant.key, kind: selected.kind });
        } }), button(text(p, 'kit.shop.cancel'), 'cancel', p, { ghost: true, click: close }))) : null, granted ? h('div', { class: 'card hero reward', role: 'status', 'data-part': 'reward' }, h('div', { class: 'icon', 'aria-hidden': 'true' }, icon('gift')), h('h3', {}, text(p, 'kit.shop.reward-received'))) : null, p.purchase?.value && !granted ? h('p', { role: 'status', 'data-part': 'purchase-status',
        'data-state': String(result['status'] ?? result['reward'] ?? 'pending') }, ['cancelled', 'canceled', 'skipped'].includes(String(result['status']))
        ? text(p, 'kit.shop.purchase-cancelled')
        : ['failed', 'not_available', 'already_owned'].includes(String(result['status']))
            ? text(p, 'kit.shop.purchase-unavailable-refresh-the-shop-and-try-again')
            : text(p, 'kit.shop.waiting-for-purchase-confirmation')) : null, isPendingPurchase(p.purchase?.value) && typeof result['orderId'] === 'string'
        ? button(text(p, 'kit.shop.check-purchase'), 'check-purchase', p) : null, h('div', { 'data-part': 'orders' }, ...orderRows(p.orders).map((o) => h('article', { class: 'card' }, h('h3', {}, o.offerKey), h('p', {}, o.status)))), outcome(p, p.purchase, 'iap.purchase'), outcome(p, p.catalog, 'iap.catalog'), outcome(p, p.orders, 'iap.orders'), details(p, { offers: p.offers, purchase: p.purchase, balance: p.balance,
        products: p.products, orders: p.orders }, 'iap.details'));
};
export const shop = component(shopView);
function orderRows(value) {
    const items = record(value?.value)['items'];
    return Array.isArray(items) ? items.slice(0, 20).map((o) => ({
        offerKey: String(record(o)['offerKey'] ?? ''), status: String(record(o)['status'] ?? '')
    })) : [];
}
function rewardIcon(p, item, size) {
    return itemArt(p, item, size) ?? icon(item.id, size, { scope: p.skinScope });
}
const rewardAmount = (p, item) => p.amountLabels && Object.hasOwn(p.amountLabels, item.id)
    ? p.amountLabels[item.id] : new Intl.NumberFormat(p.lang).format(item.amount);
export function offerRewardGrid(p, items) {
    return rewardGrid(p, items.slice(0, 50).map(item => ({ id: item.id, name: item.name,
        amount: rewardAmount(p, item), ...(item.iconUrl ? { icon: item.iconUrl } : {}),
    })), { label: text(p, 'kit.shop.bundle-contents') });
}
export function rewardTile(p, item, _size = 40) {
    return offerRewardGrid(p, [item]);
}
const purchaseStatus = (p) => p.purchase?.value
    && !['purchased', 'granted'].includes(String(record(p.purchase.value)['status']))
    ? h('p', { role: 'status' }, isPendingPurchase(p.purchase.value) ? text(p, 'kit.shop.waiting-for-purchase-confirmation')
        : text(p, 'kit.shop.purchase-not-completed')) : null;
function offerList(p, o, left, blocked) {
    const price = offerPrice(p, o);
    const cta = offerText(p, o.ui, 'cta') ?? (o.kind === 'paid'
        ? text(p, 'kit.shop.buy-for', { price: price }) : price);
    const note = offerText(p, o.ui, 'note') ?? offerText(p, o.ui, 'subtitle', 'description') ?? o.description;
    const art = offerArt(p, o, 120)
        ?? assetImage(p, uiText(o.ui, 'art', 'image'), { width: 120, height: 120 })
        ?? (o.variant.entities[0] ? itemArt(p, o.variant.entities[0], 120) : null)
        ?? skinIcon('gift', 120, { scope: p.skinScope });
    return h('div', { class: 'iap-offer limited-content', 'data-layout': 'list' }, h('div', { class: 'iap-offer__art', 'data-part': 'offer-art', 'aria-hidden': 'true' }, art), ...windowSlots(p, 'limitedOffer', { rewards: offerRewardGrid(p, o.variant.entities) }), left ? h('div', { class: 'iap-timer-card', 'data-part': 'offer-timer', role: 'timer',
        'aria-label': text(p, 'kit.shop.offer-ends-in', { left: left }) }, stopwatchIcon(24), h('div', {}, h('strong', {}, left), note ? h('span', {}, note) : null)) : null, h('div', { class: 'iap-cta-box window-actions' }, button(cta, 'purchase', p, { testid: 'iap.limited-buy', className: 'iap-cta', disabled: blocked,
        payload: () => ({ offerKey: o.key, variantKey: o.variant.key, kind: o.kind }) }), button(text(p, 'kit.shop.not-now'), 'close-offer', p, { ghost: true, disabled: false, className: 'limited-dismiss' })));
}
export const limitedOfferView = (p) => {
    const o = p.offer;
    const left = o ? offerCountdown(o.endsAt, p.now, p.lang, p.l10n) : undefined;
    const blocked = !o || !p.ready || !available(o, p.now)
        || Boolean(p.purchasingOfferKeys?.includes(o.key));
    const named = o ? uiText(o.ui, 'layout') : undefined;
    const layout = named === 'list' || named === 'tiles' ? named : p.layout ?? 'tiles';
    const subtitle = o ? offerText(p, o.ui, 'subtitle', 'description') ?? o.description : undefined;
    const art = o ? offerArt(p, o, 56) : null;
    const note = o ? offerText(p, o.ui, 'note') : undefined;
    const badge = o ? offerText(p, o.ui, 'badge') : undefined;
    const tag = o ? offerText(p, o.ui, 'tag') : undefined;
    const entities = o ? o.variant.entities.slice(0, 50) : [];
    return h('section', { 'data-testid': 'iap.limited-offer' }, dialog({ ...p, busy: false }, o ? offerText(p, o.ui, 'title') ?? o.name : text(p, 'kit.shop.offer-ended'), () => p.emitIntent('close-offer'), o && layout === 'list' ? offerList(p, o, left, blocked) : null, o && layout === 'tiles' && subtitle
        ? h('p', { class: 'iap-title-sub', 'data-part': 'offer-subtitle' }, subtitle) : null, o && layout === 'tiles' ? h('div', { class: 'iap-offer limited-content', 'data-layout': 'tiles' }, h('div', { class: 'iap-offer__main' }, h('div', { class: 'iap-art', 'data-part': 'offer-art' }, badge ? h('span', { class: 'limited-badge' }, badge) : null, tag ? h('span', { class: 'iap-tag', 'data-part': 'offer-tag' }, tag) : null, ...(art
        ? [art]
        : entities.slice(0, 3).map(item => rewardIcon(p, item, 56)))), ...windowSlots(p, 'limitedOffer', { rewards: offerRewardGrid(p, entities) })), h('div', { class: 'iap-offer__side' }, note ? h('div', { class: 'iap-note', 'data-part': 'offer-note' }, note) : null, h('div', { class: 'iap-price' }, p.previousPriceText ? h('span', {}, h('span', { class: 'mp-sr-only' }, text(p, 'kit.shop.instead-of')), h('del', { 'aria-hidden': 'true' }, p.previousPriceText), h('span', { class: 'mp-sr-only' }, p.previousPriceText)) : null, h('strong', {}, offerPrice(p, o))), left ? h('div', { class: 'iap-timer', 'data-part': 'offer-timer' }, text(p, 'kit.shop.ends-in'), h('strong', {}, left)) : null, h('div', { class: 'iap-cta-box window-actions' }, button(offerText(p, o.ui, 'cta') ?? text(p, 'kit.shop.buy-now'), 'purchase', p, { testid: 'iap.limited-buy', className: 'iap-cta', disabled: blocked,
        payload: () => ({ offerKey: o.key, variantKey: o.variant.key, kind: o.kind }) }), button(text(p, 'kit.shop.not-now'), 'close-offer', p, { ghost: true, disabled: false, className: 'limited-dismiss' })))) : null, purchaseProcessing(p), purchaseStatus(p), outcome(p, p.purchase, 'iap.purchase')));
};
export const limitedOffer = component(limitedOfferView, { presentation: 'fullscreen', popupKind: 'content' });
nameComponents({ shop, limitedOffer });

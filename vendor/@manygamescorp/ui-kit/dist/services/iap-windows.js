import { offerArt, itemArt } from './offer-art.js';
import { icon } from '../icon.js';
import { nameComponents } from '../core.js';
import { component, h, text, button, assetImage, dialog, windowDialog, windowSlots, outcome } from '../features/shared.js';
import { errorAlert } from './error.js';
import { available, purchaseProcessing, offerCountdown, offerPrice, offerRewardGrid, uiText, offerText } from './shop.js';
export const SHOP_SECTIONS = ['shop_special', 'shop_soft', 'shop_hard', 'shop_bundles',
    'shop_ads', 'shop_other'];
export function shopSection(offer) {
    if (offer.placement === undefined)
        return 'shop_other';
    return SHOP_SECTIONS.find(placement => placement === offer.placement);
}
const SECTION_TITLES = {
    shop_special: 'kit.iap-windows.section_titles-special-offers',
    shop_soft: 'kit.iap-windows.section_titles-soft-currency',
    shop_hard: 'kit.iap-windows.section_titles-hard-currency',
    shop_bundles: 'kit.iap-windows.section_titles-bundles',
    shop_ads: 'kit.iap-windows.section_titles-watch-video',
    shop_other: 'kit.iap-windows.section_titles-other',
};
function sectionTitle(p, placement) {
    const key = `kit.shop.${placement}`;
    const translated = p.l10n?.(key);
    return translated && translated !== key ? translated
        : text(p, SECTION_TITLES[placement]);
}
const entityIcon = (p, item, size) => itemArt(p, item, size)
    ?? icon(item.id, size, { scope: p.skinScope });
const canBuy = (p, o) => Boolean(p.ready)
    && !p.error && available(o, p.now) && !p.purchasingOfferKeys?.includes(o.key);
function buyIntent(p, o, label, className) {
    return button(label, 'purchase', p, { testid: `iap.buy.${o.key}`, className, part: 'shop-buy',
        disabled: !canBuy(p, o),
        payload: () => ({ offerKey: o.key, variantKey: o.variant.key,
            kind: o.kind, placement: o.placement }) });
}
function discount(p, o) {
    const value = offerText(p, o.ui, 'discount');
    return value ? h('span', { class: 'iap-discount', 'data-part': 'offer-discount' }, value) : null;
}
function packCard(p, o) {
    const badge = offerText(p, o.ui, 'badge');
    return h('div', { class: 'iap-pack', 'data-offer-key': o.key,
        ...(badge ? { 'data-highlight': '' } : {}) }, badge ? h('span', { class: 'iap-pack__badge' }, badge) : null, discount(p, o), offerArt(p, o, 32), ...windowSlots(p, 'shopWindow', { rewards: offerRewardGrid(p, o.variant.entities) }), buyIntent(p, o, offerPrice(p, o), 'iap-buy'));
}
function offerRow(p, o) {
    const left = offerCountdown(o.endsAt, p.now, p.lang, p.l10n);
    const title = offerText(p, o.ui, 'title') ?? o.name;
    const label = text(p, 'kit.iap-windows.buy-for', { title: title, offerPricepo: offerPrice(p, o) });
    return h('div', { class: 'iap-row', 'data-offer-key': o.key }, discount(p, o), h('div', { class: 'iap-row__head' }, h('div', { class: 'iap-row__icon', 'aria-hidden': 'true' }, offerArt(p, o, 24) ?? entityIcon(p, o.variant.entities[0] ?? { id: 'gift' }, 24)), h('div', { class: 'iap-row__text' }, h('div', { class: 'iap-row__title' }, h('span', {}, title), left ? h('span', { class: 'iap-timer-chip', 'data-part': 'offer-timer',
        'aria-label': text(p, 'kit.iap-windows.offer-ends-in', { left: left }) }, left) : null), offerText(p, o.ui, 'subtitle', 'description') ?? o.description
        ? h('div', { class: 'iap-row__sub' }, offerText(p, o.ui, 'subtitle', 'description') ?? o.description) : null)), ...windowSlots(p, 'shopWindow', { rewards: offerRewardGrid(p, o.variant.entities) }), button(offerPrice(p, o), 'purchase', p, { testid: `iap.buy.${o.key}`, className: 'iap-buy',
        part: 'shop-buy', disabled: !canBuy(p, o),
        payload: () => ({ offerKey: o.key, variantKey: o.variant.key,
            kind: o.kind, placement: o.placement }) }), h('span', { class: 'mp-sr-only' }, label));
}
function freeCard(p, o) {
    const name = offerText(p, o.ui, 'name');
    const unit = offerText(p, o.ui, 'unit');
    return h('div', { class: 'iap-pack', 'data-offer-key': o.key }, name ? h('span', { class: 'iap-free-name', 'data-part': 'offer-name' }, name) : null, offerArt(p, o, 32), ...windowSlots(p, 'shopWindow', { rewards: offerRewardGrid(p, unit
            ? o.variant.entities.map(item => ({ ...item, name: item.name ?? unit }))
            : o.variant.entities) }), buyIntent(p, o, offerText(p, o.ui, 'cta') ?? offerPrice(p, o), 'iap-buy'));
}
const section = (p, placement, part, ...children) => h('div', {
    class: 'iap-section', 'data-part': `shop-${part}`, 'data-placement': placement,
}, h('h4', {}, sectionTitle(p, placement)), ...children);
function specialOffers(p, offers) {
    if (!offers.length)
        return null;
    const slider = offers.length > 1;
    const cards = offers.map((o, i) => h('div', { class: 'iap-slide', role: 'group',
        'aria-label': slider ? text(p, 'kit.iap-windows.slide', { i1: i + 1 }) : o.name,
        'data-offer-key': o.key }, assetImage(p, uiText(o.ui, 'banner'), { 'data-part': 'offer-banner' }), offerText(p, o.ui, 'badge') ? h('span', { class: 'iap-pack__badge' }, offerText(p, o.ui, 'badge')) : null, discount(p, o), h('div', { class: 'iap-row__title' }, h('span', {}, offerText(p, o.ui, 'title') ?? o.name), offerCountdown(o.endsAt, p.now, p.lang, p.l10n) ? h('span', { class: 'iap-timer-chip',
        'data-part': 'offer-timer' }, p.countdownLabel
        ? h('span', { class: 'iap-timer-prefix' }, p.countdownLabel) : null, offerCountdown(o.endsAt, p.now, p.lang, p.l10n)) : null), offerText(p, o.ui, 'subtitle', 'description') ?? o.description
        ? h('div', { class: 'iap-row__sub' }, offerText(p, o.ui, 'subtitle', 'description') ?? o.description) : null, offerArt(p, o, 56), ...windowSlots(p, 'shopWindow', { rewards: offerRewardGrid(p, o.variant.entities) }), buyIntent(p, o, offerPrice(p, o), 'iap-buy')));
    return section(p, 'shop_special', 'featured', slider ? h('div', { class: 'iap-slides', role: 'group',
        'aria-label': sectionTitle(p, 'shop_special'), tabindex: 0 }, ...cards) : cards[0], ...(slider ? [h('ul', { class: 'iap-dots', 'aria-hidden': 'true' }, ...offers.map((_, i) => h('li', { ...(i === 0 ? { 'aria-current': 'true' } : {}) })))] : []));
}
export const shopWindowView = (p) => {
    const groups = {
        shop_special: [], shop_soft: [], shop_hard: [],
        shop_bundles: [], shop_ads: [], shop_other: []
    };
    const live = p.offers.filter(o => available(o, p.now) && shopSection(o)).slice(0, 100);
    for (const offer of live)
        groups[shopSection(offer)].push(offer);
    const empty = live.length === 0;
    const failed = p.error;
    const packs = (placement) => groups[placement].length
        ? section(p, placement, 'packs', h('div', { class: 'iap-packs' }, ...groups[placement].map(o => packCard(p, o)))) : null;
    const deals = [specialOffers(p, groups.shop_special), packs('shop_soft'), packs('shop_hard'),
        groups.shop_bundles.length ? section(p, 'shop_bundles', 'offers', ...groups.shop_bundles.map(o => offerRow(p, o))) : null,
        groups.shop_ads.length ? section(p, 'shop_ads', 'free', h('div', { class: 'iap-free' }, ...groups.shop_ads.map(o => freeCard(p, o)))) : null,
        groups.shop_other.length ? section(p, 'shop_other', 'remove-ads-group', ...groups.shop_other.map(o => offerRow(p, o))) : null];
    return h('section', { 'data-testid': 'iap.shop-window' }, windowDialog({ ...p, busy: false }, { template: 'shopWindow', title: p.title ?? text(p, 'kit.iap-windows.shop'), subtitle: p.subtitle }, () => p.emitIntent('close-shop'), failed ? errorAlert({ ...p, elementId: 'iap.error' }, { code: failed.code, kind: 'iap', l10n: p.l10n,
        retry: failed.retry ? { intent: 'retry', payload: { code: failed.code } } : undefined })
        : null, h('div', { class: 'iap-shop', 'data-layout': p.layout === 'landscape' ? 'landscape' : 'auto',
        ...(failed ? { 'aria-disabled': 'true', 'data-state': 'error' } : {}) }, ...windowSlots(p, 'shopWindow', { balance: p.currencies?.length ? h('ul', { class: 'iap-chips iap-balance', 'data-part': 'shop-balance',
            'aria-label': text(p, 'kit.iap-windows.balance') }, ...p.currencies.slice(0, 20).map(c => h('li', {}, `${c.name}: ${new Intl.NumberFormat(p.lang).format(c.quantity)}`))) : null,
        deals: deals.some(Boolean) ? h('div', { class: 'iap-deals', 'data-part': 'shop-deals' }, ...deals)
            : null,
        restore: button(text(p, 'kit.iap-windows.restore-purchases'), 'restore', p, { testid: 'iap.restore', ghost: true, disabled: !p.ready || p.busy || Boolean(failed) }),
        empty: empty ? h('p', { class: 'iap-empty', role: 'status' }, text(p, 'kit.iap-windows.no-offers-available-yet')) : null })), purchaseProcessing(p), outcome(p, p.purchase, 'iap.purchase')));
};
export const shopWindow = component(shopWindowView, { presentation: 'fullscreen', popupKind: 'content',
    styles: '.iap-slide>[data-part=offer-banner]{display:block;width:100%;height:auto;object-fit:contain}' });
const label = (p, pair) => text(p, pair);
const KIND = { free: 'kit.iap-windows.kind-free', ad: 'kit.iap-windows.kind-ad', purchase: 'kit.iap-windows.kind-purchase' };
const STATE = { done: 'kit.iap-windows.state-claimed', current: 'kit.iap-windows.state-now',
    locked: 'kit.iap-windows.state-locked' };
export const offerChainView = (p) => {
    const done = p.steps.filter(s => s.state === 'done').length;
    const left = offerCountdown(p.endsAt, p.now);
    return h('section', { 'data-testid': 'iap.offer-chain' }, dialog(p, p.title, () => p.emitIntent('close-chain'), h('div', { class: 'iap-chain' }, h('div', { class: 'iap-chain__bar' }, h('progress', { max: Math.max(1, p.steps.length), value: done,
        'aria-label': text(p, 'kit.iap-windows.steps-completed') }), h('strong', {}, `${done} / ${p.steps.length}`), left ? h('span', { class: 'iap-timer-chip', 'data-part': 'offer-timer' }, left) : null), h('ol', { class: 'iap-chain__steps' }, ...p.steps.slice(0, 100).map(step => h('li', { class: 'iap-step', 'data-state': step.state, 'data-step': step.id }, h('span', { class: 'iap-step__kind' }, label(p, KIND[step.kind])), step.badge ? h('span', { class: 'iap-pack__badge iap-pack__badge--inline' }, step.badge) : null, entityIcon(p, step.reward, 40), h('span', { class: 'iap-step__reward' }, step.reward.label
        ?? new Intl.NumberFormat(p.lang).format(step.reward.amount)), step.state === 'current'
        ? button(step.kind === 'purchase' && step.priceText ? step.priceText
            : text(p, 'kit.iap-windows.claim'), 'chain-claim', p, { testid: `iap.chain.${step.id}`,
            className: 'iap-buy', disabled: p.busy || !p.ready,
            payload: () => ({ stepId: step.id, kind: step.kind }) })
        : h('span', { class: 'iap-step__state' }, label(p, STATE[step.state]))))), p.final ? h('div', { class: 'iap-chain__final', 'data-part': 'chain-final',
        role: 'group', 'aria-label': text(p, 'kit.iap-windows.final-chest') }, entityIcon(p, p.final, 40), h('span', { class: 'iap-grow' }, text(p, 'kit.iap-windows.final-chest')), h('strong', {}, p.final.label
        ?? new Intl.NumberFormat(p.lang).format(p.final.amount))) : null, h('p', { class: 'iap-chain__hint' }, text(p, 'kit.iap-windows.rewards-unlock-in-order')))));
};
export const offerChain = component(offerChainView, { presentation: 'fullscreen', popupKind: 'content' });
nameComponents({ shopWindow, offerChain });

import { rewardGrid } from '../features/reward-grid.js';
import { icon as registryIcon } from '../icon.js';
import { nameComponents } from '../core.js';
import { component, h, text, dialog, assetImage, windowDialog, windowSlots } from '../features/shared.js';
import { standardActions } from './error.js';
import { partySlotsView } from './game-widgets.js';
function headerArt(p, header) {
    const stars = header.stars !== undefined && Number.isFinite(header.stars)
        ? Math.max(0, Math.min(3, Math.floor(header.stars))) : undefined;
    const art = stars !== undefined
        ? h('div', { class: 'level-stars', role: 'img',
            'aria-label': `${text(p, 'kit.popup.stars')}: ${stars}` }, ...Array.from({ length: stars }, () => registryIcon('rating-star', 56)))
        : header.icon ? registryIcon(header.icon, 72)
            : assetImage(p, header.imageKey, { alt: header.alt ?? '', loading: 'lazy' });
    const party = header.party ? partySlotsView(p, header.party) : null;
    return art || party ? h('div', { class: 'std-art', 'data-part': 'header' }, art, party) : null;
}
function block(p, item, index) {
    switch (item.kind) {
        case 'text': return h('p', { class: item.muted ? 'hint' : 'std-text' }, item.text);
        case 'image': return assetImage(p, item.key, { alt: item.alt ?? '', loading: 'lazy' });
        case 'list': return h('ul', { class: 'std-list' }, ...item.items.slice(0, 20)
            .map((entry) => listItem(p, entry)));
        case 'rewards': return h('div', { class: 'window-rewards', 'data-testid': `${p.elementId}.rewards.${index}` }, item.label ? h('span', { class: 'hint' }, item.label) : null, ...windowSlots(p, 'popup', { rewards: rewardGrid(p, item.items.slice(0, 50).map((entry, i) => ({
                id: `reward-${i}`, name: entry.name, amount: `+${entry.quantity}`, icon: entry.icon ?? 'coins',
            })), item.label ? { label: item.label } : {}) }));
    }
}
function listItem(p, entry) {
    if (typeof entry === 'string')
        return h('li', {}, entry);
    const icon = assetImage(p, entry.icon, { class: 'std-list-icon', 'data-part': 'list-icon',
        width: 24, height: 24, loading: 'lazy' });
    return icon ? h('li', { 'data-icon': '' }, icon, h('span', {}, entry.text))
        : h('li', {}, entry.text);
}
function eyebrow(p) {
    const art = assetImage(p, p.masthead, { alt: '' });
    if (!art && !p.issueLine)
        return null;
    return h('div', { class: 'std-eyebrow' }, art ? h('div', { class: 'std-masthead', 'data-part': 'masthead', 'aria-hidden': 'true' }, art)
        : null, p.issueLine ? h('p', { class: 'std-issue', 'data-part': 'issue-line' }, p.issueLine) : null);
}
export function popupView(p) {
    const closable = p.closable !== false;
    const body = windowSlots(p, 'popup', {
        header: p.header ? headerArt(p, p.header) : null,
        content: h('div', { class: 'std-content', 'data-part': 'content',
            'data-layout': p.layout === 'landscape' ? 'landscape' : 'auto' }, ...(p.content ?? []).slice(0, 12).map((item, index) => block(p, item, index))),
        actions: standardActions(p, p.actions ?? [], text(p, 'kit.popup.continue')),
    });
    if (p.footnote)
        body.push(h('p', { class: 'std-footnote', 'data-part': 'footnote' }, p.footnote));
    const head = { template: 'popup', title: p.title, eyebrow: eyebrow(p), closable };
    const root = windowDialog(p, head, () => p.emitIntent('close'), ...body);
    return p.variant === undefined ? root
        : { ...root, attrs: { ...root.attrs, 'data-popup-variant': p.variant } };
}
export const popup = component(popupView, { presentation: 'fullscreen' });
export function confirmView(p) {
    const art = p.icon ? registryIcon(p.icon, 40)
        : p.imageKey ? assetImage(p, p.imageKey, { alt: '', loading: 'lazy' }) : null;
    const item = h('div', { class: 'cf-item', 'data-part': 'subject' }, art ? h('span', { class: 'cf-tile', 'data-part': 'icon' }, art) : null, h('div', { class: 'cf-copy' }, h('strong', { class: 'cf-name' }, p.subject), p.free ? h('span', { class: 'cf-free', 'data-part': 'free' }, text(p, 'kit.popup.free')) : null, p.details ? h('span', { class: 'cf-details', 'data-part': 'details' }, p.details) : null), p.price && !p.free ? h('span', { class: 'cf-price', 'data-part': 'price' }, p.price) : null);
    const actions = standardActions({ ...p, emitIntent: (intent, payload) => {
            if (intent === 'action')
                p.emitIntent(payload?.['id'] === 'confirm' ? 'confirm' : 'close');
            else
                p.emitIntent(intent, payload);
        } }, [
        { id: 'confirm', label: p.confirmLabel ?? (p.free ? text(p, 'kit.popup.claim') : text(p, 'kit.popup.confirm')) },
        { id: 'close', label: p.cancelLabel ?? text(p, 'kit.popup.cancel'), variant: 'secondary' }
    ], text(p, 'kit.popup.cancel'));
    const title = p.title ?? (p.free ? text(p, 'kit.popup.claim-for-free')
        : text(p, 'kit.popup.confirmation'));
    return dialog(p, title, () => p.emitIntent('close'), item, actions);
}
export const confirm = component(confirmView, { presentation: 'fullscreen' });
nameComponents({ popup, confirm });

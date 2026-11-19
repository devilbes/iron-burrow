import { offerArt, itemArt } from './offer-art.js';
import { icon } from '../icon.js';
import { nameComponents } from '../core.js';
import { component, h, text, button, dialog } from '../features/shared.js';
export const adPlayer = component((p) => dialog(p, text(p, 'kit.media.test-advertisement'), () => { if (p.closable)
    p.emitIntent('close'); }, h('div', { class: 'hero' }, h('div', { class: 'icon', 'aria-hidden': 'true' }, icon('video')), h('h3', {}, text(p, 'kit.media.your-next-adventure-awaits')), h('p', { role: 'status', 'data-testid': 'fake-ad-timer' }, p.remaining > 0
    ? `${p.remaining} ${text(p, 'kit.media.s')}` : p.rewarded
    ? text(p, 'kit.media.video-completed') : text(p, 'kit.media.ready-to-continue'))), button(text(p, 'kit.media.close'), 'close', p, { disabled: !p.closable, testid: 'fake-ad-close' })), { presentation: 'fullscreen' });
export const paymentView = (p) => dialog(p, text(p, 'kit.media.test-payment'), () => p.emitIntent('cancel'), h('div', { class: 'hero' }, h('div', { class: 'icon', 'aria-hidden': 'true' }, (p.offer ? offerArt(p, p.offer, 72)
    ?? (p.offer.variant.entities[0] ? itemArt(p, p.offer.variant.entities[0], 72) : null) : null)
    ?? icon('currency', 72, { scope: p.skinScope })), h('h3', {}, p.title), h('p', { class: 'balance' }, p.priceText)), h('div', { class: 'row' }, button(text(p, 'kit.media.pay'), 'success', p, { testid: 'fake-store-success' }), button(text(p, 'kit.media.cancel'), 'cancel', p, { ghost: true, testid: 'fake-store-cancel' })));
export const payment = component(paymentView, { presentation: 'fullscreen' });
export const banner = component((p) => h('aside', {
    class: `card hero banner-${p.position}`, 'data-part': 'banner', 'aria-label': text(p, 'kit.media.advertisement'),
}, h('span', { class: 'badge' }, text(p, 'kit.media.advertisement')), ' · ManyPlay'));
nameComponents({ adPlayer, payment, banner });

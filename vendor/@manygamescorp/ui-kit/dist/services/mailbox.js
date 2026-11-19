import { icon } from '../icon.js';
import { nameComponents } from '../core.js';
import { component, h, text, windowDialog, button } from '../features/shared.js';
export const mailboxView = (p) => windowDialog(p, {
    template: 'mailbox', title: text(p, 'kit.mailbox.mail'),
    actions: p.unread ? h('span', { class: 'mail-count', 'data-testid': 'mailbox.unread',
        'aria-live': 'polite' }, text(p, 'kit.mailbox.new', { unread: p.unread })) : null,
}, () => p.emitIntent('close'), h('div', { class: 'mail-body', 'data-testid': 'mailbox' }, h('div', { class: 'mail-side' }, !p.entries.length ? h('section', { class: 'mail-empty', role: 'status' }, icon('mail'), h('h4', {}, text(p, 'kit.mailbox.no-mail-yet')), h('p', {}, text(p, 'kit.mailbox.gifts-and-game-news-will-appear-here'))) : null, p.unread ? button(text(p, 'kit.mailbox.mark-all-read'), 'readAll', p, { ghost: true, testid: 'mailbox.readAll' }) : null), h('ul', { class: 'mail-list', 'aria-label': text(p, 'kit.mailbox.messages') }, ...p.entries.slice(0, 50).map(e => h('li', { class: 'mail-entry', 'data-testid': 'mailbox.entry',
    'data-state': e.read ? 'read' : 'unread' }, h('span', { class: 'mail-icon', 'aria-hidden': 'true' }, icon(e.kind === 'gift' ? 'gift' : 'mail')), h('div', { class: 'mail-copy' }, h('strong', {}, e.title ?? (e.kind === 'gift'
    ? text(p, 'kit.mailbox.gift-received') : text(p, 'kit.mailbox.message'))), e.text ? h('p', {}, e.text) : null, h('time', { datetime: e.at }, e.dateLabel ?? e.at)), e.read ? null : button(text(p, 'kit.mailbox.mark-read'), 'read', p, { payload: () => ({ id: e.id }), ghost: true, testid: `mailbox.read.${e.id}` }))))));
export const mailbox = component(mailboxView, { presentation: 'fullscreen', popupKind: 'content' });
nameComponents({ mailbox });

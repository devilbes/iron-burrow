import { icon } from '../icon.js';
import { nameComponents } from '../core.js';
import { component, h, text, heading, button, details, record } from '../features/shared.js';
const eventNames = {
    'inventory.balance.changed': 'kit.realtime.eventnames-backpack-updated',
    'iap.order.granted': 'kit.realtime.eventnames-purchase-delivered',
    'configs.scope.published': 'kit.realtime.eventnames-new-game-settings',
};
export const realtime = component((p) => h('section', { 'data-testid': 'realtime' }, heading(p, text(p, 'kit.realtime.live-feed'), text(p, 'kit.realtime.open-two-tabs-buy-an-item-in-one-and-receive-a-notification')), h('div', { class: 'card' }, h('p', { class: 'badge', role: 'status' }, icon(record(p.status)['state'] === 'open' ? 'connected' : 'connecting'), record(p.status)['state'] === 'open' ? text(p, 'kit.realtime.connected')
    : text(p, 'kit.realtime.connecting')), button(text(p, 'kit.realtime.reconnect'), 'reconnect', p, { disabled: !p.ready, ghost: true })), h('div', { class: 'card', 'aria-live': 'polite' }, h('h3', {}, text(p, 'kit.realtime.notifications')), ...p.messages.slice(0, 50).map((m) => h('p', {}, icon('bell'), eventNames[m.type]
    ? text(p, eventNames[m.type]) : text(p, 'kit.realtime.new-event'))), p.messages.length ? null : h('p', { class: 'hint' }, text(p, 'kit.realtime.your-game-events-will-appear-here'))), p.error ? h('p', { class: 'error', role: 'alert' }, text(p, 'kit.realtime.connection-interrupted-please-reconnect')) : null, details(p, { status: p.status, metrics: p.metrics, messages: p.messages }, 'realtime.details')));
nameComponents({ realtime });

import { h, text, button, outcome } from './shared.js';
export const readNotice = (p) => p.error
    ? h('div', { class: 'stack', 'data-part': 'progress-read-error' }, outcome(p, { error: p.error }, p.elementId), button(text(p, 'kit.progress-status.retry'), 'refresh', p))
    : p.loading ? h('p', { class: 'hint', role: 'status', 'data-part': 'progress-loading' }, text(p, 'kit.progress-status.loading')) : null;

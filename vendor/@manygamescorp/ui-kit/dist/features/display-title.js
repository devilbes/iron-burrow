import { view as h } from '../core.js';
const WIDTH = 320;
function safeId(value) {
    return `kdt-${value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64)}`;
}
export function displayTitleView(text, options = {}) {
    const arc = Number.isFinite(options.arc) ? Math.max(0, Math.min(48, options.arc)) : 0;
    if (arc === 0) {
        return h('span', { class: 'kit-display-title', 'data-part': 'display-title' }, h('span', { class: 'kdt-back', 'aria-hidden': 'true' }, text), h('span', { class: 'kdt-face' }, text));
    }
    const id = safeId(options.idBase ?? 'title');
    const base = 40 + arc;
    return h('span', { class: 'kit-display-title', 'data-part': 'display-title', 'data-arc': arc }, h('svg', { class: 'kdt-arc', viewBox: `0 0 ${WIDTH} ${base + 12}`, role: 'img',
        'aria-label': text, focusable: 'false' }, h('defs', {}, h('linearGradient', { id: `${id}-fill`, x1: 0, y1: 0, x2: 0, y2: 1 }, h('stop', { offset: 0, class: 'kdt-top' }), h('stop', { offset: 1, class: 'kdt-bottom' })), h('path', { id: `${id}-path`, d: `M 8 ${base} Q ${WIDTH / 2} ${base - arc * 2} ${WIDTH - 8} ${base}` })), h('text', { 'text-anchor': 'middle', fill: `url(#${id}-fill)`, 'aria-hidden': 'true' }, h('textPath', { href: `#${id}-path`, startOffset: '50%' }, text))));
}

import { nameComponents } from '../core.js';
import { component, h, text, heading, details } from '../features/shared.js';
export const hub = component((p) => h('section', { 'data-testid': 'hub' }, heading(p, text(p, 'kit.hub.demo-platform-showcase'), text(p, 'kit.hub.every-mechanic-is-a-live-screen-on-service-data-studio-edits')), ...p.sections.slice(0, 20).map((section) => h('div', { class: 'card', 'data-testid': `hub.${section.id}` }, h('h3', {}, section.title), ...section.items.slice(0, 20).map((item) => h('div', { 'data-testid': `hub.item.${item.id}` }, h('p', {}, h('strong', {}, item.title), ' ', item.available ? null
    : h('span', { class: 'badge' }, text(p, 'kit.hub.not-connected'))), h('p', { class: 'hint' }, item.hint), h('button', { type: 'button', 'data-variant': 'ghost', disabled: !item.available,
    'data-testid': `hub.open.${item.id}`,
    onClick: () => { if (item.available)
        p.emitIntent('open', { id: item.id }); } }, text(p, 'kit.hub.open')))))), details(p, p.debug, 'hub.details')));
nameComponents({ hub });

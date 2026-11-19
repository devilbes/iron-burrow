import { nameComponents } from '../core.js';
import { component, h, text, heading, button, details, outcome } from '../features/shared.js';
export const inspector = component((p) => h('section', {
    'data-testid': p.elementId.split('.')[1],
}, heading(p, p.title, p.hint), h('p', { class: 'badge', role: 'status' }, p.result?.value
    ? text(p, 'kit.inspector.check-complete') : text(p, 'kit.inspector.ready-to-check')), h('details', {}, h('summary', {}, text(p, 'kit.inspector.details')), ...Object.entries(p.fields).map(([key, initial]) => {
    p.drafts[key] ??= initial;
    return h('label', {}, key, h('textarea', { value: p.drafts[key],
        'data-testid': `${p.elementId.split('.')[1]}.${key}`, onInput: (e) => {
            p.drafts[key] = e.target.value;
        } }));
}), h('div', { class: 'row' }, ...p.calls.map((call) => button(call, call, p, { disabled: !p.ready || p.busy })))), outcome(p, p.result, `${p.elementId}.result`), details(p, p.result)));
export const diagnostics = component((p) => h('section', { 'data-testid': 'debug' }, heading(p, text(p, 'kit.inspector.game-status'), text(p, 'kit.inspector.connected-platform-features')), h('div', { class: 'grid' }, ...p.modules.slice(0, 100).map(([name, status]) => h('article', { class: 'card' }, h('h3', {}, name), h('p', { class: 'hint' }, status)))), h('div', { class: 'row' }, button(text(p, 'kit.inspector.refresh-context'), 'context', p)), outcome(p, p.context, 'debug.context'), details(p, { facts: p.facts, context: p.context, platform: p.platformJson, source: p.source,
    events: p.events.slice(0, 60) }, 'debug.details')));
nameComponents({ inspector, diagnostics });

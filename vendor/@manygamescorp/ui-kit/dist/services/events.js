import { nameComponents } from '../core.js';
import { component, h, text, heading, button, details, outcome } from '../features/shared.js';
const TRUST = {
    client: 'kit.events.trust-client', server: 'kit.events.trust-server',
    verified: 'kit.events.trust-verified',
};
const STATUS = {
    sent: 'kit.events.status-sent', duplicate: 'kit.events.status-duplicate', failed: 'kit.events.status-failed',
};
export const gameEvents = component((p, d, ctx) => {
    const selected = p.events.find((item) => item.key === d['evt.selected']) ?? p.events[0];
    const off = !p.ready || p.busy;
    const time = (at) => new Date(at).toLocaleTimeString(p.lang);
    const pick = (table, key) => {
        const pair = table[key] ?? Object.values(table)[0];
        return text(p, pair);
    };
    return h('section', { 'data-testid': 'events' }, heading(p, text(p, 'kit.events.game-events'), text(p, 'kit.events.the-app-event-registry-pick-an-event-fill-the-fields-by-its')), h('div', { class: 'grid' }, ...p.events.map((item) => h('article', { class: 'card',
        'data-testid': `events.item.${item.key}` }, h('h3', {}, item.title), h('p', { class: 'hint' }, item.description || item.type), h('p', { class: 'badge' }, pick(TRUST, item.trust)), button(text(p, 'kit.events.select'), 'select', p, { ghost: true, disabled: p.busy,
        testid: `events.select.${item.key}`, click: () => {
            d['evt.selected'] = item.key;
            ctx.refresh();
        } })))), p.events.length ? null : h('p', { class: 'hint', 'data-testid': 'events.empty' }, text(p, 'kit.events.the-registry-is-empty-add-events-in-studio-configs-game-even')), selected ? h('div', { class: 'card', 'data-testid': 'events.form' }, h('h3', {}, selected.title), ...selected.fields.map((item) => {
        const key = `evt.f.${selected.key}.${item.name}`;
        const set = (value) => { d[key] = value; };
        d[key] ??= item.kind === 'boolean' ? 'false' : '';
        return h('label', {}, item.name, item.kind === 'boolean'
            ? h('select', { value: d[key], disabled: off, 'data-testid': key,
                onChange: (e) => set(e.target.value) }, h('option', { value: 'false' }, text(p, 'kit.events.no')), h('option', { value: 'true' }, text(p, 'kit.events.yes')))
            : h('input', { value: d[key], maxlength: 64, disabled: off, 'data-testid': key,
                inputmode: item.kind === 'integer' ? 'numeric' : 'text',
                placeholder: item.kind === 'integer' ? `${item.min}…${item.max}` : '',
                onInput: (e) => set(e.target.value) }));
    }), p.invalid ? h('p', { class: 'error', role: 'alert', 'data-testid': 'events.invalid' }, text(p, 'kit.events.check-the-field', { invalid: p.invalid })) : null, button(text(p, 'kit.events.send-event'), 'send', p, { disabled: off,
        click: () => p.emitIntent('send', { key: selected.key, drafts: Object.fromEntries(selected.fields.map((item) => [item.name, d[`evt.f.${selected.key}.${item.name}`] ?? ''])) }) }))
        : null, outcome(p, p.result, 'events.result'), h('div', { class: 'card', 'aria-live': 'polite', 'data-testid': 'events.journal' }, h('h3', {}, text(p, 'kit.events.send-journal')), ...p.journal.slice(0, 30).map((item) => h('p', {}, `${time(item.at)} · ${item.type} · `, pick(STATUS, item.status))), p.journal.length ? null : h('p', { class: 'hint' }, text(p, 'kit.events.sent-events-will-appear-here'))), details(p, p.debug ?? { events: p.events, journal: p.journal }, 'events.details'));
});
nameComponents({ gameEvents });

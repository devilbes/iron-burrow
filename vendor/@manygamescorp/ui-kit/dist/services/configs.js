import { nameComponents } from '../core.js';
import { component, h, text, heading, button, details, outcome, record } from '../features/shared.js';
function language(p, testid) {
    return h('select', { value: p.locale, 'data-testid': testid,
        onChange: (e) => p.emitIntent('locale', { tag: e.target.value }) }, ...p.locales.slice(0, 100).map((l) => h('option', { value: l.tag }, l.name)));
}
export const configs = component((p, d, ctx) => h('section', { 'data-testid': 'configs' }, heading(p, text(p, 'kit.configs.your-game-world'), text(p, 'kit.configs.settings-selected-for-you-by-the-server')), h('div', { class: 'card' }, h('h3', {}, text(p, 'kit.configs.adventure-language')), h('label', {}, text(p, 'kit.configs.language'), language(p, 'configs.locale')), h('p', { 'data-testid': 'configs.hello' }, p.hello), h('label', {}, text(p, 'kit.configs.item-count'), h('input', { type: 'range', min: 0,
    max: 30, value: d['count'] ?? '1', 'data-testid': 'configs.count', onInput: (e) => {
        d['count'] = e.target.value;
        ctx.refresh();
    } })), h('p', { 'data-testid': 'configs.plural' }, p.items(Number(d['count'] ?? '1')))), h('div', { class: 'grid' }, ...Object.entries(record(p.snapshot)).slice(0, 30).map(([scope, values]) => h('article', { class: 'card' }, h('h3', {}, scope), h('p', { class: 'badge' }, `${Object.keys(record(values)).length} ${text(p, 'kit.configs.settings')}`), ...Object.entries(record(values)).slice(0, 4).map(([key, value]) => h('p', {}, key, ': ', typeof value === 'string' || typeof value === 'number'
    || typeof value === 'boolean' ? String(value) : text(p, 'kit.configs.rule-set')))))), h('div', { class: 'card' }, h('h3', {}, text(p, 'kit.configs.a-b-experiments')), ...(p.experiments?.slice(0, 20).map((e) => h('p', { class: 'badge' }, `${e.name} · ${e.group}`))
    ?? [h('p', { class: 'hint' }, text(p, 'kit.configs.no-active-experiments'))])), button(text(p, 'kit.configs.refresh-settings'), 'refresh', p), outcome(p, p.last, 'configs'), details(p, { snapshot: p.snapshot, versions: p.versions,
    experiments: p.experiments, last: p.last }, 'configs.snapshot')));
export const languageSettings = component((p) => h('label', {}, text(p, 'kit.configs.language'), language(p, 'settings.locale')));
nameComponents({ configs, languageSettings });

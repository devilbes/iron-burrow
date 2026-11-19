import { nameComponents } from '../core.js';
import { component, h, text, button, details } from '../features/shared.js';
export function parseKvValue(type, value) {
    if (value.length > 16_384)
        throw new TypeError('VALUE_TOO_LARGE');
    if (type === 'string')
        return value;
    if (type === 'number') {
        if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value.trim())) {
            throw new TypeError('NUMBER_INVALID');
        }
        const number = Number(value);
        if (!Number.isFinite(number))
            throw new TypeError('NUMBER_INVALID');
        return number;
    }
    if (type === 'boolean' && (value === 'true' || value === 'false'))
        return value === 'true';
    if (type === 'object') {
        const parsed = JSON.parse(value);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
            throw new TypeError('OBJECT_INVALID');
        return parsed;
    }
    throw new TypeError('TYPE_INVALID');
}
export function kvView(p, d, ctx) {
    d['kv.type'] ??= 'string';
    d['kv.key'] ??= 'travel_note';
    d['kv.value'] ??= '';
    const off = !p.ready || p.busy;
    const emit = () => {
        try {
            const key = d['kv.key'] ?? '';
            if (!/^[A-Za-z0-9:_-]{1,128}$/.test(key) || ['__proto__', 'constructor', 'prototype'].includes(key)) {
                throw new TypeError('KEY_INVALID');
            }
            const value = parseKvValue(d['kv.type'], d['kv.value']);
            delete d['kv.error'];
            p.emitIntent('kv.set', { key, value });
        }
        catch {
            d['kv.error'] = text(p, 'kit.kv.check-the-key-and-value-enter-a-number-yes-no-or-a-json-obje');
        }
        ctx.refresh();
    };
    const display = (value) => typeof value === 'string' ? value : JSON.stringify(value);
    return h('div', { class: 'card', 'data-testid': 'kv' }, h('h3', {}, text(p, 'kit.kv.player-key-value-data')), h('p', { class: 'hint' }, text(p, 'kit.kv.keep-settings-and-small-notes-in-the-cloud')), h('label', {}, text(p, 'kit.kv.key'), h('input', { value: d['kv.key'], maxlength: 128,
        disabled: off, 'data-testid': 'kv.key', onInput: (e) => { d['kv.key'] = e.target.value; } })), h('label', {}, text(p, 'kit.kv.value-type'), h('select', { value: d['kv.type'], disabled: off,
        'data-testid': 'kv.type', onChange: (e) => {
            d['kv.type'] = e.target.value;
            d['kv.value'] = d['kv.type'] === 'boolean' ? 'true' : '';
            delete d['kv.error'];
            ctx.refresh();
        } }, ...['string', 'number', 'boolean', 'object'].map((type, i) => h('option', { value: type }, text(p, `kit.kv.type-${i}`))))), h('label', {}, text(p, 'kit.kv.value'), d['kv.type'] === 'boolean'
        ? h('select', { value: d['kv.value'], disabled: off, 'data-testid': 'kv.value',
            onChange: (e) => { d['kv.value'] = e.target.value; } }, h('option', { value: 'true' }, text(p, 'kit.kv.yes')), h('option', { value: 'false' }, text(p, 'kit.kv.no')))
        : h('textarea', { value: d['kv.value'], maxlength: 16384, rows: 3, disabled: off,
            'data-testid': 'kv.value', onInput: (e) => { d['kv.value'] = e.target.value; } })), h('div', { class: 'row' }, button(text(p, 'kit.kv.save'), 'kv.set', p, { disabled: off, click: emit, testid: 'kv.set' }), button(text(p, 'kit.kv.refresh-keys'), 'kv.list', p, { disabled: off, ghost: true })), d['kv.error'] || p.error ? h('p', { class: 'error', role: 'alert' }, d['kv.error'] ??
        text(p, 'kit.kv.could-not-update-data-try-again')) : null, h('ul', { class: 'kv-list' }, ...Object.entries(p.entries ?? {}).slice(0, 100).map(([key, value]) => h('li', { class: 'row' }, h('strong', {}, key), h('span', { class: 'kv-value' }, display(value)?.slice(0, 300)), button(text(p, 'kit.kv.delete'), 'kv.delete', p, { disabled: off, ghost: true,
        testid: `kv.delete.${key}`, payload: () => ({ key }) })))), Object.keys(p.entries ?? {}).length ? null : h('p', { class: 'hint' }, text(p, 'kit.kv.no-keys-yet-add-your-first')), details(p, p.entries, 'data.kv'));
}
export const kv = component((p, d, ctx) => h('section', { 'aria-label': text(p, 'kit.kv.player-key-value-data') }, kvView(p, d, ctx)));
nameComponents({ kv });

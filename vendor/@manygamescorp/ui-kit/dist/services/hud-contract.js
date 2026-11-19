export const HUD_SLOTS = Object.freeze(['left', 'right']);
export const HUD_BADGE_KINDS = Object.freeze(['dot', 'count']);
export const HUD_CAPABILITY = 'hud.registry@1';
export const HUD_CONFIG_SCOPE = 'ui.hud';
export const HUD_CONFIG_KEY = 'layout';
export const HUD_MAX_ITEMS = 64;
export const HUD_ID = /^[a-z0-9][a-z0-9_.-]{0,63}$/;
export const HUD_ITEM_STATES = Object.freeze(['active', 'locked']);
const EMPTY_LAYOUT = Object.freeze({ items: new Map(), unlisted: 'show' });
const L10N_KEY = /^[a-z][a-zA-Z0-9_.-]{0,127}$/;
const LOCALE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;
const MAX_BADGE = 999_999;
const MAX_LABEL = 64;
function plain(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function onlyKeys(value, keys) {
    return Object.keys(value).every((key) => keys.includes(key));
}
export function hudModuleImage(value) {
    if (value.length > 2048)
        return false;
    try {
        const url = new URL(value);
        return ['https:', 'http:', 'file:'].includes(url.protocol) && !url.username && !url.password
            && !url.search && !url.hash && /\/sdk-modules\/[a-z][a-z0-9.-]*\/[a-z][a-zA-Z0-9]*-[0-9a-f]{12}\.(png|webp|jpg)$/.test(url.pathname);
    }
    catch {
        return false;
    }
}
const fail = (code) => ({ ok: false, code });
function readBadge(raw) {
    if (!plain(raw) || !onlyKeys(raw, ['kind', 'value']))
        return fail('TYPE');
    if (raw['kind'] === 'dot') {
        return raw['value'] === undefined ? { ok: true, value: Object.freeze({ kind: 'dot' }) } : fail('UNKNOWN');
    }
    if (raw['kind'] !== 'count')
        return fail('PATTERN');
    const value = raw['value'];
    if (typeof value !== 'number' || !Number.isInteger(value))
        return fail('TYPE');
    if (value < 1 || value > MAX_BADGE)
        return fail('RANGE');
    return { ok: true, value: Object.freeze({ kind: 'count', value }) };
}
function readLabel(raw) {
    if (!plain(raw))
        return fail('TYPE');
    if (Object.hasOwn(raw, 'key')) {
        if (!onlyKeys(raw, ['key']) || typeof raw['key'] !== 'string')
            return fail('TYPE');
        return L10N_KEY.test(raw['key']) ? { ok: true, value: Object.freeze({ key: raw['key'] }) }
            : fail('PATTERN');
    }
    const values = raw['values'];
    if (!onlyKeys(raw, ['values']) || !plain(values))
        return fail('TYPE');
    const entries = Object.entries(values);
    if (entries.length < 1 || entries.length > 32)
        return fail('RANGE');
    for (const [locale, text] of entries) {
        if (typeof text !== 'string')
            return fail('TYPE');
        if (!LOCALE.test(locale) || /[\u0000-\u001f\u007f]/.test(text))
            return fail('PATTERN');
        if (text.length < 1 || text.length > MAX_LABEL)
            return fail('RANGE');
    }
    const frozen = Object.freeze({ ...values });
    return { ok: true, value: Object.freeze({ values: frozen }) };
}
function readIcon(raw) {
    if (typeof raw !== 'string')
        return fail('TYPE');
    if (raw.length < 1)
        return fail('RANGE');
    return raw.length <= 32 || hudModuleImage(raw) ? { ok: true, value: raw } : fail('PATTERN');
}
const ENTRY_KEYS = ['slot', 'order', 'visible', 'filters', 'badge', 'label', 'icon'];
function readEntry(id, raw, issues) {
    const entry = {};
    let valid = true;
    const bad = (field, code) => {
        valid = false;
        issues.push({ path: `items.${id}.${field}`, code });
    };
    for (const key of Object.keys(raw))
        if (!ENTRY_KEYS.includes(key))
            bad(key.slice(0, 32), 'UNKNOWN');
    const { slot, order, visible, filters } = raw;
    if (slot !== undefined) {
        if (HUD_SLOTS.includes(slot))
            entry.slot = slot;
        else
            bad('slot', 'PATTERN');
    }
    if (order !== undefined) {
        if (typeof order !== 'number' || !Number.isFinite(order))
            bad('order', 'TYPE');
        else if (Math.abs(order) > 1_000_000)
            bad('order', 'RANGE');
        else
            entry.order = order;
    }
    if (visible !== undefined) {
        if (typeof visible === 'boolean')
            entry.visible = visible;
        else
            bad('visible', 'TYPE');
    }
    if (filters !== undefined)
        entry.filters = filters;
    const badge = raw['badge'] === undefined ? undefined : readBadge(raw['badge']);
    if (badge?.ok)
        entry.badge = badge.value;
    else if (badge)
        bad('badge', badge.code);
    const label = raw['label'] === undefined ? undefined : readLabel(raw['label']);
    if (label?.ok)
        entry.label = label.value;
    else if (label)
        bad('label', label.code);
    const icon = raw['icon'] === undefined ? undefined : readIcon(raw['icon']);
    if (icon?.ok)
        entry.icon = icon.value;
    else if (icon)
        bad('icon', icon.code);
    return valid ? Object.freeze(entry) : undefined;
}
export function parseHudLayout(raw, ignored) {
    const issues = [];
    const report = () => { for (const issue of issues)
        ignored?.(Object.freeze(issue)); };
    if (raw === undefined || raw === null)
        return EMPTY_LAYOUT;
    if (!plain(raw)) {
        issues.push({ path: '', code: 'TYPE' });
        report();
        return EMPTY_LAYOUT;
    }
    for (const key of Object.keys(raw)) {
        if (key !== 'items' && key !== 'unlisted')
            issues.push({ path: key.slice(0, 32), code: 'UNKNOWN' });
    }
    const items = new Map();
    const source = raw['items'];
    if (source !== undefined && !plain(source))
        issues.push({ path: 'items', code: 'TYPE' });
    else if (source !== undefined) {
        const ids = Object.keys(source);
        if (ids.length > HUD_MAX_ITEMS)
            issues.push({ path: 'items', code: 'RANGE' });
        for (const id of ids.slice(0, HUD_MAX_ITEMS)) {
            const entry = source[id];
            if (!HUD_ID.test(id)) {
                issues.push({ path: 'items', code: 'PATTERN' });
                continue;
            }
            if (!plain(entry)) {
                issues.push({ path: `items.${id}`, code: 'TYPE' });
                continue;
            }
            const read = readEntry(id, entry, issues);
            if (read)
                items.set(id, read);
        }
    }
    const unlisted = raw['unlisted'];
    if (unlisted !== undefined && unlisted !== 'show' && unlisted !== 'hide') {
        issues.push({ path: 'unlisted', code: 'PATTERN' });
    }
    report();
    return Object.freeze({ items, unlisted: unlisted === 'hide' ? 'hide' : 'show' });
}

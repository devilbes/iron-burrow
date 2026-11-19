/** E152 placement shared by UI Kit, Studio, builds and MCP. No DOM or SDK dependency. */
export const UI_ZONES = ['topbar', 'hud', 'bottomMenu', 'window'];
export const UI_CONTEXT = /^[a-z][a-z0-9-]{0,15}$/;
/** A window is always available explicitly, even when automatic presentation is off. */
export function uiZoneEnabled(settings, zone, contexts = ['main']) {
    if (zone === 'topbar')
        return contexts.some(context => context === 'main'
            ? settings.topbarMain !== false : context === 'core' ? settings.topbarCore !== false : true);
    return zone === 'window' || settings[zone] !== false;
}
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
/** Sorted by declared order, then module id, then slot id, independently of input order. */
export function planUiSlots(settings, modules) {
    return Object.freeze(modules.flatMap(module => (module.ui?.slots ?? []).map(slot => ({ module, slot })))
        .sort((a, b) => (a.slot.order ?? 0) - (b.slot.order ?? 0)
        || compare(a.module.id, b.module.id) || compare(a.slot.id, b.slot.id))
        .map(({ module, slot }) => {
        const primary = typeof slot.zone === 'string' ? slot.zone : module.settings?.[slot.zone.fromSetting];
        const zones = [primary, ...(slot.fallback ?? [])];
        const index = zones.findIndex(zone => UI_ZONES.includes(zone)
            && uiZoneEnabled(settings, zone, slot.contexts));
        return Object.freeze({ moduleId: module.id, slot: slot.id,
            zone: index < 0 ? null : zones[index],
            via: index < 0 ? 'none' : index === 0 ? 'primary' : 'fallback' });
    }));
}
const plain = (v) => typeof v === 'object' && v !== null
    && !Array.isArray(v) && [Object.prototype, null].includes(Object.getPrototypeOf(v));
const key = (v) => typeof v === 'string' && /^[a-z][a-zA-Z0-9-]{0,31}$/.test(v)
    && !['constructor', 'prototype', '__proto__'].includes(v);
const ref = (v) => plain(v) && Object.keys(v).length === 1 && key(v.fromSetting);
const zone = (v) => UI_ZONES.includes(v);
/** Strict manifest validation, including setting references, before publication or
 * runtime import. */
export function validateUiSlots(value, schema) {
    if (!plain(value) || Object.keys(value).some(k => k !== 'slots')
        || !Array.isArray(value.slots) || value.slots.length > 32)
        return ['ui.slots'];
    const fields = plain(schema) && Array.isArray(schema.fields) ? schema.fields : [];
    const reference = (v, type) => !ref(v)
        || fields.some(field => plain(field)
            && field.key === v.fromSetting && field.type === type
            && (type !== 'enum' || (Array.isArray(field.options) && field.options.every(option => plain(option) && zone(option.value)))));
    const seen = new Set();
    const errors = [];
    value.slots.forEach((s, i) => {
        const at = `ui.slots[${i}]`;
        if (!plain(s)) {
            errors.push(at);
            return;
        }
        if (Object.keys(s).some(k => !['id', 'zone', 'contexts', 'order', 'fallback', 'features', 'autoOpen', 'does'].includes(k)))
            errors.push(at);
        if (!key(s.id) || seen.has(s.id))
            errors.push(`${at}.id`);
        else
            seen.add(s.id);
        if ((!zone(s.zone) && !ref(s.zone)) || !reference(s.zone, 'enum'))
            errors.push(`${at}.zone`);
        if (s.contexts !== undefined && (!Array.isArray(s.contexts) || s.contexts.length < 1
            || s.contexts.length > 8
            || new Set(s.contexts).size !== s.contexts.length || s.contexts.some(c => typeof c !== 'string' || !UI_CONTEXT.test(c))))
            errors.push(`${at}.contexts`);
        if (s.order !== undefined && (!Number.isSafeInteger(s.order) || Math.abs(s.order) > 10000))
            errors.push(`${at}.order`);
        if (s.fallback !== undefined && (!Array.isArray(s.fallback) || s.fallback.length > 4
            || new Set(s.fallback).size !== s.fallback.length || !s.fallback.every(zone)))
            errors.push(`${at}.fallback`);
        if (s.features !== undefined && (!Array.isArray(s.features) || s.features.length > 3
            || new Set(s.features).size !== s.features.length || !s.features.every(f => ['badge', 'timer', 'value'].includes(f))))
            errors.push(`${at}.features`);
        if (s.autoOpen !== undefined && (typeof s.autoOpen !== 'boolean' && !ref(s.autoOpen)
            || !reference(s.autoOpen, 'boolean') || s.zone !== 'window'))
            errors.push(`${at}.autoOpen`);
        if (!plain(s.does) || Object.keys(s.does).some(k => !['ru', 'en'].includes(k))
            || !['ru', 'en'].every(k => typeof s.does[k] === 'string'
                && (s.does[k]?.length ?? 0) > 0
                && (s.does[k]?.length ?? 0) <= 280
                // eslint-disable-next-line no-control-regex -- Reject control characters.
                && !/[<>\u0000-\u001f]/.test(s.does[k])))
            errors.push(`${at}.does`);
    });
    return errors;
}
//# sourceMappingURL=ui-slots.js.map
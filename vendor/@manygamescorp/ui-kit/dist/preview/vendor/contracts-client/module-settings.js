import { EDITOR_TEXT } from './module-editor-text.js';
import { isAssetRef } from './asset-ref.js';
import { canonicalizeFilter, filterParameter, isValidFilter, matchFilter } from './filters.js';
import { factDefinition } from './facts.js';
import { resolve } from './resolve.js';
/** Resolve exact/parent locale, then explicit fallback/parents; missing text stays absent. */
export function resolveLocalizedText(text, locale, fallbackLocale) {
    for (const candidate of [locale, fallbackLocale]) {
        let tag = candidate;
        while (tag) {
            if (text && Object.hasOwn(text, tag))
                return text[tag];
            const separator = tag.lastIndexOf('-');
            tag = separator < 0 ? '' : tag.slice(0, separator);
        }
    }
    return undefined;
}
/** The one reference every module schema uses to get the shared availability block. */
export const AVAILABILITY_REF = Object.freeze({ ref: 'availability' });
const SHARED_BLOCKS = {
    availability: [
        { key: 'enabled', type: 'boolean', label: EDITOR_TEXT['availability.enabled.label'],
            help: EDITOR_TEXT['availability.enabled.help'], default: true },
        { key: 'availability', type: 'filter', label: EDITOR_TEXT['availability.availability.label'],
            help: EDITOR_TEXT['availability.availability.help'], default: {},
            overridable: false },
    ],
};
/** Schema with the shared availability block followed by the module's own fields. */
export function withAvailability(fields = []) {
    return { schemaVersion: 1, fields: [AVAILABILITY_REF, ...fields] };
}
/**
 * Replaces each `{ ref }` by the fields of the shared block. Anything else (an unknown id, a
 * reference with further keys) stays in place and fails the schema validation.
 */
export function expandModuleSettingsSchema(schema) {
    if (!plain(schema) || !Array.isArray(schema.fields))
        return schema;
    const fields = schema.fields.flatMap(entry => {
        if (!plain(entry) || !Object.hasOwn(entry, 'ref') || !only(entry, ['ref'])
            || typeof entry.ref !== 'string' || !Object.hasOwn(SHARED_BLOCKS, entry.ref))
            return [entry];
        return SHARED_BLOCKS[entry.ref].map(field => structuredClone(field));
    });
    return { ...schema, fields };
}
/** Whether the schema carries the shared availability block (after expansion). */
export function hasAvailability(schema) {
    const fields = expandModuleSettingsSchema(schema)?.fields;
    return Array.isArray(fields) && fields.some(f => plain(f) && f.key === 'availability' && f.type === 'filter')
        && fields.some(f => plain(f) && f.key === 'enabled' && f.type === 'boolean');
}
/**
 * Decision made before a module is activated: `enabled` is not false and the filter matches the
 * facts of the session. Schemas without the block always pass. `settings` are resolved values.
 */
export function moduleAvailable(schema, settings, facts, parameters) {
    if (!hasAvailability(schema))
        return true;
    return settings.enabled !== false && matchFilter(settings.availability ?? {}, facts, parameters);
}
const plain = (v) => typeof v === 'object' && v !== null
    && !Array.isArray(v) && [Object.prototype, null].includes(Object.getPrototypeOf(v));
const only = (v, keys) => Object.keys(v).every(k => keys.includes(k));
const safeKey = (k) => /^[a-z][a-zA-Z0-9]{0,31}$/.test(k)
    && !['constructor', 'prototype', '__proto__'].includes(k);
const LOCALE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;
/** Shared editor dictionary validation for settings and catalog metadata. */
export const validateLocalizedText = (v, max) => plain(v)
    && Object.keys(v).length >= 1 && Object.keys(v).length <= 32
    && Object.entries(v).every(([k, t]) => LOCALE.test(k) && typeof t === 'string' && t.length > 0
        // eslint-disable-next-line no-control-regex -- Reject forbidden control characters.
        && t.length <= max && !/[<>\u0000-\u001f\u007f]/.test(t));
const number = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const ENTITY = /^[a-z][a-z0-9_]{0,63}(:[A-Za-z0-9_-]{1,64})?$/;
const L10N_KEY = /^[a-z][a-zA-Z0-9_.-]{0,127}$/;
const MAX_NUMBER = 1e15;
const MAX_DURATION = 315360000;
const MAX_NODES = 64;
const MAX_DEPTH = 3;
/** Every type except image can be nested in a list or object. */
const nestable = (t) => typeof t === 'string' && t !== 'image' && t !== 'filter'
    && Object.hasOwn(attributes, t);
/** Flat patches of sdk.overrides carry boolean/integer/string/null only. */
const overridableTypes = ['boolean', 'enum', 'integer', 'string', 'color', 'duration',
    'schedule', 'entityRef'];
const attributes = {
    boolean: ['default'], enum: ['default', 'options'], integer: ['default', 'min', 'max', 'step'],
    string: ['default', 'maxLength', 'pattern'], color: ['default'], image: ['accept', 'maxBytes', 'size'],
    number: ['default', 'min', 'max'], duration: ['default', 'min', 'max'], schedule: ['default'],
    entityRef: ['default', 'entityType'], text: ['default', 'maxLength'],
    reward: ['default', 'maxItems', 'maxAmount', 'entityType'],
    list: ['default', 'item', 'minItems', 'maxItems'], object: ['default', 'fields'], filter: ['default'],
};
const CRON_RANGES = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 7]];
function cron(value) {
    const parts = value.split(' ');
    return parts.length === 5 && parts.every((part, i) => part.split(',').every(item => {
        const m = /^(\*|(\d{1,2})(?:-(\d{1,2}))?)(?:\/(\d{1,2}))?$/.exec(item);
        if (!m)
            return false;
        const [lo, hi] = CRON_RANGES[i];
        const a = m[2] === undefined ? undefined : Number(m[2]);
        const b = m[3] === undefined ? a : Number(m[3]);
        return (m[4] === undefined || Number(m[4]) >= 1)
            && (a === undefined || (a >= lo && a <= hi && b >= a && b <= hi));
    }));
}
const DATETIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(?:Z|([+-])(\d{2}):(\d{2}))$/;
/** Epoch milliseconds of a strict ISO 8601 datetime with an explicit offset, otherwise NaN. */
function datetime(value) {
    const m = DATETIME.exec(value);
    if (!m)
        return NaN;
    // Groups: year, month, day, hour, minute, second, offset sign (unused), offset h, offset min.
    const [y, mo, d, h, mi, s, , oh, om] = m.slice(1).map(x => (x === undefined ? 0 : Number(x)));
    const probe = new Date(Date.UTC(y, mo - 1, d));
    if (mo < 1 || mo > 12 || probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d
        || h > 23 || mi > 59 || s > 59 || oh > 23 || om > 59)
        return NaN;
    return Date.parse(value);
}
/** Cron (5 fields, UTC), an ISO datetime, or an ISO `start/end` window with start before end. */
function scheduleError(value) {
    if (value === null)
        return false;
    if (typeof value !== 'string' || value.length === 0 || value.length > 128)
        return true;
    if (cron(value))
        return false;
    const [first, second, ...rest] = value.split('/');
    if (rest.length)
        return true;
    if (second === undefined)
        return Number.isNaN(datetime(first));
    const a = datetime(first), b = datetime(second);
    return Number.isNaN(a) || Number.isNaN(b) || a >= b;
}
const integer = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
/** Composite values (text, reward, list, object) are frozen at every level. */
function deepFreeze(v) {
    if (v && typeof v === 'object') {
        for (const child of Object.values(v))
            deepFreeze(child);
        Object.freeze(v);
    }
    return v;
}
const mime = ['image/png', 'image/webp', 'image/jpeg'];
/**
 * Type-specific attribute check of one field spec whose shape (type, allowed keys) is already
 * known; recurses into list items and object members. Returns the schema issue code, if any.
 */
function specIssue(f, depth, budget) {
    if (++budget.nodes > MAX_NODES || depth > MAX_DEPTH)
        return 'TOO_LARGE';
    const entityType = () => f.entityType !== undefined
        && !(typeof f.entityType === 'string' && /^[a-z][a-z0-9_]{0,31}$/.test(f.entityType));
    switch (f.type) {
        case 'enum':
            return !Array.isArray(f.options) || f.options.length < 2 || f.options.length > 16
                || !f.options.every(o => plain(o))
                || new Set(f.options.map(o => o.value)).size !== f.options.length
                || !f.options.every(o => plain(o) && only(o, ['value', 'label'])
                    && typeof o.value === 'string' && /^[a-z0-9][a-zA-Z0-9-]{0,31}$/.test(o.value) && validateLocalizedText(o.label, 64)) ? 'TYPE' : undefined;
        case 'integer':
            return !integer(f.min, -2147483647, 2147483647) || !integer(f.max, -2147483647, 2147483647)
                || f.min > f.max || (f.step !== undefined && !integer(f.step, 1, 2147483647)) ? 'TYPE' : undefined;
        case 'string':
            if (!integer(f.maxLength, 1, 256))
                return 'TYPE';
            if (f.pattern !== undefined) {
                // Deliberately bounded regular-language subset: no groups, alternation or backreferences.
                if (typeof f.pattern !== 'string' || f.pattern.length > 128
                    || (f.pattern.match(/[*+?{]/g)?.length ?? 0) > 1 || /[()|]|\\[1-9]/.test(f.pattern))
                    return 'PATTERN';
                try {
                    new RegExp(f.pattern, 'u');
                }
                catch {
                    return 'PATTERN';
                }
            }
            return undefined;
        case 'image':
            return !Array.isArray(f.accept) || f.accept.length < 1 || f.accept.length > 3
                || new Set(f.accept).size !== f.accept.length || !f.accept.every(t => mime.includes(t))
                || !integer(f.maxBytes, 1, 1048576)
                || (f.size !== undefined && (!plain(f.size) || !only(f.size, ['min', 'max', 'square'])
                    || !integer(f.size.min, 1, 2048) || !integer(f.size.max, 1, 2048)
                    || f.size.min > f.size.max
                    || (f.size.square !== undefined && typeof f.size.square !== 'boolean'))) ? 'TYPE' : undefined;
        case 'number':
            return !number(f.min, -MAX_NUMBER, MAX_NUMBER) || !number(f.max, -MAX_NUMBER, MAX_NUMBER)
                || f.min > f.max ? 'TYPE' : undefined;
        case 'duration':
            return !integer(f.min, 0, MAX_DURATION) || !integer(f.max, 0, MAX_DURATION) || f.min > f.max ? 'TYPE' : undefined;
        case 'text':
            return f.maxLength !== undefined && !integer(f.maxLength, 1, 1024) ? 'TYPE' : undefined;
        case 'entityRef':
            return entityType() ? 'TYPE' : undefined;
        case 'reward':
            return (f.maxItems !== undefined && !integer(f.maxItems, 1, 32))
                || (f.maxAmount !== undefined && !integer(f.maxAmount, 1, 2147483647)) || entityType() ? 'TYPE' : undefined;
        case 'list': {
            const item = f.item;
            if (!integer(f.maxItems, 1, 32)
                || (f.minItems !== undefined && !integer(f.minItems, 0, f.maxItems))
                || !plain(item) || !nestable(item.type)
                || !only(item, ['type', ...attributes[item.type].filter(a => a !== 'default')]))
                return 'TYPE';
            return specIssue(item, depth + 1, budget);
        }
        case 'object': {
            const members = f.fields;
            if (!Array.isArray(members) || members.length < 1 || members.length > 16)
                return 'TYPE';
            const keys = new Set();
            for (const member of members) {
                if (!plain(member) || !nestable(member.type) || typeof member.key !== 'string' || !safeKey(member.key)
                    || keys.has(member.key)
                    || !only(member, ['key', 'type', 'label', 'help', ...attributes[member.type].filter(a => a !== 'default')])
                    || !validateLocalizedText(member.label, 64) || (member.help !== undefined && !validateLocalizedText(member.help, 280)))
                    return 'TYPE';
                keys.add(member.key);
                const code = specIssue(member, depth + 1, budget);
                if (code)
                    return code;
            }
            return undefined;
        }
        default: return undefined;
    }
}
/** Schema failures block publication, including unknown attributes and forward conditions. */
export function validateModuleSettingsSchema(source) {
    const schema = expandModuleSettingsSchema(source);
    const errors = [];
    const error = (path, code = 'TYPE') => { errors.push({ path, code }); };
    if (!plain(schema) || !only(schema, ['schemaVersion', 'fields']) || schema.schemaVersion !== 1
        || !Array.isArray(schema.fields) || schema.fields.length > 24)
        return [{ path: '', code: 'TYPE' }];
    const previous = new Map();
    const budget = { nodes: 0 };
    for (const [i, raw] of schema.fields.entries()) {
        const path = `fields.${i}`;
        if (!plain(raw) || typeof raw.type !== 'string' || !Object.hasOwn(attributes, raw.type)
            || typeof raw.key !== 'string' || !safeKey(raw.key) || previous.has(raw.key)
            || !only(raw, ['key', 'type', 'label', 'help', 'visibleIf', 'overridable', ...attributes[raw.type]])
            || !validateLocalizedText(raw.label, 64)
            || (raw.help !== undefined && !validateLocalizedText(raw.help, 280))) {
            error(path);
            continue;
        }
        const f = raw;
        if ((f.overridable !== undefined && typeof f.overridable !== 'boolean')
            || (f.overridable === true && !overridableTypes.includes(f.type)))
            error(`${path}.overridable`);
        const code = specIssue(f, 1, budget);
        if (code)
            error(path, code);
        if (f.visibleIf !== undefined) {
            const pairs = plain(f.visibleIf) ? Object.entries(f.visibleIf) : [];
            const [key, value] = pairs[0] ?? [];
            const controller = key === undefined ? undefined : previous.get(key);
            if (pairs.length !== 1 || !controller || !['boolean', 'enum'].includes(controller.type)
                || fieldError(controller, value))
                error(`${path}.visibleIf`);
        }
        if (f.type !== 'image' && !errors.some(e => e.path === path) && fieldError(f, f.default))
            error(`${path}.default`);
        if (!errors.some(e => e.path.startsWith(path)))
            previous.set(f.key, f);
    }
    return errors;
}
const hasControl = (v, allowNewline) => 
// eslint-disable-next-line no-control-regex -- Reject forbidden control characters.
(allowNewline ? /[\u0000-\u0009\u000b-\u001f\u007f]/ : /[\u0000-\u001f\u007f]/).test(v);
/** Every fact is in the catalog and every project parameter is registered in `filters.params`. */
function filterRefs(node, params) {
    if (Array.isArray(node))
        return node.every(child => filterRefs(child, params));
    if (!plain(node))
        return true;
    return Object.entries(node).every(([key, child]) => {
        if (['$and', '$or', '$nor', '$not'].includes(key))
            return filterRefs(child, params);
        return key.startsWith('$') ? factDefinition(key.slice(1)) !== undefined
            : filterParameter(key, params) !== undefined;
    });
}
function filterError(value, params) {
    if (!plain(value) || !isValidFilter(value))
        return 'TYPE';
    if (params === undefined)
        return undefined;
    if (!filterRefs(value, params))
        return 'OPTION';
    try {
        canonicalizeFilter(value, params);
    }
    catch {
        return 'TYPE';
    }
    return undefined;
}
function fieldError(f, value, params) {
    switch (f.type) {
        case 'filter': return filterError(value, params);
        case 'boolean': return typeof value === 'boolean' ? undefined : 'TYPE';
        case 'enum': return typeof value !== 'string' ? 'TYPE'
            : f.options?.some(o => o.value === value) ? undefined : 'OPTION';
        case 'integer': return !Number.isInteger(value) ? 'TYPE'
            : value < f.min || value > f.max
                || (value - f.min) % (f.step ?? 1) !== 0 ? 'RANGE' : undefined;
        case 'number': return typeof value !== 'number' || !Number.isFinite(value) ? 'TYPE'
            : value < f.min || value > f.max ? 'RANGE' : undefined;
        case 'duration': return !Number.isInteger(value) ? 'TYPE'
            : value < f.min || value > f.max ? 'RANGE' : undefined;
        case 'schedule': return !scheduleError(value) ? undefined : typeof value === 'string' ? 'PATTERN' : 'TYPE';
        case 'entityRef': return value === null ? undefined : typeof value !== 'string' ? 'TYPE'
            : ENTITY.test(value) ? undefined : 'PATTERN';
        case 'text': {
            if (!plain(value))
                return 'TYPE';
            if (Object.hasOwn(value, 'key')) {
                return !only(value, ['key']) || typeof value.key !== 'string' ? 'TYPE'
                    : L10N_KEY.test(value.key) ? undefined : 'PATTERN';
            }
            if (!only(value, ['values']) || !plain(value.values))
                return 'TYPE';
            const entries = Object.entries(value.values);
            if (entries.length < 1 || entries.length > 32)
                return 'RANGE';
            for (const [locale, t] of entries) {
                if (typeof t !== 'string')
                    return 'TYPE';
                if (!LOCALE.test(locale) || hasControl(t, true))
                    return 'PATTERN';
                if (t.length < 1 || t.length > (f.maxLength ?? 256))
                    return 'RANGE';
            }
            return undefined;
        }
        case 'reward': {
            if (!Array.isArray(value))
                return 'TYPE';
            if (value.length > (f.maxItems ?? 16))
                return 'RANGE';
            const ids = new Set();
            for (const entry of value) {
                if (!plain(entry) || !only(entry, ['id', 'amount']) || typeof entry.id !== 'string'
                    || !Number.isInteger(entry.amount))
                    return 'TYPE';
                if (!ENTITY.test(entry.id))
                    return 'PATTERN';
                if (ids.has(entry.id))
                    return 'OPTION';
                ids.add(entry.id);
                if (entry.amount < 1 || entry.amount > (f.maxAmount ?? 1e9))
                    return 'RANGE';
            }
            return undefined;
        }
        case 'list': {
            if (!Array.isArray(value))
                return 'TYPE';
            if (value.length < (f.minItems ?? 0) || value.length > f.maxItems)
                return 'RANGE';
            for (const entry of value) {
                const code = fieldError(f.item, entry);
                if (code)
                    return code;
            }
            return undefined;
        }
        case 'object': {
            if (!plain(value) || !only(value, f.fields.map(m => m.key)))
                return 'TYPE';
            for (const member of f.fields) {
                if (!Object.hasOwn(value, member.key))
                    return 'TYPE';
                const code = fieldError(member, value[member.key]);
                if (code)
                    return code;
            }
            return undefined;
        }
        case 'string': return typeof value !== 'string' ? 'TYPE'
            : value.length > f.maxLength ? 'RANGE'
                : hasControl(value, false) || (f.pattern !== undefined && !new RegExp(f.pattern, 'u').test(value)) ? 'PATTERN' : undefined;
        case 'color': return typeof value !== 'string' ? 'TYPE' : /^#[0-9a-f]{6}$/.test(value) ? undefined : 'PATTERN';
        case 'image': return value === null || isAssetRef(value) ? undefined : 'ASSET_INVALID';
    }
}
export function validateModuleSettings(source, value, options = {}) {
    const schema = expandModuleSettingsSchema(source);
    const errors = [...validateModuleSettingsSchema(schema)];
    const out = Object.create(null);
    if (errors.length)
        return { valid: false, errors, value: Object.freeze(out) };
    if (!plain(value))
        return { valid: false, errors: [{ path: '', code: 'TYPE' }], value: Object.freeze(out) };
    try {
        if (new TextEncoder().encode(JSON.stringify(value)).length > 4096)
            errors.push({ path: '', code: 'TOO_LARGE' });
    }
    catch {
        errors.push({ path: '', code: 'TYPE' });
    }
    const fields = schema.fields;
    for (const key of Object.keys(value)) {
        if (!safeKey(key) || !fields.some(f => f.key === key))
            errors.push({ path: key, code: 'UNKNOWN_KEY' });
    }
    for (const f of fields) {
        const supplied = Object.hasOwn(value, f.key) ? value[f.key] : f.type === 'image' ? null : f.default;
        if (f.visibleIf
            && !Object.entries(f.visibleIf).every(([key, expected]) => out[key] === expected))
            continue;
        const code = fieldError(f, supplied, options.parameters);
        if (code) {
            errors.push({ path: f.key, code });
            continue;
        }
        out[f.key] = deepFreeze(structuredClone(supplied));
    }
    return { valid: errors.length === 0, errors, value: Object.freeze(out) };
}
/** Validate a partial override without defaults or visibility pruning. */
export function validateModuleOverride(source, data) {
    const schema = expandModuleSettingsSchema(source);
    const errors = [...validateModuleSettingsSchema(schema)];
    const value = Object.create(null);
    if (errors.length)
        return { valid: false, errors, value: Object.freeze(value) };
    if (!plain(data))
        return { valid: false, errors: [{ path: '', code: 'TYPE' }], value: Object.freeze(value) };
    try {
        if (new TextEncoder().encode(JSON.stringify(data)).length > 4096
            || Object.keys(data).length > 24)
            return { valid: false, errors: [{ path: '', code: 'TOO_LARGE' }], value: Object.freeze(value) };
    }
    catch {
        return { valid: false, errors: [{ path: '', code: 'TYPE' }], value: Object.freeze(value) };
    }
    for (const [key, supplied] of Object.entries(data)) {
        const field = schema.fields.find(f => f.key === key);
        const code = !safeKey(key) || !field ? 'UNKNOWN_KEY'
            : !overridableTypes.includes(field.type) || field.overridable === false ? 'NOT_OVERRIDABLE'
                : supplied === null ? undefined : fieldError(field, supplied);
        if (code)
            errors.push({ path: key, code });
        else
            value[key] = supplied;
    }
    return { valid: errors.length === 0, errors, value: Object.freeze(value) };
}
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
function semver(value) {
    const match = typeof value === 'string' ? SEMVER.exec(value) : null;
    return match ? match.slice(1).map(Number) : undefined;
}
function compare(a, b) {
    for (let i = 0; i < 3; i++) {
        const diff = a[i] - b[i];
        if (diff !== 0)
            return diff;
    }
    return 0;
}
/**
 * Inclusive strict-semver bounds against `facts.v` (CFG-R-08); an unreadable bound or version
 * never matches.
 */
export function versionMatches(bounds, facts) {
    if (!bounds.minVersion && !bounds.maxVersion)
        return true;
    const version = semver(facts.v);
    if (!version)
        return false;
    const min = bounds.minVersion ? semver(bounds.minVersion) : undefined;
    const max = bounds.maxVersion ? semver(bounds.maxVersion) : undefined;
    if ((bounds.minVersion && !min) || (bounds.maxVersion && !max))
        return false;
    return (!min || compare(version, min) >= 0) && (!max || compare(version, max) <= 0);
}
/** Defaults, build settings, then matching records ordered by priority and configId. */
export function applyModuleOverrides(source, base, overrides, ctx) {
    const schema = expandModuleSettingsSchema(source);
    // Runtime checks the shape only: a parameter removed from filters.params must not break a module.
    const checked = validateModuleSettings(schema, base);
    const ignored = [];
    const applied = [];
    if (!checked.valid)
        return { ...checked, ignored, overrides: applied };
    const fields = schema.fields;
    // Preserve hidden base fields: an override may make them visible later.
    const baseline = Object.fromEntries(fields.map(f => [f.key,
        plain(base) && Object.hasOwn(base, f.key) ? base[f.key] : f.type === 'image' ? null : f.default]));
    let values = { ...baseline };
    const ordered = [...overrides].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0)
        || a.configId - b.configId);
    for (const item of ordered) {
        if (!versionMatches(item, ctx.facts))
            continue;
        if (item.filters !== undefined
            && !matchFilter(item.filters, ctx.facts, ctx.parameters))
            continue;
        let data = item.data;
        const conditionals = item.conditionals ?? [];
        const result = resolve(data, conditionals, ctx.facts, { ...(ctx.parameters ? { parameters: ctx.parameters } : {}) });
        if (result.applied !== null) {
            const index = conditionals.findIndex((c, i) => plain(c)
                && (typeof c.label === 'string' ? c.label : `#${i}`) === result.applied);
            const conditional = conditionals[index];
            // Flat patches keep null as a reset rather than deleting it during conditional merge.
            data = plain(conditional) && plain(conditional.data)
                ? { ...(plain(data) ? data : {}), ...conditional.data } : result.data;
        }
        const patch = validateModuleOverride(schema, data);
        for (const issue of patch.errors)
            ignored.push({ configId: item.configId, ...issue });
        if (!Object.keys(patch.value).length)
            continue;
        const next = { ...values };
        for (const [key, value] of Object.entries(patch.value)) {
            next[key] = value === null ? baseline[key] : value;
        }
        // A patch that exposes an invalid hidden field is rolled back whole; the state stays valid.
        const checkedNext = validateModuleSettings(schema, next);
        if (!checkedNext.valid) {
            for (const issue of checkedNext.errors)
                ignored.push({ configId: item.configId, ...issue });
            continue;
        }
        values = next;
        applied.push(item.configId);
    }
    const effective = validateModuleSettings(schema, values);
    return { ...effective, ignored: Object.freeze(ignored), overrides: Object.freeze(applied) };
}
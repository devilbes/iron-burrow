import { matchFilter } from './filters.js';
const modes = ['merge', 'replace'];
const sides = ['server', 'client'];
function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/**
 * Objects merge by key, everything else (arrays too) replaces; `null` removes the key, also
 * inside an object that has no object counterpart in base.
 */
function merge(base, patch) {
    if (!record(patch))
        return patch;
    const out = new Map(record(base) ? Object.entries(base) : []);
    for (const [key, value] of Object.entries(patch)) {
        if (value === null)
            out.delete(key);
        else
            out.set(key, merge(out.get(key), value));
    }
    // fromEntries defines own properties, so a `__proto__` key never changes the prototype.
    return Object.fromEntries(out);
}
function conditional(value) {
    return record(value) && Object.hasOwn(value, 'filters') && Object.hasOwn(value, 'data')
        && (value.label === undefined || typeof value.label === 'string')
        && (value.mode === undefined || modes.includes(value.mode))
        && (value.side === undefined || sides.includes(value.side))
        && (value.enabled === undefined || typeof value.enabled === 'boolean');
}
/**
 * E94 / configs spec §3.6: the first matching conditional of `opts.sides` (in list order) is
 * applied, the rest are not evaluated. A conditional with `enabled: false` is skipped (never
 * applied, never reported in `applied`). A malformed conditional or invalid filter never applies.
 */
export function resolve(base, conditionals, facts, opts = {}) {
    const allowed = opts.sides ?? ['client'];
    const fallback = opts.conditionalsMode ?? 'merge';
    if (!Array.isArray(conditionals) || !modes.includes(fallback)) {
        return { data: base, applied: null };
    }
    for (const [index, entry] of conditionals.entries()) {
        if (!conditional(entry) || entry.enabled === false || !allowed.includes(entry.side ?? 'client')
            || !matchFilter(entry.filters, facts, opts.parameters))
            continue;
        const data = (entry.mode ?? fallback) === 'replace' ? entry.data : merge(base, entry.data);
        return { data, applied: entry.label ?? `#${index}` };
    }
    return { data: base, applied: null };
}
//# sourceMappingURL=resolve.js.map
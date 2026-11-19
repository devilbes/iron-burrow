import { NATIVE_FACT_PARAMETERS } from './native-facts.js';
export class FilterValidationError extends Error {
    kind;
    pointer;
    constructor(kind, pointer) {
        super(kind === 'invalid' ? 'Invalid filter' : 'Filter value does not fit parameter type');
        this.kind = kind;
        this.pointer = pointer;
    }
}
const numeric = /^(0|[1-9][0-9]*)$/;
export function parseFilterVersion(value) {
    if (typeof value !== 'string' || value.length > 256)
        return undefined;
    const match = /^[vV]?(\d+(?:\.\d+)*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.exec(value);
    if (!match)
        return undefined;
    const parts = match[1].split('.');
    const pre = match[2]?.split('.') ?? [];
    if (!parts.every((part) => numeric.test(part)) ||
        pre.some((part) => /^\d+$/.test(part) && !numeric.test(part)))
        return undefined;
    return { parts, pre };
}
function numberCompare(a, b) {
    return a.length !== b.length ? Math.sign(a.length - b.length) : a === b ? 0 : a < b ? -1 : 1;
}
export function compareFilterVersions(a, b) {
    const x = parseFilterVersion(a), y = parseFilterVersion(b);
    if (!x || !y)
        return undefined;
    for (let i = 0; i < Math.max(3, x.parts.length, y.parts.length); i++) {
        const diff = numberCompare(x.parts[i] ?? '0', y.parts[i] ?? '0');
        if (diff)
            return diff;
    }
    if (!x.pre.length || !y.pre.length)
        return x.pre.length === y.pre.length ? 0 : x.pre.length ? -1 : 1;
    for (let i = 0; i < Math.max(x.pre.length, y.pre.length); i++) {
        const left = x.pre[i], right = y.pre[i];
        if (left === undefined || right === undefined)
            return left === undefined ? -1 : 1;
        if (left === right)
            continue;
        const ln = numeric.test(left), rn = numeric.test(right);
        return ln && rn
            ? numberCompare(left, right)
            : ln !== rn
                ? ln
                    ? -1
                    : 1
                : left < right
                    ? -1
                    : 1;
    }
    return 0;
}
/** Strict ISO calendar validation before Date.parse; offset-less datetimes are UTC. */
export function parseFilterDate(value) {
    if (typeof value === 'number') {
        const ms = value >= 1e12 ? value : value * 1000;
        return Number.isFinite(ms) && Math.abs(ms) <= 8.64e15 ? ms : undefined;
    }
    if (typeof value !== 'string' || value.length > 64)
        return undefined;
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})?)?$/.exec(value);
    if (!match)
        return undefined;
    const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (month < 1 ||
        month > 12 ||
        day < 1 ||
        day > days[month - 1] ||
        Number(match[4] ?? 0) > 23 ||
        Number(match[5] ?? 0) > 59 ||
        Number(match[6] ?? 0) > 59)
        return undefined;
    const zone = match[8];
    if (zone && zone !== 'Z' && (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(4)) > 59))
        return undefined;
    const ms = Date.parse(match[4] === undefined ? value + 'T00:00:00Z' : zone ? value : value + 'Z');
    return Number.isFinite(ms) ? ms : undefined;
}
/** Native definitions override caller definitions, preventing games from retyping trusted facts. */
export function filterParameter(key, params = {}) {
    if (key.startsWith('$')) {
        const descriptor = Object.getOwnPropertyDescriptor(NATIVE_FACT_PARAMETERS, key);
        return descriptor?.value;
    }
    const descriptor = Object.getOwnPropertyDescriptor(params, key);
    return descriptor && 'value' in descriptor ? descriptor.value : undefined;
}
export function filterValueFits(param, value) {
    switch (param.type) {
        case 'version':
            return parseFilterVersion(value) !== undefined;
        case 'date':
            return parseFilterDate(value) !== undefined;
        case 'enum':
            return (typeof value === 'string' &&
                value !== '' &&
                (param.open === true || (param.values ?? []).includes(value)));
        case 'string':
            return typeof value === 'string' && (value !== '' || param.allowEmpty === true);
        case 'number':
            return typeof value === 'number' && Number.isFinite(value);
        case 'boolean':
            return typeof value === 'boolean';
    }
}
export function filterTypeOperators(type) {
    if (type === 'string[]')
        return ['$eq', '$ne', '$in', '$nin', '$exists'];
    if (type === 'number')
        return ['$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin', '$exists', '$mod', '$not'];
    if (type === 'boolean' || type === 'enum')
        return ['$eq', '$ne', '$in', '$nin', '$exists', '$not'];
    if (type === 'date')
        return ['$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$exists'];
    if (type === 'version')
        return ['$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin', '$exists'];
    return undefined;
}
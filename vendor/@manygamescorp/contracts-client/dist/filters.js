import { prepareFilter, filterField, } from './filter-syntax.js';
import { filterParameter, filterValueFits, filterTypeOperators, compareFilterVersions, parseFilterDate } from './filter-values.js';
const logical = new Set(['$and', '$or', '$nor', '$not']);
const cache = new WeakMap();
const noMatch = () => false;
const record = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const identifier = (value) => Number.isSafeInteger(value);
function ownValue(object, key) {
    if (!record(object))
        return undefined;
    const descriptor = Object.getOwnPropertyDescriptor(object, key);
    return descriptor && 'value' in descriptor ? descriptor.value : undefined;
}
function lookup(facts, path) {
    if (Object.hasOwn(facts, path))
        return ownValue(facts, path);
    let value = facts;
    for (const part of path.split('.'))
        value = ownValue(value, part);
    return value;
}
/** Own data elements of a plain array of strings; anything else is not an array fact. */
function strings(value) {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype)
        return undefined;
    const out = [];
    for (let index = 0; index < value.length; index++) {
        const item = Object.getOwnPropertyDescriptor(value, index);
        if (!item || !('value' in item) || typeof item.value !== 'string')
            return undefined;
        out.push(item.value);
    }
    return out;
}
/** E96: `$eq`/`$ne` — the value is (not) in the array; `$in`/`$nin` — lists (do not) intersect. */
function arrayOperators(actual, spec) {
    return Object.entries(spec).every(([op, arg]) => {
        if (op === '$exists')
            return arg ? actual !== undefined : actual === undefined;
        if (actual === undefined)
            return op === '$ne' || op === '$nin';
        const items = strings(actual);
        if (!items)
            return false;
        switch (op) {
            case '$eq':
                return items.includes(arg);
            case '$ne':
                return !items.includes(arg);
            case '$in':
                return arg.some((item) => items.includes(item));
            case '$nin':
                return !arg.some((item) => items.includes(item));
            default:
                return false;
        }
    });
}
function operators(actual, spec, param) {
    if (param &&
        actual !== undefined &&
        !filterValueFits(param, actual) &&
        !(Object.keys(spec).length === 1 && Object.hasOwn(spec, '$exists')))
        return false;
    const allowed = param && filterTypeOperators(param.type);
    if (param &&
        Object.entries(spec).some(([op, arg]) => (allowed && !allowed.includes(op)) ||
            (!['$exists', 'caseInsensitive', '$mod', '$not'].includes(op) &&
                !(op === '$in' || op === '$nin'
                    ? arg.every((item) => filterValueFits(param, item))
                    : filterValueFits(param, arg)))))
        return false;
    const typedCompare = (arg) => param?.type === 'version'
        ? compareFilterVersions(actual, arg)
        : param?.type === 'date'
            ? (() => {
                const a = parseFilterDate(actual), b = parseFilterDate(arg);
                return a === undefined || b === undefined ? undefined : Math.sign(a - b);
            })()
            : actual === arg
                ? 0
                : undefined;
    const typed = param?.type === 'version' || param?.type === 'date';
    return Object.entries(spec).every(([op, arg]) => {
        if (actual === undefined)
            return op === '$ne' || op === '$nin' || (op === '$exists' && !arg);
        switch (op) {
            case '$exists':
                return arg ? actual !== undefined : actual === undefined;
            case '$eq':
                return typed ? typedCompare(arg) === 0 : actual !== undefined && actual === arg;
            case '$ne':
                return typed ? typedCompare(arg) !== undefined && typedCompare(arg) !== 0 : actual !== arg;
            case '$in':
                return typed
                    ? arg.some((item) => typedCompare(item) === 0)
                    : actual !== undefined && arg.includes(actual);
            case '$nin':
                return typed
                    ? !arg.some((item) => typedCompare(item) === 0)
                    : !arg.includes(actual);
            case '$mod': {
                const [divisor, remainder] = arg;
                return identifier(actual) && actual % divisor === remainder;
            }
            case '$gt':
            case '$gte':
            case '$lt':
            case '$lte': {
                if (typed) {
                    const diff = typedCompare(arg);
                    return (diff !== undefined &&
                        (op === '$gt'
                            ? diff > 0
                            : op === '$gte'
                                ? diff >= 0
                                : op === '$lt'
                                    ? diff < 0
                                    : diff <= 0));
                }
                if (typeof actual !== typeof arg ||
                    !(typeof actual === 'string' || (typeof actual === 'number' && Number.isFinite(actual))))
                    return false;
                const a = actual;
                const b = arg;
                return op === '$gt' ? a > b : op === '$gte' ? a >= b : op === '$lt' ? a < b : a <= b;
            }
            case '$startsWith':
            case '$endsWith':
            case '$contains': {
                if (typeof actual !== 'string' || actual.length > 256)
                    return false;
                const text = spec.caseInsensitive === true ? actual.toLowerCase() : actual;
                const needle = spec.caseInsensitive === true ? arg.toLowerCase() : arg;
                return op === '$startsWith'
                    ? text.startsWith(needle)
                    : op === '$endsWith'
                        ? text.endsWith(needle)
                        : text.includes(needle);
            }
            case 'caseInsensitive':
                return true;
            case '$not':
                return actual !== undefined && !operators(actual, arg, param);
            default:
                return false;
        }
    });
}
function build(filter, params) {
    const parts = Object.entries(filter).map(([key, expected]) => {
        if (key === '$not') {
            const inner = build(expected, params);
            return (facts) => !inner(facts);
        }
        if (logical.has(key)) {
            const children = expected.map((child) => build(child, params));
            return key === '$and'
                ? (facts) => children.every((part) => part(facts))
                : key === '$or'
                    ? (facts) => children.some((part) => part(facts))
                    : (facts) => !children.some((part) => part(facts));
        }
        const { path, kind } = filterField(key);
        if (kind === 'array') {
            const spec = record(expected) ? expected : { $eq: expected };
            return (facts) => arrayOperators(lookup(facts, path), spec);
        }
        return (facts) => {
            const actual = lookup(facts, path);
            return record(expected)
                ? operators(actual, expected, filterParameter(key, params))
                : expected !== null && operators(actual, { $eq: expected }, filterParameter(key, params));
        };
    });
    return (facts) => parts.every((part) => part(facts));
}
/** Invalid filters compile to false. A retained predicate captures a validated snapshot. */
export function compileFilter(filter, params = {}) {
    try {
        const { json, value } = prepareFilter(filter);
        const object = filter;
        const cached = cache.get(object);
        if (Object.keys(params).length === 0 && cached?.json === json)
            return cached.predicate;
        const evaluate = build(value, params);
        const predicate = (facts) => {
            try {
                return record(facts) && evaluate(facts);
            }
            catch {
                return false;
            }
        };
        if (Object.keys(params).length === 0)
            cache.set(object, { json, predicate });
        return predicate;
    }
    catch {
        return noMatch;
    }
}
export function matchFilter(filter, facts = {}, params = {}) {
    return compileFilter(filter, params)(facts);
}
export { FILTER_OPERATORS, isValidFilter, canonicalizeFilter, FilterValidationError, compareFilterVersions, parseFilterVersion, parseFilterDate, filterParameter, filterValueFits, filterTypeOperators } from './filter-syntax.js';
//# sourceMappingURL=filters.js.map
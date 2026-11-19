import { factDefinition } from './facts.js';
import { FilterValidationError, filterParameter, filterValueFits, filterTypeOperators, } from './filter-values.js';
export { FilterValidationError, compareFilterVersions, parseFilterVersion, parseFilterDate, filterParameter, filterValueFits, filterTypeOperators, } from './filter-values.js';
/** Closed operator list (E96). Any other `$name` in a field position is a native fact name. */
export const FILTER_OPERATORS = Object.freeze([
    '$and',
    '$or',
    '$not',
    '$nor',
    '$eq',
    '$ne',
    '$gt',
    '$gte',
    '$lt',
    '$lte',
    '$in',
    '$nin',
    '$exists',
    '$mod',
    '$startsWith',
    '$endsWith',
    '$contains',
]);
const MAX_NODES = 64;
const MAX_BYTES = 4096;
const MAX_IDENTIFIER_BYTES = 16_384;
const MAX_IDENTIFIER_LIST = 1000;
// Upper bounds of the raw snapshot before the identifier-list exception is applied.
const RAW_NODES = MAX_NODES + MAX_IDENTIFIER_BYTES / 2;
const logical = new Set(['$and', '$or', '$nor', '$not']);
const stringOps = new Set(['$startsWith', '$endsWith', '$contains']);
const unsafeKeys = new Set(['__proto__', 'prototype', 'constructor', '_bsontype']);
class InvalidFilter extends Error {
}
function invalid() {
    throw new InvalidFilter();
}
function scalar(value) {
    return (value === null ||
        typeof value === 'string' ||
        typeof value === 'boolean' ||
        (typeof value === 'number' && Number.isFinite(value)));
}
function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/** Bounded JSON snapshot: never call getters/toJSON, even before checking the byte limit. */
function snapshot(filter, maxDepth = 4) {
    let nodes = 0;
    let stringUnits = 0;
    const walk = (value, depth) => {
        if (++nodes > RAW_NODES || depth > maxDepth)
            invalid();
        if (scalar(value)) {
            if (typeof value === 'string')
                stringUnits += value.length;
            if (stringUnits > MAX_IDENTIFIER_BYTES)
                invalid();
            return value;
        }
        if (typeof value !== 'object' || value === null)
            invalid();
        const proto = Object.getPrototypeOf(value);
        if (Array.isArray(value)
            ? proto !== Array.prototype
            : proto !== Object.prototype && proto !== null)
            invalid();
        const keys = Reflect.ownKeys(value);
        if (keys.length > (Array.isArray(value) ? MAX_IDENTIFIER_LIST + 1 : MAX_NODES + 1))
            invalid();
        const out = Array.isArray(value) ? [] : Object.create(null);
        for (const key of keys) {
            if (Array.isArray(value) && key === 'length')
                continue;
            if (typeof key !== 'string' || unsafeKeys.has(key) || key.includes('\0'))
                invalid();
            stringUnits += key.length;
            if (stringUnits > MAX_IDENTIFIER_BYTES)
                invalid();
            const descriptor = Object.getOwnPropertyDescriptor(value, key);
            if (!descriptor || !descriptor.enumerable || !('value' in descriptor))
                invalid();
            if (Array.isArray(out)) {
                if (key !== String(out.length))
                    invalid();
                out.push(walk(descriptor.value, depth + 1));
            }
            else
                out[key] = walk(descriptor.value, depth + 1);
        }
        if (Array.isArray(value) && out.length !== value.length)
            invalid();
        return out;
    };
    const value = walk(filter, 0);
    if (!record(value))
        invalid();
    return { value, nodes };
}
/** `$X` → catalog fact `X`; `k` → `custom.k`. Unknown native names are invalid. */
export function filterField(key) {
    const native = key.startsWith('$');
    const name = native ? key.slice(1) : key;
    if (!name ||
        name.split('.').some((part) => !part || part.startsWith('$') || unsafeKeys.has(part)))
        return undefined;
    if (!native)
        return { path: `custom.${name}`, kind: 'value' };
    const definition = factDefinition(name);
    if (!definition)
        return undefined;
    return {
        path: name,
        kind: definition.identifier ? 'identifier' : definition.type === 'string[]' ? 'array' : 'value',
    };
}
const identifier = (value) => Number.isSafeInteger(value);
function modulo(arg) {
    if (!Array.isArray(arg) || arg.length !== 2 || !arg.every(identifier))
        return false;
    const [divisor, remainder] = arg;
    return divisor >= 2 && divisor <= 10_000 && remainder >= 0 && remainder < divisor;
}
function arraySpec(entries) {
    return entries.every(([op, arg]) => {
        switch (op) {
            case '$eq':
            case '$ne':
                return typeof arg === 'string';
            case '$in':
            case '$nin':
                return Array.isArray(arg) && arg.every((item) => typeof item === 'string');
            case '$exists':
                return typeof arg === 'boolean';
            default:
                return false;
        }
    });
}
function identifierSpec(entries, budget) {
    return entries.every(([op, arg]) => {
        switch (op) {
            case '$eq':
            case '$ne':
                return identifier(arg);
            case '$in':
            case '$nin':
                if (!Array.isArray(arg) || arg.length > MAX_IDENTIFIER_LIST || !arg.every(identifier)) {
                    return false;
                }
                budget.listed += arg.length;
                return true;
            case '$mod':
                return modulo(arg);
            default:
                return false;
        }
    });
}
function valueSpec(entries) {
    return entries.every(([op, arg]) => {
        if (stringOps.has(op)) {
            return typeof arg === 'string' && arg.length > 0 && arg.length <= 128;
        }
        switch (op) {
            case 'caseInsensitive':
                return typeof arg === 'boolean' && entries.some(([key]) => stringOps.has(key));
            case '$eq':
            case '$ne':
                return scalar(arg);
            case '$gt':
            case '$gte':
            case '$lt':
            case '$lte':
                return typeof arg === 'string' || (typeof arg === 'number' && Number.isFinite(arg));
            case '$in':
            case '$nin':
                return Array.isArray(arg) && arg.every(scalar);
            case '$exists':
                return typeof arg === 'boolean';
            case '$mod':
                return modulo(arg);
            case '$not':
                return record(arg) && valueSpec(Object.entries(arg));
            default:
                return false;
        }
    });
}
function condition(target, value, budget) {
    if (!record(value)) {
        return target.kind === 'array'
            ? typeof value === 'string'
            : target.kind === 'identifier'
                ? identifier(value)
                : scalar(value);
    }
    const entries = Object.entries(value);
    if (!entries.some(([op]) => op.startsWith('$')))
        return false;
    return target.kind === 'array'
        ? arraySpec(entries)
        : target.kind === 'identifier'
            ? identifierSpec(entries, budget)
            : valueSpec(entries);
}
function expression(filter, budget) {
    if (!record(filter))
        return false;
    return Object.entries(filter).every(([key, value]) => {
        if (key === '$not')
            return expression(value, budget);
        if (logical.has(key)) {
            return (Array.isArray(value) &&
                value.length > 0 &&
                value.every((child) => expression(child, budget)));
        }
        const target = filterField(key);
        return target !== undefined && condition(target, value, budget);
    });
}
export function prepareFilter(filter) {
    const { value, nodes } = snapshot(filter);
    const budget = { listed: 0 };
    if (!expression(value, budget) || nodes - budget.listed > MAX_NODES)
        invalid();
    const json = JSON.stringify(value);
    const limit = budget.listed > 0 ? MAX_IDENTIFIER_BYTES : MAX_BYTES;
    if (new TextEncoder().encode(json).byteLength > limit)
        invalid();
    return { json, value };
}
/** Syntax, catalog names and limits; the same check runs before every evaluation. */
export function isValidFilter(filter) {
    try {
        prepareFilter(filter);
        return true;
    }
    catch {
        return false;
    }
}
/** Bounded write canonicalization. Preserves literal representations, never mutates its input. */
export function canonicalizeFilter(filter, params = {}) {
    let value;
    try {
        value = snapshot(filter, 12).value;
    }
    catch {
        throw new FilterValidationError('invalid', '');
    }
    const pointerKey = (key) => key.replaceAll('~', '~0').replaceAll('/', '~1');
    const fingerprint = (entry) => JSON.stringify(entry, (_key, node) => record(node)
        ? Object.fromEntries(Object.entries(node).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
        : node);
    const unique = (entries) => {
        const seen = new Set();
        return entries.filter((entry) => {
            const key = fingerprint(entry);
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
    };
    const specOf = (entry) => (record(entry) ? entry : { $eq: entry });
    const compact = (spec) => Object.keys(spec).length === 1 && Object.hasOwn(spec, '$eq') ? spec['$eq'] : spec;
    const conditionValue = (key, entry, at) => {
        const param = filterParameter(key, params);
        const check = (arg, pointer) => {
            if (arg === null || (arg === '' && !(param?.type === 'string' && param.allowEmpty === true)))
                throw new FilterValidationError('invalid', pointer);
            if (param && scalar(arg) && !filterValueFits(param, arg))
                throw new FilterValidationError('type', pointer);
        };
        const walk = (spec, pointer) => {
            const out = {};
            for (const [op, arg] of Object.entries(spec)) {
                const here = pointer + '/' + pointerKey(op);
                const allowed = filterTypeOperators(param?.type ?? (key.startsWith('$') ? (factDefinition(key.slice(1))?.type ?? '') : ''));
                if (allowed && !allowed.includes(op))
                    throw new FilterValidationError('type', here);
                if (op === 'caseInsensitive' && arg === false)
                    continue;
                if (op === '$not' && record(arg)) {
                    out[op] = walk(arg, here);
                    continue;
                }
                if (op === '$in' || op === '$nin') {
                    if (!Array.isArray(arg) || !arg.length)
                        throw new FilterValidationError('invalid', here);
                    arg.forEach((item, index) => check(item, here + '/' + index));
                    const items = unique(arg);
                    if (items.length === 1 &&
                        op === '$in' &&
                        Object.hasOwn(spec, '$eq') &&
                        fingerprint(spec['$eq']) !== fingerprint(items[0])) {
                        out[op] = items;
                        continue;
                    }
                    if (items.length === 1 &&
                        op === '$nin' &&
                        Object.hasOwn(spec, '$ne') &&
                        fingerprint(spec['$ne']) !== fingerprint(items[0])) {
                        out[op] = items;
                        continue;
                    }
                    out[items.length === 1 ? (op === '$in' ? '$eq' : '$ne') : op] =
                        items.length === 1 ? items[0] : items;
                }
                else {
                    if (!['$exists', 'caseInsensitive', '$mod'].includes(op))
                        check(arg, here);
                    out[op] = arg;
                }
            }
            if (!Object.keys(out).length)
                throw new FilterValidationError('invalid', pointer);
            return out;
        };
        if (!record(entry)) {
            check(entry, at);
            return entry;
        }
        return compact(walk(entry, at));
    };
    const conjunction = (nodes) => {
        const out = {};
        const conflicts = [];
        const blocked = new Set();
        const merge = (a, b) => {
            if (fingerprint(a) === fingerprint(b))
                return a;
            const left = specOf(a), right = specOf(b);
            if ((left['caseInsensitive'] === true) !== (right['caseInsensitive'] === true))
                return undefined;
            return Object.keys(right).every((op) => !Object.hasOwn(left, op) || fingerprint(left[op]) === fingerprint(right[op]))
                ? compact({ ...left, ...right })
                : undefined;
        };
        // Canonical children can already contain conflict conjunctions. Flatten them before
        // merging siblings so an existing $and is never overwritten by another conflict.
        const expanded = [];
        const expand = (node) => {
            const fields = {};
            for (const [key, entry] of Object.entries(node)) {
                if (key === '$and' && Array.isArray(entry))
                    entry.forEach((child) => expand(child));
                else
                    fields[key] = entry;
            }
            if (Object.keys(fields).length)
                expanded.push(fields);
        };
        nodes.forEach(expand);
        for (const node of expanded)
            for (const [key, entry] of Object.entries(node)) {
                if (blocked.has(key)) {
                    const previous = conflicts.find((part) => Object.hasOwn(part, key) &&
                        (fingerprint(part[key]) === fingerprint(entry) ||
                            (!logical.has(key) && merge(part[key], entry) !== undefined)));
                    if (previous)
                        previous[key] = logical.has(key) ? previous[key] : merge(previous[key], entry);
                    else
                        conflicts.push({ [key]: entry });
                    continue;
                }
                if (!Object.hasOwn(out, key)) {
                    out[key] = entry;
                    continue;
                }
                if (fingerprint(out[key]) === fingerprint(entry))
                    continue;
                const merged = !logical.has(key) ? merge(out[key], entry) : undefined;
                if (merged !== undefined) {
                    out[key] = merged;
                    continue;
                }
                blocked.add(key);
                conflicts.push({ [key]: out[key] }, { [key]: entry });
                delete out[key];
            }
        if (conflicts.length)
            out['$and'] = unique(conflicts);
        return out;
    };
    const walk = (node, at, grouped = false) => {
        if (grouped && !Object.keys(node).length)
            throw new FilterValidationError('invalid', at);
        const parts = [];
        for (const [key, entry] of Object.entries(node)) {
            const here = at + '/' + pointerKey(key);
            if (key === '$not') {
                if (!record(entry))
                    throw new FilterValidationError('invalid', here);
                parts.push({ [key]: walk(entry, here, true) });
            }
            else if (logical.has(key)) {
                if (!Array.isArray(entry) || !entry.length || !entry.every(record))
                    throw new FilterValidationError('invalid', here);
                let children = entry.map((child, index) => walk(child, here + '/' + index, true));
                if (key === '$and') {
                    parts.push(...children);
                    continue;
                }
                if (key === '$or')
                    children = children.flatMap((child) => Object.keys(child).length === 1 && Array.isArray(child['$or'])
                        ? child['$or']
                        : [child]);
                children = unique(children);
                parts.push(key === '$or' && children.length === 1 ? children[0] : { [key]: children });
            }
            else {
                if (record(entry)) {
                    const spec = { ...entry };
                    for (const [list, op] of [
                        ['$in', '$eq'],
                        ['$nin', '$ne'],
                    ]) {
                        const values = spec[list];
                        if (Array.isArray(values) &&
                            values.length &&
                            unique(values).length === 1 &&
                            Object.hasOwn(spec, op) &&
                            fingerprint(spec[op]) !== fingerprint(values[0])) {
                            // Validate the original argument and pointer before splitting it.
                            conditionValue(key, { [list]: values }, here);
                            parts.push({ [key]: conditionValue(key, { [op]: values[0] }, here) });
                            delete spec[list];
                        }
                    }
                    parts.push({ [key]: conditionValue(key, spec, here) });
                }
                else
                    parts.push({ [key]: conditionValue(key, entry, here) });
            }
        }
        return conjunction(parts);
    };
    const out = walk(value, '');
    if (!isValidFilter(out))
        throw new FilterValidationError('invalid', '');
    return out;
}
import { SDKError } from '@manygamescorp/core/error';
export function fail(code = 'LEVELS_NOT_LOADED') {
    throw new SDKError(code, { module: 'levels' });
}
export function object(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
        && [Object.prototype, null].includes(Object.getPrototypeOf(value));
}
export function integer(value, min = 1, max = 1_000_000) {
    return Number.isSafeInteger(value) && value >= min && value <= max;
}
export function levelNumber(n) {
    if (!integer(n))
        fail('VALIDATION_FAILED');
}
export function rangeIndex(value) {
    if (!object(value) || typeof value.key !== 'string'
        || !/^r_[A-Za-z0-9_]{1,62}$/.test(value.key) || !integer(value.first)
        || (value.last !== null && !integer(value.last, value.first)))
        fail();
    const closed = /^r_([0-9]{4,6})_([0-9]{4,6})$/.exec(value.key);
    if (value.last === null ? value.first !== 1 || closed !== null
        : !closed || Number(closed.at(1)) !== value.first
            || Number(closed.at(2)) !== value.last)
        fail();
    return { key: value.key, first: value.first, last: value.last };
}
export function readIndex(value) {
    if (!object(value) || value.kind !== 'set' || !integer(value.first)
        || (value.last !== null && !integer(value.last, value.first))
        || !Array.isArray(value.index) || value.index.length === 0 || value.index.length > 2000)
        fail();
    const ranges = value.index.map(rangeIndex).sort((a, b) => a.first - b.first
        || (b.last ?? Infinity) - (a.last ?? Infinity));
    const keys = new Set();
    const stack = [];
    let covered = value.first - 1;
    for (const r of ranges) {
        if (keys.has(r.key) || r.first < value.first
            || (r.last ?? Infinity) > (value.last ?? Infinity))
            fail();
        keys.add(r.key);
        while (stack.length && (stack.at(-1).last ?? Infinity) < r.first)
            stack.pop();
        const enclosing = stack.at(-1);
        if (enclosing && ((r.last ?? Infinity) > (enclosing.last ?? Infinity)
            || (r.first === enclosing.first && r.last === enclosing.last)))
            fail();
        if (r.first > covered + 1)
            fail();
        covered = Math.max(covered, r.last ?? Infinity);
        stack.push(r);
    }
    if (covered < (value.last ?? Infinity))
        fail();
    return { first: value.first, last: value.last, ranges };
}
export function select(index, n) {
    if (n < index.first || n > (index.last ?? Infinity))
        fail();
    let best;
    for (const r of index.ranges) {
        if (r.first <= n && n <= (r.last ?? Infinity)
            && (!best || (r.last ?? Infinity) - r.first < (best.last ?? Infinity) - best.first)) {
            best = r;
        }
    }
    return best ?? fail();
}
export function copyRecord(value) {
    if (!object(value) || Object.hasOwn(value, 'server'))
        fail();
    const json = JSON.stringify(value);
    if (new TextEncoder().encode(json).length > 81_920)
        fail();
    const copy = JSON.parse(json);
    const freeze = (v) => {
        if (v !== null && typeof v === 'object') {
            for (const child of Object.values(v))
                freeze(child);
            Object.freeze(v);
        }
    };
    freeze(copy);
    return copy;
}
export function recordValue(record, key) {
    for (const [name, value] of Object.entries(record ?? {}))
        if (name === key)
            return value;
    return undefined;
}

export const outcomeStatuses = ['won', 'lost', 'quit', 'cooldown', 'error'];
const record = (v) => typeof v === 'object' && v !== null
    && !Array.isArray(v) && [Object.prototype, null].includes(Object.getPrototypeOf(v));
/** Strict JSON, including finite numbers and UTF-8 size; no lossy JSON.stringify coercions. */
export function isActionJson(value, maxBytes = 16384) {
    const seen = new Set();
    const visit = (v, depth) => {
        if (depth > 64)
            return false;
        if (v === null || typeof v === 'string' || typeof v === 'boolean')
            return true;
        if (typeof v === 'number')
            return Number.isFinite(v);
        if (typeof v !== 'object' || seen.has(v))
            return false;
        seen.add(v);
        const ok = Array.isArray(v) ? v.length === Object.keys(v).length
            && Reflect.ownKeys(v).length === v.length + 1
            && v.every(x => visit(x, depth + 1)) : record(v)
            && Reflect.ownKeys(v).length === Object.keys(v).length
            && Object.values(v).every(x => visit(x, depth + 1));
        seen.delete(v);
        return ok;
    };
    try {
        return visit(value, 0)
            && new TextEncoder().encode(JSON.stringify(value)).length <= maxBytes;
    }
    catch {
        return false;
    }
}
/** Check the mechanic-outcome@1 contract and its JSON size limits. */
export function isMechanicOutcome(value) {
    return record(value) && outcomeStatuses.includes(value.status)
        && (value.attemptId === null || typeof value.attemptId === 'string')
        && (value.reward === undefined || (Number.isInteger(value.reward)
            && value.reward >= 0 && value.reward <= 1e9))
        && (value.availableAt === undefined || (value.status === 'cooldown'
            && Number.isSafeInteger(value.availableAt) && value.availableAt >= 0))
        && (value.data === undefined || isActionJson(value.data)) && isActionJson(value, Infinity);
}
const keywords = ['type', 'properties', 'required', 'additionalProperties', 'items', 'enum', 'const',
    'minimum', 'maximum', 'minLength', 'maxLength', 'minItems', 'maxItems', 'anyOf', 'oneOf', 'allOf',
    'title', 'description', '$schema'];
/** Bounded inline JSON Schema subset; unsupported keywords fail at manifest validation. */
export function validActionSchema(s, depth = 0) {
    if (typeof s === 'boolean')
        return true;
    if (!record(s) || depth > 16 || !isActionJson(s, 32768)
        || Object.keys(s).some(k => !keywords.includes(k)))
        return false;
    if (s.type !== undefined && !['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'].includes(s.type))
        return false;
    if (s.properties !== undefined && (!record(s.properties)
        || !Object.values(s.properties).every(v => validActionSchema(v, depth + 1))))
        return false;
    if (s.required !== undefined && (!Array.isArray(s.required) || !s.required.every(v => typeof v === 'string')))
        return false;
    for (const k of ['items', 'additionalProperties']) {
        if (s[k] !== undefined && !validActionSchema(s[k], depth + 1))
            return false;
    }
    for (const k of ['anyOf', 'oneOf', 'allOf']) {
        if (s[k] !== undefined && (!Array.isArray(s[k]) || !s[k].length
            || !s[k].every(v => validActionSchema(v, depth + 1))))
            return false;
    }
    for (const k of ['minimum', 'maximum', 'minLength', 'maxLength', 'minItems', 'maxItems']) {
        if (s[k] !== undefined && (typeof s[k] !== 'number' || !Number.isFinite(s[k])
            || (k !== 'minimum' && k !== 'maximum' && (!Number.isInteger(s[k]) || s[k] < 0))))
            return false;
    }
    return s.enum === undefined || (Array.isArray(s.enum) && s.enum.length > 0);
}
/** First failing path, or undefined. Values must first pass strict JSON validation. */
export function actionSchemaError(s, v, path) {
    if (s === true)
        return undefined;
    if (s === false)
        return path;
    const equal = (a, b) => {
        if (a === b)
            return true;
        if (Array.isArray(a) && Array.isArray(b))
            return a.length === b.length
                && a.every((x, i) => equal(x, b[i]));
        return record(a) && record(b) && Object.keys(a).length === Object.keys(b).length
            && Object.keys(a).every(k => Object.hasOwn(b, k) && equal(a[k], b[k]));
    };
    if (Object.hasOwn(s, 'const') && !equal(s.const, v))
        return path;
    if (Array.isArray(s.enum) && !s.enum.some(x => equal(x, v)))
        return path;
    for (const key of ['anyOf', 'oneOf', 'allOf']) {
        if (!Array.isArray(s[key]))
            continue;
        const count = s[key]
            .filter(x => actionSchemaError(x, v, path) === undefined).length;
        if (key === 'anyOf' ? count === 0 : key === 'oneOf' ? count !== 1
            : count !== s[key].length)
            return path;
    }
    const type = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
    if (s.type !== undefined && s.type !== type && !(s.type === 'integer' && Number.isInteger(v)))
        return path;
    if (typeof v === 'number' && ((typeof s.minimum === 'number' && v < s.minimum)
        || (typeof s.maximum === 'number' && v > s.maximum)))
        return path;
    const length = typeof v === 'string' ? [...v].length : Array.isArray(v) ? v.length : undefined;
    if (length !== undefined) {
        const min = s[typeof v === 'string' ? 'minLength' : 'minItems'];
        const max = s[typeof v === 'string' ? 'maxLength' : 'maxItems'];
        if ((typeof min === 'number' && length < min) || (typeof max === 'number' && length > max))
            return path;
    }
    if (Array.isArray(v) && s.items !== undefined) {
        for (let i = 0; i < v.length; i++) {
            const error = actionSchemaError(s.items, v[i], `${path}[${i}]`);
            if (error)
                return error;
        }
    }
    if (record(v)) {
        if (Array.isArray(s.required))
            for (const k of s.required) {
                if (!Object.hasOwn(v, k))
                    return `${path}.${k}`;
            }
        for (const [k, x] of Object.entries(v)) {
            const sub = record(s.properties) && Object.hasOwn(s.properties, k)
                ? s.properties[k] : s.additionalProperties;
            if (sub !== undefined) {
                const error = actionSchemaError(sub, x, `${path}.${k}`);
                if (error)
                    return error;
            }
        }
    }
    return undefined;
}
export function validModuleActions(v) {
    return record(v) && Object.keys(v).every(k => k === 'callable') && record(v.callable)
        && Object.keys(v.callable).length <= 32 && Object.entries(v.callable).every(([name, a]) => /^[a-z][a-z0-9-]{0,63}$/.test(name) && record(a)
        && Object.keys(a).every(k => k === 'params' || k === 'result')
        && (a.params === undefined || validActionSchema(a.params))
        && (a.result === undefined || a.result === 'mechanic-outcome@1' || validActionSchema(a.result)));
}
//# sourceMappingURL=actions.js.map
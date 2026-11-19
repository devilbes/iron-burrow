import { recordValue } from './levels-validation.js';
import { fail, freeze, integer, plain } from './mechanic-validation.js';
export function createCurve(spec, refine) {
    const bad = (path) => fail('MECHANIC_CURVE_INVALID', { path });
    if (!plain(spec))
        bad('spec');
    const keys = Object.keys(spec);
    const copied = Object.fromEntries(keys.map(k => {
        const p = recordValue(spec, k);
        if (k === 'level' || /[$.]/.test(k) || k.includes('\0')
            || ['constructor', 'prototype', '__proto__', '_bsontype'].includes(k) || !plain(p)
            || Object.keys(p).some(x => !['min', 'max'].includes(x))
            || !Number.isSafeInteger(p.min) || !Number.isSafeInteger(p.max)
            || p.min > p.max)
            bad(`spec.${k}`);
        return [k, { min: p.min, max: p.max }];
    }));
    freeze(copied);
    const check = (v, path) => {
        if (!plain(v) || Object.keys(v).length !== keys.length)
            return bad(path);
        for (const k of keys)
            if (!Object.hasOwn(v, k) || !integer(recordValue(v, k), recordValue(copied, k).min, recordValue(copied, k).max))
                bad(`${path}.${k}`);
        return { ...v };
    };
    const validate = (points) => {
        if (!Array.isArray(points) || points.length < 1 || points.length > 32)
            return bad('');
        let previous = 0;
        return freeze(points.map((p, i) => {
            if (!plain(p) || !integer(p.level, 1, 1_000_000) || p.level <= previous
                || (i === 0 && p.level !== 1))
                return bad(`[${i}].level`);
            previous = p.level;
            const { level: n, ...params } = p;
            return { level: n, ...check(params, `[${i}]`) };
        }));
    };
    const jsonSchema = freeze({ type: 'array', minItems: 1, maxItems: 32,
        items: { type: 'object', required: ['level', ...keys], additionalProperties: false,
            properties: { level: { type: 'integer', minimum: 1, maximum: 1_000_000 },
                ...Object.fromEntries(keys.map(k => [k, { type: 'integer',
                        minimum: recordValue(copied, k).min,
                        maximum: recordValue(copied, k).max }])) } } });
    return Object.freeze({ spec: copied, jsonSchema, validate,
        evaluate(n, points) {
            if (!integer(n, 0, 1_000_000))
                fail('MECHANIC_LEVEL_INVALID');
            n = Math.max(1, n);
            const checked = validate(points);
            let a = checked.at(0);
            let b = a;
            for (const p of checked) {
                if (p.level <= n)
                    a = b = p;
                else {
                    b = p;
                    break;
                }
            }
            const params = Object.fromEntries(keys.map(k => {
                let v = BigInt(recordValue(a, k));
                if (b.level !== a.level) {
                    const numerator = (BigInt(recordValue(b, k)) - v) * BigInt(n - a.level);
                    const denominator = BigInt(b.level - a.level);
                    v += numerator / denominator - (numerator < 0n
                        && numerator % denominator !== 0n ? 1n : 0n);
                }
                return [k, Math.min(recordValue(copied, k).max, Math.max(recordValue(copied, k).min, Number(v)))];
            }));
            return freeze(check(refine ? refine(params) : params, 'refine'));
        },
    });
}

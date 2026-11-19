import { createRandom, restoreRandom } from './random.js';
import vectors from './random.vectors.json' with { type: 'json' };
/** Throws on any golden-vector mismatch; defaults to the portable server implementation. */
export function assertRandomConformance(api = { createRandom, restoreRandom }) {
    const equal = (actual, expected, label) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected))
            throw new Error(`CM-72 mismatch: ${label}`);
    };
    for (const vector of vectors.vectors) {
        const random = api.createRandom(vector.seed);
        equal(random.snapshot().state, vector.state.map(word => parseInt(word, 16)), 'initial state');
        equal(vector.nextUint32.map(() => random.nextUint32()), vector.nextUint32, 'nextUint32');
        const fractions = api.createRandom(vector.seed);
        equal(vector.nextUint32.map(() => fractions.next()), vector.nextUint32.map(word => word / 2 ** 32), 'next');
    }
    const derived = vectors.derived;
    const dice = api.createRandom(derived.seed);
    equal(derived.dice.map(() => dice.int(1, 6)), derived.dice, 'dice');
    const input = Object.freeze(Array.from({ length: 10 }, (_, i) => i));
    equal(api.createRandom(derived.seed).shuffle(input), derived.shuffle, 'shuffle');
    equal(input, Array.from({ length: 10 }, (_, i) => i), 'shuffle input');
    const signed = api.createRandom(derived.seed);
    equal(signed.int(0, 2 ** 32 - 1), vectors.vectors[3].nextUint32[0], 'full uint32 range');
    equal(derived.signed.map(() => signed.int(-5, 5)), derived.signed, 'signed');
    const rejection = api.createRandom(derived.seed);
    // First word exceeds the acceptance limit; the second must be used.
    equal(rejection.int(0, 2 ** 31), vectors.vectors[3].nextUint32[1], 'rejection sampling');
    equal(rejection.nextUint32(), vectors.vectors[3].nextUint32[2], 'rejection draw count');
    const v = vectors.continuation;
    const original = api.createRandom(v.seed);
    for (let i = 0; i < v.skipUint32; i++)
        original.nextUint32();
    equal(original.snapshot(), v.snapshot, 'snapshot');
    for (const random of [original, api.restoreRandom(JSON.parse(JSON.stringify(v.snapshot)))]) {
        equal(random.nextUint32(), v.nextUint32, 'continued word');
        equal(random.int(0, 2 ** 31), v.int, 'continued int');
        equal(random.next(), v.next, 'continued next');
        equal(random.shuffle(input), v.shuffle, 'continued shuffle');
        equal(random.pick(['a', 'b', 'c']), v.pick, 'continued pick');
        equal(random.snapshot(), v.finalSnapshot, 'final snapshot');
    }
}
//# sourceMappingURL=random-conformance.js.map
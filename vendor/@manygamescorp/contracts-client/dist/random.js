/** Portable ASCII seed shared by levels and mechanics. */
export const SEED_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
/** Tests the seed format without coercion. */
export function isSeed(value) {
    return typeof value === 'string' && SEED_PATTERN.test(value);
}
/** 128 cryptographically random bits encoded as 22 unpadded base64url characters. */
export function createSeed() {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_')
        .replaceAll('=', '');
}
const mask = (1n << 64n) - 1n;
const rotl = (x, n) => ((x << n) | (x >>> (32 - n))) >>> 0;
function fail(code) { throw new Error(code); }
/** Creates a deterministic stream; seed case and every ASCII byte are significant. */
export function createRandom(seed, invalid = fail) {
    if (!isSeed(seed))
        invalid('RANDOM_SEED_INVALID');
    let h = 0xcbf29ce484222325n;
    for (const char of seed)
        h = ((h ^ BigInt(char.charCodeAt(0))) * 0x100000001b3n) & mask;
    const s = Array.from({ length: 4 }, () => {
        h = (h + 0x9e3779b97f4a7c15n) & mask;
        let z = ((h ^ (h >> 30n)) * 0xbf58476d1ce4e5b9n) & mask;
        z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & mask;
        return Number((z ^ (z >> 31n)) >> 32n) >>> 0;
    });
    if (!s.some(x => x !== 0))
        s[0] = 1;
    return stream(s, invalid);
}
/** Restores a detached stream; malformed or unsupported snapshots raise RANDOM_STATE_INVALID. */
export function restoreRandom(snapshot, invalid = fail) {
    if (typeof snapshot !== 'object' || snapshot === null || Array.isArray(snapshot)) {
        invalid('RANDOM_STATE_INVALID');
    }
    const value = snapshot;
    if (Object.keys(value).length !== 3 || !Object.hasOwn(value, 'version')
        || !Object.hasOwn(value, 'algorithm') || !Object.hasOwn(value, 'state')
        || value.version !== 1 || value.algorithm !== 'CM-72' || !Array.isArray(value.state)
        || value.state.length !== 4)
        invalid('RANDOM_STATE_INVALID');
    const state = Array.from(value.state);
    if (!state.every(word => typeof word === 'number' && Number.isInteger(word)
        && word >= 0 && word <= 0xffff_ffff) || !state.some(word => word !== 0)) {
        invalid('RANDOM_STATE_INVALID');
    }
    return stream(state, invalid);
}
function stream(s, invalid) {
    const nextUint32 = () => {
        const r = Math.imul(rotl(Math.imul(s[1], 5), 7), 9) >>> 0;
        const t = s[1] << 9;
        s[2] = s[2] ^ s[0];
        s[3] = s[3] ^ s[1];
        s[1] = s[1] ^ s[2];
        s[0] = s[0] ^ s[3];
        s[2] = s[2] ^ t;
        s[3] = rotl(s[3], 11);
        return r;
    };
    const int = (min, max) => {
        const range = max - min + 1;
        if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max)
            || min > max || range > 0x1_0000_0000)
            invalid('RANDOM_RANGE_INVALID');
        const limit = Math.floor(0x1_0000_0000 / range) * range;
        let u;
        do {
            u = nextUint32();
        } while (u >= limit);
        return min + u % range;
    };
    return Object.freeze({
        snapshot() {
            return Object.freeze({ version: 1, algorithm: 'CM-72',
                state: Object.freeze([s[0] >>> 0, s[1] >>> 0, s[2] >>> 0, s[3] >>> 0]) });
        },
        nextUint32, next: () => nextUint32() / 0x1_0000_0000, int,
        pick(items) {
            if (items.length === 0)
                invalid('RANDOM_RANGE_INVALID');
            return items[int(0, items.length - 1)];
        },
        shuffle(items) {
            const out = [...items];
            for (let i = out.length - 1; i > 0; i--) {
                const j = int(0, i);
                [out[i], out[j]] = [out[j], out[i]];
            }
            return out;
        },
    });
}
//# sourceMappingURL=random.js.map
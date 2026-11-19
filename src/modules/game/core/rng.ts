// Seeded PRNG of the simulation (GDD 10 §2): mulberry32, separate streams from the run seed.
// Math.random and the clock are never used by the rules.

export interface Rng { (): number; state: number }

/** mulberry32: a float in [0, 1) per call; `state` is the whole generator (plain uint32). */
export function mulberry32(seed: number): Rng {
  const next = (() => {
    next.state = (next.state + 0x6d2b79f5) >>> 0;
    let t = next.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }) as Rng;
  next.state = seed >>> 0;
  return next;
}

/** Stream salts: rngAI, rngDrop, rngGen (GDD 10 §2). */
export const STREAM = Object.freeze({ ai: 0xa1a1, drop: 0xd20d, gen: 0x6e6e } as const);

/** The uint32 run seed of a server seed string (FNV-1a 32); a numeric string is taken as is. */
export function runSeedOf(seed: string | number): number {
  if (typeof seed === 'number') return seed >>> 0;
  if (/^\d{1,10}$/.test(seed) && Number(seed) <= 0xffffffff) return Number(seed) >>> 0;
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Index by weights (all ≥ 0, sum > 0) with one draw of `rng`. */
export function weighted(rng: () => number, weights: readonly number[]): number {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i] ?? 0;
    if (roll < 0) return i;
  }
  return weights.length - 1;
}

/** Fisher–Yates shuffle in place with `rng`. */
export function shuffle<T>(list: T[], rng: () => number): T[] {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = list[i] as T;
    list[i] = list[j] as T;
    list[j] = tmp;
  }
  return list;
}

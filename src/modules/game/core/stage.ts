// Stage data (GDD 12 §1): a level entry of the level record turned into a checked StageDef, and
// the enemy composition rules of the campaign (12 §2) and of Siege waves (12 §5).
import { ENEMY_TYPES, type EnemyType, type Tunables } from './config.js';
import { mulberry32, shuffle } from './rng.js';

/** Cell types (bricks and steel live per quarter in the field). */
export const CELL = Object.freeze({ empty: 0, lava: 1, roots: 2, oil: 3, core: 4 } as const);
/** Quarter materials. */
export const MAT = Object.freeze({ none: 0, brick: 1, steel: 2 } as const);

export interface StageDef {
  readonly id: string;
  /** Campaign stage number (1…30); 0 for the Siege arena. */
  readonly index: number;
  readonly chapter: number;
  readonly theme: string;
  readonly grid: readonly string[];
  /** Remaining-quarter masks of `B`/`S` cells: key `col,row`, 1=TL 2=TR 4=BL 8=BR. */
  readonly quarters: ReadonlyMap<string, number>;
  /** Spawn order of the campaign stage; empty for Siege (waves are generated). */
  readonly enemies: readonly EnemyType[];
  readonly maxAlive: number;
  /** Seconds between spawns. */
  readonly spawnInterval: number;
  readonly siege: boolean;
}

export class StageDataError extends Error {
  constructor(message: string) { super(message); this.name = 'StageDataError'; }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

function parseQuarters(raw: unknown): Map<string, number> {
  const out = new Map<string, number>();
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!isRecord(item)) throw new StageDataError('quarters item');
      const { col, row, mask } = item;
      if (!Number.isInteger(col) || !Number.isInteger(row) || !Number.isInteger(mask)) throw new StageDataError('quarters item');
      out.set(`${col as number},${row as number}`, (mask as number) & 15);
    }
  } else if (isRecord(raw)) {
    for (const [key, hex] of Object.entries(raw)) {
      const mask = typeof hex === 'number' ? hex : Number.parseInt(String(hex), 16);
      if (!/^\d+,\d+$/.test(key) || !Number.isInteger(mask)) throw new StageDataError(`quarters ${key}`);
      out.set(key, mask & 15);
    }
  } else if (raw !== undefined) throw new StageDataError('quarters');
  return out;
}

/** A level entry (record `entries[]` or a `configs/levels` file) as a StageDef; throws on bad data. */
export function parseStage(entry: unknown, tun: Tunables): StageDef {
  if (!isRecord(entry)) throw new StageDataError('entry');
  const grid = entry.grid;
  if (!Array.isArray(grid) || grid.length !== tun.cells || !grid.every((row) => typeof row === 'string' && row.length === tun.cells
    && /^[.BSLROC]+$/.test(row))) throw new StageDataError('grid');
  const [cx, cy] = tun.core;
  if ((grid[cy] as string)[cx] !== 'C' || grid.join('').split('C').length !== 2) throw new StageDataError('core');
  const siege = !Array.isArray(entry.enemies);
  const enemies = siege ? [] : (entry.enemies as unknown[]).map((type) => {
    if (!ENEMY_TYPES.includes(type as EnemyType)) throw new StageDataError(`enemy ${String(type)}`);
    return type as EnemyType;
  });
  if (!siege && enemies.length !== tun.stageEnemies) throw new StageDataError('enemies count');
  const index = Number.isInteger(entry.index) ? (entry.index as number) : 0;
  const chapter = Number.isInteger(entry.chapter) ? (entry.chapter as number) : 1;
  const byChapter = (list: readonly number[]): number => list[Math.min(Math.max(chapter, 1), list.length) - 1] ?? 0;
  const maxAlive = typeof entry.maxAlive === 'number' ? entry.maxAlive : byChapter(tun.maxAliveByChapter);
  const spawnInterval = typeof entry.spawnInterval === 'number' ? entry.spawnInterval : byChapter(tun.spawnIntervalByChapter);
  return { id: String(entry.id ?? ''), index, chapter, theme: String(entry.theme ?? ''), grid: grid as string[],
    quarters: parseQuarters(entry.quarters), enemies, maxAlive, spawnInterval, siege };
}

/** Campaign composition of stage N (GDD 12 §2): counts per type. */
export function campaignMix(n: number, finales: readonly number[] = [10, 20, 30]): Record<EnemyType, number> {
  const brute = Math.floor((n - 1) / 5) + (finales.includes(n) ? 1 : 0);
  const gunner = Math.min(Math.floor((n + 1) / 3), 6);
  const scout = Math.min(2 + Math.floor(n / 4), 7);
  return { brute, gunner, scout, grunt: 20 - brute - gunner - scout };
}

/** Deterministic spawn order of a campaign stage (GDD 12 §2, D-12-01), slots 1…20. */
export function campaignOrder(n: number): EnemyType[] {
  const mix = campaignMix(n);
  const slots: (EnemyType | null)[] = Array.from({ length: 21 }, () => null);
  for (let i = 0; i < mix.brute; i++) slots[4 + Math.floor(((i + 0.5) * 17) / mix.brute)] = 'brute';
  const fill = (type: EnemyType, count: number, from: number): void => {
    const free: number[] = [];
    for (let s = from; s <= 20; s++) if (slots[s] === null) free.push(s);
    for (let i = 0; i < count; i++) slots[free[Math.floor(((i + 0.5) * free.length) / count)] as number] = type;
  };
  fill('gunner', mix.gunner, 2);
  fill('scout', mix.scout, 1);
  return slots.slice(1).map((type) => type ?? 'grunt');
}

/** Siege wave w (1-based): size, composition, spawn order (seeded by runSeed + w), limits. */
export interface Wave {
  readonly w: number;
  readonly order: readonly EnemyType[];
  readonly maxAlive: number;
  /** Ticks between spawns. */
  readonly interval: number;
  /** AI fire multiplier of the wave. */
  readonly fireMult: number;
}

export function siegeMix(w: number, tun: Tunables): Record<EnemyType, number> {
  const s = tun.siege;
  const size = s.waveSize;
  const brute = Math.min(Math.round(s.bruteShare.perWave * size) * w, Math.round(s.bruteShare.cap * size));
  const gunner = Math.min(Math.floor(w / s.gunner.div), s.gunner.cap);
  const scout = Math.min(s.scout.base + Math.floor(w / s.scout.div), s.scout.cap);
  return { brute, gunner, scout, grunt: Math.max(0, size - brute - gunner - scout) };
}

export function siegeWave(w: number, runSeed: number, tun: Tunables): Wave {
  const mix = siegeMix(w, tun);
  const order: EnemyType[] = [];
  for (const type of ENEMY_TYPES) for (let i = 0; i < mix[type]; i++) order.push(type);
  shuffle(order, mulberry32((runSeed + w) >>> 0));
  const s = tun.siege;
  const seconds = Math.max(s.interval.min, s.interval.start - s.interval.step * (w - 1));
  return { w, order, maxAlive: Math.min(s.maxAlive.base + Math.floor(w / s.maxAlive.div), s.maxAlive.cap),
    interval: Math.round(seconds * tun.tps), fireMult: Math.min(1 + s.fireMult.step * (w - 1), s.fireMult.cap) };
}

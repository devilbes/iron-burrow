// Game numbers: the game.* config records (GDD 31 plat.configs) turned into simulation units.
// Every value comes from a record; a key that is missing or has the wrong shape falls back to
// the built-in copy of the published record (records.default.json), key by key.
import DEFAULT_RECORDS from './records.default.json' with { type: 'json' };

export type EnemyType = 'scout' | 'grunt' | 'gunner' | 'brute';
export type PowerupType = 'star' | 'bubble' | 'rebar' | 'quake' | 'freeze' | 'hull';
export type BoosterKind = 'bubble' | 'shockwave' | 'fortify' | 'hull';
export type BattleBooster = Exclude<BoosterKind, 'hull'>;

export const ENEMY_TYPES: readonly EnemyType[] = ['scout', 'grunt', 'gunner', 'brute'];
export const POWERUP_TYPES: readonly PowerupType[] = ['star', 'bubble', 'rebar', 'quake', 'freeze', 'hull'];
export const BATTLE_BOOSTERS: readonly BattleBooster[] = ['bubble', 'shockwave', 'fortify'];

/** The record keys the game reads (scope `game`). */
export type RecordKey = keyof typeof DEFAULT_RECORDS & `game.${string}`;
export type GameRecords = { readonly [K in RecordKey]?: unknown };

export interface EnemyTune { readonly speed: number; readonly hp: number; readonly points: number;
  readonly bulletSpeed: number; readonly fireP: number }

/** Simulation numbers: lengths in units (1 cell = `unit`), speeds in units per tick, times in ticks. */
export interface Tunables {
  readonly unit: number;
  readonly tps: number;
  readonly cells: number;
  readonly core: readonly [number, number];
  readonly playerSpawn: readonly [number, number];
  readonly enemySpawns: readonly (readonly [number, number])[];
  readonly maxTicksPerFrame: number;
  readonly maxFrameMs: number;
  readonly playerSpeed: number;
  readonly lives: number;
  readonly bulletSpeed: number;
  readonly fastBulletSpeed: number;
  readonly gunL2Bullets: number;
  readonly gunCarry: boolean;
  readonly oilSlide: number;
  readonly stageEnemies: number;
  readonly carriers: readonly number[];
  readonly maxAliveByChapter: readonly number[];
  readonly spawnIntervalByChapter: readonly number[];
  readonly fireMultByChapter: readonly number[];
  readonly score: { readonly clear: number; readonly life: number; readonly pickup: number; readonly maxLivesCheck: number };
  readonly ticks: {
    readonly intro: number; readonly clearDelay: number; readonly defeatDelay: number;
    readonly continueReady: number; readonly firstSpawn: number; readonly spawnAnim: number;
    readonly respawn: number; readonly fireCooldown: number; readonly boosterCooldown: number;
    readonly spawnShield: number; readonly powerupTtl: number; readonly bubblePowerup: number;
    readonly rebar: number; readonly freeze: number; readonly bubbleBooster: number;
    readonly fortify: number; readonly aiDecision: number; readonly aiFireCheck: number;
    readonly aiStuck: number; readonly waveBreak: number;
  };
  readonly threatRadius: number;
  readonly levelEndRetryMs: readonly number[];
  readonly consumeRetryMs: readonly number[];
  readonly ai: { readonly weights: readonly [number, number, number]; readonly aimFireP: number; readonly brickKeepP: number };
  readonly enemies: Readonly<Record<EnemyType, EnemyTune>>;
  readonly powerupWeights: readonly number[];
  readonly powerupMaxOnField: number;
  readonly quakeScores: boolean;
  readonly boosters: {
    readonly limits: Readonly<Record<BattleBooster, number>>;
    readonly hullPrestage: number; readonly hullContinue: number;
    readonly continueLives: number; readonly continueRebuildCore: boolean; readonly siegeMult: number;
  };
  readonly siege: {
    readonly unlockAfter: number; readonly waveSize: number;
    readonly maxAlive: { readonly base: number; readonly div: number; readonly cap: number };
    readonly bruteShare: { readonly perWave: number; readonly cap: number };
    readonly gunner: { readonly div: number; readonly cap: number };
    readonly scout: { readonly base: number; readonly div: number; readonly cap: number };
    readonly interval: { readonly start: number; readonly step: number; readonly min: number };
    readonly fireMult: { readonly step: number; readonly cap: number };
    readonly carriers: readonly number[]; readonly lives: number; readonly continueMax: number;
    readonly waveBonus: number;
    /** Kill multiplier step in tenths: kill × (10 + step·(w−1)) / 10, integer (D-11-02). */
    readonly killMultTenths: number;
  };
}

type Json = null | boolean | number | string | readonly Json[] | { readonly [key: string]: Json };

const kindOf = (value: unknown): string => (Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value);

/** `value` where it has the shape of `fallback` (recursively), `fallback` elsewhere. */
export function mergeShape<T>(fallback: T, value: unknown): T {
  if (kindOf(value) !== kindOf(fallback)) return fallback;
  if (typeof fallback === 'number') return (Number.isFinite(value) ? value : fallback) as T;
  if (Array.isArray(fallback)) {
    const list = value as unknown[];
    if (list.length === 0 || fallback.length === 0) return (list.length ? list : fallback) as T;
    const sample = fallback[0] as Json;
    return (list.every((item) => kindOf(item) === kindOf(sample)) ? list.map((item) => mergeShape(sample, item)) : fallback) as T;
  }
  if (typeof fallback === 'object' && fallback !== null) {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(fallback)) out[key] = mergeShape(item, (value as Record<string, unknown>)[key]);
    return out as T;
  }
  return value as T;
}

type Records = typeof DEFAULT_RECORDS;

/** The records as the game reads them: each published key over the built-in copy. */
export function readRecords(records: GameRecords = {}): Records {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(DEFAULT_RECORDS) as (keyof Records)[]) {
    out[key] = key.startsWith('game.') ? mergeShape(DEFAULT_RECORDS[key], (records as Record<string, unknown>)[key]) : DEFAULT_RECORDS[key];
  }
  return out as Records;
}

const pair = (value: readonly number[]): readonly [number, number] => [value[0] ?? 0, value[1] ?? 0];

/** Tunables from the game.* records (missing keys from the built-in copy). */
export function createTunables(records: GameRecords = {}): Tunables {
  const r = readRecords(records);
  const bal = r['game.balance'];
  const unit = bal.unit_per_cell;
  const tps = bal.ticks_per_second;
  const t = (seconds: number): number => Math.round(seconds * tps);
  const speed = (cellsPerSecond: number): number => Math.round((cellsPerSecond * unit) / tps);
  const enemy = (type: EnemyType): EnemyTune => {
    const e = r['game.enemies'][type] as { speed: number; hp: number; points: number; fast_bullet?: boolean };
    return { speed: speed(e.speed), hp: e.hp, points: e.points, fireP: bal.ai.fire_p[type],
      bulletSpeed: speed(e.fast_bullet ? bal.gun_l1_bullet_speed : bal.bullet_speed) };
  };
  const pw = r['game.powerups'];
  const bo = r['game.boosters'];
  const sg = r['game.siege'];
  return {
    unit, tps, cells: bal.field_cells, core: pair(bal.core_cell), playerSpawn: pair(bal.player_spawn),
    enemySpawns: bal.enemy_spawns.map(pair), maxTicksPerFrame: bal.max_ticks_per_frame, maxFrameMs: bal.max_frame_ms,
    playerSpeed: speed(bal.player_speed), lives: bal.player_lives, bulletSpeed: speed(bal.bullet_speed),
    fastBulletSpeed: speed(bal.gun_l1_bullet_speed), gunL2Bullets: bal.gun_l2_bullets, gunCarry: bal.gun_carry_campaign,
    oilSlide: Math.round(bal.oil_slide_cells * unit), stageEnemies: bal.stage_enemies, carriers: bal.carrier_indices,
    maxAliveByChapter: bal.max_alive_by_chapter, spawnIntervalByChapter: bal.spawn_interval_s_by_chapter,
    fireMultByChapter: bal.fire_mult_by_chapter,
    score: { clear: bal.score_clear_bonus, life: bal.score_life_bonus, pickup: bal.score_powerup, maxLivesCheck: bal.score_max_lives_check },
    ticks: {
      intro: t(bal.intro_s), clearDelay: t(bal.clear_delay_s), defeatDelay: t(bal.defeat_delay_s),
      continueReady: t(bal.continue_ready_s), firstSpawn: t(bal.first_spawn_delay_s), spawnAnim: t(bal.enemy_spawn_anim_s),
      respawn: t(bal.player_respawn_delay_s), fireCooldown: t(bal.player_fire_cooldown_s), boosterCooldown: t(bal.booster_cooldown_s),
      spawnShield: t(bal.spawn_shield_s), powerupTtl: t(pw.lifetime_s), bubblePowerup: t(pw.bubble_s), rebar: t(pw.rebar_s),
      freeze: t(pw.freeze_s), bubbleBooster: t(bo.bubble.duration_s), fortify: t(bo.fortify.duration_s),
      aiDecision: t(bal.ai.decision_s), aiFireCheck: t(bal.ai.fire_check_s), aiStuck: t(bal.ai.stuck_s), waveBreak: t(sg.wave_break_s),
    },
    threatRadius: Math.round(bal.threat_radius_cells * unit),
    levelEndRetryMs: bal.level_end_retry_s.map((s) => s * 1000),
    consumeRetryMs: bo.consume_retry_s.map((s) => s * 1000),
    ai: { weights: [bal.ai.weights.core, bal.ai.weights.player, bal.ai.weights.random], aimFireP: bal.ai.aim_fire_p, brickKeepP: bal.ai.brick_keep_dir_p },
    enemies: { scout: enemy('scout'), grunt: enemy('grunt'), gunner: enemy('gunner'), brute: enemy('brute') },
    powerupWeights: POWERUP_TYPES.map((type) => pw.weights[type]), powerupMaxOnField: pw.max_on_field, quakeScores: pw.quake_scores,
    boosters: {
      limits: { bubble: bo.bubble.max_per_stage, shockwave: bo.shockwave.max_per_stage, fortify: bo.fortify.max_per_stage },
      hullPrestage: bo.hull.prestage_max, hullContinue: bo.hull.continue_max, continueLives: bo.hull.continue_lives,
      continueRebuildCore: bo.hull.continue_rebuild_core, siegeMult: bo.siege_limit_mult,
    },
    siege: {
      unlockAfter: sg.unlock_after_stage, waveSize: sg.wave_size,
      maxAlive: { base: sg.max_alive.base, div: sg.max_alive.wave_div, cap: sg.max_alive.cap },
      bruteShare: { perWave: sg.brute_share.per_wave, cap: sg.brute_share.cap },
      gunner: { div: sg.gunner.wave_div, cap: sg.gunner.cap },
      scout: { base: sg.scout.base, div: sg.scout.wave_div, cap: sg.scout.cap },
      interval: sg.spawn_interval, fireMult: sg.fire_mult, carriers: sg.carrier_indices,
      lives: sg.lives, continueMax: sg.continue_max, waveBonus: sg.wave_clear_bonus_per_wave,
      killMultTenths: Math.round(sg.kill_mult_per_wave * 10),
    },
  };
}

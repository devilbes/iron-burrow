// The state of one run (a campaign stage or a Siege run) and its creation. All positions are
// integer units, all timers are ticks; the state is plain data the render reads as it is.
import type { BattleBooster, EnemyType, PowerupType, Tunables } from './config.js';
import { createField, type Dir, type Field } from './field.js';
import { mulberry32, STREAM, type Rng } from './rng.js';
import { siegeWave, type StageDef, type Wave } from './stage.js';

export type Phase = 'intro' | 'playing' | 'cleared' | 'defeated';
export type DefeatCause = 'core' | 'lives';

export interface Tank {
  readonly id: number;
  x: number;
  y: number;
  dir: Dir;
  /** Distance moved in the last tick (0 = blocked or standing). */
  moved: number;
}

export interface Player extends Tank {
  alive: boolean;
  gun: number;
  fireCooldown: number;
  shield: number;
  respawn: number;
  slide: number;
  driving: boolean;
}

export interface Enemy extends Tank {
  readonly type: EnemyType;
  /** 1-based spawn number in the stage (or in the wave in Siege). */
  readonly slot: number;
  readonly wave: number;
  hp: number;
  carrier: boolean;
  /** Ticks of the spawn animation left: not solid, not hittable, not acting. */
  spawning: number;
  decisionTimer: number;
  fireTimer: number;
  wantDecision: boolean;
  stuck: number;
  fire: boolean;
  /** Direction of the shot the AI decided on (the tank may turn before the shot leaves). */
  fireDir: Dir;
}

export interface Bullet {
  readonly id: number;
  /** 0 = player, otherwise the enemy id. */
  readonly owner: number;
  x: number;
  y: number;
  readonly dir: Dir;
  readonly speed: number;
  readonly steel: boolean;
}

export interface Powerup { readonly type: PowerupType; readonly col: number; readonly row: number; ttl: number }

export type GameEvent =
  | { readonly t: 'spawn'; readonly id: number; readonly type: EnemyType; readonly carrier: boolean }
  | { readonly t: 'player_spawn' }
  | { readonly t: 'shot'; readonly owner: number }
  | { readonly t: 'hit'; readonly id: number; readonly hp: number }
  | { readonly t: 'kill'; readonly id: number; readonly type: EnemyType; readonly points: number; readonly by: 'bullet' | 'shockwave' | 'quake' }
  | { readonly t: 'drop'; readonly type: PowerupType; readonly col: number; readonly row: number }
  | { readonly t: 'pickup'; readonly type: PowerupType; readonly points: number }
  | { readonly t: 'powerup_expired' }
  | { readonly t: 'tile'; readonly quarters: readonly (readonly [number, number])[]; readonly steel: boolean }
  | { readonly t: 'bullet_block'; readonly owner: number; readonly x?: number; readonly y?: number; readonly on?: 'tile' | 'tank' }
  | { readonly t: 'clash'; readonly x?: number; readonly y?: number }
  | { readonly t: 'shield_block'; readonly x?: number; readonly y?: number }
  | { readonly t: 'player_death'; readonly lives: number }
  | { readonly t: 'threat' }
  | { readonly t: 'core_destroyed'; readonly owner: number }
  | { readonly t: 'booster'; readonly kind: BattleBooster }
  | { readonly t: 'wave_start'; readonly w: number }
  | { readonly t: 'wave_clear'; readonly w: number; readonly bonus: number }
  | { readonly t: 'playing' }
  | { readonly t: 'cleared' }
  | { readonly t: 'defeated'; readonly cause: DefeatCause }
  | { readonly t: 'continue' };

/** Input of one tick. */
export interface Command {
  readonly dir: Dir | null;
  readonly fire: boolean;
  readonly booster?: BattleBooster;
}

export interface RunOptions {
  readonly stage: StageDef;
  readonly tun: Tunables;
  readonly seed: number;
  /** Gun level carried in from the previous stage (campaign, D-10-06). */
  readonly gun?: number;
  /** Spare Hulls taken in pre-stage (each +1 life). */
  readonly extraLives?: number;
}

export interface RunState {
  readonly tun: Tunables;
  readonly stage: StageDef;
  readonly siege: boolean;
  readonly seed: number;
  readonly field: Field;
  readonly rngAI: Rng;
  readonly rngDrop: Rng;
  tick: number;
  phase: Phase;
  /** Ticks spent in the current phase. */
  phaseTicks: number;
  cause: DefeatCause | null;
  coreAlive: boolean;
  player: Player;
  enemies: Enemy[];
  bullets: Bullet[];
  powerup: Powerup | null;
  nextId: number;
  /** Spawn queue: enemy types still to come (campaign: the stage order; Siege: the wave). */
  queue: { type: EnemyType; slot: number }[];
  spawnTimer: number;
  spawnPoint: number;
  maxAlive: number;
  spawnInterval: number;
  fireMult: number;
  lives: number;
  deaths: number;
  /** Enemies destroyed (bullets, Shockwave, quake): the stage is clear at stageEnemies. */
  destroyed: number;
  kills: Record<EnemyType, number>;
  pickups: number;
  score: number;
  freeze: number;
  /** Core wall effect (Steel Fortress / rebar): ticks left; at 0 the wall turns back to brick. */
  wallSteel: number;
  /** Wall quarters that could not be refilled under a tank: index → material. */
  wallPending: Map<number, number>;
  boostersUsed: Record<BattleBooster, number>;
  boosterCooldown: number;
  continues: number;
  threat: boolean;
  /** Siege wave in play (1-based); 0 in the campaign. */
  wave: number;
  waveData: Wave | null;
  waveKilled: number;
  waveBreak: number;
  waveScore: number;
  events: GameEvent[];
}

const byChapter = (list: readonly number[], chapter: number): number => list[Math.min(Math.max(chapter, 1), list.length) - 1] ?? 1;

export function createRun(options: RunOptions): RunState {
  const { stage, tun } = options;
  const seed = options.seed >>> 0;
  const siege = stage.siege;
  const [px, py] = tun.playerSpawn;
  const player: Player = { id: 0, x: px * tun.unit, y: py * tun.unit, dir: 0, moved: 0, alive: true,
    gun: siege ? 0 : Math.max(0, Math.min(3, options.gun ?? 0)), fireCooldown: 0, shield: tun.ticks.spawnShield,
    respawn: 0, slide: 0, driving: false };
  const state: RunState = {
    tun, stage, siege, seed, field: createField(stage, tun),
    rngAI: mulberry32(seed ^ STREAM.ai), rngDrop: mulberry32(seed ^ STREAM.drop),
    tick: 0, phase: 'intro', phaseTicks: 0, cause: null, coreAlive: true, player, enemies: [], bullets: [], powerup: null,
    nextId: 1, queue: siege ? [] : stage.enemies.map((type, i) => ({ type, slot: i + 1 })), spawnTimer: tun.ticks.firstSpawn,
    spawnPoint: 0, maxAlive: stage.maxAlive, spawnInterval: Math.round(stage.spawnInterval * tun.tps),
    fireMult: byChapter(tun.fireMultByChapter, stage.chapter),
    lives: (siege ? tun.siege.lives : tun.lives) + Math.max(0, options.extraLives ?? 0), deaths: 0, destroyed: 0,
    kills: { scout: 0, grunt: 0, gunner: 0, brute: 0 }, pickups: 0, score: 0, freeze: 0, wallSteel: 0, wallPending: new Map(),
    boostersUsed: { bubble: 0, shockwave: 0, fortify: 0 }, boosterCooldown: 0, continues: 0, threat: false,
    wave: 0, waveData: null, waveKilled: 0, waveBreak: 0, waveScore: 0, events: [],
  };
  if (siege) startWave(state, 1);
  return state;
}

/** Siege: wave w becomes the one in play (its queue, limits and fire multiplier). */
export function startWave(state: RunState, w: number): void {
  const wave = siegeWave(w, state.seed, state.tun);
  state.wave = w;
  state.waveData = wave;
  state.waveKilled = 0;
  state.queue = wave.order.map((type, i) => ({ type, slot: i + 1 }));
  state.maxAlive = wave.maxAlive;
  state.spawnInterval = wave.interval;
  state.fireMult = wave.fireMult;
}

/** Remaining enemies of the stage (campaign) or of the wave (Siege), the queue and the field. */
export function enemiesLeft(state: RunState): number {
  return state.siege ? state.queue.length + state.enemies.length : state.tun.stageEnemies - state.destroyed;
}

// One simulation tick in the order of GDD 10 §5, the battle boosters (§7), continue (D-10-07),
// stars and the run summary. Pure: the state and the command in, the state and its events out.
import type { BattleBooster } from './config.js';
import { bulletsTick, destroyEnemy, dropPowerup, fillWall, fire, markThreat, pickupTick, setWall } from './combat.js';
import { MAT } from './stage.js';
import { centre, enemyTick, movePlayer } from './tanks.js';
import { startWave, type Command, type Enemy, type RunState } from './state.js';

const IDLE: Command = { dir: null, fire: false };

/** Per-stage (Siege: per-run, ×siegeMult) use limit of a battle booster. */
export function boosterLimit(state: RunState, kind: BattleBooster): number {
  const base = state.tun.boosters.limits[kind];
  return state.siege ? base * state.tun.boosters.siegeMult : base;
}

/** Whether the battle booster may be used now (rules only; the inventory count is the caller's). */
export function canUseBooster(state: RunState, kind: BattleBooster): boolean {
  if (state.phase !== 'playing' || state.boosterCooldown > 0) return false;
  if (state.boostersUsed[kind] >= boosterLimit(state, kind)) return false;
  if (kind === 'bubble') return state.player.alive && state.player.shield <= 0;
  if (kind === 'shockwave') return state.enemies.some((e) => e.spawning <= 0);
  return state.wallSteel <= 0;
}

function applyBooster(state: RunState, kind: BattleBooster): void {
  const t = state.tun.ticks;
  if (kind === 'bubble') state.player.shield = t.bubbleBooster;
  else if (kind === 'shockwave') {
    for (const e of state.enemies.filter((x) => x.spawning <= 0)) {
      if (e.carrier) { e.carrier = false; dropPowerup(state); }
      destroyEnemy(state, e, 'shockwave');
    }
  } else { state.wallSteel = Math.max(state.wallSteel, t.fortify); setWall(state, MAT.steel); }
  state.boostersUsed[kind]++;
  state.boosterCooldown = t.boosterCooldown;
  state.events.push({ t: 'booster', kind });
}

function timers(state: RunState): void {
  const p = state.player;
  if (p.fireCooldown > 0) p.fireCooldown--;
  if (p.shield > 0) p.shield--;
  if (state.boosterCooldown > 0) state.boosterCooldown--;
  if (state.freeze > 0) state.freeze--;
  if (state.wallSteel > 0 && --state.wallSteel === 0) setWall(state, MAT.brick);
  fillWall(state);
  if (state.powerup && --state.powerup.ttl <= 0) { state.powerup = null; state.events.push({ t: 'powerup_expired' }); }
  for (const e of state.enemies) if (e.spawning > 0 && --e.spawning === 0) e.wantDecision = true;
  if (state.waveBreak > 0) {
    if (--state.waveBreak === 0) {
      startWave(state, state.wave + 1);
      state.spawnTimer = state.tun.ticks.firstSpawn;
      state.events.push({ t: 'wave_start', w: state.wave });
    }
  } else if (state.spawnTimer > 0) state.spawnTimer--;
}

const overlaps = (ax: number, ay: number, bx: number, by: number, size: number): boolean =>
  ax < bx + size && bx < ax + size && ay < by + size && by < ay + size;

function spawnEnemy(state: RunState): void {
  if (state.waveBreak > 0 || state.spawnTimer > 0 || state.queue.length === 0 || state.enemies.length >= state.maxAlive) return;
  const unit = state.tun.unit;
  const points = state.tun.enemySpawns;
  const tanks = [...(state.player.alive ? [state.player] : []), ...state.enemies];
  for (let k = 0; k < points.length; k++) {
    const index = (state.spawnPoint + k) % points.length;
    const [col, row] = points[index] as readonly [number, number];
    if (tanks.some((t) => overlaps(t.x, t.y, col * unit, row * unit, unit))) continue;
    const next = state.queue.shift() as { type: Enemy['type']; slot: number };
    const carriers = state.siege ? state.tun.siege.carriers : state.tun.carriers;
    const enemy: Enemy = { id: state.nextId++, type: next.type, slot: next.slot, wave: state.wave, x: col * unit, y: row * unit,
      dir: 2, moved: 0, hp: state.tun.enemies[next.type].hp, carrier: carriers.includes(next.slot),
      spawning: state.tun.ticks.spawnAnim, decisionTimer: 0, fireTimer: 0, wantDecision: true, stuck: 0, fire: false };
    state.enemies.push(enemy);
    state.spawnPoint = (index + 1) % points.length;
    state.spawnTimer = state.spawnInterval;
    state.events.push({ t: 'spawn', id: enemy.id, type: enemy.type, carrier: enemy.carrier });
    return;
  }
}

function respawnPlayer(state: RunState): void {
  const p = state.player;
  if (p.alive || state.lives <= 0 || p.respawn <= 0 || --p.respawn > 0) return;
  placePlayer(state);
}

function placePlayer(state: RunState): void {
  const p = state.player;
  const [col, row] = state.tun.playerSpawn;
  Object.assign(p, { alive: true, x: col * state.tun.unit, y: row * state.tun.unit, dir: 0, moved: 0, slide: 0,
    driving: false, respawn: 0, shield: state.tun.ticks.spawnShield });
  state.events.push({ t: 'player_spawn' });
}

function shots(state: RunState, wantFire: boolean): void {
  const p = state.player;
  const tun = state.tun;
  if (p.alive && wantFire && p.fireCooldown <= 0) {
    const own = state.bullets.filter((b) => b.owner === 0).length;
    if (own < (p.gun >= 2 ? tun.gunL2Bullets : 1)) {
      fire(state, p, 0, p.gun >= 1 ? tun.fastBulletSpeed : tun.bulletSpeed, p.gun >= 3);
      p.fireCooldown = tun.ticks.fireCooldown;
    }
  }
  if (state.phase !== 'playing') return;
  for (const e of state.enemies) {
    if (!e.fire) continue;
    e.fire = false;
    if (state.freeze > 0 || state.bullets.some((b) => b.owner === e.id)) continue;
    fire(state, e, e.id, tun.enemies[e.type].bulletSpeed, false);
  }
}

function proximityThreat(state: RunState): void {
  if (state.threat) return;
  const unit = state.tun.unit;
  const cx = (state.field.core[0] + 0.5) * unit;
  const cy = (state.field.core[1] + 0.5) * unit;
  const r = state.tun.threatRadius;
  for (const e of state.enemies) {
    if (e.spawning > 0) continue;
    const [ex, ey] = centre(state, e);
    if ((ex - cx) ** 2 + (ey - cy) ** 2 < r * r) { markThreat(state); return; }
  }
}

function outcome(state: RunState): void {
  if (!state.coreAlive || (state.lives <= 0 && !state.player.alive)) {
    state.phase = 'defeated';
    state.phaseTicks = 0;
    state.cause = state.coreAlive ? 'lives' : 'core';
    state.events.push({ t: 'defeated', cause: state.cause });
    return;
  }
  if (state.siege) {
    if (state.waveBreak === 0 && state.waveData && state.waveKilled >= state.waveData.order.length) {
      const bonus = state.tun.siege.waveBonus * state.wave;
      state.score += bonus;
      state.waveScore = bonus;
      state.waveBreak = state.tun.ticks.waveBreak;
      state.events.push({ t: 'wave_clear', w: state.wave, bonus });
    }
    return;
  }
  if (state.destroyed >= state.tun.stageEnemies) {
    state.phase = 'cleared';
    state.phaseTicks = 0;
    state.score += state.tun.score.clear + state.tun.score.life * state.lives;
    state.bullets = state.bullets.filter((b) => b.owner === 0);
    state.events.push({ t: 'cleared' });
  }
}

/** Advances the run by one tick with the input `cmd`; `state.events` lists what happened. */
export function step(state: RunState, cmd: Command = IDLE): RunState {
  state.events = [];
  state.tick++;
  state.phaseTicks++;
  if (state.phase === 'intro') {
    if (state.phaseTicks >= readyTicks(state)) {
      state.phase = 'playing';
      state.phaseTicks = 0;
      state.events.push({ t: 'playing' });
      if (state.siege && state.continues === 0 && state.wave === 1 && state.destroyed === 0) state.events.push({ t: 'wave_start', w: 1 });
    }
    return state;
  }
  if (state.phase === 'defeated') return state;
  if (state.phase === 'cleared') {
    if (state.player.fireCooldown > 0) state.player.fireCooldown--;
    movePlayer(state, cmd.dir);
    shots(state, cmd.fire);
    bulletsTick(state);
    return state;
  }
  timers(state);
  if (cmd.booster && canUseBooster(state, cmd.booster)) applyBooster(state, cmd.booster);
  spawnEnemy(state);
  respawnPlayer(state);
  movePlayer(state, cmd.dir);
  for (const e of [...state.enemies]) enemyTick(state, e, state.bullets.some((b) => b.owner === e.id));
  shots(state, cmd.fire);
  bulletsTick(state);
  pickupTick(state);
  proximityThreat(state);
  outcome(state);
  return state;
}

/** Ticks of the intro banner: the stage intro, or READY after a continue. */
export const readyTicks = (state: RunState): number => (state.continues > 0 ? state.tun.ticks.continueReady : state.tun.ticks.intro);

/**
 * Continue after a defeat (D-10-07): lives = continue lives, the Core back (not its wall), bullets
 * gone, enemies on the field back to the head of the queue (not counted), the player respawned
 * with a shield; READY banner, then play.
 */
export function applyContinue(state: RunState): void {
  if (state.phase !== 'defeated') return;
  const tun = state.tun;
  state.lives = tun.boosters.continueLives;
  if (tun.boosters.continueRebuildCore) state.coreAlive = true;
  state.bullets = [];
  const back = state.enemies.map((e) => ({ type: e.type, slot: e.slot }));
  state.queue.unshift(...back);
  state.enemies = [];
  state.continues++;
  state.cause = null;
  state.spawnTimer = tun.ticks.firstSpawn;
  placePlayer(state);
  state.phase = 'intro';
  state.phaseTicks = 0;
  state.events.push({ t: 'continue' });
}

/** Stars of a cleared stage (GDD 00 §5): ★★★ no life lost, ★★ ≤ 1, ★ else or after a continue. */
export function stars(state: RunState): number {
  if (state.phase !== 'cleared') return 0;
  if (state.continues > 0) return 1;
  return state.deaths === 0 ? 3 : state.deaths <= 1 ? 2 : 1;
}

/** Highest score a stage can give (D-11-04); a higher one is rejected before the level end. */
export function maxStageScore(state: RunState): number {
  const tun = state.tun;
  const kills = state.stage.enemies.reduce((sum, type) => sum + tun.enemies[type].points, 0);
  return kills + tun.carriers.length * tun.score.pickup + tun.score.clear + tun.score.life * tun.score.maxLivesCheck;
}

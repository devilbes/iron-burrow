// Bullets (GDD 10 §4, §5 step 7), kills and score (GDD 11), power-up drops and pickups
// (GDD 10 §7, 12 §4), the Core wall effect.
import { POWERUP_TYPES, type PowerupType } from './config.js';
import { bulletTileHit, cellAt, damageStrip, DX, DY, type Dir } from './field.js';
import { weighted } from './rng.js';
import { CELL, MAT } from './stage.js';
import type { Bullet, Enemy, RunState, Tank } from './state.js';

const BULLET_DIV = 4; // bullet box = 1/4 cell (core.bullet_size)

export const bulletSize = (state: RunState): number => state.tun.unit / BULLET_DIV;

/** A new bullet centred on the tank axis at its front edge. */
export function fire(state: RunState, tank: Tank, owner: number, speed: number, steel: boolean): void {
  const unit = state.tun.unit;
  const half = bulletSize(state) / 2;
  const cx = tank.x + unit / 2 + (DX[tank.dir] * unit) / 2;
  const cy = tank.y + unit / 2 + (DY[tank.dir] * unit) / 2;
  state.bullets.push({ id: state.nextId++, owner, x: cx - half, y: cy - half, dir: tank.dir, speed, steel });
  state.events.push({ t: 'shot', owner });
}

const boxOverlap = (ax: number, ay: number, as: number, bx: number, by: number, bs: number): boolean =>
  ax < bx + bs && bx < ax + as && ay < by + bs && by < ay + as;

/** Score of a kill: campaign points, Siege points × (10 + step·(w−1)) / 10, floored (D-11-02). */
export function killPoints(state: RunState, e: Enemy): number {
  const base = state.tun.enemies[e.type].points;
  if (!state.siege) return base;
  return Math.floor((base * (10 + state.tun.siege.killMultTenths * (e.wave - 1))) / 10);
}

/** Removes an enemy as destroyed; `scores` false for quake (GDD 10 E10). */
export function destroyEnemy(state: RunState, e: Enemy, by: 'bullet' | 'shockwave' | 'quake'): void {
  const scores = by !== 'quake' || state.tun.quakeScores;
  const points = scores ? killPoints(state, e) : 0;
  state.enemies.splice(state.enemies.indexOf(e), 1);
  state.destroyed++;
  state.kills[e.type]++;
  state.score += points;
  if (state.siege && e.wave === state.wave) state.waveKilled++;
  state.events.push({ t: 'kill', id: e.id, type: e.type, points, by });
}

/** A carrier's first hit drops a power-up: type, then cell, both from rngDrop (GDD 12 §4). */
export function dropPowerup(state: RunState): void {
  const type = POWERUP_TYPES[weighted(state.rngDrop, state.tun.powerupWeights)] as PowerupType;
  const free = freeCells(state);
  if (free.length === 0) return;
  const [col, row] = free[Math.floor(state.rngDrop() * free.length)] as [number, number];
  state.powerup = { type, col, row, ttl: state.tun.ticks.powerupTtl };
  state.events.push({ t: 'drop', type, col, row });
}

function freeCells(state: RunState): [number, number][] {
  const f = state.field;
  const unit = state.tun.unit;
  const banned = new Set<string>([...f.wall, state.tun.playerSpawn, ...state.tun.enemySpawns].map(([c, r]) => `${c},${r}`));
  const tanks: Tank[] = [...(state.player.alive ? [state.player] : []), ...state.enemies];
  const out: [number, number][] = [];
  for (let row = 0; row < f.cells; row++) {
    for (let col = 0; col < f.cells; col++) {
      const c = cellAt(f, col, row);
      if (c === CELL.lava || c === CELL.core || banned.has(`${col},${row}`)) continue;
      let solid = false;
      for (let k = 0; k < 4; k++) if (f.mat[(row * 2 + (k >> 1)) * f.qs + col * 2 + (k & 1)] !== MAT.none) solid = true;
      if (solid) continue;
      if (tanks.some((t) => boxOverlap(t.x, t.y, unit, col * unit, row * unit, unit))) continue;
      out.push([col, row]);
    }
  }
  return out;
}

/** A hit on an enemy by the player's bullet: −1 HP, the carrier's first hit drops, kill at 0. */
function hitEnemy(state: RunState, e: Enemy): void {
  e.hp--;
  if (e.carrier) { e.carrier = false; dropPowerup(state); }
  if (e.hp <= 0) destroyEnemy(state, e, 'bullet');
  else state.events.push({ t: 'hit', id: e.id, hp: e.hp });
}

export function killPlayer(state: RunState): void {
  const p = state.player;
  p.alive = false;
  p.gun = 0;
  p.shield = 0;
  p.slide = 0;
  state.lives--;
  state.deaths++;
  p.respawn = state.lives > 0 ? state.tun.ticks.respawn : 0;
  state.events.push({ t: 'player_death', lives: state.lives });
}

/** Distance from the bullet back edge to the tank front along the flight (smaller = met first). */
function along(b: Bullet, t: Tank, size: number): number {
  switch (b.dir) {
    case 0: return b.y - (t.y + size);
    case 2: return t.y - b.y;
    case 1: return t.x - b.x;
    default: return b.x - (t.x + size);
  }
}

function tankHit(state: RunState, b: Bullet): boolean {
  const unit = state.tun.unit;
  const bs = bulletSize(state);
  const candidates: Tank[] = [];
  const p = state.player;
  if (b.owner !== 0 && p.alive && boxOverlap(b.x, b.y, bs, p.x, p.y, unit)) candidates.push(p);
  for (const e of state.enemies) if (e.id !== b.owner && e.spawning <= 0 && boxOverlap(b.x, b.y, bs, e.x, e.y, unit)) candidates.push(e);
  if (candidates.length === 0) return false;
  candidates.sort((a, c) => along(b, a, unit) - along(b, c, unit) || a.id - c.id);
  const target = candidates[0] as Tank;
  if (target === p) {
    if (p.shield > 0) state.events.push({ t: 'shield_block' });
    else killPlayer(state);
  } else if (b.owner === 0) hitEnemy(state, target as Enemy);
  else state.events.push({ t: 'bullet_block', owner: b.owner });
  return true;
}

function coreHit(state: RunState, b: Bullet): boolean {
  const unit = state.tun.unit;
  const [cx, cy] = state.field.core;
  if (!boxOverlap(b.x, b.y, bulletSize(state), cx * unit, cy * unit, unit)) return false;
  if (state.phase === 'playing' && state.coreAlive) {
    state.coreAlive = false;
    state.events.push({ t: 'core_destroyed', owner: b.owner });
  }
  return true;
}

function tileHit(state: RunState, b: Bullet): boolean {
  const f = state.field;
  const bs = bulletSize(state);
  const hit = bulletTileHit(f, b.x, b.y, bs, b.dir);
  if (!hit) return false;
  const vertical = b.dir === 0 || b.dir === 2;
  const axis = vertical ? b.x + bs / 2 : b.y + bs / 2;
  const broken = damageStrip(f, axis, hit.row, vertical, b.steel);
  if (broken.length) {
    state.events.push({ t: 'tile', quarters: broken, steel: b.steel });
    if (b.owner !== 0 && broken.some(([qx, qy]) => isWall(state, qx, qy))) markThreat(state);
  } else state.events.push({ t: 'bullet_block', owner: b.owner });
  return true;
}

const isWall = (state: RunState, qx: number, qy: number): boolean =>
  state.field.wall.some(([c, r]) => c === qx >> 1 && r === qy >> 1);

export function markThreat(state: RunState): void {
  if (state.threat) return;
  state.threat = true;
  state.events.push({ t: 'threat' });
}

const outside = (state: RunState, b: Bullet, size: number): boolean => {
  const max = state.tun.cells * state.tun.unit;
  return b.x < 0 || b.y < 0 || b.x + size > max || b.y + size > max;
};

/** Step 7 of the tick: move all bullets, bullet–bullet, then each bullet by id. */
export function bulletsTick(state: RunState): void {
  const bs = bulletSize(state);
  for (const b of state.bullets) { b.x += DX[b.dir] * b.speed; b.y += DY[b.dir] * b.speed; }
  const dead = new Set<number>();
  for (const a of state.bullets) {
    if (a.owner !== 0 || dead.has(a.id)) continue;
    for (const e of state.bullets) {
      if (e.owner === 0 || dead.has(e.id) || !boxOverlap(a.x, a.y, bs, e.x, e.y, bs)) continue;
      dead.add(a.id); dead.add(e.id);
      state.events.push({ t: 'clash' });
      break;
    }
  }
  for (const b of [...state.bullets].sort((x, y) => x.id - y.id)) {
    if (dead.has(b.id)) continue;
    if (tankHit(state, b) || coreHit(state, b) || tileHit(state, b) || outside(state, b, bs)) dead.add(b.id);
  }
  if (dead.size) state.bullets = state.bullets.filter((b) => !dead.has(b.id));
}

/** Sets the Core wall to `material`; quarters under a tank wait until it leaves. */
export function setWall(state: RunState, material: number): void {
  const f = state.field;
  state.wallPending.clear();
  for (const [col, row] of f.wall) {
    for (let k = 0; k < 4; k++) state.wallPending.set((row * 2 + (k >> 1)) * f.qs + col * 2 + (k & 1), material);
  }
  fillWall(state);
}

/** Refills pending wall quarters that no tank covers now. */
export function fillWall(state: RunState): void {
  if (state.wallPending.size === 0) return;
  const f = state.field;
  const q = f.q;
  const unit = state.tun.unit;
  const tanks: Tank[] = [...(state.player.alive ? [state.player] : []), ...state.enemies];
  for (const [index, material] of state.wallPending) {
    const qx = index % f.qs;
    const qy = Math.floor(index / f.qs);
    if (tanks.some((t) => boxOverlap(t.x, t.y, unit, qx * q, qy * q, q))) continue;
    f.mat[index] = material;
    state.wallPending.delete(index);
  }
}

/** Applies a picked power-up (GDD 10 §7). */
export function applyPowerup(state: RunState, type: PowerupType): void {
  const t = state.tun.ticks;
  const p = state.player;
  if (type === 'star') p.gun = Math.min(3, p.gun + 1);
  else if (type === 'bubble') p.shield = Math.max(p.shield, t.bubblePowerup);
  else if (type === 'rebar') { state.wallSteel = Math.max(state.wallSteel, t.rebar); setWall(state, MAT.steel); }
  else if (type === 'quake') for (const e of state.enemies.filter((x) => x.spawning <= 0)) destroyEnemy(state, e, 'quake');
  else if (type === 'freeze') state.freeze = Math.max(state.freeze, t.freeze);
  else state.lives++;
  state.pickups++;
  state.score += state.tun.score.pickup;
  state.events.push({ t: 'pickup', type, points: state.tun.score.pickup });
}

/** Step 8: the player's AABB over the power-up cell picks it up. */
export function pickupTick(state: RunState): void {
  const pu = state.powerup;
  const p = state.player;
  if (!pu || !p.alive) return;
  const unit = state.tun.unit;
  if (!boxOverlap(p.x, p.y, unit, pu.col * unit, pu.row * unit, unit)) return;
  state.powerup = null;
  applyPowerup(state, pu.type);
}

export const dirToward = (dx: number, dy: number): Dir => (Math.abs(dy) >= Math.abs(dx) ? (dy < 0 ? 0 : 2) : dx < 0 ? 3 : 1);

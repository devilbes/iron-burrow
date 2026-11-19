// Tank movement (GDD 10 §3): turns with alignment, tile sweep, tank–tank overlap rule, oil slide,
// and the AI of the Rustbugs (GDD 12 §3).
import { CELL, MAT } from './stage.js';
import { cellAt, DX, DY, matAt, rectBlocked, sweep, type Dir } from './field.js';
import { weighted } from './rng.js';
import type { Enemy, RunState, Tank } from './state.js';

const overlap = (ax: number, ay: number, bx: number, by: number, size: number): number => {
  const w = Math.min(ax, bx) + size - Math.max(ax, bx);
  const h = Math.min(ay, by) + size - Math.max(ay, by);
  return w > 0 && h > 0 ? w * h : 0;
};

/** Tanks that are solid for others: the living player and enemies past their spawn animation. */
export function solidTanks(state: RunState, except: number): Tank[] {
  const out: Tank[] = [];
  if (state.player.alive && except !== 0) out.push(state.player);
  for (const enemy of state.enemies) if (enemy.id !== except && enemy.spawning <= 0) out.push(enemy);
  return out;
}

/** Moving `tank` to (x, y) would increase its overlap with some other solid tank. */
function tankConflict(state: RunState, tank: Tank, x: number, y: number): boolean {
  const size = state.tun.unit;
  for (const other of solidTanks(state, tank.id)) {
    if (overlap(x, y, other.x, other.y, size) > overlap(tank.x, tank.y, other.x, other.y, size)) return true;
  }
  return false;
}

/** Turns `tank` to `dir`; a 90° turn aligns the other coordinate to the nearest quarter line. */
export function turn(state: RunState, tank: Tank, dir: Dir): void {
  if (tank.dir === dir) return;
  const perpendicular = (tank.dir & 1) !== (dir & 1);
  tank.dir = dir;
  if (!perpendicular) return;
  const q = state.field.q;
  const snap = (v: number): number => Math.floor((v + q / 2) / q) * q;
  const horizontal = (dir & 1) === 1;
  const x = horizontal ? tank.x : snap(tank.x);
  const y = horizontal ? snap(tank.y) : tank.y;
  if (x === tank.x && y === tank.y) return;
  if (rectBlocked(state.field, x, y, state.tun.unit) || tankConflict(state, tank, x, y)) return;
  tank.x = x;
  tank.y = y;
}

/** Moves `tank` up to `dist` in its direction; returns the distance moved. */
export function move(state: RunState, tank: Tank, dist: number): number {
  const free = sweep(state.field, tank.x, tank.y, state.tun.unit, tank.dir, dist);
  const x = tank.x + DX[tank.dir] * free;
  const y = tank.y + DY[tank.dir] * free;
  if (free === 0 || tankConflict(state, tank, x, y)) { tank.moved = 0; return 0; }
  tank.x = x;
  tank.y = y;
  tank.moved = free;
  return free;
}

/** Centre of a tank. */
export const centre = (state: RunState, tank: Tank): [number, number] => [tank.x + state.tun.unit / 2, tank.y + state.tun.unit / 2];

/** The player moves on input; off the stick on oil it slides a little further (GDD 10 §3). */
export function movePlayer(state: RunState, dir: Dir | null): void {
  const p = state.player;
  p.moved = 0;
  if (!p.alive) return;
  const speed = state.tun.playerSpeed;
  if (dir !== null) {
    turn(state, p, dir);
    move(state, p, speed);
    p.driving = true;
    p.slide = 0;
    return;
  }
  if (p.driving) {
    const [cx, cy] = centre(state, p);
    if (cellAt(state.field, Math.floor(cx / state.tun.unit), Math.floor(cy / state.tun.unit)) === CELL.oil) p.slide = state.tun.oilSlide;
  }
  p.driving = false;
  if (p.slide > 0) {
    const moved = move(state, p, Math.min(speed, p.slide));
    p.slide = moved > 0 ? p.slide - moved : 0;
  }
}

/** Quarters directly in front of a tank: what material is there (or -1 for the edge / lava). */
function aheadKinds(state: RunState, tank: Tank, dir: Dir): { brick: boolean; hard: boolean } {
  const f = state.field;
  const q = f.q;
  const size = state.tun.unit;
  let brick = false;
  let hard = false;
  const check = (qx: number, qy: number): void => {
    const m = matAt(f, qx, qy);
    if (m < 0) { hard = true; return; }
    if (m === MAT.brick) brick = true;
    if (m === MAT.steel) hard = true;
    const c = cellAt(f, qx >> 1, qy >> 1);
    if (c === CELL.lava) hard = true;
  };
  if (dir === 0 || dir === 2) {
    const qy = dir === 0 ? Math.floor(tank.y / q) - 1 : Math.floor((tank.y + size) / q);
    for (let qx = Math.floor(tank.x / q); qx <= Math.floor((tank.x + size - 1) / q); qx++) check(qx, qy);
  } else {
    const qx = dir === 3 ? Math.floor(tank.x / q) - 1 : Math.floor((tank.x + size) / q);
    for (let qy = Math.floor(tank.y / q); qy <= Math.floor((tank.y + size - 1) / q); qy++) check(qx, qy);
  }
  return { brick, hard };
}

type Mode = 0 | 1 | 2; // core, player, random

/** decide() of GDD 12 §3: a new direction for the enemy. */
export function decide(state: RunState, e: Enemy, exclude: Dir | null, forced?: Mode): void {
  const rng = state.rngAI;
  let mode = forced ?? (weighted(rng, state.tun.ai.weights) as Mode);
  if (mode === 1 && !state.player.alive) mode = 0;
  if (mode !== 2) {
    const [tx, ty] = mode === 1 ? centre(state, state.player)
      : [(state.field.core[0] + 0.5) * state.tun.unit, (state.field.core[1] + 0.5) * state.tun.unit];
    const [ex, ey] = centre(state, e);
    const dx = tx - ex;
    const dy = ty - ey;
    const vertical = Math.abs(dy) >= Math.abs(dx);
    const along = (isVertical: boolean): Dir => {
      const delta = isVertical ? dy : dx;
      const positive = delta === 0 ? rng() < 0.5 : delta > 0;
      return (isVertical ? (positive ? 2 : 0) : (positive ? 1 : 3)) as Dir;
    };
    const ok = (d: Dir): boolean => d !== exclude && !aheadKinds(state, e, d).hard;
    const first = along(vertical);
    if (ok(first)) { turn(state, e, first); return; }
    const second = along(!vertical);
    if (ok(second)) { turn(state, e, second); return; }
  }
  const choices = ([0, 1, 2, 3] as Dir[]).filter((d) => d !== exclude);
  turn(state, e, choices[Math.floor(rng() * choices.length)] as Dir);
}

/** Distance from the tank to the next quarter line ahead (0 when it stands on one). */
function toLine(state: RunState, tank: Tank): number {
  const q = state.field.q;
  const pos = (tank.dir & 1) === 1 ? tank.x : tank.y;
  const rem = ((pos % q) + q) % q;
  if (rem === 0) return 0;
  return tank.dir === 1 || tank.dir === 2 ? q - rem : rem;
}

/** Target ahead on the barrel axis with no steel between (GDD 12 D-12-02). */
export function aimLine(state: RunState, e: Enemy): boolean {
  const unit = state.tun.unit;
  const [ex, ey] = centre(state, e);
  const targets: [number, number][] = [[(state.field.core[0] + 0.5) * unit, (state.field.core[1] + 0.5) * unit]];
  const p = state.player;
  if (p.alive) {
    const [px, py] = centre(state, p);
    if (cellAt(state.field, Math.floor(px / unit), Math.floor(py / unit)) !== CELL.roots) targets.push([px, py]);
  }
  for (const [tx, ty] of targets) {
    const vertical = (e.dir & 1) === 0;
    const off = vertical ? Math.abs(tx - ex) : Math.abs(ty - ey);
    if (off > unit / 2) continue;
    const ahead = vertical ? (e.dir === 0 ? ey - ty : ty - ey) : (e.dir === 3 ? ex - tx : tx - ex);
    if (ahead <= 0) continue;
    if (!steelBetween(state, ex, ey, tx, ty, vertical)) return true;
  }
  return false;
}

function steelBetween(state: RunState, ax: number, ay: number, bx: number, by: number, vertical: boolean): boolean {
  const q = state.field.q;
  if (vertical) {
    const qx = Math.floor(ax / q);
    for (let qy = Math.floor(Math.min(ay, by) / q); qy <= Math.floor(Math.max(ay, by) / q); qy++) {
      if (matAt(state.field, qx, qy) === MAT.steel || matAt(state.field, qx - 1, qy) === MAT.steel) return true;
    }
    return false;
  }
  const qy = Math.floor(ay / q);
  for (let qx = Math.floor(Math.min(ax, bx) / q); qx <= Math.floor(Math.max(ax, bx) / q); qx++) {
    if (matAt(state.field, qx, qy) === MAT.steel || matAt(state.field, qx, qy - 1) === MAT.steel) return true;
  }
  return false;
}

/** One tick of an enemy: decision, movement, block handling, fire check (GDD 12 §3). */
export function enemyTick(state: RunState, e: Enemy, hasBullet: boolean): void {
  e.moved = 0;
  if (e.spawning > 0 || state.freeze > 0) return;
  const t = state.tun.ticks;
  e.decisionTimer++;
  e.fireTimer++;
  if (e.decisionTimer >= t.aiDecision) e.wantDecision = true;
  let dist = state.tun.enemies[e.type].speed;
  let decideAfter = false;
  if (e.wantDecision) {
    const line = toLine(state, e);
    if (line === 0) { decide(state, e, null); e.decisionTimer = 0; e.wantDecision = false; }
    else if (line <= dist) { dist = line; decideAfter = true; }
  }
  const moved = move(state, e, dist);
  if (decideAfter && moved === dist) { decide(state, e, null); e.decisionTimer = 0; e.wantDecision = false; }
  if (moved === 0) {
    // Blocked by a tile with brick in it: shoot the way open. Blocked by a tank: turn.
    const byTile = sweep(state.field, e.x, e.y, state.tun.unit, e.dir, 1) === 0;
    const ahead = aheadKinds(state, e, e.dir);
    if (byTile && ahead.brick && !hasBullet) {
      // The shot goes the way the tank faced when it hit the brick, even if it turns now.
      e.fire = true;
      e.fireDir = e.dir;
      if (state.rngAI() >= state.tun.ai.brickKeepP) decide(state, e, e.dir);
    } else decide(state, e, e.dir);
    e.stuck++;
    if (e.stuck >= t.aiStuck) { decide(state, e, e.dir, 2); e.stuck = 0; }
  } else e.stuck = 0;
  if (e.fireTimer >= t.aiFireCheck) {
    e.fireTimer = 0;
    const p = aimLine(state, e) ? state.tun.ai.aimFireP : state.tun.enemies[e.type].fireP * state.fireMult;
    if (!hasBullet && !e.fire && state.rngAI() < p) { e.fire = true; e.fireDir = e.dir; }
  }
}

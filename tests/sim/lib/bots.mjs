// Player bots of the balance simulations (GDD 13 §3 policies): random, novice, expert. A bot
// reads the run state the way a player reads the screen and returns the command of the tick.
// It never changes the state. Its own randomness is a separate seeded stream.

const CELL_LAVA = 1;
const CELL_CORE = 4;
const MAT_BRICK = 1;
const MAT_STEEL = 2;
const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Materials of the 4 quarters of a cell: { brick, steel } counts. */
function cellMats(f, col, row) {
  let brick = 0;
  let steel = 0;
  for (let k = 0; k < 4; k++) {
    const m = f.mat[(row * 2 + (k >> 1)) * f.qs + col * 2 + (k & 1)];
    if (m === MAT_BRICK) brick++;
    else if (m === MAT_STEEL) steel++;
  }
  return { brick, steel };
}

/** Dijkstra over cells from `from` to any goal cell; brick costs `brickCost`, steel is a wall unless `steelCost`. */
function findPath(f, from, goals, brickCost, steelCost) {
  const n = f.cells;
  const dist = new Float64Array(n * n).fill(Infinity);
  const prev = new Int32Array(n * n).fill(-1);
  const goalSet = new Set(goals.map(([c, r]) => r * n + c));
  const start = from[1] * n + from[0];
  dist[start] = 0;
  const open = [start];
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (dist[open[i]] < dist[open[bi]]) bi = i;
    const cur = open[bi];
    open[bi] = open[open.length - 1];
    open.pop();
    if (goalSet.has(cur)) {
      const path = [];
      for (let c = cur; c !== -1; c = prev[c]) path.push([c % n, Math.floor(c / n)]);
      return path.reverse();
    }
    const cx = cur % n;
    const cy = Math.floor(cur / n);
    for (let d = 0; d < 4; d++) {
      const nx = cx + DX[d];
      const ny = cy + DY[d];
      if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
      const idx = ny * n + nx;
      const type = f.cell[idx];
      if (type === CELL_LAVA || (type === CELL_CORE && !goalSet.has(idx))) continue;
      const { brick, steel } = cellMats(f, nx, ny);
      let cost = 1;
      if (steel) { if (steelCost === null) continue; cost = steelCost; }
      else if (brick) cost = brickCost;
      const nd = dist[cur] + cost;
      if (nd < dist[idx]) {
        if (dist[idx] === Infinity) open.push(idx);
        dist[idx] = nd;
        prev[idx] = cur;
      }
    }
  }
  return null;
}

const cellOf = (unit, t) => [Math.round(t.x / unit), Math.round(t.y / unit)];

/** Something solid for bullets (brick/steel quarter) on the line between two points on one axis. */
function blockedLine(f, ax, ay, bx, by, vertical, stopAt) {
  const q = f.q;
  const band = [Math.floor((vertical ? ax : ay) / q) - 1, Math.floor((vertical ? ax : ay) / q)];
  const lo = Math.floor(Math.min(vertical ? ay : ax, vertical ? by : bx) / q);
  const hi = Math.floor(Math.max(vertical ? ay : ax, vertical ? by : bx) / q);
  for (let k = lo; k <= hi; k++) {
    for (const b of band) {
      const qx = vertical ? b : k;
      const qy = vertical ? k : b;
      if (qx < 0 || qy < 0 || qx >= f.qs || qy >= f.qs) continue;
      const m = f.mat[qy * f.qs + qx];
      if (m >= stopAt) return true;
    }
  }
  return false;
}

/** Firing in `dir` would hit the own Core with nothing in between. */
function coreAhead(state, dir) {
  const { unit } = state.tun;
  const p = state.player;
  const px = p.x + unit / 2;
  const py = p.y + unit / 2;
  const cx = (state.field.core[0] + 0.5) * unit;
  const cy = (state.field.core[1] + 0.5) * unit;
  const vertical = dir === 0 || dir === 2;
  const off = vertical ? Math.abs(cx - px) : Math.abs(cy - py);
  if (off >= unit) return false;
  const ahead = vertical ? (dir === 0 ? py - cy : cy - py) : dir === 3 ? px - cx : cx - px;
  if (ahead <= 0) return false;
  return !blockedLine(state.field, px, py, cx, cy, vertical, MAT_BRICK);
}

/** An active enemy on one of the player's axes (±half cell) with no steel between: the direction to it. */
function aimAt(state, maxOff, clearOnly = null) {
  const { unit } = state.tun;
  const p = state.player;
  const px = p.x + unit / 2;
  const py = p.y + unit / 2;
  let best = null;
  for (const e of state.enemies) {
    if (e.spawning > 0) continue;
    const ex = e.x + unit / 2;
    const ey = e.y + unit / 2;
    let dir = null;
    let dist = 0;
    if (Math.abs(ex - px) <= maxOff) { dir = ey < py ? 0 : 2; dist = Math.abs(ey - py); }
    else if (Math.abs(ey - py) <= maxOff) { dir = ex < px ? 3 : 1; dist = Math.abs(ex - px); }
    if (dir === null) continue;
    const steel = p.gun >= 3 ? 99 : MAT_STEEL;
    const stopAt = clearOnly && !clearOnly(e) ? MAT_BRICK : steel;
    if (blockedLine(state.field, px, py, ex, ey, dir === 0 || dir === 2, stopAt)) continue;
    if (!best || dist < best.dist) best = { dir, dist };
  }
  return best;
}

/** Direction to drive toward cell `next` (aligning the other axis first). */
function steer(state, next) {
  const { unit } = state.tun;
  const p = state.player;
  const tx = next[0] * unit;
  const ty = next[1] * unit;
  const dx = tx - p.x;
  const dy = ty - p.y;
  if (dx === 0 && dy === 0) return null;
  if (dx !== 0 && dy !== 0) {
    if (Math.abs(dx) < Math.abs(dy)) return dx > 0 ? 1 : 3;
    return dy > 0 ? 2 : 0;
  }
  return dx !== 0 ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0;
}

/** Brick right in front of the player in `dir`. */
function brickAhead(state, dir) {
  const f = state.field;
  const { unit } = state.tun;
  const q = f.q;
  const p = state.player;
  const cells = [];
  if (dir === 0 || dir === 2) {
    const qy = dir === 0 ? Math.floor(p.y / q) - 1 : Math.floor((p.y + unit) / q);
    for (let qx = Math.floor(p.x / q); qx <= Math.floor((p.x + unit - 1) / q); qx++) cells.push([qx, qy]);
  } else {
    const qx = dir === 3 ? Math.floor(p.x / q) - 1 : Math.floor((p.x + unit) / q);
    for (let qy = Math.floor(p.y / q); qy <= Math.floor((p.y + unit - 1) / q); qy++) cells.push([qx, qy]);
  }
  return cells.some(([qx, qy]) => qx >= 0 && qy >= 0 && qx < f.qs && qy < f.qs && f.mat[qy * f.qs + qx] > 0
    && (f.mat[qy * f.qs + qx] === MAT_BRICK || p.gun >= 3));
}

/**
 * An enemy bullet flying at the player closer than `range`: `{ facing }` when it comes head-on
 * (shoot it down), otherwise the direction that leaves its line.
 */
function incoming(state, range) {
  const { unit } = state.tun;
  const p = state.player;
  const px = p.x + unit / 2;
  const py = p.y + unit / 2;
  for (const b of state.bullets) {
    if (b.owner === 0) continue;
    const bx = b.x + unit / 8;
    const by = b.y + unit / 8;
    const vertical = b.dir === 0 || b.dir === 2;
    const off = vertical ? Math.abs(bx - px) : Math.abs(by - py);
    const gap = vertical ? (b.dir === 2 ? py - by : by - py) : b.dir === 1 ? px - bx : bx - px;
    if (off >= unit * 0.6 || gap <= 0 || gap >= range) continue;
    if (p.dir === (b.dir + 2) % 4) return { facing: true, dir: p.dir, offset: off };
    const sides = vertical ? [bx <= px ? 1 : 3, bx <= px ? 3 : 1] : [by <= py ? 2 : 0, by <= py ? 0 : 2];
    return { facing: false, dir: sides[0] };
  }
  return null;
}

/** How far a bullet flies along its direction before a solid quarter or the edge (units). */
function bulletReach(state, b, bs) {
  const f = state.field;
  const q = f.q;
  const max = f.cells * state.tun.unit;
  let reach = 0;
  const limit = b.speed * 40;
  while (reach < limit) {
    reach += q / 2;
    const x = b.x + DX[b.dir] * reach;
    const y = b.y + DY[b.dir] * reach;
    if (x < 0 || y < 0 || x + bs > max || y + bs > max) return reach;
    for (let qy = Math.floor(y / q); qy <= Math.floor((y + bs - 1) / q); qy++) {
      for (let qx = Math.floor(x / q); qx <= Math.floor((x + bs - 1) / q); qx++) if (f.mat[qy * f.qs + qx] > 0) return reach;
    }
  }
  return reach;
}

/** Driving in `dir` (null = stand) for the next `horizon` ticks is clear of every enemy bullet. */
function safeMove(state, rules, dir, horizon) {
  const { unit } = state.tun;
  const bs = unit / 4;
  const p = state.player;
  const travel = dir === null ? 0 : rules.sweep(state.field, p.x, p.y, unit, dir, state.tun.playerSpeed * horizon);
  for (const b of state.bullets) {
    if (b.owner === 0) continue;
    const reach = bulletReach(state, b, bs);
    for (let t = 1; t <= horizon; t++) {
      const fly = Math.min(b.speed * t, reach);
      const bx = b.x + DX[b.dir] * fly;
      const by = b.y + DY[b.dir] * fly;
      const go = dir === null ? 0 : Math.min(state.tun.playerSpeed * t, travel);
      const px = p.x + (dir === null ? 0 : DX[dir] * go);
      const py = p.y + (dir === null ? 0 : DY[dir] * go);
      if (bx < px + unit && px < bx + bs && by < py + unit && py < by + bs) return false;
      if (fly >= reach) break;
    }
  }
  return true;
}

/** The desired move if it is safe, else the first safe alternative (stand, sideways, back). */
function safest(state, rules, dir, horizon) {
  if (safeMove(state, rules, dir, horizon)) return { dir, safe: true };
  const base = dir ?? state.player.dir;
  for (const alt of [null, (base + 1) % 4, (base + 3) % 4, (base + 2) % 4, base]) {
    if (alt === dir) continue;
    if (safeMove(state, rules, alt, horizon)) return { dir: alt, safe: false };
  }
  return { dir, safe: false };
}

function nearestPowerup(state, maxCells) {
  const pu = state.powerup;
  if (!pu) return null;
  const [pc, pr] = cellOf(state.tun.unit, state.player);
  return Math.abs(pu.col - pc) + Math.abs(pu.row - pr) <= maxCells ? [pu.col, pu.row] : null;
}

/** Bot policies: `create(seed, params)` → `(state) => command`. */
export const POLICIES = ['random', 'novice', 'expert'];

export function createBot(policy, seed, params, rules) {
  const rng = mulberry32(seed ^ 0xb07b07);
  const mem = { timer: 0, dir: null, fire: false, path: null, wander: false };
  if (policy === 'random') return (state) => randomBot(state, rng, mem, params);
  const tuning = policy === 'expert' ? params.expert : params.novice;
  return (state) => smartBot(state, rng, mem, tuning, policy === 'expert' ? rules : null);
}

function randomBot(state, rng, mem, params) {
  if (mem.timer-- <= 0) {
    mem.timer = Math.round(params.random.period_s * state.tun.tps) - 1;
    const pick = Math.floor(rng() * 5);
    mem.dir = pick === 4 ? null : pick;
    mem.fire = rng() < params.random.fire_p;
  }
  const facing = mem.dir ?? state.player.dir;
  return { dir: mem.dir, fire: mem.fire && !coreAhead(state, facing) };
}

function plan(state, rng, mem, tuning, expert) {
  const f = state.field;
  const { unit } = state.tun;
  const p = state.player;
  mem.wander = !expert && rng() < tuning.err_p;
  if (mem.wander) { mem.dir = Math.floor(rng() * 4); mem.path = null; return; }
  const from = cellOf(unit, p);
  const pu = expert ? (state.powerup ? [state.powerup.col, state.powerup.row] : null) : nearestPowerup(state, tuning.powerup_cells);
  let goals = pu ? [pu] : [];
  if (!goals.length) {
    let enemies = state.enemies.filter((e) => e.spawning <= 0);
    if (expert) {
      const [cc, cr] = f.core;
      const near = enemies.filter((e) => Math.hypot(e.x / unit - cc, e.y / unit - cr) < tuning.core_guard_cells);
      if (near.length) enemies = near;
    }
    goals = enemies.map((e) => cellOf(unit, e));
  }
  if (!goals.length) {
    // Nothing to chase: wait near the Core wall, in front of the spawn line.
    goals = [[state.tun.playerSpawn[0], state.tun.playerSpawn[1] - (expert ? 2 : 0)]];
  }
  mem.path = findPath(f, from, goals, tuning.brick_cost, expert && p.gun >= 3 ? tuning.brick_cost : null);
}

function smartBot(state, rng, mem, tuning, rules) {
  const expert = rules !== null;
  const p = state.player;
  if (!p.alive) return { dir: null, fire: false };
  if (mem.timer-- <= 0) {
    mem.timer = Math.round(tuning.reaction_s * state.tun.tps) - 1;
    plan(state, rng, mem, tuning, expert);
  }
  if (expert) return expertMove(state, rules, mem, tuning);
  // The novice looks at the field once per reaction cycle: it holds fire for the cycle when it
  // saw an enemy on its axis ahead or a brick in its way, and never shoots its own Core.
  const step = follow(state, mem);
  const facing = step.dir ?? p.dir;
  if (mem.timer === Math.round(tuning.reaction_s * state.tun.tps) - 1) {
    const aim = aimAt(state, state.tun.unit / 2);
    mem.fire = Boolean((aim && aim.dir === facing) || brickAhead(state, facing));
  }
  return { dir: step.dir, fire: mem.fire && !coreAhead(state, facing) };
}

/** Expert: shoot down head-on bullets, keep out of bullet paths, turn to aligned enemies, follow the plan. */
function expertMove(state, rules, mem, tuning) {
  const p = state.player;
  const unit = state.tun.unit;
  const horizon = Math.round(tuning.dodge_cells * unit / state.tun.bulletSpeed) + 2;
  const own = state.bullets.some((b) => b.owner === 0);
  const threat = incoming(state, tuning.dodge_cells * unit);
  if (threat && threat.facing && !own && threat.offset < unit / 4) return { dir: null, fire: !coreAhead(state, threat.dir) };
  const [cc, cr] = state.field.core;
  const nearCore = (e) => Math.hypot(e.x / unit - cc, e.y / unit - cr) < tuning.core_guard_cells;
  const aim = aimAt(state, unit / 2, nearCore);
  if (aim) {
    if (p.dir !== aim.dir) return { dir: aim.dir, fire: false };
    if (safeMove(state, rules, null, horizon)) return { dir: null, fire: !coreAhead(state, aim.dir) };
  }
  const step = follow(state, mem);
  const choice = safest(state, rules, step.dir, horizon);
  const facing = choice.dir ?? p.dir;
  const shoot = p.dir === facing && brickAhead(state, facing);
  return { dir: choice.dir, fire: shoot && !coreAhead(state, facing) };
}

/** The move of the tick along the planned path (or the wander direction of a mistake cycle). */
function follow(state, mem) {
  if (mem.wander) return { dir: mem.dir };
  const path = mem.path;
  if (!path || path.length < 2) return { dir: null };
  const [pc, pr] = cellOf(state.tun.unit, state.player);
  const at = path.findIndex((c) => c[0] === pc && c[1] === pr);
  const next = at === -1 ? path[0] : path[at + 1];
  return { dir: next ? steer(state, next) : null };
}

// The match view of a run (CONTRACT §3.3 MatchView): tiles and quarter masks from the field, the
// tanks, bullets, power-up and effect timers in ms, the three spawn points with the next Rustbug
// (the visible queue), the HUD numbers and the booster states. Read-only over the rules' state.
import { BATTLE_BOOSTERS, boosterLimit, CELL, enemiesLeft, MAT, type BattleBooster, type RunState } from '../core/index.js';
import type { BoosterState, BoosterView, Dir, FieldBooster, MatchView, Phase, TileCode, TileTheme, TutorialView } from '../index.js';

const DIRS: readonly Dir[] = ['up', 'right', 'down', 'left'];
const CELL_CODE: Readonly<Record<number, TileCode>> = { [CELL.lava]: 'L', [CELL.roots]: 'R', [CELL.oil]: 'O', [CELL.core]: 'C' };
const BOOSTER_ID: Readonly<Record<BattleBooster, FieldBooster>> = { bubble: 'bst_bubble', shockwave: 'bst_shockwave', fortify: 'bst_fortify' };
const MAX_GUN = 3;

export interface BoosterContext {
  /** Inventory count left for new uses. */
  count(kind: BattleBooster): number;
  /** Consume failed for good this run. */
  blocked(kind: BattleBooster): boolean;
}

export interface ViewInput {
  readonly run: RunState;
  readonly phase: Phase;
  readonly mode: 'campaign' | 'siege';
  readonly stage: number;
  readonly theme: TileTheme;
  readonly spawnHeld: boolean;
  readonly tutorial: TutorialView | null;
  readonly boosters: BoosterContext;
}

const ms = (run: RunState, ticks: number): number => Math.max(0, Math.round((ticks * 1000) / run.tun.tps));
const gunOf = (gun: number): 0 | 1 | 2 | 3 => Math.max(0, Math.min(MAX_GUN, gun)) as 0 | 1 | 2 | 3;

/** Tile codes and quarter masks (1 TL, 2 TR, 4 BL, 8 BR) of every cell, row-major. */
export function tilesOf(run: RunState): { tiles: TileCode[]; quarters: number[] } {
  const f = run.field;
  const tiles: TileCode[] = [];
  const quarters: number[] = [];
  for (let row = 0; row < f.cells; row++) {
    for (let col = 0; col < f.cells; col++) {
      let mask = 0;
      let steel = false;
      for (let bit = 0; bit < 4; bit++) {
        const m = f.mat[(row * 2 + (bit >> 1)) * f.qs + col * 2 + (bit & 1)];
        if (m === MAT.none) continue;
        mask |= 1 << bit;
        if (m === MAT.steel) steel = true;
      }
      const type = f.cell[row * f.cells + col] as number;
      tiles.push(mask > 0 ? (steel ? 'S' : 'B') : CELL_CODE[type] ?? '.');
      quarters.push(mask);
    }
  }
  return { tiles, quarters };
}

function boosterState(run: RunState, kind: BattleBooster, ctx: BoosterContext, playing: boolean): BoosterView {
  const t = run.tun.ticks;
  const count = Math.max(0, ctx.count(kind));
  const used = run.boostersUsed[kind];
  const limit = boosterLimit(run, kind);
  const effect = kind === 'bubble' ? (run.boostersUsed.bubble > 0 ? run.player.shield : 0) : kind === 'fortify' ? run.wallSteel : 0;
  const total = kind === 'bubble' ? t.bubbleBooster : kind === 'fortify' ? Math.max(t.fortify, t.rebar) : 0;
  let state: BoosterState = 'ready';
  let left = 0;
  let all = 0;
  if (ctx.blocked(kind)) state = 'blocked';
  else if (effect > 0) { state = 'active'; left = effect; all = Math.max(total, effect); }
  else if (used >= limit) state = 'limit';
  else if (count <= 0) state = 'empty';
  else if (run.boosterCooldown > 0 || !playing) { state = 'cooldown'; left = run.boosterCooldown; all = t.boosterCooldown; }
  return { id: BOOSTER_ID[kind], count, used, limit, state, leftMs: ms(run, left), totalMs: ms(run, all) };
}

/** The three spawn points; the next point shows the head of the queue. */
function spawnsOf(run: RunState): MatchView['spawns'] {
  const unit = run.tun.unit;
  const next = run.queue[0]?.type ?? null;
  return run.tun.enemySpawns.map(([col, row], index) => ({
    col, row, next: index === run.spawnPoint && run.waveBreak === 0 ? next : null,
    busy: run.enemies.some((e) => e.spawning > 0 && e.x === col * unit && e.y === row * unit),
  }));
}

export function buildView(input: ViewInput): MatchView {
  const { run } = input;
  const { tiles, quarters } = tilesOf(run);
  const p = run.player;
  const playing = run.phase === 'playing';
  const frozen = run.freeze > 0;
  return {
    tick: run.tick, alpha: 1, phase: input.phase, mode: input.mode, theme: input.theme, tiles, quarters,
    wall: { steel: run.wallSteel > 0, leftMs: ms(run, run.wallSteel), totalMs: ms(run, Math.max(run.tun.ticks.fortify, run.tun.ticks.rebar)) },
    spawns: spawnsOf(run),
    player: p.alive ? { id: p.id, x: p.x, y: p.y, px: p.x, py: p.y, dir: DIRS[p.dir] ?? 'up', moving: p.moved > 0,
      spawning: false, gun: gunOf(p.gun), shieldMs: ms(run, p.shield) } : null,
    enemies: run.enemies.map((e) => ({ id: e.id, x: e.x, y: e.y, px: e.x, py: e.y, dir: DIRS[e.dir] ?? 'down',
      moving: e.moved > 0, spawning: e.spawning > 0, kind: e.type, hp: e.hp, carrier: e.carrier, frozen })),
    bullets: run.bullets.map((b) => ({ id: b.id, x: b.x, y: b.y, px: b.x, py: b.y, dir: DIRS[b.dir] ?? 'up',
      owner: b.owner === 0 ? 'player' as const : 'enemy' as const, heavy: b.steel })),
    powerup: run.powerup ? { kind: run.powerup.type, col: run.powerup.col, row: run.powerup.row, leftMs: ms(run, run.powerup.ttl) } : null,
    freezeMs: ms(run, run.freeze),
    spawnHeld: input.spawnHeld,
    hud: {
      enemiesLeft: enemiesLeft(run), queued: run.queue.length, lives: run.lives, score: run.score,
      stage: input.mode === 'campaign' ? input.stage : null, wave: input.mode === 'siege' ? run.wave : null, gun: gunOf(p.gun),
      boosters: BATTLE_BOOSTERS.map((kind) => boosterState(run, kind, input.boosters, playing)),
    },
    tutorial: input.tutorial,
  };
}

/** The booster kind of a field booster id. */
export function kindOf(id: FieldBooster): BattleBooster {
  return id === 'bst_bubble' ? 'bubble' : id === 'bst_shockwave' ? 'shockwave' : 'fortify';
}

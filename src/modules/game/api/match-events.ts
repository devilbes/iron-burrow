// Rule events of the ticks → MatchEvent of the screens (CONTRACT §7.4): positions in cells, the
// target of a hit, effect ends and warnings from the change of the timers between two frames.
import { CELL, type GameEvent, type RunState } from '../core/index.js';
import type { BoosterId, MatchEvent } from '../index.js';

const BOOSTER: Readonly<Record<string, BoosterId>> = { bubble: 'bst_bubble', shockwave: 'bst_shockwave', fortify: 'bst_fortify' };

/** Last known cell of each enemy (a killed one is gone from the state before its event is read). */
export type Positions = Map<number, readonly [number, number]>;

export function remember(run: RunState, positions: Positions): void {
  const unit = run.tun.unit;
  for (const e of run.enemies) positions.set(e.id, [Math.round(e.x / unit), Math.round(e.y / unit)]);
}

const cellAt = (run: RunState, x: number | undefined, y: number | undefined): [number, number] => {
  const unit = run.tun.unit;
  return [Math.max(0, Math.min(run.tun.cells - 1, Math.floor((x ?? 0) / unit))), Math.max(0, Math.min(run.tun.cells - 1, Math.floor((y ?? 0) / unit)))];
};

const isWall = (run: RunState, col: number, row: number): boolean => run.field.wall.some(([c, r]) => c === col && r === row);

function tileEvents(run: RunState, e: Extract<GameEvent, { t: 'tile' }>): MatchEvent[] {
  const first = e.quarters[0];
  if (!first) return [];
  const col = first[0] >> 1;
  const row = first[1] >> 1;
  const grid = run.stage.grid[row]?.[col];
  const steel = isWall(run, col, row) ? run.wallSteel > 0 : grid === 'S';
  if (steel) return [{ type: 'steel-broken', col, row }];
  return [{ type: 'hit', target: isWall(run, col, row) ? 'core-wall' : 'brick', col, row }];
}

/** One rule event as screen events (none for the internal ones). */
export function mapEvent(run: RunState, e: GameEvent, positions: Positions): MatchEvent[] {
  switch (e.t) {
    case 'spawn': return [{ type: 'enemy-spawn', kind: e.type }];
    case 'player_spawn': return [{ type: 'player-spawn' }];
    case 'shot': return [{ type: 'shot', owner: e.owner === 0 ? 'player' : 'enemy', heavy: e.owner === 0 && run.player.gun >= 3 }];
    case 'hit': {
      const enemy = run.enemies.find((one) => one.id === e.id);
      const [col, row] = enemy ? cellAt(run, enemy.x, enemy.y) : positions.get(e.id) ?? [0, 0];
      return enemy?.type === 'brute' ? [{ type: 'hit', target: 'brute', col, row }] : [];
    }
    case 'kill': {
      const [col, row] = positions.get(e.id) ?? [0, 0];
      positions.delete(e.id);
      const out: MatchEvent[] = [{ type: 'kill', kind: e.type, by: e.by, points: e.points, col, row }];
      if (!run.siege && run.tun.stageEnemies - run.destroyed === 1) out.push({ type: 'last-enemy' });
      return out;
    }
    case 'drop': return [{ type: 'powerup-spawn', kind: e.type, col: e.col, row: e.row }];
    case 'pickup': {
      const out: MatchEvent[] = [{ type: 'pickup', kind: e.type, points: e.points }];
      if (e.type === 'star') out.push({ type: 'gun-up', level: Math.min(3, run.player.gun) as 0 | 1 | 2 | 3 });
      if (e.type === 'hull') out.push({ type: 'life-up' });
      return out;
    }
    case 'powerup_expired': return [{ type: 'powerup-expired' }];
    case 'tile': return tileEvents(run, e);
    case 'bullet_block': {
      const [col, row] = cellAt(run, e.x, e.y);
      return [{ type: 'hit', target: e.on === 'tank' ? 'shield' : run.field.cell[row * run.tun.cells + col] === CELL.core ? 'core-wall' : 'steel', col, row }];
    }
    case 'clash': { const [col, row] = cellAt(run, e.x, e.y); return [{ type: 'hit', target: 'bullet', col, row }]; }
    case 'shield_block': { const [col, row] = cellAt(run, e.x, e.y); return [{ type: 'hit', target: 'shield', col, row }]; }
    case 'player_death': return [{ type: 'player-death', lives: e.lives }];
    case 'threat': return [{ type: 'core-threat' }, { type: 'core-alarm' }];
    case 'core_destroyed': return [{ type: 'core-destroyed' }];
    case 'booster': return [{ type: 'booster', id: BOOSTER[e.kind] ?? 'bst_bubble' }];
    case 'wave_start': return [{ type: 'wave-start', wave: e.w }];
    case 'wave_clear': return [{ type: 'wave-clear', wave: e.w, bonus: e.bonus }];
    case 'cleared': return [{ type: 'cleared' }];
    case 'defeated': return [{ type: 'defeated', reason: e.cause }];
    case 'continue': return [{ type: 'booster', id: 'bst_hull' }];
    default: return [];
  }
}

/** The shield warning sounds this long before the shield ends (feedback timing, GDD 23). */
const SHIELD_WARNING_S = 2;

/** Timers of the run a frame compares (effect ends and warnings). */
export interface Timers { shield: number; freeze: number; wall: number; slide: number; alive: boolean }

export const timersOf = (run: RunState): Timers =>
  ({ shield: run.player.shield, freeze: run.freeze, wall: run.wallSteel, slide: run.player.slide, alive: run.player.alive });

/** Effect ends, the shield warning and the oil slide between two frames. */
export function timerEvents(run: RunState, before: Timers, bubbleUsed: boolean, rebar: boolean): MatchEvent[] {
  const now = timersOf(run);
  const out: MatchEvent[] = [];
  const warn = Math.round(run.tun.tps * SHIELD_WARNING_S);
  if (before.freeze > 0 && now.freeze === 0) out.push({ type: 'effect-end', effect: 'freeze' });
  if (before.alive && now.alive && before.shield > 0 && now.shield === 0) out.push({ type: 'effect-end', effect: bubbleUsed ? 'bubble' : 'shield' });
  if (before.shield > warn && now.shield > 0 && now.shield <= warn) out.push({ type: 'shield-warning' });
  if (before.wall > 0 && now.wall === 0) out.push({ type: 'effect-end', effect: rebar ? 'rebar' : 'fortify' });
  if (before.slide === 0 && now.slide > 0) out.push({ type: 'oil-slide' });
  return out;
}

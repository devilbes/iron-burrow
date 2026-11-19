// S15 — the tutorial of stage 1 (CONTRACT §11): six steps over the running stage, each with its
// target and how it ends; the enemy spawn is held until the end of T4 (or a time cap); a step
// shows at least a minimum time, with a short gap before the next. Times run on the simulation
// ticks (a pause stops them). The step reached is written to kv at once; a replay of stage 1 from
// step ≥ 4 starts at T5 without the hold. The pace is `game.balance.tut` (GDD 14 `tut.*`).
import type { InputMode, MatchEvent, TutorialView } from '../index.js';
import type { RunState } from '../core/index.js';
import type { TutorialTunables } from './records.js';

/** First step of a replay once the player has seen T4 (CONTRACT §11). */
const REPLAY_FROM = 5;

type Step = TutorialView['step'];
const LAST: Step = 6;

export interface TutorialHost {
  /** kv `tut.stage1_step` / `tut.stage1_done`, written at once. */
  saveStep(step: number): void;
  done(skipped: boolean): void;
}

export class Tutorial {
  step: Step | null;
  /** Spawn held (T1–T4 of the first run). */
  hold: boolean;
  private shownAt = 0;
  private gapUntil = 0;
  private startTick = -1;
  private startX = 0;
  private startY = 0;
  private finished = false;
  private waitingDrop = false;
  mode: InputMode = 'keys';

  constructor(from: number, private readonly host: TutorialHost, private readonly tut: TutorialTunables) {
    const first = from >= REPLAY_FROM - 1 ? REPLAY_FROM : 1;
    this.step = first as Step;
    this.hold = first < REPLAY_FROM;
  }

  get active(): boolean { return !this.finished && this.step !== null; }

  private ticks(run: RunState, seconds: number): number { return Math.round(seconds * run.tun.tps); }

  /** Keeps the spawn timer from running out while the spawn is held. */
  holdSpawn(run: RunState): void {
    if (!this.hold) return;
    if (this.startTick >= 0 && run.tick - this.startTick >= this.ticks(run, this.tut.spawn_hold_max_s)) { this.hold = false; return; }
    run.spawnTimer = Math.max(run.spawnTimer, run.tun.maxTicksPerFrame + 1);
  }

  /** The view of the step (null between steps and when done). */
  view(): TutorialView | null {
    if (!this.active || this.step === null || this.waitingDrop) return null;
    const keys = this.mode === 'keys';
    switch (this.step) {
      case 1: return { step: 1, text: keys ? 'screen.tut.move_keys' : 'screen.tut.move_touch', text2: null, target: keys ? 'keys' : 'stick' };
      case 2: return { step: 2, text: keys ? 'screen.tut.fire_keys' : 'screen.tut.fire_touch', text2: null, target: keys ? 'keys' : 'fire' };
      case 3: return { step: 3, text: 'screen.tut.brick', text2: null, target: 'brick' };
      case 4: return { step: 4, text: 'screen.tut.core', text2: 'screen.tut.core_selfhit', target: 'core' };
      case 5: return { step: 5, text: 'screen.tut.enemy', text2: null, target: 'enemy' };
      default: return { step: 6, text: 'screen.tut.carrier', text2: null, target: 'powerup' };
    }
  }

  /** Advances the steps by what the ticks of a frame did; returns the tutorial events. */
  update(run: RunState, events: readonly MatchEvent[]): MatchEvent[] {
    if (!this.active || this.step === null || run.phase !== 'playing') return [];
    if (this.startTick < 0) this.begin(run);
    if (this.step === LAST && this.waitingDrop) {
      if (events.some((e) => e.type === 'powerup-spawn')) { this.waitingDrop = false; this.shownAt = run.tick; return [{ type: 'tutorial', step: 6 }]; }
      return [];
    }
    if (run.tick < this.gapUntil) return [];
    return this.reached(run, events) ? this.next(run) : [];
  }

  private begin(run: RunState): void {
    this.startTick = run.tick;
    this.shownAt = run.tick;
    this.startX = run.player.x;
    this.startY = run.player.y;
    this.host.saveStep(this.step ?? 1);
  }

  private reached(run: RunState, events: readonly MatchEvent[]): boolean {
    const shown = run.tick - this.shownAt;
    if (shown < this.ticks(run, this.tut.step_min_show_s)) return false;
    const has = (type: MatchEvent['type']): boolean => events.some((e) => e.type === type);
    switch (this.step) {
      case 1: return Math.abs(run.player.x - this.startX) + Math.abs(run.player.y - this.startY) >= this.tut.move_done_cells * run.tun.unit;
      case 2: return events.some((e) => e.type === 'shot' && e.owner === 'player');
      case 3: return events.some((e) => e.type === 'hit' && e.target === 'brick') || has('steel-broken') || shown >= this.ticks(run, this.tut.brick_timeout_s);
      case 4: return shown >= this.ticks(run, this.tut.core_show_s);
      case 5: return has('kill') || shown >= this.ticks(run, this.tut.enemy_timeout_s);
      default: return has('pickup') || has('powerup-expired');
    }
  }

  /** «Got it»: the step is done now (after its minimum time). */
  confirm(run: RunState | null): MatchEvent[] {
    if (!run || !this.active || this.waitingDrop) return [];
    if (run.tick - this.shownAt < this.ticks(run, this.tut.step_min_show_s)) return [];
    return this.next(run);
  }

  private next(run: RunState): MatchEvent[] {
    const step = this.step ?? LAST;
    if (step === 4) this.hold = false;
    if (step >= LAST) { this.finish(false); return []; }
    const next = (step + 1) as Step;
    this.step = next;
    this.host.saveStep(next);
    this.gapUntil = run.tick + this.ticks(run, this.tut.step_gap_s);
    this.shownAt = this.gapUntil;
    if (next === LAST && run.powerup === null) { this.waitingDrop = true; return []; }
    return [{ type: 'tutorial', step: next }];
  }

  /** «Skip»: the tutorial is over, the spawn goes on. */
  skip(): void { this.finish(true); }

  private finish(skipped: boolean): void {
    if (this.finished) return;
    this.finished = true;
    this.hold = false;
    this.step = null;
    this.host.done(skipped);
  }
}

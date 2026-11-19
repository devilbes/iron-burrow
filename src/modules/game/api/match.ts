// A Match (CONTRACT §3.3) over the level controller: the screen's frame loop drives it with
// `advance`, reads `view`, sends input and boosters; the tutorial of stage 1 and the QA hooks live
// here; `end` turns the controller's result into the StageResult of S07 / S08 / S09.
import { type BattleBooster, type ControllerEvent, type LevelController, type Outcome } from '../controller/index.js';
import { boosterLimit, type RunState } from '../core/index.js';
import type { BoosterUse, DefeatInfo, Dir, FieldBooster, InputMode, Match, MatchEvent, MatchView, OfferKey, Phase, StageEntry,
  StageResult, StageSetup, TileTheme } from '../index.js';
import { buildView, kindOf } from './match-view.js';
import { mapEvent, remember, timerEvents, timersOf, type Positions, type Timers } from './match-events.js';
import type { Tutorial } from './tutorial.js';

const DIR_INDEX: Readonly<Record<Dir, 0 | 1 | 2 | 3>> = { up: 0, right: 1, down: 2, left: 3 };
const ENDED = ['ending', 'result', 'end_failed'];

/** What the match needs from the API around it. */
export interface MatchHost {
  /** Booster count left for new uses (inventory minus unconfirmed consumes). */
  count(kind: BattleBooster): number;
  /** Spare Hulls owned. */
  hulls(): number;
  defeatOffers(): readonly OfferKey[];
  /** First core threat: the booster hint is due (once per player). */
  boosterHint(): boolean;
  /** The result of S07 / S08 / S09 from the controller outcome. */
  result(match: MatchImpl, outcome: Outcome, run: RunState | null): Promise<StageResult>;
  offline(): Error;
  readonly qa: boolean;
}

export class MatchImpl implements Match {
  private clock = 0;
  private readonly positions: Positions = new Map();
  private readonly pending: MatchEvent[] = [];
  private readonly blocked = new Set<BattleBooster>();
  private timers: Timers | null = null;
  private introShown = false;
  private bubbleUsed = false;
  private rebar = false;
  private alive = true;
  private readonly off: () => void;
  private resultCache: Promise<StageResult> | null = null;
  inputMode: InputMode = 'keys';

  constructor(private readonly ctl: LevelController, readonly setup: StageSetup, readonly entry: StageEntry,
    private readonly host: MatchHost, readonly tutorial: Tutorial | null) {
    this.off = ctl.on((event) => this.onEvent(event));
  }

  get mode(): 'campaign' | 'siege' { return this.setup.mode; }
  get n(): number { return this.setup.n; }
  get paused(): boolean { return this.ctl.phase === 'paused'; }
  get run(): RunState | null { return this.alive ? this.ctl.run : null; }

  /** Another match started: this one is inert. */
  retire(): void { this.alive = false; this.off(); }

  private onEvent(event: ControllerEvent): void {
    const run = this.run;
    if (!run) return;
    if (event.t === 'booster_failed') {
      if (event.kind !== 'hull') { this.blocked.add(event.kind); this.pending.push({ type: 'consume-failed', id: `bst_${event.kind}` as FieldBooster }); }
      return;
    }
    if (event.t === 'booster' && event.kind === 'bubble') this.bubbleUsed = true;
    if (event.t === 'booster' && event.kind === 'fortify') this.rebar = false;
    if (event.t === 'pickup' && event.type === 'rebar') this.rebar = true;
    if (event.t === 'continue') this.timers = null;
    if (!('t' in event) || event.t === 'phase' || event.t === 'start_failed' || event.t === 'defeat' || event.t === 'result') return;
    const mapped = mapEvent(run, event, this.positions);
    for (const e of mapped) {
      this.pending.push(e);
      if (e.type === 'core-threat' && this.host.boosterHint()) this.pending.push({ type: 'booster-hint' });
    }
    remember(run, this.positions);
  }

  private theme(): TileTheme {
    const theme = this.entry.theme;
    return theme === 'pit' ? 'magma' : theme;
  }

  private phase(): Phase {
    const run = this.run;
    const ctl = this.ctl.phase;
    if (ctl === 'paused') return 'paused';
    if (run?.phase === 'cleared' || (ENDED.includes(ctl) && this.ctl.outcome?.won === true && this.mode === 'campaign')) return 'cleared';
    if (ctl === 'defeated' || ENDED.includes(ctl)) return 'defeated';
    return ctl === 'intro' ? 'intro' : 'playing';
  }

  view(): MatchView {
    const run = this.run;
    if (!run) throw this.host.offline();
    const tut = this.tutorial;
    if (tut) tut.mode = this.inputMode;
    return buildView({ run, phase: this.phase(), mode: this.mode, stage: this.n, theme: this.theme(),
      spawnHeld: tut?.hold === true, tutorial: tut?.view() ?? null,
      boosters: { count: (kind) => this.host.count(kind), blocked: (kind) => this.blocked.has(kind) } });
  }

  advance(elapsedMs: number): readonly MatchEvent[] {
    const run = this.run;
    if (!run) return [];
    if (!this.introShown) {
      this.introShown = true;
      this.pending.push({ type: 'intro', stage: this.mode === 'campaign' ? this.n : null, wave: this.mode === 'siege' ? Math.max(1, run.wave) : null });
    }
    const before = this.timers ?? timersOf(run);
    this.tutorial?.holdSpawn(run);
    this.clock += Math.max(0, elapsedMs);
    this.ctl.frame(this.clock);
    const current = this.run;
    if (!current) return this.flush();
    this.pending.push(...timerEvents(current, before, this.bubbleUsed, this.rebar));
    this.timers = timersOf(current);
    if (this.tutorial) this.pending.push(...this.tutorial.update(current, this.pending));
    return this.flush();
  }

  private flush(): MatchEvent[] { return this.pending.splice(0); }

  setInput(input: { readonly move: Dir | null; readonly fire: boolean }): void {
    if (!this.alive) return;
    this.ctl.setInput(input.move === null ? null : DIR_INDEX[input.move], input.fire);
  }

  setInputMode(mode: InputMode): void { this.inputMode = mode; }

  useBooster(id: FieldBooster): BoosterUse {
    const run = this.run;
    const kind = kindOf(id);
    const deny = (reason: Exclude<BoosterUse, 'applied'>): BoosterUse => {
      this.pending.push({ type: 'booster-denied', id, reason });
      if (reason === 'empty') this.pending.push({ type: 'booster-hint' });
      return reason;
    };
    if (!run) return 'blocked';
    if (this.blocked.has(kind)) return deny('blocked');
    if (run.boostersUsed[kind] >= boosterLimit(run, kind)) return deny('limit');
    if (this.host.count(kind) <= 0) return deny('empty');
    if (this.ctl.useBooster(kind)) return 'applied';
    // Not now: the intro, the general cooldown, or nothing for it to do (a shield up, no enemy).
    return deny('cooldown');
  }

  pause(): void { if (this.alive) this.ctl.pause(); }
  resume(): void { if (this.alive) this.ctl.resume(); }

  tutorialNext(): void {
    if (this.tutorial) this.pending.push(...this.tutorial.confirm(this.run));
  }

  tutorialSkip(): void { this.tutorial?.skip(); }

  defeat(): DefeatInfo | null {
    const run = this.run;
    if (!run || this.ctl.phase !== 'defeated') return null;
    const max = run.siege ? run.tun.siege.continueMax : run.tun.boosters.hullContinue;
    const used = run.continues >= max;
    const hulls = this.host.hulls();
    const cont: DefeatInfo['continue'] = used ? 'used' : hulls > 0 ? 'available' : 'empty';
    return { reason: run.cause ?? 'lives', continue: cont, offers: cont === 'empty' ? this.host.defeatOffers() : [],
      score: run.score, wave: run.siege ? run.wave : null };
  }

  async continueRun(): Promise<'continued' | 'empty' | 'used' | 'failed'> {
    const info = this.defeat();
    if (!info) return 'failed';
    if (info.continue !== 'available') return info.continue;
    const ok = await this.ctl.continueWithHull();
    if (ok) this.timers = null;
    return ok ? 'continued' : this.host.hulls() > 0 ? 'failed' : 'empty';
  }

  /** Resolves when the controller has a result or gave up on the level end. */
  private settled(): Promise<void> {
    const done = (): boolean => this.ctl.phase === 'result' || this.ctl.phase === 'end_failed' || this.ctl.phase === 'idle';
    if (done()) return Promise.resolve();
    return new Promise((resolve) => {
      const off = this.ctl.on((event) => { if (event.t === 'phase' && done()) { off(); resolve(); } });
    });
  }

  async end(how: 'final' | 'quit'): Promise<StageResult> {
    if (this.resultCache) return this.resultCache;
    if (how === 'quit' && this.mode === 'campaign') {
      const run = this.run;
      await this.ctl.exit();
      return this.host.result(this, { mode: 'campaign', stage: this.n, wave: 0, won: false, verified: false, stars: 0,
        score: run?.score ?? 0, localStars: 0 }, null);
    }
    const phase = this.ctl.phase;
    if (phase === 'end_failed') { if (!await this.ctl.retryEnd()) throw this.host.offline(); }
    else if (this.mode === 'siege' && ['intro', 'playing', 'paused'].includes(phase)) await this.ctl.forfeit();
    else if (phase === 'defeated' || phase === 'ending') await this.ctl.concede();
    await this.settled();
    const outcome = this.ctl.outcome;
    if (this.ctl.phase !== 'result' || !outcome) throw this.host.offline();
    this.resultCache = this.host.result(this, outcome, this.run);
    return this.resultCache;
  }

  get qa(): Match['qa'] {
    if (!this.host.qa) return null;
    return {
      win: () => {
        const run = this.run;
        if (!run || run.siege || run.phase !== 'playing') return;
        run.queue = [];
        run.enemies = [];
        run.destroyed = run.tun.stageEnemies;
      },
      lose: () => { const run = this.run; if (run && run.phase === 'playing') run.coreAlive = false; },
    };
  }
}

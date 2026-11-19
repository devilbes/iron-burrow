// S05 Gameplay (CONTRACT §3.3, §4, §6, §11): the Canvas field, the match HUD, the input and the
// S15 hints in one screen; the frame loop is the screen's — requestAnimationFrame → advance →
// events (sound, haptics, fx, toasts) → view → draw. Windows (S04, S06–S09, S16, save-retry,
// Starter Crate) are opened by match-flow.ts through the game window functions.
import { gameOf, type FieldBooster, type InputMode, type IronBurrow, type Layout, type Match, type MatchView,
  type StageSetup } from '../modules/game/index.js';
import { holdLoop, sound, type Sound } from './audio.js';
import { coarsePointer, Controls } from './controls.js';
import { FieldRenderer, type FocusTarget } from './field-draw.js';
import { GRID, MAX_CELL } from './field-paint.js';
import type { ScreenContext, ScreenMount } from './index.js';
import { react } from './match-events.js';
import { afterClear, afterDefeat, boosterInfo, pauseMenu, startSelected, type FlowHost } from './match-flow.js';
import { renderMatch, type HudActions, type HudModel } from './match-hud.js';
import { HudLive } from './match-live.js';
import { MATCH_CSS } from './match-style.js';
import { ImageBank } from './media.js';
import { boosterHintText } from './tutorial.js';
import { currentLayout, mountLive, watchLayout, type LiveView } from './ui.js';

/** Long press on a booster opens its card (CONTRACT §4 S16: 500 ms). */
const LONG_PRESS_MS = 500;
/** Side panels of L / D keep at least this width, px (layout). */
const PANEL_MIN = 168;
/** How long the booster hint plate stays, ms (UI pace). */
const HINT_MS = 5000;
/** Frames with no new tick in `cleared` before S07: the clear delay of the logic is over. */
const SETTLED_FRAMES = 2;
const ENGINE = 'sfx_engine_loop';

const FOCUS: Readonly<Record<string, FocusTarget>> = { brick: 'brick', core: 'core', enemy: 'enemy', powerup: 'powerup' };

class GameScreen implements FlowHost {
  readonly game: IronBurrow;
  readonly sound: Sound;
  gone = false;
  match: Match | null = null;
  setup: StageSetup | null = null;
  ending = false;
  busy = false;
  private readonly model: HudModel;
  private readonly live: LiveView;
  private readonly hud: HudLive;
  private readonly controls: Controls;
  private readonly bank = new ImageBank();
  private field: FieldRenderer | null = null;
  private frame = 0;
  private lastTime: number | null = null;
  private lastTick = -1;
  private still = 0;
  private closedAt = -Infinity;
  private shape = '';
  /** After Continue: the phase may still read `defeated` for a frame — S08 is not opened again. */
  private continuing = false;
  private hintTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly offs: (() => void)[] = [];

  constructor(private readonly root: HTMLElement, readonly ctx: ScreenContext) {
    this.game = gameOf(ctx.game);
    this.sound = sound(this.game);
    const win = root.ownerDocument.defaultView ?? window;
    this.model = { layout: currentLayout(win), coarse: coarsePointer(win), inputMode: coarsePointer(win) ? 'touch' : 'keys',
      view: null, mode: null, qa: false, hint: null, toast: null, offline: false };
    this.controls = new Controls(root.ownerDocument, {
      active: () => !this.busy && this.match !== null && !this.ending,
      input: (move, fire) => { try { this.match?.setInput({ move, fire }); } catch { /* ended */ } },
      mode: (mode) => this.inputMode(mode),
      pause: (event) => { if (event.timeStamp > this.closedAt) void pauseMenu(this); },
      booster: (index) => { const b = this.model.view?.hud.boosters[index]; if (b) this.tapBooster(b.id); },
    });
    this.offs.push(this.sound.attach(root));
    this.live = mountLive(root, 'game', () => renderMatch(ctx, this.model, this.actions()), { styles: MATCH_CSS });
    this.live.host.dataset['layout'] = this.model.layout;
    this.hud = new HudLive(ctx, this.live, this.model);
    this.watch(win);
    this.rendered();
    this.frame = win.requestAnimationFrame((now) => this.tick(now));
    void startSelected(this);
  }

  private watch(win: Window): void {
    this.offs.push(watchLayout((layout) => this.onLayout(layout, win), win));
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => this.layoutField());
      observer.observe(this.live.host);
      this.offs.push(() => observer.disconnect());
    }
    this.offs.push(this.ctx.onSuspend((suspended) => this.onSuspend(suspended)));
    try {
      this.offs.push(this.game.onSettings((s) => { if (this.field) this.field.fx.reduced = s.motion; }));
    } catch { /* stub */ }
  }

  private actions(): HudActions {
    return {
      pause: () => { void pauseMenu(this); },
      booster: (id) => this.boosterHandlers(id),
      qaWin: () => { try { this.match?.qa?.win(); } catch { /* not in test */ } },
      qaLose: () => { try { this.match?.qa?.lose(); } catch { /* not in test */ } },
      next: () => { this.sound.sfx('sfx_ui_click'); try { this.match?.tutorialNext(); } catch { /* ended */ } this.refresh(); },
      skip: () => { this.sound.sfx('sfx_ui_back'); try { this.match?.tutorialSkip(); } catch { /* ended */ } this.refresh(); },
      stick: this.controls.stick(),
      fire: this.controls.fireButton(),
    };
  }

  /** Booster button: tap uses it (or opens its card when none is left), a long press opens the card. */
  private boosterHandlers(id: FieldBooster): Readonly<Record<string, (event: Event) => void>> {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let long = false;
    const clear = (): void => { if (timer) clearTimeout(timer); timer = null; };
    return {
      onPointerdown: (event) => {
        long = false;
        if ((event as PointerEvent).pointerType === 'touch') this.inputMode('touch');
        clear();
        timer = setTimeout(() => { timer = null; long = true; void boosterInfo(this, id); }, LONG_PRESS_MS);
      },
      onPointerup: () => { const pressed = timer !== null; clear(); if (pressed && !long) this.tapBooster(id); },
      onPointercancel: () => { clear(); long = true; },
      onPointerleave: () => { clear(); long = true; },
      onClick: (event) => { if ((event as MouseEvent).detail === 0) this.tapBooster(id); },
    };
  }

  private tapBooster(id: FieldBooster): void {
    const match = this.match;
    if (!match || this.busy || this.ending) return;
    const b = this.model.view?.hud.boosters.find((item) => item.id === id);
    if (b && (b.count <= 0 || b.state === 'empty')) { void boosterInfo(this, id); return; }
    try { match.useBooster(id); } catch { /* ended */ }
    this.setHint(null);
  }

  private inputMode(mode: InputMode): void {
    if (this.model.inputMode === mode) return;
    this.model.inputMode = mode;
    try { this.match?.setInputMode(mode); } catch { /* ended */ }
  }

  private setHint(text: string | null): void {
    if (this.hintTimer) clearTimeout(this.hintTimer);
    this.hintTimer = text ? setTimeout(() => this.setHint(null), HINT_MS) : null;
    if (this.model.hint === text) return;
    this.model.hint = text;
    this.refresh();
  }

  attach(match: Match): void {
    this.match = match;
    this.ending = false;
    this.continuing = false;
    this.still = 0;
    this.lastTick = -1;
    this.lastTime = null;
    this.model.mode = match.mode;
    this.model.qa = this.game.env.qa && match.qa !== null;
    try { match.setInputMode(this.model.inputMode); } catch { /* ended */ }
    try { this.model.view = match.view(); } catch { this.model.view = null; }
    this.field?.reset();
    this.refresh();
    this.sound.sfx('jgl_stage_start');
    this.sound.music(this.musicId());
  }

  detach(): void {
    this.match = null;
    this.controls.release();
    holdLoop(this.game, ENGINE, false);
  }

  private musicId(): string | null {
    const view = this.model.view;
    if (!this.match || !view) return null;
    return this.match.mode === 'siege' ? 'mus_siege' : `mus_stage_${view.theme}`;
  }

  async window<T>(open: () => Promise<T>): Promise<T> {
    this.busy = true;
    this.controls.release();
    holdLoop(this.game, ENGINE, false);
    this.sound.duck(true);
    try { return await Promise.resolve().then(open); } finally {
      this.busy = false;
      this.closedAt = performance.now();
      this.sound.duck(false);
      if (this.match && !this.ending && !this.gone) this.sound.music(this.musicId());
    }
  }

  private onLayout(layout: Layout, win: Window): void {
    this.model.layout = layout;
    this.model.coarse = coarsePointer(win);
    this.live.host.dataset['layout'] = layout;
    this.refresh();
    const phase = this.model.view?.phase;
    if (phase === 'playing' || phase === 'intro') void pauseMenu(this);
  }

  private onSuspend(suspended: boolean): void {
    if (!suspended) return;
    this.sound.stop();
    this.controls.release();
    if (this.match && !this.busy && !this.ending) void pauseMenu(this);
  }

  /** Renders the tree again and picks up the new elements (canvas, HUD nodes). */
  private refresh(): void {
    if (this.gone) return;
    this.live.refresh();
    this.rendered();
  }

  private rendered(): void {
    this.hud.invalidate();
    const canvas = this.hud.canvas();
    if (canvas && canvas !== this.field?.canvas) {
      this.field = new FieldRenderer(canvas, this.bank, this.live.host);
      try { this.field.fx.reduced = this.game.settings().motion; } catch { /* stub */ }
    }
    this.field?.repaint(this.live.host);
    this.layoutField();
    if (this.model.view) this.hud.update(this.model.view);
  }

  /** Field size from the screen (CONTRACT §4): cell = floor(fieldPx / 13), at most 72 px. */
  private layoutField(): void {
    const section = this.live.shadow()?.querySelector<HTMLElement>('.game');
    const box = this.live.shadow()?.querySelector<HTMLElement>('.field-box');
    if (!section || !box || !this.field) return;
    const style = getComputedStyle(section);
    const pad = Number.parseFloat(style.paddingTop) || 0;
    const gap = Number.parseFloat(style.columnGap) || 0;
    const fieldPx = this.model.layout === 'portrait'
      ? Math.min(box.clientWidth, box.clientHeight)
      : Math.min(section.clientHeight - pad * 2, section.clientWidth - pad * 2 - gap * 2 - PANEL_MIN * 2);
    const cell = Math.max(1, Math.min(MAX_CELL, Math.floor(fieldPx / GRID)));
    section.style.setProperty('--field', `${cell * GRID}px`);
    this.field.resize(cell, (section.ownerDocument.defaultView ?? window).devicePixelRatio || 1);
    this.hud.cell(cell);
  }

  private tick(now: number): void {
    if (this.gone) return;
    const win = this.root.ownerDocument.defaultView ?? window;
    this.frame = win.requestAnimationFrame((next) => this.tick(next));
    const elapsed = this.lastTime === null ? 0 : Math.max(0, now - this.lastTime);
    this.lastTime = now;
    const match = this.match;
    if (!match) return;
    try { this.step(match, elapsed, now); } catch { /* a bad frame never stops the loop */ }
  }

  private step(match: Match, elapsed: number, now: number): void {
    const before = this.model.view;
    const events = this.busy ? [] : match.advance(elapsed);
    const view = match.view();
    this.model.view = view;
    const fieldNow = this.field;
    if (fieldNow && events.length > 0) {
      react({ ctx: this.ctx, game: this.game, sound: this.sound, field: fieldNow, live: this.hud, now, before,
        hint: () => this.setHint(boosterHintText(this.ctx, this.model.inputMode)), tutorial: () => this.refresh() }, events);
    }
    this.model.offline = !this.online();
    const shape = this.shapeOf(view);
    if (shape !== this.shape) { this.shape = shape; this.refresh(); }
    this.hud.update(view);
    const tut = view.tutorial?.target;
    fieldNow?.draw(view, now, tut ? FOCUS[tut] ?? null : null);
    holdLoop(this.game, ENGINE, !this.busy && view.phase === 'playing' && this.controls.move !== null);
    this.settle(match, view);
  }

  /** What the tree depends on besides the numbers: a change renders it again. */
  private shapeOf(view: MatchView): string {
    const tut = view.tutorial;
    const tutKey = tut ? `${tut.step}:${tut.text}:${tut.text2 ?? ''}:${tut.target}:${this.model.inputMode}` : '';
    const ids = view.hud.boosters.map((b) => b.id).join(',');
    return `${this.model.layout}|${this.model.coarse}|${tutKey}|${ids}|${view.hud.stage}|${this.model.qa}|${this.model.offline}`;
  }

  private online(): boolean {
    try { return this.game.online(); } catch { return true; }
  }

  /** Clear / defeat windows once the logic's delay is over. */
  private settle(match: Match, view: MatchView): void {
    if (this.ending || this.busy) return;
    if (view.phase === 'defeated') {
      if (!this.continuing) void afterDefeat(this, match, () => this.continued());
      return;
    }
    this.continuing = false;
    if (view.phase !== 'cleared') { this.still = 0; this.lastTick = view.tick; return; }
    this.still = view.tick === this.lastTick ? this.still + 1 : 0;
    this.lastTick = view.tick;
    if (this.still >= SETTLED_FRAMES) void afterClear(this, match);
  }

  private continued(): void {
    this.continuing = true;
    this.field?.coreRestored();
    this.still = 0;
    this.sound.music(this.musicId());
  }

  unmount(): void {
    if (this.gone) return;
    this.gone = true;
    const win = this.root.ownerDocument.defaultView ?? window;
    win.cancelAnimationFrame(this.frame);
    if (this.hintTimer) clearTimeout(this.hintTimer);
    holdLoop(this.game, ENGINE, false);
    this.sound.duck(false);
    if (this.match && !this.ending && !this.match.paused) { try { this.match.pause(); } catch { /* ended */ } }
    this.controls.off();
    this.hud.off();
    for (const off of this.offs.splice(0)) { try { off(); } catch { /* gone */ } }
    this.live.off();
  }
}

export const mount: ScreenMount = (root, ctx) => {
  const screen = new GameScreen(root, ctx);
  return () => screen.unmount();
};

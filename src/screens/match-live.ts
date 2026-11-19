// Fast-changing parts of the S05 HUD, written straight into the screen's shadow DOM each frame
// (no re-render): the numbers of the stat chips and the score, booster state / count / ring, the
// field's `data-state`, `data-cell` and `data-fx-ack`, and the toast. Elements are looked up once
// per render (`invalidate` after a refresh) and touched only when their value changed.
import type { MatchView } from '../modules/game/index.js';
import type { ScreenContext } from './index.js';
import { boosterName, phaseState, ringShare, statTexts, type HudModel } from './match-hud.js';
import { formatNumber, type LiveView } from './ui.js';

/** How long a toast stays, ms (UI pace, not a game number). */
const TOAST_MS = 1800;

export class HudLive {
  private readonly last = new Map<string, string>();
  private readonly found = new Map<string, HTMLElement | null>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly ctx: ScreenContext, private readonly live: LiveView, private readonly model: HudModel) {}

  /** After a render: elements may be new, write every value again. */
  invalidate(): void { this.found.clear(); this.last.clear(); }

  private el(selector: string): HTMLElement | null {
    if (this.found.has(selector)) return this.found.get(selector) ?? null;
    const node = this.live.shadow()?.querySelector<HTMLElement>(selector) ?? null;
    this.found.set(selector, node);
    return node;
  }

  /** Runs `write` when `value` differs from the last one written under `key`. */
  private changed(key: string, value: string): boolean {
    if (this.last.get(key) === value) return false;
    this.last.set(key, value);
    return true;
  }

  canvas(): HTMLCanvasElement | null {
    return this.el('[data-testid=game-field]') as HTMLCanvasElement | null;
  }

  update(v: MatchView): void {
    const field = this.canvas();
    const state = phaseState(v);
    if (field && this.changed('state', state)) field.dataset['state'] = state;
    const texts = statTexts(this.ctx, v);
    for (const name of ['enemies', 'lives', 'stage', 'gun'] as const) {
      const text = texts[name];
      const chip = this.el(`[data-testid=hud-${name}]`);
      if (!chip || !this.changed(name, text.long)) continue;
      chip.title = text.long;
      chip.setAttribute('aria-label', text.long);
      const short = chip.querySelector('.short');
      const long = chip.querySelector('.long');
      if (short) short.textContent = text.short;
      if (long) long.textContent = text.long;
    }
    const score = formatNumber(v.hud.score);
    const scoreValue = this.el('[data-testid=hud-score] .value');
    if (scoreValue && this.changed('score', score)) scoreValue.textContent = score;
    for (const b of v.hud.boosters) {
      const button = this.el(`[data-testid=hud-booster-${boosterName(b.id)}]`);
      if (!button) continue;
      if (this.changed(`${b.id}:state`, b.state)) button.dataset['state'] = b.state;
      const share = ringShare(b).toFixed(3);
      if (this.changed(`${b.id}:ring`, share)) button.style.setProperty('--p', share);
      const count = formatNumber(b.count);
      if (this.changed(`${b.id}:count`, count)) {
        const badge = button.querySelector('[data-testid=hud-booster-count]');
        if (badge) badge.textContent = count;
      }
    }
  }

  /** `data-cell` of the field (cell size in CSS px). */
  cell(px: number): void {
    const field = this.canvas();
    if (field && this.changed('cell', String(px))) field.dataset['cell'] = String(px);
  }

  /** `data-fx-ack`: the id of the last effect shown (`fx.shot`, `fx.kill_grunt`…). */
  ack(fx: string): void {
    const field = this.canvas();
    if (field) field.dataset['fxAck'] = fx;
  }

  /** Shows `text` in `hud-toast` for a moment (the latest replaces the one shown). */
  toast(text: string): void {
    this.model.toast = text;
    this.showToast();
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.timer = null; this.model.toast = null; this.showToast(); }, TOAST_MS);
  }

  private showToast(): void {
    const node = this.el('[data-testid=hud-toast]');
    if (!node) return;
    node.textContent = this.model.toast ?? '';
    node.dataset['state'] = this.model.toast ? 'shown' : 'idle';
  }

  off(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}

// The S05 screen tree: field canvas, match HUD (enemies, lives, stage / wave, score, gun, pause,
// the three field boosters with their state ring and count, toast, QA buttons), the tutorial
// plate and the input zone (stick and FIRE for `pointer: coarse`, key captions otherwise). The
// tree is rendered on structural changes only; the numbers change in place (match-live.ts).
import type { BoosterView, FieldBooster, InputMode, Layout, MatchView, Mode } from '../modules/game/index.js';
import type { ScreenContext } from './index.js';
import { gameArt, itemArt } from './media.js';
import { itemName } from './rewards.js';
import { tutorialPlate } from './tutorial.js';
import { button, formatNumber, view, type ViewChild, type ViewNode } from './ui.js';

type Handlers = Readonly<Record<string, (event: Event) => void>>;

export interface HudModel {
  layout: Layout;
  coarse: boolean;
  inputMode: InputMode;
  view: MatchView | null;
  mode: Mode | null;
  qa: boolean;
  /** Booster hint plate text (S15 `booster-hint`), or null. */
  hint: string | null;
  /** Text of `hud-toast` now, or null (idle). */
  toast: string | null;
  /** The connection is down (`game.online()`): a plate says it is reconnecting. */
  offline: boolean;
}

export interface HudActions {
  pause(): void;
  booster(id: FieldBooster): Handlers;
  qaWin(): void;
  qaLose(): void;
  next(): void;
  skip(): void;
  stick: Handlers;
  fire: Handlers;
}

export interface StatText { readonly short: string; readonly long: string }

/** HUD texts of a view: the short number next to the icon and the full line (no art / a11y). */
export function statTexts(ctx: ScreenContext, v: MatchView): Readonly<Record<'enemies' | 'lives' | 'stage' | 'gun', StatText>> {
  const hud = v.hud;
  const wave = hud.stage === null && hud.wave !== null;
  const n = (wave ? hud.wave : hud.stage) ?? 0;
  return {
    enemies: { short: formatNumber(hud.enemiesLeft), long: ctx.t('screen.hud.enemies', { count: hud.enemiesLeft }) },
    lives: { short: formatNumber(hud.lives), long: ctx.t('screen.hud.lives', { count: hud.lives }) },
    stage: { short: formatNumber(n), long: wave ? ctx.t('screen.hud.wave', { n }) : ctx.t('screen.hud.stage', { n }) },
    gun: { short: formatNumber(hud.gun), long: ctx.t('screen.hud.gun', { n: hud.gun }) },
  };
}

/** Short name of a field booster without `bst_` (`bubble`, `shockwave`, `fortify`): the testid part. */
export const boosterName = (id: FieldBooster): string => id.replace(/^bst_/, '');

/** Share of the ring of a booster: what is left of its effect or of its cooldown. */
export function ringShare(b: BoosterView): number {
  if ((b.state !== 'active' && b.state !== 'cooldown') || b.totalMs <= 0) return 0;
  return Math.max(0, Math.min(1, b.leftMs / b.totalMs));
}

/** Hides the picture and shows the text of its holder when the file is missing. */
const artMissing = (event: Event): void => {
  const holder = (event.target as HTMLElement).closest('[data-art]');
  holder?.setAttribute('data-art', 'missing');
};

function art(id: string, src = gameArt(id)): ViewNode {
  return view('img', { src, alt: '', draggable: 'false', decoding: 'async', onError: artMissing });
}

function chip(testid: string, icon: string, text: StatText, pulse = false): ViewNode {
  return view('div', { class: 'chip', 'data-testid': testid, 'data-art': 'ok', title: text.long, 'aria-label': text.long,
    'data-dynamic': '', 'data-pulse': pulse ? 'true' : undefined },
    art(icon), view('span', { class: 'short' }, text.short), view('span', { class: 'long' }, text.long));
}

function stats(ctx: ScreenContext, v: MatchView | null, wave: boolean): ViewChild[] {
  if (!v) return [];
  const text = statTexts(ctx, v);
  return [
    chip('hud-stage', wave ? 'icon_wave' : 'icon_stage', text.stage),
    chip('hud-enemies', 'icon_enemy_left', text.enemies, v.tutorial?.target === 'enemy'),
    chip('hud-lives', 'icon_life', text.lives),
    chip('hud-gun', 'icon_gun', text.gun),
  ];
}

function scoreChip(ctx: ScreenContext, v: MatchView | null): ViewNode {
  return view('div', { class: 'chip', 'data-testid': 'hud-score', 'data-dynamic': '' },
    view('span', { class: 'label' }, ctx.t('screen.hud.score')),
    view('b', { class: 'value' }, formatNumber(v?.hud.score ?? 0)));
}

function keyCap(ctx: ScreenContext, key: string): ViewNode {
  return view('span', { class: 'key' }, ctx.t('screen.hud.key', { key }));
}

function pauseButton(ctx: ScreenContext, m: HudModel, a: HudActions): ViewNode {
  const label = ctx.t('screen.hud.pause');
  return view('button', { type: 'button', class: 'pause', 'data-testid': 'hud-pause', 'data-art': 'ok', 'aria-label': label,
    title: label, onClick: () => a.pause() },
  art('icon_pause'), view('span', { class: 'long' }, label), m.coarse ? null : keyCap(ctx, 'Esc'));
}

function boosterButton(ctx: ScreenContext, m: HudModel, a: HudActions, b: BoosterView, index: number): ViewNode {
  const name = itemName(ctx, b.id);
  const key = String(index + 1);
  return view('button', { type: 'button', class: 'booster', 'data-testid': `hud-booster-${boosterName(b.id)}`,
    'data-item': b.id, 'data-state': b.state, 'data-art': 'ok', 'aria-label': name, title: name, ...a.booster(b.id) },
  view('span', { class: 'face' }, art(b.id, itemArt(b.id)), view('span', { class: 'bname' }, name)),
  view('span', { class: 'count', 'data-testid': 'hud-booster-count', 'data-dynamic': '' }, formatNumber(b.count)),
  m.coarse ? null : keyCap(ctx, key));
}

function boosters(ctx: ScreenContext, m: HudModel, a: HudActions): ViewNode {
  const list = m.view?.hud.boosters ?? [];
  return view('div', { class: 'boosters', 'data-pulse': m.view?.tutorial?.target === 'boosters' ? 'true' : undefined },
    ...list.map((b, i) => boosterButton(ctx, m, a, b, i)),
    m.qa ? view('div', { class: 'qa' },
      button(ctx.t('screen.qa.win'), () => a.qaWin(), { testid: 'qa-win', small: true }),
      button(ctx.t('screen.qa.lose'), () => a.qaLose(), { testid: 'qa-lose', small: true })) : null);
}

function stickZone(ctx: ScreenContext, m: HudModel, a: HudActions): ViewNode {
  const target = m.view?.tutorial?.target;
  if (m.coarse) {
    return view('div', { class: 'zone-s' },
      view('div', { class: 'stick', 'data-testid': 'stick', 'data-pulse': target === 'stick' ? 'true' : undefined, ...a.stick },
        art('ctrl_stick_base'), view('div', { class: 'knob', 'data-part': 'knob' }, art('ctrl_stick_knob'))));
  }
  return view('div', { class: 'zone-s' },
    view('div', { class: 'plate captions', 'data-pulse': target === 'keys' ? 'true' : undefined },
      view('div', { class: 'row' }, keyCap(ctx, 'W'), keyCap(ctx, 'A'), keyCap(ctx, 'S'), keyCap(ctx, 'D'), keyCap(ctx, '←↑↓→')),
      view('div', { class: 'row' }, view('span', {}, ctx.t('screen.hud.fire')), keyCap(ctx, 'Space'), keyCap(ctx, 'J'))));
}

function fireZone(ctx: ScreenContext, m: HudModel, a: HudActions): ViewNode {
  if (!m.coarse) return view('div', { class: 'zone-r' });
  const target = m.view?.tutorial?.target;
  return view('div', { class: 'zone-r' },
    view('button', { type: 'button', class: 'fire', 'data-testid': 'fire', 'data-pressed': 'false',
      'data-pulse': target === 'fire' ? 'true' : undefined, ...a.fire },
    art('ctrl_fire'), view('span', {}, ctx.t('screen.hud.fire'))));
}

function hints(ctx: ScreenContext, m: HudModel, a: HudActions): ViewNode {
  const tut = m.view?.tutorial ?? null;
  return view('div', { class: 'zone-t' },
    tut ? tutorialPlate(ctx, tut, m.inputMode, m.view?.hud.enemiesLeft ?? 0, { next: a.next, skip: a.skip }) : null,
    m.hint ? view('p', { class: 'plate hint', 'data-testid': 'booster-hint', role: 'status' }, m.hint) : null,
    m.offline ? view('p', { class: 'plate hint muted', 'data-testid': 'hud-offline', role: 'status' }, ctx.t('screen.common.offline')) : null);
}

/** `data-state` of the field: playing|paused|won|lost from the match phase. */
export function phaseState(v: MatchView | null): string {
  if (!v) return 'paused';
  if (v.phase === 'paused') return 'paused';
  if (v.phase === 'cleared') return 'won';
  if (v.phase === 'defeated') return 'lost';
  return 'playing';
}

/** The screen tree. `data-state` of the canvas and the numbers are kept current by match-live.ts. */
export function renderMatch(ctx: ScreenContext, m: HudModel, a: HudActions): ViewNode {
  const wave = m.view !== null && m.view.hud.stage === null && m.view.hud.wave !== null;
  return view('section', { class: 'game', 'data-window': 'game', 'data-layout': m.layout,
    'data-input': m.coarse ? 'touch' : 'keys', 'data-mode': m.mode ?? undefined },
  view('div', { class: 'panel pa' }, ...stats(ctx, m.view, wave)),
  view('div', { class: 'panel pb' }, scoreChip(ctx, m.view), pauseButton(ctx, m, a)),
  view('div', { class: 'field-box' },
    view('canvas', { class: 'field', 'data-testid': 'game-field', 'data-grid': '13x13', 'data-state': phaseState(m.view),
      'aria-hidden': 'true' }),
    view('p', { class: 'plate toast', 'data-testid': 'hud-toast', 'data-state': m.toast ? 'shown' : 'idle', role: 'status',
      'aria-live': 'polite' }, m.toast ?? '')),
  boosters(ctx, m, a),
  hints(ctx, m, a),
  stickZone(ctx, m, a),
  fireZone(ctx, m, a));
}

// S15 Tutorial of stage 1 (CONTRACT §11): a hint plate inside the game screen (not an overlay —
// the stage keeps running), next to the controls / field side, never over the two bottom rows of
// the field. Texts are the localization keys the match view names (`view.tutorial.text/text2`);
// the per-step keys below are the fallback when a view gives none. «Got it» → `tutorialNext()`,
// «Skip» → `tutorialSkip()`. The booster hint (first core threat) is a plate of its own.
import type { InputMode, TutorialView } from '../modules/game/index.js';
import type { ScreenContext } from './index.js';
import { button, view, type ViewNode } from './ui.js';

/** Hint keys by step and input mode, when the view has no key (§11 table). */
function fallback(ctx: ScreenContext, step: TutorialView['step'], mode: InputMode, count: number): [string, string | null] {
  switch (step) {
    case 1: return [mode === 'touch' ? ctx.t('screen.tut.move_touch') : ctx.t('screen.tut.move_keys'), null];
    case 2: return [mode === 'touch' ? ctx.t('screen.tut.fire_touch') : ctx.t('screen.tut.fire_keys'), null];
    case 3: return [ctx.t('screen.tut.brick'), null];
    case 4: return [ctx.t('screen.tut.core'), ctx.t('screen.tut.core_selfhit')];
    case 5: return [ctx.t('screen.tut.enemy', { count }), null];
    default: return [ctx.t('screen.tut.carrier'), null];
  }
}

/** The two lines of a step: the view's keys (`{count}` for the enemy step), else the fallback. */
export function tutorialLines(ctx: ScreenContext, tut: TutorialView, mode: InputMode, count: number): [string, string | null] {
  if (!tut.text) return fallback(ctx, tut.step, mode, count);
  return [ctx.t(tut.text, { count }), tut.text2 ? ctx.t(tut.text2, { count }) : null];
}

/** The hint plate (`tutorial-hint`, `data-step`, `data-target`) with «Got it» and «Skip». */
export function tutorialPlate(ctx: ScreenContext, tut: TutorialView, mode: InputMode, count: number,
  on: { next: () => void; skip: () => void }): ViewNode {
  const [text, text2] = tutorialLines(ctx, tut, mode, count);
  return view('div', { class: 'tut', 'data-testid': 'tutorial-hint', 'data-window': 'tutorial',
    'data-step': tut.step, 'data-target': tut.target, role: 'status', 'aria-live': 'polite' },
  // The arrow mark of the banner; the target itself pulses (controls) or is framed on the field.
  view('span', { class: 'tut-arrow', 'aria-hidden': 'true' }, '!'),
  view('div', { class: 'tut-copy' },
    view('p', { class: 'tut-text', 'data-dynamic': '' }, text),
    text2 ? view('p', { class: 'tut-text muted' }, text2) : null),
  view('div', { class: 'tut-actions' },
    button(ctx.t('screen.tut.next'), on.next, { testid: 'tutorial-next', small: true, primary: true }),
    button(ctx.t('screen.tut.skip'), on.skip, { testid: 'tutorial-skip', small: true })));
}

/** The booster hint (`booster-hint` event): «Core in danger! Use a booster.» + how to use one. */
export function boosterHintText(ctx: ScreenContext, mode: InputMode): string {
  const how = mode === 'touch' ? ctx.t('screen.tut.booster_touch') : ctx.t('screen.tut.booster_keys');
  return `${ctx.t('screen.tut.booster_hint')} ${how}`;
}

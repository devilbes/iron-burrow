// S04 Pre-stage game window: the goal, the best score and stars, the Spare Hull switch, the first
// clear reward and Start. The switch and «Get more» are buttons of the body (they keep the window
// open); the kit buttons are Start and Close only (CONTRACT §3.3 «Переходы», §6).
import { gameOf, type Mode, type PreStageInfo, type StageFrom } from '../modules/game/index.js';
import type { ScreenContext } from './index.js';
import { rewardRow } from './rewards.js';
import { openOffer } from './shop.js';
import { attempt, sectionTitle, starsRow, WINDOW_CSS } from './stage-ui.js';
import { button, formatNumber, mountLive, view, type ViewNode } from './ui.js';

type HullState = 'on' | 'off' | 'empty';

interface PrestageState {
  info: PreStageInfo | null;
  hull: HullState;
  owned: number;
  busy: boolean;
}

/** Opens S04; on Start calls `game.select(...)` and resolves true; Close resolves false. */
export async function openPrestage(ctx: ScreenContext, mode: Mode, n: number,
  options: { from: StageFrom; offline?: boolean }): Promise<boolean> {
  const game = gameOf(ctx.game);
  const info = await attempt<PreStageInfo | null>(() => game.prestage(mode, n), null);
  const state: PrestageState = { info, hull: info?.hull.state ?? 'empty', owned: info?.hull.owned ?? 0, busy: false };
  const offline = options.offline === true || info === null;
  let refresh = (): void => undefined;

  const reread = async (): Promise<void> => {
    const next = await attempt<PreStageInfo | null>(() => game.prestage(mode, n), null);
    if (!next) return;
    state.info = next;
    state.owned = next.hull.owned;
    if (state.owned <= 0) state.hull = 'empty';
    else if (state.hull === 'empty') state.hull = next.hull.state === 'empty' ? 'off' : next.hull.state;
    refresh();
  };
  const getMore = async (): Promise<void> => {
    if (state.busy) return;
    state.busy = true;
    refresh();
    try { await openOffer(ctx, 'prestage'); } catch { /* the offer window reports its own errors */ }
    state.busy = false;
    await reread();
    refresh();
  };
  const flip = (): void => {
    if (state.hull === 'empty') return;
    state.hull = state.hull === 'on' ? 'off' : 'on';
    refresh();
  };

  const ticket = ctx.window.open({
    title: mode === 'siege' ? ctx.t('screen.pre.title_siege') : ctx.t('screen.pre.title', { n }),
    body: (root) => {
      const live = mountLive(root, 'prestage', () => render(ctx, mode, state, offline, { flip, getMore }),
        { styles: WINDOW_CSS + PRESTAGE_CSS });
      refresh = () => live.refresh();
      const stop = game.onBalances(() => { void reread(); });
      return () => { stop(); refresh = () => undefined; live.off(); };
    },
    actions: [
      { id: 'prestage-start', label: ctx.t('screen.pre.start'), variant: 'primary' },
      { id: 'prestage-close', label: ctx.t('screen.pre.close'), variant: 'secondary' },
    ],
  });
  const picked = await ticket.result;
  if (picked !== 'prestage-start') return false;
  try {
    game.select({ mode, n, takeHull: state.hull === 'on', from: options.from });
    return true;
  } catch { return false; }
}

function render(ctx: ScreenContext, mode: Mode, state: PrestageState, offline: boolean,
  on: { flip: () => void; getMore: () => Promise<void> }): ViewNode {
  const info = state.info;
  const goal = mode === 'siege' ? ctx.t('screen.pre.goal_siege')
    : info ? ctx.t('screen.pre.goal', { count: info.goal }) : null;
  // Two columns where the window is wide (landscape phone, desktop): the goal, the record and Spare
  // Hull on the left, the first clear reward on the right; one column in a portrait window.
  return view('div', { class: 'win', 'data-window': 'prestage', 'data-state': state.hull, 'data-mode': mode },
    view('div', { class: 'cols' },
      view('div', { class: 'col' },
        goal === null ? null : view('p', { class: 'plate window-text', 'data-testid': 'prestage-goal' }, goal),
        info ? view('div', { class: 'best' },
          view('p', { class: 'accent', 'data-testid': 'prestage-best', 'data-dynamic': '' },
            ctx.t('screen.pre.best', { score: formatNumber(info.best) })),
          starsRow(info.stars, 'prestage-stars')) : null,
        info ? hullBlock(ctx, state, on) : null),
      info && info.rewards.length > 0
        ? view('div', { class: 'col', 'data-testid': 'prestage-rewards' },
          sectionTitle(ctx.t('screen.pre.rewards')), rewardRow(ctx, info.rewards))
        : null),
    offline ? view('p', { class: 'plate window-text', 'data-testid': 'prestage-offline' }, ctx.t('screen.pre.offline')) : null);
}

const PRESTAGE_CSS = `
.best{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:4px 12px}
.best .stars svg{width:24px;height:24px}
.toggle .col{gap:0}
.toggle .muted{font-size:.85rem}
`;

function hullBlock(ctx: ScreenContext, state: PrestageState,
  on: { flip: () => void; getMore: () => Promise<void> }): ViewNode {
  const empty = state.hull === 'empty';
  const sub = empty ? ctx.t('screen.pre.hull_none') : ctx.t('screen.pre.hull_owned', { count: state.owned });
  const hullSwitch = view('button', {
    type: 'button', class: 'toggle', role: 'switch', 'aria-checked': state.hull === 'on' ? 'true' : 'false',
    'data-testid': 'prestage-hull', 'data-state': state.hull, disabled: empty ? true : undefined,
    onClick: () => on.flip(),
  },
  view('span', { class: 'col' }, view('span', {}, ctx.t('screen.pre.hull')),
    view('span', { class: 'muted', 'data-dynamic': '' }, sub)),
  view('b', {}, state.hull === 'on' ? ctx.t('screen.settings.on') : ctx.t('screen.settings.off')));
  return view('div', { class: 'col' },
    hullSwitch,
    state.info?.hullHint ? view('p', { class: 'hint', 'data-testid': 'prestage-hint' }, ctx.t('screen.pre.hull_hint')) : null,
    state.owned <= 0
      ? button(ctx.t('screen.pre.shop'), () => { void on.getMore(); },
        { testid: 'prestage-shop', small: true, disabled: state.busy })
      : null);
}

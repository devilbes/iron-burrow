// Stage windows of the game route: S06 Pause, S07 Stage Clear, S09 Siege Result and the
// «couldn't save» window (S08 Defeat lives in win-defeat.ts). Kit buttons only close the window
// (CONTRACT §3.3 «Переходы»); what stays in a window — the sound toggles of S06 — is in the body.
import { gameOf, type Match, type SiegeStanding, type StageResult } from '../modules/game/index.js';
import type { ScreenContext } from './index.js';
import { rewardRow } from './rewards.js';
import { settingsBody } from './settings.js';
import { attempt, numberRow, sectionTitle, starsRow, WINDOW_CSS } from './stage-ui.js';
import { formatNumber, mountLive, mountView, view, type ViewNode } from './ui.js';

export { openDefeat } from './win-defeat.js';

/** S06: the sound toggles stay in the window; close (×, Esc, dim) resumes. */
export async function openPause(ctx: ScreenContext, match: Match): Promise<'resume' | 'restart' | 'quit'> {
  const ticket = ctx.window.open({
    title: ctx.t('screen.pause.title'),
    body: (root) => {
      const host = root.ownerDocument.createElement('div');
      host.dataset['window'] = 'pause';
      host.dataset['state'] = match.mode;
      root.append(host);
      let off: () => void = () => undefined;
      try { off = settingsBody(ctx)(host); } catch { /* the toggles are optional in the pause */ }
      return () => { off(); host.remove(); };
    },
    actions: [
      { id: 'pause-resume', label: ctx.t('screen.pause.resume'), variant: 'primary' },
      { id: 'pause-restart', label: ctx.t('screen.pause.restart'), variant: 'secondary' },
      { id: 'pause-quit', label: ctx.t('screen.pause.quit'), variant: 'secondary' },
    ],
  });
  const picked = await ticket.result;
  if (picked === 'pause-restart') return 'restart';
  if (picked === 'pause-quit') return 'quit';
  return 'resume';
}

/** S07: stars, score breakdown, «New Best!», the first clear reward; Next only when there is one. */
export async function openClear(ctx: ScreenContext, result: StageResult): Promise<'next' | 'replay' | 'map'> {
  const title = result.campaignDone ? ctx.t('screen.clear.campaign_done')
    : result.chapterDone ? ctx.t('screen.clear.chapter_done') : ctx.t('screen.clear.title');
  const actions = [
    ...(result.next !== null ? [{ id: 'clear-next', label: ctx.t('screen.clear.next'), variant: 'primary' as const }] : []),
    { id: 'clear-replay', label: ctx.t('screen.clear.replay'), variant: result.next !== null ? 'secondary' as const : 'primary' as const },
    { id: 'clear-map', label: ctx.t('screen.clear.map'), variant: 'secondary' as const },
  ];
  const ticket = ctx.window.open({
    title,
    header: { stars: result.stars },
    body: (root) => mountView(root, 'stage-clear', () => renderClear(ctx, result), { styles: WINDOW_CSS }),
    actions,
    dismissible: false,
  });
  const picked = await ticket.result;
  if (picked === 'clear-next' && result.next !== null) return 'next';
  if (picked === 'clear-replay') return 'replay';
  return 'map';
}

function renderClear(ctx: ScreenContext, result: StageResult): ViewNode {
  const b = result.breakdown;
  const rows = view('ul', { class: 'rows plate' },
    numberRow(ctx.t('screen.clear.kills'), formatNumber(b.kills)),
    numberRow(ctx.t('screen.clear.pickups'), formatNumber(b.pickups)),
    numberRow(ctx.t('screen.clear.bonus'), formatNumber(b.clear)),
    numberRow(ctx.t('screen.clear.lives', { count: b.livesLeft }), formatNumber(b.lives)),
    view('li', { class: 'accent' }, view('span', {}, ctx.t('screen.clear.total')),
      view('b', { 'data-testid': 'clear-score', 'data-dynamic': '', 'data-score': result.score }, formatNumber(result.score))));
  return view('div', { class: 'win', 'data-window': 'stage-clear', 'data-state': result.newBest ? 'best' : 'clear',
    'data-mode': result.mode },
  starsRow(result.stars, 'clear-stars'),
  view('div', { class: 'cols' },
    view('div', { class: 'col' },
      rows,
      result.newBest ? view('p', { class: 'accent', 'data-testid': 'clear-best' }, ctx.t('screen.clear.best')) : null),
    result.rewards.length > 0
      ? view('div', { class: 'col', 'data-testid': 'clear-rewards' },
        sectionTitle(ctx.t('screen.clear.rewards')), rewardRow(ctx, result.rewards))
      : null));
}

interface SiegeState { standing: SiegeStanding | null; loaded: boolean }

/** S09: score, wave, best this week and rank (`siegeStanding`); unranked when the boards fail. */
export async function openSiegeResult(ctx: ScreenContext, result: StageResult): Promise<'retry' | 'boards' | 'lobby'> {
  const game = gameOf(ctx.game);
  const state: SiegeState = { standing: null, loaded: false };
  let refresh = (): void => undefined;
  void attempt<SiegeStanding | null>(() => game.siegeStanding(result.score), null).then((standing) => {
    state.standing = standing;
    state.loaded = true;
    refresh();
  });
  const ticket = ctx.window.open({
    title: ctx.t('screen.siege.title'),
    body: (root) => {
      const live = mountLive(root, 'siege-result', () => renderSiege(ctx, result, state), { styles: WINDOW_CSS });
      refresh = () => live.refresh();
      return () => { refresh = () => undefined; live.off(); };
    },
    actions: [
      { id: 'siege-retry', label: ctx.t('screen.siege.retry'), variant: 'primary' },
      { id: 'siege-boards', label: ctx.t('screen.siege.boards'), variant: 'secondary' },
      { id: 'siege-lobby', label: ctx.t('screen.siege.lobby'), variant: 'secondary' },
    ],
    dismissible: false,
  });
  const picked = await ticket.result;
  if (picked === 'siege-retry') return 'retry';
  if (picked === 'siege-boards') return 'boards';
  return 'lobby';
}

function renderSiege(ctx: ScreenContext, result: StageResult, state: SiegeState): ViewNode {
  const standing = state.standing;
  const rank = standing?.rank ?? null;
  const newBest = result.newBest || standing?.newBest === true;
  const best = standing?.best ?? null;
  const wave = result.wave ?? result.breakdown.waves;
  return view('div', { class: 'win', 'data-window': 'siege-result', 'data-state': state.loaded ? 'ready' : 'loading' },
    view('p', { class: 'big', 'data-testid': 'siege-score', 'data-dynamic': '', 'data-score': result.score },
      ctx.t('screen.siege.score', { score: formatNumber(result.score) })),
    view('p', { class: 'plate window-text', 'data-testid': 'siege-wave', 'data-dynamic': '' },
      ctx.t('screen.siege.wave', { n: wave })),
    newBest ? view('p', { class: 'accent', 'data-testid': 'siege-new-best' }, ctx.t('screen.siege.new_best')) : null,
    best !== null
      ? view('p', { class: 'accent', 'data-testid': 'siege-best', 'data-dynamic': '' },
        ctx.t('screen.siege.best', { score: formatNumber(best) }))
      : null,
    view('p', { class: 'plate window-text', 'data-testid': 'siege-rank', 'data-state': rank !== null ? 'ranked' : 'unranked',
      'data-dynamic': '' },
    rank !== null ? ctx.t('screen.siege.rank', { rank: formatNumber(rank) }) : ctx.t('screen.siege.unranked')));
}

/** The level end was not saved: retry it or leave for the map (no close button). */
export async function openSaveFailed(ctx: ScreenContext): Promise<'retry' | 'leave'> {
  const ticket = ctx.window.open({
    title: ctx.t('screen.clear.save_title'),
    body: (root) => mountView(root, 'save-retry', () =>
      view('div', { class: 'win', 'data-window': 'save-retry', 'data-state': 'failed' },
        view('p', { class: 'plate window-text' }, ctx.t('screen.clear.save_failed'))), { styles: WINDOW_CSS }),
    actions: [
      { id: 'save-retry', label: ctx.t('screen.clear.retry_save'), variant: 'primary' },
      { id: 'save-leave', label: ctx.t('screen.clear.leave'), variant: 'secondary' },
    ],
    dismissible: false,
  });
  return (await ticket.result) === 'save-retry' ? 'retry' : 'leave';
}

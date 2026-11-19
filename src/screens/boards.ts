// S13 Leaderboards game window: two boards (Siege best of the week, campaign score of all time) as
// tabs of the body, the board's period as a label, the rows with medals for the top three, the player's own row
// pinned under the list, the reset countdown, the guest hint (CONTRACT §4 S13, §6, D-GC-07).
// Tabs are buttons of the body (they keep the window open); the kit button closes.
import { gameOf, type Board, type BoardPage, type BoardRow, type IronBurrow, type Period } from '../modules/game/index.js';
import { sound } from './audio.js';
import type { ScreenContext } from './index.js';
import { gameArt, picture } from './media.js';
import { attempt, WINDOW_CSS } from './stage-ui.js';
import { formatNumber, mountLive, view, type ViewNode } from './ui.js';

/** The two boards of the window, in tab order, with the period each opens on. */
const BOARDS: readonly { readonly id: Board; readonly period: Period }[] = [
  { id: 'siege_best', period: 'weekly' },
  { id: 'campaign_score', period: 'alltime' },
];
/** Medals of places 1–3: frames of `medal_top3` (gold, silver, bronze). */
const MEDALS = 3;

interface BoardsState {
  board: Board;
  period: Period;
  page: BoardPage | null;
  status: 'loading' | 'ready' | 'failed';
}

const BOARDS_CSS = `
.tabs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.tabs .mp-button{border:0;border-radius:0;color:var(--mp-card-subtle);background:var(--mp-card-surface);
 box-shadow:inset 0 2px 3px var(--game-shade-strong);
 clip-path:polygon(8px 0,calc(100% - 8px) 0,100% 8px,100% 100%,0 100%,0 8px)}
.tabs .mp-button[data-state=active]{color:var(--mp-card-fg);
 background:linear-gradient(180deg,color-mix(in srgb,var(--game-steel-teal) 78%,var(--mp-card-fg)),var(--game-steel-teal) 55%);
 box-shadow:inset 0 -3px 0 var(--mp-card-accent)}
.bar{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:4px 12px}
.period{margin:0;font-family:var(--mp-font-ui);font-weight:700;color:var(--mp-card-muted)}
.reset{margin:0;font-size:.85rem;color:var(--mp-text-2)}
.list{display:grid;gap:4px;margin:0;padding:0;list-style:none;max-height:min(44vh,22rem);overflow-y:auto;
 overscroll-behavior:contain}
.row{display:grid;grid-template-columns:2.5em minmax(0,1fr) auto;align-items:center;gap:.5em;
 min-height:40px;padding:.2em .6em;border:0;border-radius:0;background:var(--mp-window-background);
 box-shadow:inset 0 2px 3px var(--game-shade-strong);
 clip-path:polygon(4px 0,calc(100% - 4px) 0,100% 4px,100% calc(100% - 4px),calc(100% - 4px) 100%,4px 100%,0 calc(100% - 4px),0 4px)}
.row[data-self]{box-shadow:inset 0 0 0 1px var(--mp-card-success),inset 0 0 8px var(--game-slit-glow)}
.rank{display:grid;place-items:center;width:2.25em;height:2.25em;
 font-family:var(--mp-font-ui);font-weight:700;font-variant-numeric:tabular-nums}
.rank>*{grid-area:1/1}
.medal{display:block;width:100%;height:100%;overflow:hidden}
.name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.score{font-family:var(--mp-font-ui);font-weight:700;font-variant-numeric:tabular-nums}
.self-label{font-size:.75rem;color:var(--mp-text-2)}
@media (max-height: 480px){.list{max-height:34vh}}
`;

/** Opens S13 on `board` (default: Siege); resolves when it is closed. */
export async function openBoards(ctx: ScreenContext, board?: Board): Promise<void> {
  const game = gameOf(ctx.game);
  const first = BOARDS.find((entry) => entry.id === board) ?? BOARDS[0];
  if (!first) return;
  const state: BoardsState = { board: first.id, period: first.period, page: null, status: 'loading' };
  let refresh = (): void => undefined;
  let asked = 0;

  const load = async (): Promise<void> => {
    const ticket = ++asked;
    state.status = 'loading';
    refresh();
    game.event('leaderboard_view', { board: state.board, period: state.period });
    const page = await attempt<BoardPage | null>(() => game.board(state.board, state.period), null);
    if (ticket !== asked) return;
    state.page = page;
    state.status = page ? 'ready' : 'failed';
    refresh();
  };
  const pick = (next: Board): void => {
    if (next === state.board) return;
    click(game);
    state.board = next;
    state.period = BOARDS.find((entry) => entry.id === next)?.period ?? state.period;
    void load();
  };

  const ticket = ctx.window.open({
    title: ctx.t('screen.boards.title'),
    body: (root) => {
      const live = mountLive(root, 'leaderboards', () => render(ctx, state, { pick }),
        { styles: WINDOW_CSS + BOARDS_CSS + medalCss() });
      refresh = () => live.refresh();
      return () => { refresh = () => undefined; live.off(); };
    },
    actions: [{ id: 'boards-close', label: ctx.t('screen.common.close'), variant: 'secondary' }],
  });
  void load();
  await ticket.result.catch(() => 'close');
  asked += 1;
}

/** `medal_top3` frames for places 1–3: the sheet in a clipping box (the view takes no inline styles). */
function medalCss(): string {
  const rules = [`.medal>.sheet{width:${MEDALS * 100}%;max-width:none;height:100%}`];
  for (let rank = 2; rank <= MEDALS; rank += 1) rules.push(`.medal[data-medal="${rank}"]>.sheet{margin-left:-${(rank - 1) * 100}%}`);
  return rules.join('\n');
}

function click(game: IronBurrow): void {
  try { sound(game).sfx('sfx_ui_click'); } catch { /* sound is optional */ }
}

function boardLabel(ctx: ScreenContext, board: Board): string {
  return board === 'siege_best' ? ctx.t('screen.boards.siege') : ctx.t('screen.boards.campaign');
}

function periodLabel(ctx: ScreenContext, period: Period): string {
  return period === 'weekly' ? ctx.t('screen.boards.weekly') : ctx.t('screen.boards.alltime');
}

function render(ctx: ScreenContext, state: BoardsState,
  on: { pick: (board: Board) => void }): ViewNode {
  const page = state.status === 'ready' ? state.page : null;
  const tabs = view('div', { class: 'tabs', role: 'tablist' }, ...BOARDS.map((entry) => {
    const active = entry.id === state.board;
    return view('button', { type: 'button', class: 'mp-button mp-button--small', role: 'tab',
      'aria-selected': active ? 'true' : 'false', 'data-testid': 'boards-tab', 'data-board': entry.id,
      'data-state': active ? 'active' : 'idle', onClick: () => on.pick(entry.id) }, boardLabel(ctx, entry.id));
  }));
  const reset = page?.resetsAt ? resetText(ctx, page.resetsAt) : null;
  // Each board has one period of its own definition (siege — the week, campaign — all time): it is
  // a label of the board, not a switch with nothing to switch to.
  const bar = view('div', { class: 'bar' },
    view('p', { class: 'period', 'data-testid': 'boards-period', 'data-state': state.period, 'data-dynamic': '' },
      periodLabel(ctx, state.period)),
    reset === null ? null : view('p', { class: 'reset', 'data-testid': 'boards-reset', 'data-dynamic': '' }, reset));
  return view('div', { class: 'win', 'data-window': 'leaderboards', 'data-state': state.status,
    'data-board': state.board, 'data-period': state.period }, tabs, bar, ...content(ctx, state, page));
}

function content(ctx: ScreenContext, state: BoardsState, page: BoardPage | null): ViewNode[] {
  if (state.status === 'failed') {
    return [view('p', { class: 'plate window-text', 'data-testid': 'boards-unavailable' }, ctx.t('screen.boards.unavailable'))];
  }
  if (!page) return [view('ul', { class: 'list', 'aria-busy': 'true' })];
  const nodes: ViewNode[] = [];
  if (page.rows.length === 0) {
    nodes.push(view('p', { class: 'plate window-text', 'data-testid': 'boards-empty' }, ctx.t('screen.boards.empty')));
  } else {
    nodes.push(view('ol', { class: 'list', 'data-dynamic': '' }, ...page.rows.map((row) => rowView(ctx, row, 'boards-row'))));
  }
  const self = page.self ?? page.rows.find((row) => row.self) ?? null;
  if (self) nodes.push(view('div', { class: 'list' }, rowView(ctx, self, 'boards-self')));
  if (page.guest) nodes.push(view('p', { class: 'hint', 'data-testid': 'boards-guest' }, ctx.t('screen.boards.guest')));
  return nodes;
}

function rowView(ctx: ScreenContext, row: BoardRow, testid: string): ViewNode {
  const medal = row.rank >= 1 && row.rank <= MEDALS
    ? view('span', { class: 'medal', 'aria-hidden': 'true', 'data-medal': row.rank },
      picture(gameArt('medal_top3'), '', { class: 'sheet' }))
    : null;
  return view('li', { class: 'row', 'data-testid': testid, 'data-rank': row.rank, 'data-self': row.self ? '' : undefined },
    view('span', { class: 'rank' }, medal, view('b', {}, formatNumber(row.rank))),
    view('span', { class: 'name' }, row.name,
      row.self ? view('span', { class: 'self-label' }, ` · ${ctx.t('screen.boards.you')}`) : null),
    view('b', { class: 'score', 'data-dynamic': '' }, formatNumber(row.score)));
}

/** «Resets in …» with the largest whole unit left (days, hours, minutes), through Intl. */
function resetText(ctx: ScreenContext, resetsAt: number): string | null {
  const left = resetsAt - Date.now();
  if (!(left > 0)) return null;
  const units: readonly [Intl.NumberFormatOptions['unit'], number][] = [
    ['day', 86_400_000], ['hour', 3_600_000], ['minute', 60_000],
  ];
  const [unit, size] = units.find(([, ms]) => left >= ms) ?? ['minute', 60_000];
  const amount = Math.max(1, Math.floor(left / size));
  let time: string;
  try { time = new Intl.NumberFormat(undefined, { style: 'unit', unit, unitDisplay: 'long' }).format(amount); } catch {
    time = String(amount);
  }
  return ctx.t('screen.boards.reset', { time });
}

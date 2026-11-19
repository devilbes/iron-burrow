import type { Leaderboards } from '@manygamescorp/mod-leaderboards/leaderboards';
import { leaderboardWindow, type LeaderboardWindowRow } from
  '@manygamescorp/ui-kit/services/leaderboard-window';
import { LEADERBOARD, MODULES } from '../../boot/ids.js';
import { windowContribution, type PresenterPart, type PresenterRuntime } from './presenter.js';

const BOARD = 'starter.window.leaderboard';

/** Leaderboard: the stock `leaderboardWindow` with the top of `leaderboard_weekly` and «you». */
export function leaderboardPresenter(run: PresenterRuntime): PresenterPart {
  let rows: readonly LeaderboardWindowRow[] = [];
  let me: { rank: number | null; score: number | null } | undefined;
  let loading = false;
  let load = 0;
  let offs: (() => void)[] = [];
  const fetchBoard = async (): Promise<void> => {
    const api = run.module<Leaderboards>(MODULES.leaderboards);
    if (!api) return;
    const current = ++load;
    loading = true; rows = []; me = undefined; run.refresh(BOARD);
    try {
      const page = await api.get(LEADERBOARD, { limit: 20 });
      if (current !== load) return;
      rows = page.items.map((item) => ({ rank: item.rank, gid: item.gid, score: item.score,
        ...(item.profile?.name ? { name: item.profile.name } : {}),
        ...(item.profile?.avatar ? { avatar: item.profile.avatar } : {}) }));
      me = { rank: page.me.rank, score: page.me.score };
    } catch (error) { if (current === load) run.fail(error); } finally {
      if (current === load) { loading = false; run.refresh(BOARD); }
    }
  };
  return {
    contributes: [windowContribution(BOARD, 'leaderboard', MODULES.leaderboards)],
    components: { leaderboard: leaderboardWindow },
    uses: [MODULES.leaderboards],
    emits: ['leaderboards:window:closed'],
    listens: ['leaderboards:window:open', 'leaderboards:window:close'],
    props(elementId) {
      if (elementId !== BOARD) return undefined;
      const gid = run.sdk().auth?.session?.gid;
      return { ...run.common(), busy: loading, tab: LEADERBOARD,
        tabs: [{ id: LEADERBOARD, label: run.sdk().l10n.t('shell.leaderboard.weekly') }],
        entries: rows, ...(me ? { me } : {}), ...(gid !== undefined ? { meGid: gid } : {}) };
    },
    intent() { /* one board: no tabs to switch */ },
    start(ctx) {
      offs = [
        ctx.bus.on('leaderboards:window:open', () => {
          const done = (): void => {
            if (!ctx.signal.aborted) ctx.bus.emit('leaderboards:window:closed', { view: 'main' });
          };
          run.open(BOARD, done);
          void fetchBoard();
        }),
        ctx.bus.on('leaderboards:window:close', () => run.host()?.close(BOARD)),
      ];
    },
    stop() { for (const off of offs) off(); offs = []; rows = []; me = undefined; load++; },
  };
}

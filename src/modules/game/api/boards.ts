// Leaderboards of the game (CONTRACT §8.4, S13, S09): a page of a board with the player's own row,
// and the Siege standing after a run. Scores are written by the server from the level ends
// (clientAuthoritative false); the game never submits them. Each board has one period of its own
// definition (siege_best — the week, campaign_score — all time).
import { BOARDS, MODULES } from '../../../boot/ids.js';
import type { Board, BoardPage, BoardRow, Period, SiegeStanding } from '../index.js';
import type { Host } from './host.js';
import type { BoardEntry, LeaderboardsApi } from './sdk.js';

const PAGE_SIZE = 20;
const AROUND_RADIUS = 2;
/** Gid of a guest session: no rank is kept for it. */
const GUEST_GID = 0;

function keyOf(board: Board): string {
  return board === 'siege_best' ? BOARDS.siege : BOARDS.campaign;
}

const row = (entry: BoardEntry, self: boolean): BoardRow =>
  ({ rank: entry.rank, name: entry.profile?.name ?? `#${entry.gid}`, score: entry.score, self });

export class Boards {
  /** Best Siege score seen this session (S09 «New Best!» against the week's best). */
  private siegeBest: number | null = null;

  constructor(private readonly host: Host) {}

  private api(): LeaderboardsApi {
    const api = this.host.svc<LeaderboardsApi>(MODULES.leaderboards);
    if (!api) throw Object.assign(new Error('leaderboards unavailable'), { code: 'unavailable' });
    return api;
  }

  async board(board: Board, period: Period): Promise<BoardPage> {
    const api = this.api();
    const key = keyOf(board);
    const page = await api.get(key, { limit: PAGE_SIZE });
    let gid: number | null = null;
    let around: BoardEntry[] = [];
    try {
      const near = await api.around(key, { radius: AROUND_RADIUS });
      gid = near.gid;
      around = [...near.entries];
    } catch { /* a guest or no score yet */ }
    const rows = page.items.map((entry) => row(entry, gid !== null && entry.gid === gid));
    const mine = around.find((entry) => entry.gid === gid) ?? null;
    const self = rows.find((one) => one.self) ?? (mine ? row(mine, true)
      : page.me.rank !== null && page.me.score !== null ? { rank: page.me.rank, name: '', score: page.me.score, self: true } : null);
    const resetsAt = page.expiresAt ? Date.parse(page.expiresAt) : null;
    return { board, period, rows, self, resetsAt: Number.isFinite(resetsAt) ? resetsAt : null,
      guest: gid === GUEST_GID || (gid === null && self === null) };
  }

  /** The week's best and place after a run; «New Best!» when the run beat the best known before it. */
  async siegeStanding(score: number | null): Promise<SiegeStanding> {
    const before = this.siegeBest;
    let best: number | null = null;
    let rank: number | null = null;
    try {
      const standing = await this.api().rank(BOARDS.siege);
      best = standing.score;
      rank = standing.rank;
    } catch { /* unranked */ }
    const top = Math.max(best ?? 0, score ?? 0);
    this.siegeBest = Math.max(this.siegeBest ?? 0, top);
    const known = before ?? (best !== null && score !== null && best > score ? best : null);
    const newBest = score !== null && score > 0 && (known === null || score > known);
    return { best: best === null && score === null ? null : top, rank, newBest };
  }
}

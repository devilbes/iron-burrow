// Lobby, map, pre-stage and result data (CONTRACT §3.3, §9): stages open in order up to the first
// not won (progress read once), best stars per stage (the stars track), best score per stage (the
// cloud save), the first clear reward (display only, `game.rewards`), Siege after stage 5.
import LEVEL_SET from '../../../../configs/remote/levels.main/set.json' with { type: 'json' };
import { LEVEL_SET_RECORD } from '../../../boot/ids.js';
import type { Outcome } from '../controller/index.js';
import type { BoosterKind } from '../controller/index.js';
import type { RunState } from '../core/index.js';
import type { CampaignInfo, Mode, PreStageInfo, StageInfo, StageResult } from '../index.js';
import { KV, type Host } from './host.js';
import type { MatchImpl } from './match.js';
import { firstClearRewards } from './records.js';

type Chapter = CampaignInfo['chapters'][number];
type ChapterN = 1 | 2 | 3;
const MAX_STARS = 3;

/** Chapters of the campaign set (`chapters[]` of `levels.main/set`, else the built-in copy). */
function chapters(host: Host, current: number): Chapter[] {
  type Raw = { first?: number; last?: number };
  const published = host.configs?.get<{ chapters?: Raw[] }>(LEVEL_SET_RECORD.scope, LEVEL_SET_RECORD.key)?.chapters;
  const list: Raw[] = Array.isArray(published) && published.length > 0 ? published : LEVEL_SET.data.chapters;
  return list.slice(0, 3).map((raw, i) => {
    const first = Number(raw.first ?? 1);
    return { n: (i + 1) as ChapterN, first, last: Number(raw.last ?? first), open: first <= current };
  });
}

const chapterOf = (list: readonly Chapter[], n: number): ChapterN => list.find((c) => n >= c.first && n <= c.last)?.n ?? 1;

/** A stage is cleared when progress has passed it or it has stars. */
function cleared(host: Host, n: number): boolean {
  return n < host.current || (host.stars.get(n) ?? 0) > 0;
}

export function campaignInfo(host: Host, last: number): CampaignInfo {
  const list = chapters(host, host.current);
  const finales = new Set(list.map((c) => c.last));
  const stages: StageInfo[] = [];
  for (let n = 1; n <= last; n++) {
    const state: StageInfo['state'] = cleared(host, n) ? 'cleared' : n <= host.current ? 'open' : 'locked';
    stages.push({ n, id: String(n), chapter: chapterOf(list, n), state, stars: Math.min(MAX_STARS, host.stars.get(n) ?? 0) as StageInfo['stars'],
      best: host.best.get(n) ?? 0, finale: finales.has(n) });
  }
  const next = Math.min(Math.max(1, host.current), Math.max(1, last));
  const stars = stages.reduce((sum, s) => sum + s.stars, 0);
  const unlockAfter = host.records().tun.siege.unlockAfter;
  return { stages, next, stars, maxStars: last * MAX_STARS, chapters: list, chapter: chapterOf(list, next),
    siege: { unlocked: stages.filter((s) => s.state === 'cleared').length >= unlockAfter || cleared(host, unlockAfter), unlockAfter } };
}

export function prestageInfo(host: Host, mode: Mode, n: number, count: (kind: BoosterKind) => number): PreStageInfo {
  const tun = host.records().tun;
  const owned = count('hull');
  const campaign = mode === 'campaign';
  const hullHint = campaign && n >= 2 && owned > 0 && !host.flag(KV.prestageHint);
  if (hullHint) void host.setKv(KV.prestageHint, true).catch(() => undefined);
  const firstTime = campaign && !cleared(host, n);
  return { mode, n, goal: campaign ? tun.stageEnemies : 0, best: campaign ? host.best.get(n) ?? 0 : 0,
    stars: (campaign ? Math.min(MAX_STARS, host.stars.get(n) ?? 0) : 0) as PreStageInfo['stars'],
    hull: { owned, state: owned > 0 ? 'off' : 'empty' }, hullHint,
    tutorial: campaign && n === 1 && !host.flag(KV.tutDone), rewards: firstTime ? firstClearRewards(host.records().meta, n) : [] };
}

/** Score parts of a run (S07 rows): kills, pick-ups, the clear (or wave) bonus, the lives bonus. */
function breakdown(host: Host, run: RunState | null, won: boolean, score: number): StageResult['breakdown'] {
  const tun = host.records().tun;
  if (!run) return { kills: score, pickups: 0, clear: 0, lives: 0, livesLeft: 0, waves: 0 };
  const pickups = run.pickups * tun.score.pickup;
  const waves = run.siege ? Math.max(0, run.wave - (run.waveBreak > 0 ? 0 : 1)) : 0;
  const waveBonus = run.siege ? tun.siege.waveBonus * (waves * (waves + 1)) / 2 : 0;
  const clear = won ? tun.score.clear : waveBonus;
  const lives = won ? tun.score.life * run.lives : 0;
  return { kills: Math.max(0, score - pickups - clear - lives), pickups, clear, lives, livesLeft: run.lives, waves };
}

/** S07 / S08 / S09 data of an outcome; records the stars and best score of a verified clear. */
export function stageResult(host: Host, match: MatchImpl, outcome: Outcome, run: RunState | null, last: number): Omit<StageResult, 'starterDue'> {
  const n = match.n;
  const campaign = match.mode === 'campaign';
  const won = campaign && outcome.won;
  const verified = outcome.verified;
  const firstClear = won && verified && !cleared(host, n);
  const previous = host.best.get(n) ?? 0;
  if (won && verified) {
    host.stars.set(n, Math.max(host.stars.get(n) ?? 0, outcome.stars));
    host.rememberBest(n, outcome.score);
    host.current = Math.max(host.current, Math.min(n + 1, last));
    if (firstClear && n === host.records().tun.siege.unlockAfter) host.ports.track('siege_unlock', {});
  }
  const list = chapters(host, host.current);
  const quit = !campaign ? false : !outcome.won && outcome.score >= 0 && run === null;
  return {
    mode: match.mode, n, result: won ? 'clear' : quit ? 'quit' : 'defeat',
    reason: won || quit ? null : run?.cause ?? 'lives', score: outcome.score,
    breakdown: breakdown(host, run, won, outcome.score),
    stars: (won && verified ? Math.min(MAX_STARS, outcome.stars) : 0) as StageResult['stars'], verified,
    best: Math.max(previous, won && verified ? outcome.score : 0), newBest: won && verified && previous > 0 && outcome.score > previous,
    rewards: firstClear ? firstClearRewards(host.records().meta, n) : [],
    chapterDone: firstClear && list.some((c) => c.last === n), campaignDone: firstClear && n === last,
    wave: campaign ? null : outcome.wave, next: won && verified && n < last ? n + 1 : null,
  };
}

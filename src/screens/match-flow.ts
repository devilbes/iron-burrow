// The window flow of S05 (CONTRACT §3.3 «Переходы», §2, §4): start with the S04 offline path,
// pause (S06: resume / restart / quit), booster info (S16), stage clear (S07), defeat (S08 with
// continue), Siege result (S09), the save-retry window and the Starter Crate auto offer before any
// action after S07/S08/S09. Next / Replay / Retry start again in this same screen (`ctx.go` on the
// own route does nothing); only Map / Lobby leave it.
import type { FieldBooster, IronBurrow, Match, Mode, StageFrom, StageResult, StageSetup } from '../modules/game/index.js';
import type { Sound } from './audio.js';
import { openBoards } from './boards.js';
import { openBoosterInfo } from './booster-info.js';
import type { ScreenContext } from './index.js';
import { openPrestage } from './prestage.js';
import { openOffer } from './shop.js';
import { openClear, openDefeat, openPause, openSaveFailed, openSiegeResult } from './stage-windows.js';

export interface FlowHost {
  readonly ctx: ScreenContext;
  readonly game: IronBurrow;
  readonly sound: Sound;
  /** The screen was left: nothing more may happen. */
  readonly gone: boolean;
  readonly match: Match | null;
  /** The setup the current match was started with. */
  setup: StageSetup | null;
  /** A clear / defeat / quit is being handled: the loop does not react to the phase. */
  ending: boolean;
  /** A window is over the stage. */
  readonly busy: boolean;
  /** Plays the started match in this screen. */
  attach(match: Match): void;
  /** The match is over (between attempts): no field updates, no input. */
  detach(): void;
  /** Runs a window: input let go, music ducked, `busy` while it is open. */
  window<T>(open: () => Promise<T>): Promise<T>;
}

const leaveRoute = (mode: Mode): 'home' | 'map' => (mode === 'siege' ? 'home' : 'map');

function selected(game: IronBurrow): StageSetup | null {
  try { return game.selected(); } catch { return null; }
}

/**
 * Starts the selected stage (`game.start()`); a rejection (offline, refused, not implemented)
 * reopens S04 with «Connection needed»: Start tries again, Close leaves to the map / lobby.
 */
export async function startSelected(host: FlowHost): Promise<void> {
  for (;;) {
    const setup = selected(host.game);
    if (!setup) { host.ctx.go('map'); return; }
    try {
      const match = await host.game.start();
      if (host.gone) return;
      host.setup = setup;
      host.attach(match);
      return;
    } catch {
      if (host.gone) return;
      const again = await host.window(() => openPrestage(host.ctx, setup.mode, setup.n, { from: setup.from, offline: true }))
        .catch(() => false);
      if (host.gone) return;
      if (!again) { host.ctx.go(leaveRoute(setup.mode)); return; }
    }
  }
}

/** S04 for the next / same stage, then a new start here; Close leaves to the map (lobby for Siege). */
async function again(host: FlowHost, mode: Mode, n: number, from: StageFrom): Promise<void> {
  host.detach();
  const ok = await host.window(() => openPrestage(host.ctx, mode, n, { from })).catch(() => false);
  if (host.gone) return;
  if (ok) await startSelected(host);
  else host.ctx.go(leaveRoute(mode));
}

/** `match.end(how)`; after a final rejection the save-retry window: retry → end again, leave → map. */
async function finish(host: FlowHost, match: Match, how: 'final' | 'quit'): Promise<StageResult | null> {
  for (;;) {
    try { return await match.end(how); } catch {
      if (host.gone) return null;
      const pick = await host.window(() => openSaveFailed(host.ctx)).catch(() => 'leave' as const);
      if (host.gone) return null;
      if (pick === 'leave') { host.detach(); host.ctx.go('map'); return null; }
    }
  }
}

/** The Starter Crate auto window first, when the result says it is due (D-20-08). */
async function starter(host: FlowHost, result: StageResult): Promise<void> {
  if (!result.starterDue || host.gone) return;
  await host.window(() => openOffer(host.ctx, 'starter_auto')).catch(() => undefined);
}

/** S06 Pause (button, Esc / P, suspend, layout change). */
export async function pauseMenu(host: FlowHost): Promise<void> {
  const match = host.match;
  if (!match || host.busy || host.ending) return;
  try { match.pause(); } catch { /* already paused */ }
  host.sound.sfx('sfx_ui_pause');
  const pick = await host.window(() => openPause(host.ctx, match)).catch(() => 'resume' as const);
  if (host.gone || host.match !== match) return;
  if (pick === 'resume') { try { match.resume(); } catch { /* ended */ } return; }
  host.ending = true;
  const siege = match.mode === 'siege';
  if (pick === 'restart') {
    if (siege) { if (!await finish(host, match, 'final')) return; } else await match.end('quit').catch(() => undefined);
    if (host.gone) return;
    const setup = host.setup ?? selected(host.game);
    host.detach();
    // A restart from the pause is a new attempt of the same setup, without S04: Spare Hull is
    // not taken again (it would be spent silently).
    if (setup) { try { host.game.select({ ...setup, takeHull: false, from: 'retry' }); } catch { /* stub */ } }
    await startSelected(host);
    return;
  }
  if (siege) {
    const result = await finish(host, match, 'final');
    if (result && !host.gone) await siegeResult(host, result);
    return;
  }
  await match.end('quit').catch(() => undefined);
  if (!host.gone) { host.detach(); host.ctx.go('map'); }
}

/** S16 over a paused stage: a tap on a booster with none left, or a long press. */
export async function boosterInfo(host: FlowHost, id: FieldBooster): Promise<void> {
  const match = host.match;
  if (!match || host.busy || host.ending) return;
  const paused = match.paused;
  if (!paused) { try { match.pause(); } catch { /* ended */ } }
  await host.window(() => openBoosterInfo(host.ctx, id, match.mode)).catch(() => undefined);
  if (!host.gone && host.match === match && !paused && !host.ending) { try { match.resume(); } catch { /* ended */ } }
}

/** S07 after the clear delay: end, Clear window, then Next / Replay (S04 here) or Map. */
export async function afterClear(host: FlowHost, match: Match): Promise<void> {
  host.ending = true;
  const result = await finish(host, match, 'final');
  if (!result || host.gone) return;
  if (match.mode === 'siege') { await siegeResult(host, result); return; }
  if (result.chapterDone || result.campaignDone) host.sound.sfx('jgl_chapter_clear');
  const pick = await host.window(() => openClear(host.ctx, result)).catch(() => 'map' as const);
  if (host.gone) return;
  await starter(host, result);
  if (host.gone) return;
  if (pick === 'next' && result.next !== null) { await again(host, 'campaign', result.next, 'next'); return; }
  if (pick === 'replay') { await again(host, 'campaign', result.n, 'replay'); return; }
  host.detach();
  host.ctx.go('map');
}

/** S08 after the defeat delay: Continue keeps the stage; Retry / Map (Siege: End Run) end it. */
export async function afterDefeat(host: FlowHost, match: Match, onContinue: () => void): Promise<void> {
  host.ending = true;
  let info = null;
  try { info = match.defeat(); } catch { info = null; }
  const pick = info ? await host.window(() => openDefeat(host.ctx, match, info)).catch(() => 'map' as const) : 'map';
  if (host.gone || host.match !== match) return;
  if (pick === 'continued') {
    host.ending = false;
    if (match.paused) { try { match.resume(); } catch { /* not paused */ } }
    onContinue();
    return;
  }
  const result = await finish(host, match, 'final');
  if (!result || host.gone) return;
  if (match.mode === 'siege') { await siegeResult(host, result); return; }
  await starter(host, result);
  if (host.gone) return;
  if (pick === 'retry') { await again(host, 'campaign', match.n, 'retry'); return; }
  host.detach();
  host.ctx.go('map');
}

/** S09 at the end of a Siege run: Play Again (S04 here), Leaderboards then Lobby, or Lobby. */
async function siegeResult(host: FlowHost, result: StageResult): Promise<void> {
  host.detach();
  host.sound.sfx(result.newBest ? 'jgl_siege_record' : 'jgl_siege_result');
  const pick = await host.window(() => openSiegeResult(host.ctx, result)).catch(() => 'lobby' as const);
  if (host.gone) return;
  await starter(host, result);
  if (host.gone) return;
  if (pick === 'retry') { await again(host, 'siege', result.n, 'retry'); return; }
  if (pick === 'boards') await host.window(() => openBoards(host.ctx, 'siege_best')).catch(() => undefined);
  if (!host.gone) host.ctx.go('home');
}

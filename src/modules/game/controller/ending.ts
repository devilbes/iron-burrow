// The end of a stage / run: the level end with its automatic retries (GDD 31 D-31-04: the same
// call again, game-ports keeps the event id until it succeeds), the manual retry after the last
// one, the result on the server answer (never waiting for a reward), the defeat and its concede.
import { maxStageScore, stars } from '../core/tick.js';
import { canContinue } from './boosters.js';
import { writeCarry } from './carry.js';
import { emit, EVENTS, levelOf, levelPorts, runParams, setPhase, track, type Ctx, type PendingEnd } from './context.js';
import { Cancelled, withRetry } from './retry.js';
import type { Outcome } from './ports.js';

type Answer = { verified: boolean; stars: number };

/** Sends the level end (`manual`: one call, no automatic retries). */
function sendEnd(ctx: Ctx, pending: PendingEnd, manual: boolean): Promise<void> {
  const ports = ctx.mode ? levelPorts(ctx, ctx.mode) : null;
  const gen = ctx.gen;
  ctx.pendingEnd = pending;
  setPhase(ctx, 'ending');
  if (!ports) { setPhase(ctx, 'end_failed'); return Promise.resolve(); }
  const level = levelOf(ctx);
  const task = (): Promise<Answer> => ports.endLevel(level, pending.won, { ...pending.stats });
  const sent = manual ? task() : withRetry(task, ctx.tun.levelEndRetryMs, ctx.timers);
  const done = sent.then((answer) => {
    if (gen !== ctx.gen || ctx.disposed) return;
    ctx.pendingEnd = null;
    pending.onAnswer(answer);
  }, (error: unknown) => {
    if (gen !== ctx.gen || ctx.disposed || error instanceof Cancelled) return;
    setPhase(ctx, 'end_failed');
  });
  const tracked = done.finally(() => { if (ctx.ending === tracked) ctx.ending = null; });
  ctx.ending = tracked;
  return tracked;
}

/** The result is known: phase 'result', the outcome to the listeners, the stage_end event. */
function complete(ctx: Ctx, part: Pick<Outcome, 'won' | 'verified' | 'stars' | 'score' | 'localStars'>): void {
  const run = ctx.run;
  const outcome: Outcome = { mode: ctx.mode ?? 'campaign', stage: ctx.stage, wave: run?.wave ?? 0, ...part };
  ctx.outcome = outcome;
  setPhase(ctx, 'result');
  emit(ctx, { t: 'result', outcome });
  const used = run ? run.boostersUsed.bubble + run.boostersUsed.shockwave + run.boostersUsed.fortify : 0;
  const duration = run ? Math.round(run.tick / ctx.tun.tps) : 0;
  if (outcome.mode === 'siege') {
    track(ctx, EVENTS.siegeEnd, { waves: outcome.wave, score: part.score, duration_s: duration, boosters_used: used });
    return;
  }
  track(ctx, EVENTS.stageEnd, { ...runParams(ctx), result: part.won ? 'clear' : 'defeat', stars: part.stars, score: part.score,
    duration_s: duration, lives_lost: run?.deaths ?? 0, boosters_used: used, defeat_cause: run?.cause ?? '' });
}

/** Campaign stage cleared and its delay over: the verified level end, then the gun carry. */
export function finishWin(ctx: Ctx): void {
  const run = ctx.run;
  if (!run) return;
  const n = ctx.stage;
  const score = run.score;
  const localStars = stars(run);
  const gun = ctx.tun.gunCarry ? run.player.gun : 0;
  if (score > maxStageScore(run)) {
    // D-11-04: a score over the stage maximum is never sent as a won level end.
    setPhase(ctx, 'ending');
    complete(ctx, { won: true, verified: false, stars: 0, score, localStars });
    return;
  }
  void sendEnd(ctx, { won: true, stats: { moves: run.tick, score }, onAnswer: (answer) => {
    if (answer.verified) ctx.carry = { stage: n + 1, gun };
    complete(ctx, { won: true, verified: answer.verified, stars: answer.stars, score, localStars });
    if (answer.verified) writeCarry(ctx, n, gun);
  } }, false);
}

/** The defeat delay is over: phase 'defeated' and the defeat screen data. */
export function enterDefeat(ctx: Ctx): void {
  const run = ctx.run;
  if (!run) return;
  setPhase(ctx, 'defeated');
  emit(ctx, { t: 'defeat', canContinue: canContinue(ctx), score: run.score, cause: run.cause });
}

/**
 * Gives up an unresolved defeat: the level end, once (with its retries).
 * Campaign: a lost level end with score 0 (D-11-01: a defeat score is not recorded).
 * Siege: a run always ends with a defeat and its score is the run result for the siege_best
 * board, whose source is the Siege level end — so the run end is sent as won=true with the score
 * (the arena has no rewards; the outcome still says won=false to the player).
 */
export function concede(ctx: Ctx): Promise<void> {
  if (ctx.phase === 'ending' && ctx.ending) return ctx.ending;
  const run = ctx.run;
  if (ctx.phase !== 'defeated' || ctx.continuing || !run) return Promise.resolve();
  const score = run.score;
  const siege = ctx.mode === 'siege';
  const stats = { moves: run.tick, score: siege ? score : 0 };
  return sendEnd(ctx, { won: siege, stats, onAnswer: (answer) => {
    complete(ctx, { won: false, verified: answer.verified, stars: siege ? 0 : answer.stars, score, localStars: 0 });
  } }, false);
}

/** After the automatic retries failed: one more call on the player's demand. */
export async function retryEnd(ctx: Ctx): Promise<boolean> {
  const pending = ctx.pendingEnd;
  if (ctx.phase !== 'end_failed' || !pending) return false;
  await sendEnd(ctx, pending, true);
  return ctx.pendingEnd === null;
}

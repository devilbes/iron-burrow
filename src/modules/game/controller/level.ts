// The level controller: one campaign stage or Siege run at a time on top of the pure rules, the
// platform level ports, the booster inventory and an injected clock. Network calls happen only at
// the start (level, attempt, pre-stage hulls), on booster use / continue (consume) and at the end
// (level end, then the one save of the gun carry); never from the ticks in between.
import { applyContinue } from '../core/tick.js';
import { canContinue, canUse, consumeHull, REASON, useBooster } from './boosters.js';
import { createCtx, runParams, setPhase, track, type Ctx } from './context.js';
import { concede, retryEnd } from './ending.js';
import { frame, pause, resume } from './loop.js';
import { start } from './start.js';
import type { ControllerDeps, LevelController, StartOptions } from './ports.js';

/** Continue after a defeat: the Spare Hull is consumed first (confirmed), then the run goes on. */
async function continueWithHull(ctx: Ctx): Promise<boolean> {
  const run = ctx.run;
  if (ctx.phase !== 'defeated' || ctx.continuing || !run || !canContinue(ctx)) return false;
  ctx.continuing = true;
  let ok = false;
  try { ok = await consumeHull(ctx, REASON.continue); } finally { ctx.continuing = false; }
  if (!ok || ctx.run !== run || ctx.phase !== 'defeated' || ctx.disposed) return false;
  applyContinue(run);
  ctx.acc = 0;
  ctx.lastFrame = null;
  track(ctx, 'continue_used', runParams(ctx));
  setPhase(ctx, 'intro');
  return true;
}

/** Resolves an open end first: an unresolved defeat is conceded, a level end in flight awaited. */
async function settle(ctx: Ctx): Promise<void> {
  if (ctx.phase === 'defeated' && !ctx.continuing) await concede(ctx);
  else if (ctx.ending) await ctx.ending;
}

/** Leaving a stage in play: the analytics quit (no level end: the attempt is abandoned). */
function quitIfPlaying(ctx: Ctx): void {
  const playing = ['intro', 'playing', 'paused', 'cleared'];
  if (ctx.run && playing.includes(ctx.phase)) track(ctx, 'stage_end', { ...runParams(ctx), result: 'quit', score: ctx.run.score });
}

async function startAfterSettle(ctx: Ctx, options: StartOptions, gun?: number): Promise<boolean> {
  await settle(ctx);
  if (ctx.continuing) return false;
  quitIfPlaying(ctx);
  return start(ctx, options, gun);
}

export function createLevelController(deps: ControllerDeps): LevelController {
  const ctx = createCtx(deps);
  return {
    get phase() { return ctx.phase; },
    get run() { return ctx.run; },
    get mode() { return ctx.mode; },
    get stage() { return ctx.stage; },
    get outcome() { return ctx.outcome; },
    start: (options) => startAfterSettle(ctx, options),
    frame: (nowMs) => frame(ctx, nowMs),
    setInput(dir, fire) { ctx.input = { dir, fire }; },
    useBooster: (kind) => useBooster(ctx, kind),
    canUse: (kind) => canUse(ctx, kind),
    pause: () => pause(ctx),
    resume: () => resume(ctx),
    continueWithHull: () => continueWithHull(ctx),
    concede: () => concede(ctx),
    retryEnd: () => retryEnd(ctx),
    async next() {
      const o = ctx.outcome;
      if (ctx.phase !== 'result' || !o || o.mode !== 'campaign' || !o.won || !o.verified) return false;
      if (ctx.lastStage !== null && o.stage >= ctx.lastStage) return false;
      return start(ctx, { mode: 'campaign', stage: o.stage + 1 });
    },
    async retry() {
      const mode = ctx.mode;
      if (!mode || ctx.phase === 'idle' || ctx.phase === 'loading') return false;
      const options: StartOptions = mode === 'siege' ? { mode } : { mode, stage: ctx.stage };
      return startAfterSettle(ctx, options, 0);
    },
    async exit() {
      await settle(ctx);
      quitIfPlaying(ctx);
      ctx.gen++;
      ctx.run = null;
      ctx.queued = null;
      ctx.pendingEnd = null;
      ctx.pausedFrom = null;
      setPhase(ctx, 'idle');
    },
    on(listener) {
      ctx.listeners.add(listener);
      return () => { ctx.listeners.delete(listener); };
    },
    dispose() {
      ctx.disposed = true;
      ctx.gen++;
      ctx.timers.dispose();
      ctx.listeners.clear();
    },
  };
}

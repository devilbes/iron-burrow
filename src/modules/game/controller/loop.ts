// The frame loop (GDD 10 §2): a fixed-step accumulator of 1/tps, at most maxTicksPerFrame ticks
// per frame (the rest of the time is dropped), a frame gap over maxFrameMs cut; nothing runs
// while paused (D-10-01, E9). Every RunState event goes to the listeners.
import { step } from '../core/tick.js';
import type { Command } from '../core/state.js';
import { consumeBattle } from './boosters.js';
import { emit, setPhase, type Ctx } from './context.js';
import { enterDefeat, finishWin } from './ending.js';
import type { ControllerPhase } from './ports.js';

const TICKING: readonly ControllerPhase[] = ['intro', 'playing', 'cleared'];
const MS = 1000;

/** Advances the run by the frame time up to `nowMs`. */
export function frame(ctx: Ctx, nowMs: number): void {
  const tun = ctx.tun;
  if (!ctx.run || !TICKING.includes(ctx.phase)) { ctx.lastFrame = null; return; }
  if (ctx.lastFrame === null || nowMs < ctx.lastFrame) { ctx.lastFrame = nowMs; return; }
  const gap = Math.min(nowMs - ctx.lastFrame, tun.maxFrameMs);
  ctx.lastFrame = nowMs;
  // Time in ms × tps: one tick = 1000 units, integer for integer frame times.
  ctx.acc += gap * tun.tps;
  let ticks = 0;
  while (ctx.acc >= MS && ticks < tun.maxTicksPerFrame && TICKING.includes(ctx.phase)) {
    ctx.acc -= MS;
    ticks++;
    tick(ctx);
  }
  if (ctx.acc >= MS || !TICKING.includes(ctx.phase)) ctx.acc = 0;
}

/** One tick with the current input and the queued booster; then the phase it leads to. */
export function tick(ctx: Ctx): void {
  const run = ctx.run;
  if (!run) return;
  const cmd: Command = ctx.queued ? { ...ctx.input, booster: ctx.queued } : { ...ctx.input };
  ctx.queued = null;
  step(run, cmd);
  for (const event of run.events) {
    if (event.t === 'booster') consumeBattle(ctx, event.kind);
    emit(ctx, event);
  }
  syncPhase(ctx);
}

/** The controller phase after a tick (the delays of cleared / defeated in ticks). */
function syncPhase(ctx: Ctx): void {
  const run = ctx.run;
  if (!run) return;
  const t = ctx.tun.ticks;
  if (run.phase === 'intro' || run.phase === 'playing') setPhase(ctx, run.phase);
  else if (run.phase === 'cleared') {
    setPhase(ctx, 'cleared');
    if (run.phaseTicks >= t.clearDelay) finishWin(ctx);
  } else if (run.phase === 'defeated' && run.phaseTicks >= t.defeatDelay) enterDefeat(ctx);
  // During the defeat delay the phase stays 'playing' (the blast plays; the sim stands still).
}

export function pause(ctx: Ctx): void {
  if (!TICKING.includes(ctx.phase)) return;
  ctx.pausedFrom = ctx.phase;
  setPhase(ctx, 'paused');
}

/** Back to the phase pause() left; the first frame after it only takes the time (no catch-up). */
export function resume(ctx: Ctx): void {
  if (ctx.phase !== 'paused') return;
  const back = ctx.pausedFrom ?? 'playing';
  ctx.pausedFrom = null;
  ctx.lastFrame = null;
  ctx.acc = 0;
  setPhase(ctx, back);
}

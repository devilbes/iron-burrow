// Start of a campaign stage or a Siege run: the level from its record, the server-seeded attempt,
// the Spare Hulls of the pre-stage (only confirmed ones add lives, D-15-02), the carried gun.
import { parseStage } from '../core/stage.js';
import { runSeedOf } from '../core/rng.js';
import { createRun } from '../core/state.js';
import { available, consumeHull, REASON } from './boosters.js';
import { readSave, takeCarry } from './carry.js';
import { emit, levelPorts, runParams, setPhase, track, type Ctx } from './context.js';
import type { Mode, StartOptions } from './ports.js';

/** The level and its seed; null when a service failed (nothing else is called then). */
async function loadLevel(ctx: Ctx, mode: Mode, stage: number | undefined) {
  const ports = levelPorts(ctx, mode);
  if (!ports) return null;
  try {
    const n = mode === 'siege' ? 1 : stage ?? await ctx.deps.campaign.currentLevel();
    if (mode === 'campaign') await readSave(ctx);
    const level = await ports.level(n);
    const def = parseStage(level.entry, ctx.tun);
    const { seed } = await ports.beginAttempt(n);
    return { n, last: level.last, def, seed: runSeedOf(seed) };
  } catch {
    return null;
  }
}

/** Spare Hulls of the pre-stage: one confirmed consume per hull, up to the mode's limit. */
async function takeHulls(ctx: Ctx, mode: Mode, wanted: number): Promise<number> {
  const b = ctx.tun.boosters;
  const limit = mode === 'siege' ? b.hullPrestage * b.siegeMult : b.hullPrestage;
  const count = Math.min(Math.max(0, Math.floor(wanted)), limit, Math.max(0, available(ctx, 'hull')));
  let confirmed = 0;
  for (let i = 0; i < count; i++) {
    if (!(await consumeHull(ctx, REASON.prestage))) break;
    confirmed++;
  }
  return confirmed;
}

/**
 * Starts a stage / run. `gun` overrides the carried gun (retry starts with 0). Resolves false
 * (phase 'error', event start_failed) when the level or the attempt cannot be had.
 */
export async function start(ctx: Ctx, options: StartOptions, gun?: number): Promise<boolean> {
  if (ctx.disposed || ctx.phase === 'loading' || ctx.phase === 'ending' || ctx.continuing) return false;
  const gen = ++ctx.gen;
  const mode = options.mode;
  ctx.run = null;
  ctx.outcome = null;
  ctx.pendingEnd = null;
  ctx.queued = null;
  ctx.pausedFrom = null;
  setPhase(ctx, 'loading');
  const level = await loadLevel(ctx, mode, options.mode === 'campaign' ? options.stage : undefined);
  if (gen !== ctx.gen || ctx.disposed) return false;
  if (!level) {
    setPhase(ctx, 'error');
    emit(ctx, { t: 'start_failed' });
    return false;
  }
  const hulls = await takeHulls(ctx, mode, options.hull ?? 0);
  if (gen !== ctx.gen || ctx.disposed) return false;
  ctx.mode = mode;
  ctx.stage = level.n;
  if (mode === 'campaign') ctx.lastStage = level.last;
  const gunLevel = mode === 'campaign' ? gun ?? takeCarry(ctx, level.n) : 0;
  if (gun !== undefined) ctx.carry = null;
  ctx.disabled.clear();
  ctx.acc = 0;
  ctx.lastFrame = null;
  ctx.input = { dir: null, fire: false };
  ctx.run = createRun({ stage: level.def, tun: ctx.tun, seed: level.seed, gun: gunLevel, extraLives: hulls });
  const key = `${mode}:${level.n}`;
  const attempt = (ctx.attempts.get(key) ?? 0) + 1;
  ctx.attempts.set(key, attempt);
  track(ctx, 'stage_start', { ...runParams(ctx), attempt, hull_prestage: hulls, gun_level: ctx.run.player.gun });
  setPhase(ctx, 'intro');
  return true;
}

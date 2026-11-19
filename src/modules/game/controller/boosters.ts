// Boosters against the inventory (GDD 15 D-15-02, 10 D-10-08): battle boosters are optimistic —
// the effect goes into the next tick, the consume runs alongside with retries, after the final
// failure the kind is off until the end of the stage / run; Spare Hull only after confirmation.
import { canUseBooster } from '../core/tick.js';
import type { BattleBooster, BoosterKind } from '../core/config.js';
import { emit, EVENTS, runParams, stageOrWave, track, type Ctx } from './context.js';
import { Cancelled, withRetry } from './retry.js';

/** Consume reasons (logged by the inventory; not shown to the player). */
export const REASON = Object.freeze({ battle: 'stage_booster', prestage: 'prestage_hull', continue: 'continue_hull' } as const);

/** Inventory count left for new uses: the quantity minus the unconfirmed use of that kind. */
export function available(ctx: Ctx, kind: BoosterKind): number {
  const inventory = ctx.deps.inventory;
  if (!inventory) return 0;
  let count = 0;
  try { count = inventory.quantity(kind); } catch { return 0; }
  return count - (ctx.inflight.has(kind) ? 1 : 0) - (ctx.queued === kind ? 1 : 0);
}

/** The battle booster may be used now: rules, inventory, not disabled, no unconfirmed use. */
export function canUse(ctx: Ctx, kind: BattleBooster): boolean {
  const run = ctx.run;
  if (!run || ctx.phase !== 'playing' || run.phase !== 'playing' || ctx.queued !== null) return false;
  if (ctx.disabled.has(kind) || ctx.inflight.has(kind)) return false;
  return canUseBooster(run, kind) && available(ctx, kind) > 0;
}

/** Queues a battle booster for the next tick's command. */
export function useBooster(ctx: Ctx, kind: BattleBooster): boolean {
  if (!canUse(ctx, kind)) return false;
  ctx.queued = kind;
  return true;
}

/** The sim applied `kind` (its 'booster' event): consume it in the background. */
export function consumeBattle(ctx: Ctx, kind: BattleBooster): void {
  const inventory = ctx.deps.inventory;
  if (!inventory) return;
  const run = ctx.run;
  const key = ctx.deps.uuid();
  ctx.inflight.add(kind);
  const task = (): Promise<void> => inventory.consume(kind, { reason: REASON.battle, idempotencyKey: key });
  withRetry(task, ctx.tun.consumeRetryMs, ctx.timers).then(() => {
    ctx.inflight.delete(kind);
    track(ctx, EVENTS.boosterUse, { ...runParams(ctx), item: kind, stage_or_wave: stageOrWave(ctx) });
  }, (error: unknown) => {
    ctx.inflight.delete(kind);
    if (error instanceof Cancelled || ctx.disposed) return;
    // Only the run that used it loses the button; a new stage starts with all kinds on.
    if (ctx.run === run) ctx.disabled.add(kind);
    emit(ctx, { t: 'booster_failed', kind });
  });
}

/** Consumes one Spare Hull and waits for the confirmation (with the consume retries). */
export async function consumeHull(ctx: Ctx, reason: string): Promise<boolean> {
  const inventory = ctx.deps.inventory;
  if (!inventory || available(ctx, 'hull') <= 0) return false;
  const key = ctx.deps.uuid();
  ctx.inflight.add('hull');
  try {
    await withRetry(() => inventory.consume('hull', { reason, idempotencyKey: key }), ctx.tun.consumeRetryMs, ctx.timers);
    return true;
  } catch (error) {
    if (!(error instanceof Cancelled) && !ctx.disposed) emit(ctx, { t: 'booster_failed', kind: 'hull' });
    return false;
  } finally {
    ctx.inflight.delete('hull');
  }
}

/** Continue limit of the mode (campaign: hull continue_max, Siege: siege continue_max). */
export function canContinue(ctx: Ctx): boolean {
  const run = ctx.run;
  if (!run || run.phase !== 'defeated') return false;
  const max = run.siege ? ctx.tun.siege.continueMax : ctx.tun.boosters.hullContinue;
  return run.continues < max && !ctx.inflight.has('hull') && available(ctx, 'hull') > 0;
}

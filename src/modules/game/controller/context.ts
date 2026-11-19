// The mutable state of one level controller, shared by its parts (start, loop, boosters, end).
import type { GameState } from '../index.js';
import { createTunables, type BattleBooster, type BoosterKind, type Tunables } from '../core/config.js';
import type { Dir } from '../core/field.js';
import type { RunState } from '../core/state.js';
import { createTimers, type Timers } from './retry.js';
import type { ControllerDeps, ControllerEvent, ControllerPhase, LevelSetPorts, Listener, Mode, Outcome } from './ports.js';

/** A level end waiting for its answer (kept for the manual retry). */
export interface PendingEnd {
  readonly won: boolean;
  readonly stats: { readonly moves: number; readonly score: number };
  readonly onAnswer: (result: { verified: boolean; stars: number }) => void;
}

export interface Ctx {
  readonly deps: ControllerDeps;
  readonly tun: Tunables;
  readonly timers: Timers;
  readonly listeners: Set<Listener>;
  phase: ControllerPhase;
  /** The phase pause() left (resume() goes back to it). */
  pausedFrom: ControllerPhase | null;
  mode: Mode | null;
  stage: number;
  /** Last level of the campaign set (null: no end known). */
  lastStage: number | null;
  run: RunState | null;
  /** Bumped by every start and by dispose: late answers of an older one are ignored. */
  gen: number;
  disposed: boolean;
  /** Accumulated time in ms × tps (integer for integer frame times). */
  acc: number;
  lastFrame: number | null;
  input: { dir: Dir | null; fire: boolean };
  /** Battle booster for the next tick's command. */
  queued: BattleBooster | null;
  outcome: Outcome | null;
  /** The level end in flight (start/next/retry wait for it). */
  ending: Promise<void> | null;
  pendingEnd: PendingEnd | null;
  /** Continue is consuming its Spare Hull. */
  continuing: boolean;
  /** Gun carried into the next campaign stage (D-10-06). */
  carry: { stage: number; gun: number } | null;
  /** The cloud save read once per session (lazily, at the first campaign start). */
  save: { read: Promise<void> | null; loaded: GameState | null; ok: boolean };
  /** Starts per mode:stage this session (analytics). */
  attempts: Map<string, number>;
  /** Kinds whose consume failed for good: off until the end of the stage / run. */
  disabled: Set<BoosterKind>;
  /** Kinds with an unconfirmed consume (at most one each). */
  inflight: Set<BoosterKind>;
}

export function createCtx(deps: ControllerDeps): Ctx {
  return {
    deps, tun: createTunables(deps.records ?? {}), timers: createTimers(deps.clock), listeners: new Set(),
    phase: 'idle', pausedFrom: null, mode: null, stage: 0, lastStage: null, run: null, gen: 0, disposed: false,
    acc: 0, lastFrame: null, input: { dir: null, fire: false }, queued: null, outcome: null, ending: null,
    pendingEnd: null, continuing: false, carry: null, save: { read: null, loaded: null, ok: false }, attempts: new Map(),
    disabled: new Set(), inflight: new Set(),
  };
}

export function emit(ctx: Ctx, event: ControllerEvent): void {
  for (const listener of [...ctx.listeners]) {
    try { listener(event); } catch { /* a listener never breaks the loop */ }
  }
}

export function setPhase(ctx: Ctx, phase: ControllerPhase): void {
  if (ctx.phase === phase) return;
  ctx.phase = phase;
  emit(ctx, { t: 'phase', phase });
}

/** The level ports of the mode in play (null: Siege without its ports). */
export function levelPorts(ctx: Ctx, mode: Mode): LevelSetPorts | null {
  return mode === 'siege' ? ctx.deps.siege ?? null : ctx.deps.campaign;
}

/** The level number of the run in its set (Siege: the arena, level 1). */
export const levelOf = (ctx: Ctx): number => (ctx.mode === 'siege' ? 1 : ctx.stage);

/** Analytics, fire-and-forget (GDD 32 names, flat params). */
/** Analytics event names of GDD 32 (`an.*`). */
export const EVENTS = Object.freeze({
  stageStart: 'an.stage_start', stageEnd: 'an.stage_end', boosterUse: 'an.booster_use',
  continueUsed: 'an.continue_used', siegeEnd: 'an.siege_end',
} as const);

export function track(ctx: Ctx, event: (typeof EVENTS)[keyof typeof EVENTS], params: Record<string, string | number>): void {
  try { ctx.deps.campaign.track(event, params); } catch { /* analytics never blocks */ }
}

/** Common params of the stage events. */
export function runParams(ctx: Ctx): Record<string, string | number> {
  const run = ctx.run;
  return { mode: ctx.mode ?? '', stage: ctx.stage, chapter: run?.stage.chapter ?? 0, wave: run?.wave ?? 0 };
}

/** `stage_or_wave` of the booster events: the campaign stage or the Siege wave. */
export function stageOrWave(ctx: Ctx): number {
  return ctx.mode === 'siege' ? ctx.run?.wave ?? 0 : ctx.stage;
}

// Ports of the level controller. GamePorts (src/modules/game/index.ts) stays as it is: the extra
// services the controller needs (the inventory of boosters, the level ports of the Siege set, a
// clock) are wired by the integrator. Boosters are logical kinds here; the item ids live in boot.
import type { GamePorts } from '../index.js';
import type { BattleBooster, BoosterKind, GameRecords } from '../core/config.js';
import type { Dir } from '../core/field.js';
import type { DefeatCause, GameEvent, RunState } from '../core/state.js';

export type { BattleBooster, BoosterKind, Dir, GameRecords, RunState };

/** The booster inventory (inventory.quantity / inventory.consume of the platform). */
export interface BoosterInventory {
  quantity(kind: BoosterKind): number;
  consume(kind: BoosterKind, options: { reason: string; idempotencyKey: string }): Promise<void>;
}

/** The level ports of the Siege level set (level 1 = the Siege arena). */
export type LevelSetPorts = Pick<GamePorts, 'level' | 'beginAttempt' | 'endLevel'>;

/** Injectable time source and timers (tests use a fake clock). */
export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface ControllerDeps {
  /** The campaign level set and the platform services (save, analytics). */
  readonly campaign: GamePorts;
  /** The Siege level set; without it a Siege start fails. */
  readonly siege?: LevelSetPorts;
  /** Without an inventory no booster can be used and no Spare Hull taken. */
  readonly inventory?: BoosterInventory;
  /** The game.* config records (missing keys from the built-in copy). */
  readonly records?: GameRecords;
  readonly clock: Clock;
  readonly uuid: () => string;
}

export type Mode = 'campaign' | 'siege';

export type ControllerPhase = 'idle' | 'loading' | 'intro' | 'playing' | 'paused' | 'cleared' | 'defeated' | 'ending'
  | 'result' | 'end_failed' | 'error';

export type StartOptions =
  | { readonly mode: 'campaign'; readonly stage?: number; readonly hull?: number }
  | { readonly mode: 'siege'; readonly hull?: number };

/** The end of a stage or a Siege run as the result screen shows it. */
export interface Outcome {
  readonly mode: Mode;
  /** Campaign stage; 1 (the arena) in Siege. */
  readonly stage: number;
  /** Siege wave reached; 0 in the campaign. */
  readonly wave: number;
  readonly won: boolean;
  /** The server verified the level end (false without one, e.g. a score over the stage maximum). */
  readonly verified: boolean;
  /** Stars from the server answer. */
  readonly stars: number;
  readonly score: number;
  /** Stars the rules give locally (shown until / unless the server answers). */
  readonly localStars: number;
}

export type ControllerEvent =
  | GameEvent
  | { readonly t: 'phase'; readonly phase: ControllerPhase }
  | { readonly t: 'start_failed' }
  | { readonly t: 'booster_failed'; readonly kind: BoosterKind }
  | { readonly t: 'defeat'; readonly canContinue: boolean; readonly score: number; readonly cause: DefeatCause | null }
  | { readonly t: 'result'; readonly outcome: Outcome };

export type Listener = (event: ControllerEvent) => void;

export interface LevelController {
  readonly phase: ControllerPhase;
  /** The run in play (read-only use by the render); null when none. */
  readonly run: RunState | null;
  readonly mode: Mode | null;
  /** Campaign stage of the run (1 in Siege, 0 before the first start). */
  readonly stage: number;
  /** The last result; null until a stage or run ends. */
  readonly outcome: Outcome | null;
  start(options: StartOptions): Promise<boolean>;
  frame(nowMs: number): void;
  setInput(dir: Dir | null, fire: boolean): void;
  useBooster(kind: BattleBooster): boolean;
  /** The battle booster may be used now (rules, inventory, not disabled). */
  canUse(kind: BattleBooster): boolean;
  pause(): void;
  resume(): void;
  continueWithHull(): Promise<boolean>;
  concede(): Promise<void>;
  retryEnd(): Promise<boolean>;
  next(): Promise<boolean>;
  retry(): Promise<boolean>;
  exit(): Promise<void>;
  on(listener: Listener): () => void;
  /** Stops everything: timers cleared, listeners dropped, late answers ignored. */
  dispose(): void;
}

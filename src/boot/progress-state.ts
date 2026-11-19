import type { Sdk } from '@manygamescorp/core/kernel';
import { SDKError } from '@manygamescorp/core/error';
import type { Progress, ProgressState } from '@manygamescorp/mod-progress/progress';
import { MODULES, PROGRESS } from './ids.js';

/**
 * The game's progress tracks, read once per player session: one `progress.init` with every key
 * the game uses. Afterwards the tracks change only by what the game's own accepted actions did
 * (`change`): an action answer carries no progress state, and reading the state again after an
 * action is exactly the repeated request the game must not make.
 */
export interface ProgressStore {
  /** The tracks by key; the first call reads them, a read failed on the network is tried again
   * by the next call. */
  read(): Promise<ReadonlyMap<string, ProgressState>>;
  /** A track as last read or changed; `undefined` before the read. */
  get(key: string): ProgressState | undefined;
  /** Applies to a read track what an accepted action did; then notifies the listeners. */
  change(key: string, apply: (state: ProgressState) => ProgressState): void;
  onChange(listener: () => void): () => void;
  /** Forgets the tracks (player change); the next `read` reads them for the new player. */
  reset(): void;
}

/** Every progress key the game uses, read in one request. */
const KEYS: readonly string[] = Object.values(PROGRESS);

/** `state` with step `step` completed. */
export function withCompletedStep(state: ProgressState, step: string): ProgressState {
  if (state.steps[step]?.status === 'completed') return state;
  const current = state.steps[step] ?? { availableAt: null, conditions: {} };
  return { ...state, steps: { ...state.steps, [step]: { ...current, status: 'completed' } } };
}

export function createProgressStore(sdk: () => Sdk): ProgressStore {
  let states: Map<string, ProgressState> | undefined;
  let reading: Promise<Map<string, ProgressState>> | undefined;
  let player = 0;
  const listeners = new Set<() => void>();
  const read = (): Promise<Map<string, ProgressState>> => {
    if (states) return Promise.resolve(states);
    const run = player;
    reading ??= sdk().getModule<Progress>(MODULES.progress).init(KEYS).then((list) => {
      const next = new Map(list.map((state) => [state.key, state]));
      if (run === player) states = next;
      return next;
    }, (error: unknown) => {
      // Only a retryable failure (network) is read again, on the next call; a refused or
      // invalid answer stays the answer of this session.
      if (run === player && error instanceof SDKError && error.retryable) reading = undefined;
      throw error;
    });
    return reading;
  };
  return {
    read,
    get: (key) => states?.get(key),
    change(key, apply) {
      const state = states?.get(key);
      if (!states || !state) return;
      states.set(key, apply(state));
      for (const listener of listeners) listener();
    },
    onChange(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    reset() { player++; states = undefined; reading = undefined; },
  };
}

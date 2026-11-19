// Timers of the controller on the injected clock and the retry policy built on them. Every
// pending timer is known, so dispose() leaves none behind.
import type { Clock } from './ports.js';

/** Rejection of a wait cut short by dispose(). */
export class Cancelled extends Error {
  constructor() { super('cancelled'); this.name = 'Cancelled'; }
}

export interface Timers {
  /** Resolves after `ms`; rejects with Cancelled on dispose. */
  sleep(ms: number): Promise<void>;
  /** Timers not fired yet. */
  pending(): number;
  dispose(): void;
}

export function createTimers(clock: Clock): Timers {
  const live = new Map<object, { handle: unknown; reject: (error: Error) => void }>();
  return {
    sleep(ms) {
      return new Promise<void>((resolve, reject) => {
        const token = {};
        const handle = clock.setTimeout(() => { live.delete(token); resolve(); }, ms);
        live.set(token, { handle, reject });
      });
    },
    pending: () => live.size,
    dispose() {
      const all = [...live.values()];
      live.clear();
      for (const { handle, reject } of all) { clock.clearTimeout(handle); reject(new Cancelled()); }
    },
  };
}

/**
 * Runs `task`; after a failure waits `delays[i]` and runs it again, as many times as there are
 * delays. The last error (or Cancelled) rejects. The task decides what a repeat sends: the level
 * end and the consume repeat the same call (same event id / idempotency key).
 */
export async function withRetry<T>(task: () => Promise<T>, delays: readonly number[], timers: Timers): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await task();
    } catch (error) {
      if (error instanceof Cancelled || i >= delays.length) throw error;
      await timers.sleep(delays[i] as number);
    }
  }
}

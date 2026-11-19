import type { ScreenContext } from '../screens/index.js';

/**
 * `ctx.onSuspend`: the game stops its level clock, physics and sound while the player cannot
 * play, and goes on after. Two reasons, both events of the SDK (sticky: the current state comes
 * at once):
 * - `app:lifecycle:changed` `hidden` — the tab or the app is in the background;
 * - `sdk:orientation:changed` `blocked` — the device is held the other way than the game's
 *   `ORIENTATION` and the SDK covers the game with «rotate your device». An SDK that does not
 *   publish this event yet never blocks.
 * The shell draws nothing here and decides nothing: it only joins the two signals into one.
 */
interface Bus { on(event: string, listener: (payload: unknown) => void): () => void }

export interface Suspend {
  readonly onSuspend: ScreenContext['onSuspend'];
  /** Drops every handler (the screen that set them is left). */
  clear(): void;
}

export function createSuspend(bus: () => Bus): Suspend {
  const handlers = new Set<(suspended: boolean) => void>();
  const reasons = { hidden: false, blocked: false };
  let suspended = false;
  let bound = false;
  const flag = (payload: unknown, name: string): boolean =>
    typeof payload === 'object' && payload !== null && (payload as Record<string, unknown>)[name] === true;
  const publish = (): void => {
    const next = reasons.hidden || reasons.blocked;
    if (next === suspended) return;
    suspended = next;
    for (const handler of [...handlers]) {
      try { handler(suspended); } catch (error) { console.warn('suspend handler failed', error); }
    }
  };
  const bind = (): void => {
    if (bound) return;
    bound = true;
    bus().on('app:lifecycle:changed', (payload) => { reasons.hidden = flag(payload, 'hidden'); publish(); });
    bus().on('sdk:orientation:changed', (payload) => { reasons.blocked = flag(payload, 'blocked'); publish(); });
  };
  return {
    onSuspend(handler) {
      bind();
      handlers.add(handler);
      if (suspended) handler(true);
      return () => { handlers.delete(handler); };
    },
    clear() { handlers.clear(); },
  };
}

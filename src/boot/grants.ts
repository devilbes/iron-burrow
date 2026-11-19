import type { Sdk } from '@manygamescorp/core/kernel';
import type { InventoryNamespace } from '@manygamescorp/mod-inventory/inventory';
import type { Progress } from '@manygamescorp/mod-progress/progress';
import { MODULES, PROGRESS } from './ids.js';
import { withCompletedStep, type ProgressStore } from './progress-state.js';

/**
 * Server grants (level reward, daily coins) land after the action's answer. With the realtime
 * module the server pushes `inventory.balance.changed`; inventory re-reads itself and emits
 * `inventory:items:granted`, which opens the reward window and updates the top bar. Without
 * realtime nothing tells the client: an expected grant is then picked up by ONE inventory read
 * at the next screen change — never by waiting or re-reading in a loop.
 */
export interface GrantFollowUp {
  /** An accepted action will be followed by a server grant. */
  expect(): void;
  /** A natural moment (a screen is shown): reads the inventory once if a grant is expected. */
  settle(): void;
}

export function createGrantFollowUp(sdk: () => Sdk): GrantFollowUp {
  let expected = false;
  const pushed = (): boolean => sdk().modules()
    .some((module) => module.id === MODULES.realtime && module.state === 'started');
  return {
    expect() { expected = !pushed(); },
    settle() {
      if (!expected) return;
      expected = false;
      void sdk().getModule<InventoryNamespace>(MODULES.inventory).refresh().catch(() => undefined);
    },
  };
}

/**
 * One visit per player and UTC day: the `login` action advances the daily track and the server
 * grants the day's coins. The event id makes a repeated send of the same day a no-op. Sent once,
 * after the one progress read of the session and only for an active daily track; an accepted
 * (not duplicate) visit completes the available day in that read state, so the daily window
 * shows it without another read.
 */
export async function sendDailyLogin(sdk: Sdk, progress: ProgressStore,
  grants: GrantFollowUp): Promise<void> {
  const gid = sdk.auth?.session?.gid;
  if (gid === undefined) return;
  const day = new Date(sdk.time.now()).toISOString().slice(0, 10);
  try {
    // The read comes first, so the state it returns does not yet include this visit. No visit
    // without an active daily track: the server would refuse it.
    const states = await progress.read();
    if (states.get(PROGRESS.daily)?.status !== 'active') return;
    const ack = await sdk.getModule<Progress>(MODULES.progress)
      .send({ eventId: `login:${gid}:${day}`, type: 'login', data: {} });
    if (ack.duplicate) return;
    grants.expect();
    progress.change(PROGRESS.daily, (state) => {
      const day = Object.entries(state.steps).find(([, step]) => step.status === 'available')?.[0];
      return day ? withCompletedStep(state, day) : state;
    });
  } catch { /* progress down: the next start sends it */ }
}

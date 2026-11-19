// The daily visit (src/boot/grants.ts): one progress read, one `login` action, no waiting for its
// grant and no read of progress after it; the visited day is completed in the read state.
import assert from 'node:assert/strict';
import test from 'node:test';
import { BOOT, transpile } from './helpers/boot-modules.mjs';

const load = transpile(BOOT);
const { createGrantFollowUp, sendDailyLogin } = await load('boot/grants');
const { createProgressStore } = await load('boot/progress-state');

const step = (status) => ({ status, availableAt: null, conditions: {} });

function fakeSdk({ duplicate = false, initFails = false, status = 'active' } = {}) {
  const calls = [];
  const progress = {
    init: async (keys) => {
      calls.push('progress.init');
      if (initFails) throw new Error('down');
      return keys.map((key) => ({ key, status, attemptId: 'a1', rewards: [],
        steps: { day_1: step('completed'), day_2: step('available'), day_3: step('locked') } }));
    },
    send: async (action) => { calls.push(`send ${action.type} ${action.eventId}`); return { duplicate }; },
  };
  const modules = { progress, inventory: { refresh: async () => { calls.push('inventory.refresh'); } } };
  const sdk = { getModule: (id) => modules[id], modules: () => [],
    auth: { session: { gid: 7 } }, time: { now: () => Date.UTC(2026, 10, 16, 12) } };
  return { calls, sdk, store: createProgressStore(() => sdk), grants: createGrantFollowUp(() => sdk) };
}

test('the visit reads progress once, sends one login and completes the day without another read', async () => {
  const server = fakeSdk();
  await sendDailyLogin(server.sdk, server.store, server.grants);
  assert.deepEqual(server.calls, ['progress.init', 'send login login:7:2026-11-16']);
  assert.equal(server.store.get('reward_daily').steps.day_2.status, 'completed');
  assert.equal(server.store.get('reward_daily').steps.day_3.status, 'locked');
  // The day's coins: one inventory read at the next screen (no realtime here), then nothing.
  server.grants.settle();
  server.grants.settle();
  assert.deepEqual(server.calls.slice(2), ['inventory.refresh']);
});

test('a visit already sent today changes nothing and expects no grant', async () => {
  const server = fakeSdk({ duplicate: true });
  await sendDailyLogin(server.sdk, server.store, server.grants);
  server.grants.settle();
  assert.equal(server.store.get('reward_daily').steps.day_2.status, 'available');
  assert.deepEqual(server.calls, ['progress.init', 'send login login:7:2026-11-16']);
});

test('no visit when progress cannot be read or the daily track is not active', async () => {
  for (const options of [{ initFails: true }, { status: 'unavailable' }]) {
    const server = fakeSdk(options);
    await sendDailyLogin(server.sdk, server.store, server.grants);
    assert.deepEqual(server.calls, ['progress.init']);
  }
});

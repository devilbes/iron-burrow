// GamePorts on a fake SDK (src/boot/game-ports.ts, progress-state.ts): every SDK call is logged,
// so the tests check the requests themselves — one progress read per session, level records
// once, the level end answered without waiting for its reward, no cloud save unless asked.
import assert from 'node:assert/strict';
import test from 'node:test';
import { BOOT, transpile } from './helpers/boot-modules.mjs';

const load = transpile(BOOT);
const { createGamePorts } = await load('boot/game-ports');
const { createProgressStore } = await load('boot/progress-state');
const { createGrantFollowUp } = await load('boot/grants');
const { SDKError } = await load('sdk-stub');
const { PROGRESS } = await load('boot/ids');

const ENTRY = { id: 'level_1', title: 'levels.main.level_1.title', size: 4 };
const step = (status) => ({ status, availableAt: null, conditions: {} });

/** One player's server side; `calls` lists every SDK request in order. */
function fakeSdk({ completed = [], verified = true, realtime = false, initError } = {}) {
  const calls = [];
  const clock = { now: 0 };
  const saved = { version: 0, data: {} };
  const ends = [];
  const applied = (n) => ({ set: 'main', n, key: 'r_0001_0005', levelId: `level_${n}`, configVersion: 1,
    contentHash: 'a'.repeat(64), entry: { ...ENTRY, id: `level_${n}` }, range: {} });
  const modules = {
    gamestate: {
      get: async () => { calls.push('gamestate.get'); return structuredClone(saved); },
      set: async (data, { version }) => {
        calls.push('gamestate.set');
        if (version !== saved.version) throw new SDKError('GAME_STATE_VERSION_CONFLICT', { httpStatus: 409 });
        Object.assign(saved, { version: version + 1, data: structuredClone(data) });
        return { version: saved.version };
      },
      clear: async () => { calls.push('gamestate.clear'); saved.version++; saved.data = {}; return { version: saved.version }; },
    },
    levels: { open: async () => {
      calls.push('levels.open');
      return { get: async (n) => { calls.push(`levels.get ${n}`); return applied(n); },
        levelEnd: async (_, result, { eventId }) => {
          calls.push('levelEnd'); ends.push({ ...result, eventId });
          return { level: { verified, stars: verified ? 2 : 0 } };
        } };
    } },
    progress: {
      init: async (keys) => {
        calls.push(`progress.init ${keys.join(',')}`);
        if (initError) throw initError;
        const steps = Object.fromEntries([1, 2, 3, 4, 5].map((n) =>
          [`level_${n}`, step(completed.includes(n) ? 'completed' : 'available')]));
        return keys.map((key) => ({ key, status: 'active', attemptId: 'a1', rewards: [],
          steps: key === 'progress_main' ? steps : { day_1: step('available') } }));
      },
      beginAttempt: async () => { calls.push('beginAttempt'); return { attemptId: 'a1', seed: 'seed-1' }; },
    },
    inventory: { refresh: async () => { calls.push('inventory.refresh'); return {}; } },
  };
  const sdk = { getModule: (id) => modules[id], bus: { on: () => () => undefined },
    modules: () => (realtime ? [{ id: 'realtime', state: 'started' }] : []),
    time: { now: () => clock.now }, configs: { get: () => ({ last: 5 }) },
    analytics: { sendEvent: () => undefined } };
  const progress = createProgressStore(() => sdk);
  const grants = createGrantFollowUp(() => sdk);
  return { calls, clock, saved, ends, progress, grants, sdk,
    ports: () => createGamePorts(sdk, progress, grants) };
}

test('level records: the set is opened once, a level read once, then from memory', async () => {
  const server = fakeSdk();
  const ports = server.ports();
  assert.deepEqual(await ports.level(1), { n: 1, last: 5, id: 'level_1', entry: ENTRY });
  await ports.level(1);
  await ports.beginAttempt(1);
  await ports.level(2);
  assert.deepEqual(server.calls, ['levels.open', 'levels.get 1', 'beginAttempt', 'levels.get 2']);
});

test('the level end returns the answer at once; the next level comes from the one progress read', async () => {
  const server = fakeSdk();
  const ports = server.ports();
  assert.equal(await ports.currentLevel(), 1);
  server.clock.now = 10_000;
  assert.deepEqual(await ports.beginAttempt(1), { seed: 'seed-1' });
  server.clock.now = 14_500;
  assert.deepEqual(await ports.endLevel(1, true, { moves: 3, score: 30 }), { verified: true, stars: 2 });
  assert.equal(server.ends[0].durationMs, 4_500);
  assert.equal(server.ends[0].seed, 'seed-1');
  assert.equal(await ports.currentLevel(), 2);
  // One progress read for the session, no read after the level end, no cloud save.
  assert.deepEqual(server.calls.filter((call) => !call.startsWith('levels.')),
    [`progress.init ${Object.values(PROGRESS).join(',')}`, 'beginAttempt', 'levelEnd']);
});

test('without realtime the expected grant is read once at the next screen, not waited for', async () => {
  const server = fakeSdk();
  const ports = server.ports();
  await ports.beginAttempt(1);
  await ports.endLevel(1, true, { moves: 3, score: 30 });
  assert.ok(!server.calls.includes('inventory.refresh'));
  server.grants.settle();
  server.grants.settle();
  assert.equal(server.calls.filter((call) => call === 'inventory.refresh').length, 1);
});

test('with realtime the grant is pushed: no inventory read by the template', async () => {
  const server = fakeSdk({ realtime: true });
  const ports = server.ports();
  await ports.beginAttempt(1);
  await ports.endLevel(1, true, { moves: 3, score: 30 });
  server.grants.settle();
  assert.ok(!server.calls.includes('inventory.refresh'));
});

test('a won level played again expects no reward; an unverified end changes nothing', async () => {
  const replay = fakeSdk({ completed: [1] });
  const ports = replay.ports();
  assert.equal(await ports.currentLevel(), 2);
  await ports.beginAttempt(1);
  await ports.endLevel(1, true, { moves: 3, score: 30 });
  replay.grants.settle();
  assert.ok(!replay.calls.includes('inventory.refresh'));
  const refused = fakeSdk({ verified: false });
  const other = refused.ports();
  await other.beginAttempt(1);
  assert.deepEqual(await other.endLevel(1, true, { moves: 3, score: 30 }), { verified: false, stars: 0 });
  assert.equal(await other.currentLevel(), 1);
});

test('the cloud save is off until the game asks: read once, written with its version', async () => {
  const server = fakeSdk();
  const ports = server.ports();
  await ports.currentLevel();
  await ports.beginAttempt(1);
  await ports.endLevel(1, false, { moves: 3, score: 0 });
  assert.ok(!server.calls.some((call) => call.startsWith('gamestate.')));
  assert.equal(await ports.loadSave(), null);
  assert.equal(await ports.loadSave(), null);
  await ports.save({ board: [1, 2] });
  assert.deepEqual(server.saved.data, { board: [1, 2] });
  // Another device wrote meanwhile: one re-read and one more write.
  server.saved.version += 1;
  await ports.save({ board: [3] });
  assert.deepEqual(server.saved.data, { board: [3] });
  assert.deepEqual(server.calls.filter((call) => call.startsWith('gamestate.')),
    ['gamestate.get', 'gamestate.set', 'gamestate.set', 'gamestate.get', 'gamestate.set']);
});

test('progress read: concurrent callers share one request; only a network failure is read again', async () => {
  const server = fakeSdk();
  await Promise.all([server.progress.read(), server.progress.read(), server.ports().currentLevel()]);
  await server.progress.read();
  assert.equal(server.calls.length, 1);
  const offline = fakeSdk({ initError: new SDKError('NETWORK_ERROR', { retryable: true }) });
  await assert.rejects(offline.progress.read());
  await assert.rejects(offline.progress.read());
  assert.equal(offline.calls.length, 2);
  const invalid = fakeSdk({ initError: new SDKError('INTERNAL') });
  await assert.rejects(invalid.progress.read());
  await assert.rejects(invalid.ports().currentLevel());
  assert.equal(invalid.calls.length, 1);
});

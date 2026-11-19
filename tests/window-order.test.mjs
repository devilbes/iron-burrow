// Order of the game's windows (`ctx.window`) and the kit reward window (src/shell/windows/order.ts):
// never one over the other; the one asked second opens when the first is closed.
import assert from 'node:assert/strict';
import test from 'node:test';
import { transpile } from './helpers/boot-modules.mjs';

const { createWindowOrder } = await (transpile(['shell/windows/order']))('shell/windows/order');

/** A fake shell: `open(name)` shows a window and returns its ticket; `shut(name)` is the player closing it. */
function fakeShell() {
  const shown = [];
  const log = [];
  const tickets = new Map();
  return {
    shown, log,
    opener: (name) => () => {
      let done;
      const closed = new Promise((resolve) => { done = resolve; });
      shown.push(name); log.push(`open ${name}`);
      const ticket = { closed, close: () => { if (!tickets.has(name)) return; tickets.delete(name); shown.splice(shown.indexOf(name), 1); log.push(`close ${name}`); done(); } };
      tickets.set(name, ticket);
      return ticket;
    },
    shut: async (name) => { tickets.get(name)?.close(); await new Promise((resolve) => setImmediate(resolve)); },
  };
}

test('the result first, the reward after it is closed: never one over the other', async () => {
  const order = createWindowOrder();
  const shell = fakeShell();
  const result = order.open('game', shell.opener('result'));
  const reward = order.open('reward', shell.opener('reward'));
  assert.deepEqual(shell.shown, ['result'], 'the reward waits while the result is up');
  assert.deepEqual(order.shown(), { game: 1, reward: 0 });
  await shell.shut('result');
  assert.deepEqual(shell.shown, ['reward'], 'the reward opens once the result is gone');
  await shell.shut('reward');
  await Promise.all([result.closed, reward.closed]);
  assert.deepEqual(shell.log, ['open result', 'close result', 'open reward', 'close reward']);
});

test('a reward already up: a game window waits for it', async () => {
  const order = createWindowOrder();
  const shell = fakeShell();
  order.open('reward', shell.opener('reward'));
  order.open('game', shell.opener('pause'));
  assert.deepEqual(shell.shown, ['reward']);
  await shell.shut('reward');
  assert.deepEqual(shell.shown, ['pause']);
});

test('game windows stack over game windows; the reward waits for the last of them', async () => {
  const order = createWindowOrder();
  const shell = fakeShell();
  order.open('game', shell.opener('pause'));
  order.open('reward', shell.opener('reward'));
  order.open('game', shell.opener('confirm'));
  assert.deepEqual(shell.shown, ['pause', 'confirm']);
  await shell.shut('confirm');
  assert.deepEqual(shell.shown, ['pause'], 'one game window still up: the reward still waits');
  await shell.shut('pause');
  assert.deepEqual(shell.shown, ['reward']);
});

test('a waiting window closed before its turn never opens', async () => {
  const order = createWindowOrder();
  const shell = fakeShell();
  order.open('game', shell.opener('result'));
  const reward = order.open('reward', shell.opener('reward'));
  reward.close();
  await reward.closed;
  await shell.shut('result');
  assert.deepEqual(shell.log, ['open result', 'close result']);
  assert.deepEqual(order.shown(), { game: 0, reward: 0 });
});

test('a window that fails to open does not hold the other side', async () => {
  const order = createWindowOrder();
  const shell = fakeShell();
  assert.throws(() => order.open('game', () => { throw new Error('no shell'); }));
  order.open('reward', shell.opener('reward'));
  assert.deepEqual(shell.shown, ['reward']);
});

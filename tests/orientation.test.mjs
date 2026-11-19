// The orientation of the game (`ORIENTATION` of src/screens/index.ts): one of the three values,
// handed to the SDK at start, equal to the application setting (`orientation` of platform.json)
// when that names one; a notice when the game declares one while the application still says
// `any` — the setting is changed on the platform, not by the game. And `ctx.onSuspend`
// (src/shell/suspend.ts): one pause signal out of the SDK's two events.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { transpile } from './helpers/boot-modules.mjs';

const root = new URL('../', import.meta.url);
const source = (path) => readFileSync(new URL(path, root), 'utf8');
const VALUES = ['any', 'landscape', 'portrait'];

/** `ORIENTATION` as declared in the text of src/screens/index.ts. */
export function declared(text) {
  return /export const ORIENTATION: GameOrientation = '([^']*)'/.exec(text)?.[1];
}

/**
 * The declaration against the application setting: `problem` fails the test, `notice` is printed.
 * A platform.json without `orientation` (the template as shipped) is `any`.
 */
export function compare(orientation, platform) {
  const setting = platform?.orientation ?? 'any';
  if (setting !== 'any' && setting !== orientation) {
    return { problem: `platform.json orientation is "${setting}", ORIENTATION in src/screens/index.ts is "${orientation}": `
      + 'the game is made for one of them — declare the same value' };
  }
  if (setting === 'any' && orientation !== 'any') {
    return { notice: `ORIENTATION is "${orientation}" while the application setting (platform.json orientation) is "any": `
      + `set the application's orientation to "${orientation}" on the platform (the game cannot change it)` };
  }
  return {};
}

test('the rules of the check', () => {
  assert.equal(declared("export const ORIENTATION: GameOrientation = 'landscape';"), 'landscape');
  assert.deepEqual(compare('any', { orientation: 'any' }), {});
  assert.deepEqual(compare('any', {}), {});
  assert.deepEqual(compare('landscape', { orientation: 'landscape' }), {});
  assert.match(compare('landscape', { orientation: 'portrait' }).problem, /portrait.*landscape/);
  assert.match(compare('any', { orientation: 'portrait' }).problem, /portrait/);
  assert.match(compare('landscape', { orientation: 'any' }).notice, /on the platform/);
  assert.match(compare('portrait', null).notice, /portrait/);
});

test('ORIENTATION is declared, handed to the SDK and agrees with the application setting', (t) => {
  const orientation = declared(source('src/screens/index.ts'));
  assert.ok(VALUES.includes(orientation), `ORIENTATION in src/screens/index.ts is one of ${VALUES.join(', ')}, got ${orientation}`);
  assert.match(source('src/boot/start.ts'), /orientation: ORIENTATION\b/, 'src/boot/start.ts passes ORIENTATION to createSdk');
  const file = fileURLToPath(new URL('platform.json', root));
  const platform = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
  const { problem, notice } = compare(orientation, platform);
  if (notice) t.diagnostic(`NOTICE: ${notice}`);
  assert.equal(problem, undefined, problem);
});

/** A bus of two sticky events, as the SDK's. */
function fakeBus() {
  const listeners = new Map();
  return { on(event, listener) { listeners.set(event, listener); return () => listeners.delete(event); },
    emit(event, payload) { listeners.get(event)?.(payload); }, listeners };
}

test('ctx.onSuspend: hidden or blocked pauses, both gone resumes, a left screen hears nothing', async () => {
  const { createSuspend } = await transpile(['shell/suspend'])('shell/suspend');
  const bus = fakeBus();
  const suspend = createSuspend(() => bus);
  assert.equal(bus.listeners.size, 0, 'no subscription before the first handler');
  const seen = [];
  const off = suspend.onSuspend((value) => seen.push(value));
  assert.deepEqual([...bus.listeners.keys()].sort(), ['app:lifecycle:changed', 'sdk:orientation:changed']);
  bus.emit('app:lifecycle:changed', { hidden: false, online: true });
  bus.emit('sdk:orientation:changed', { required: 'landscape', current: 'landscape', blocked: false });
  assert.deepEqual(seen, [], 'nothing to pause: no call');
  bus.emit('sdk:orientation:changed', { required: 'landscape', current: 'portrait', blocked: true });
  bus.emit('app:lifecycle:changed', { hidden: true, online: true });
  bus.emit('sdk:orientation:changed', { required: 'landscape', current: 'landscape', blocked: false });
  assert.deepEqual(seen, [true], 'still hidden: still paused');
  bus.emit('app:lifecycle:changed', { hidden: false, online: true });
  assert.deepEqual(seen, [true, false]);
  bus.emit('app:lifecycle:changed', { hidden: true, online: false });
  const late = [];
  suspend.onSuspend((value) => late.push(value));
  assert.deepEqual(late, [true], 'set while suspended: told at once');
  off();
  suspend.clear();
  bus.emit('app:lifecycle:changed', { hidden: false, online: true });
  assert.deepEqual([seen, late], [[true, false, true], [true]]);
  // An SDK without the orientation event: only the lifecycle pauses.
  assert.doesNotThrow(() => bus.emit('sdk:orientation:changed', undefined));
});

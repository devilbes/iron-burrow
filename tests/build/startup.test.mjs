// Startup of the built entry: every startup state is visible (tests/helpers/startup.mjs).
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fixture, passes, sdkInstalled, startup } from '../helpers/build-fixture.mjs';

const it = test;

it('portable build emits the fallback and game logic without the SDK boot graph', t => {
  if (sdkInstalled) return t.skip('requires a template without installed SDK packages');
  const game = fixture(t, 'test');
  passes(game.build());
  assert.ok(existsSync(join(game.root, 'dist/app/main.js')));
  // Strings are bundled into the entry; no SDK boot entry without an SDK.
  assert.equal(existsSync(join(game.root, 'dist/app/boot')), false);
  assert.equal(existsSync(join(game.root, 'dist/app/start.js')), false);
  assert.equal(startup(game, { coreImportFailure: true }).state, 'unavailable');
});

it('built startup hands platform.json to the boot and keeps startup states visible', async (t) => {
  const game = fixture(t, 'test');
  passes(game.build());
  const html = readFileSync(join(game.root, 'dist/index.html'), 'utf8');
  assert.match(html, /id="preloader"/);
  assert.match(html, /<div id="boot-loader"[^>]*>/);
  const platform = { appId: 1, sdk: { modules: [{ id: 'ui-kit', settings: { hud: true } }] } };
  await t.test('ready: start() gets the root, the loader and platform.json', () => {
    const result = startup(game, { platform });
    assert.deepEqual(result.calls, ['start']);
    assert.deepEqual(result.platform, platform);
    assert.equal(result.state, 'ready');
    assert.deepEqual(result.errors, []);
  });
  await t.test('missing SDK shows a readable status and does not start', () => {
    const result = startup(game, { platform, coreImportFailure: true });
    assert.equal(result.state, 'unavailable');
    assert.match(result.text, /SDK is not installed/);
    assert.deepEqual(result.calls, []);
  });
  await t.test('boot failure is visible and does not log the raw error', () => {
    const result = startup(game, { platform, startFailure: true });
    assert.equal(result.state, 'error');
    assert.deepEqual(result.errors, [['sdk boot failed', { code: 'AUTH_UNAVAILABLE', status: 503, rid: 'test-rid' }]]);
  });
  for (const options of [{ fetchFailure: true }, { httpOk: false }, { invalidJson: true }]) {
    await t.test(`configuration failure remains visible: ${JSON.stringify(options)}`, () => {
      const result = startup(game, { platform, ...options });
      assert.equal(result.state, 'error');
      assert.match(result.text, /could not start/);
      assert.deepEqual(result.calls, []);
    });
  }
});

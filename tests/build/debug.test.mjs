// Debug sources of src/debug*/: in local builds, never in prod.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fixture, passes } from '../helpers/build-fixture.mjs';

const it = test;

it('prod artifact excludes nested debug sources and clears stale output', (t) => {
  const game = fixture(t, 'prod', {
    'src/debug/nested/menu.ts': 'export const debug = true;',
    'src/debug-tools/tool.ts': 'export const enabled = true;',
    'dist/app/debug/stale.js': 'secret debug menu',
  });
  passes(game.build());
  assert.equal(existsSync(join(game.root, 'dist/app/debug')), false);
  assert.equal(existsSync(join(game.root, 'dist/app/debug-tools/tool.js')), true);
  assert.equal(existsSync(join(game.root, 'dist/app/main.js')), true);
  assert.equal(existsSync(join(game.root, 'dist/index.html')), true);
  assert.equal(JSON.parse(readFileSync(join(game.root, 'dist/platform.json'))).environment, 'prod');
});

it('prod does not typecheck excluded debug roots', (t) => {
  const game = fixture(t, 'prod', { 'src/debug/broken.ts': 'const invalid: number = "debug only";' });
  passes(game.build());
  assert.equal(existsSync(join(game.root, 'dist/app/debug')), false);
});

for (const environment of ['dev', 'test', null, undefined]) {
  it(`local/${environment} build retains debug sources`, (t) => {
    const game = fixture(t, environment, { 'src/debug/menu.ts': 'export const debug = true;' });
    passes(game.build());
    assert.equal(existsSync(join(game.root, 'dist/app/debug/menu.js')), true);
  });
}

for (const statement of ['import { debug } from "./debug/menu.js"; console.log(debug);', 'void import("./debug/menu.js");']) {
  it(`prod rejects imported debug source: ${statement}`, (t) => {
    const game = fixture(t, 'prod', {
      'src/main.ts': statement,
      'src/debug/menu.ts': 'export const debug = true;',
    });
    const result = game.build();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Prod build imports src\/debug/);
    assert.equal(existsSync(join(game.root, 'dist/app/main.js')), false);
    assert.equal(existsSync(join(game.root, 'dist/app/debug')), false);
  });
}

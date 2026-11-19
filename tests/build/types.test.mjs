// The type check of the build and of scripts/typecheck.mjs: the same config, no silent fallback.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fixture, passes, sdkInstalled, template, typecheck } from '../helpers/build-fixture.mjs';

const it = test;

it('prod still reports type errors in game code', (t) => {
  const game = fixture(t, 'prod', { 'src/main.ts': 'const value: number = "wrong";' });
  const result = game.build();
  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /TS2322/);
});

it('build preserves project tsconfig exclusions', (t) => {
  const config = JSON.parse(readFileSync(join(template, 'tsconfig.json')));
  config.exclude = ['src/unused'];
  config.include.push('src/unused/**/*.ts');
  const game = fixture(t, 'prod', {
    'tsconfig.json': JSON.stringify(config),
    'src/unused/broken.ts': 'const unused: number = "wrong";',
  });
  passes(game.build());
  assert.equal(existsSync(join(game.root, 'dist/app/unused')), false);
});

for (const configuration of [
  { 'platform.json': JSON.stringify({ environment: 'test', sdk: { modules: [] } }) },
  { 'package.json': JSON.stringify({ dependencies: { '@manygamescorp/core': 'file:vendor/@manygamescorp/core' } }) },
  { 'vendor/@manygamescorp/importmap.json': JSON.stringify({ imports: { '@manygamescorp/core/kernel': './vendor/core.js' } }) },
]) it(`configured SDK checks the entire graph without falling back (${Object.keys(configuration)[0]})`, t => {
  const game = fixture(t, 'test', {
    ...configuration,
    'src/shell/type-error.ts': 'const invalid: number = "must fail the full SDK build";',
  });
  const result = game.build();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /shell\/type-error\.ts/);
  assert.match(result.stderr, /TS2322/);
  assert.equal(existsSync(join(game.root, 'dist/app/main.js')), false);
});

const BROKEN_SCREEN = { 'src/screens/type-error.ts': 'export const invalid: number = "must fail the check";' };

it('typecheck of a project with an SDK covers the screens', t => {
  const game = fixture(t, undefined, { ...BROKEN_SCREEN,
    'platform.json': JSON.stringify({ environment: 'test', sdk: { modules: [] } }) });
  const result = typecheck(game);
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /typecheck: tsconfig\.sdk\.json/);
  assert.match(result.stdout + result.stderr, /screens\/type-error\.ts/);
});

it('typecheck without an SDK checks the portable part only', t => {
  if (sdkInstalled) return t.skip('requires a template without installed SDK packages');
  const game = fixture(t, undefined, BROKEN_SCREEN);
  const result = typecheck(game);
  passes(result);
  assert.match(result.stdout, /typecheck: tsconfig\.json/);
});

// `npm run check:fast` bundles without the type check (it runs scripts/typecheck.mjs beside it);
// `npm run build` and a prod build always check.
it('--no-typecheck bundles without the type check; the build without it and a prod build still check', (t) => {
  const broken = { 'src/modules/broken.ts': 'export const invalid: number = "wrong";' };
  const local = fixture(t, 'test', broken);
  passes(local.build('--no-typecheck'));
  assert.equal(existsSync(join(local.root, 'dist/app/main.js')), true);
  const full = local.build();
  assert.notEqual(full.status, 0);
  assert.match(full.stdout + full.stderr, /TS2322/);
  const prod = fixture(t, 'prod', broken).build('--no-typecheck');
  assert.notEqual(prod.status, 0);
  assert.match(prod.stdout + prod.stderr, /TS2322/);
});

it('typecheck is incremental and still reports an unchanged error on the next run', (t) => {
  const game = fixture(t, undefined, { ...BROKEN_SCREEN,
    'platform.json': JSON.stringify({ environment: 'test', sdk: { modules: [] } }) });
  for (const run of [1, 2]) {
    const result = typecheck(game);
    assert.notEqual(result.status, 0, `run ${run}`);
    assert.match(result.stdout + result.stderr, /screens\/type-error\.ts/, `run ${run}`);
  }
  assert.equal(existsSync(join(game.root, '.cache/typecheck/tsconfig.sdk.tsbuildinfo')), true);
});

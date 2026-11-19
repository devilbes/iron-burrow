// Which tests run where: `npm run test:unit` and `npm run check` run every test file of tests/, and the quick set
// of `npm run check:fast` (tests/*.test.mjs) builds no project copy — those tests live in tests/build/.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { matchesGlob } from 'node:path';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const files = readdirSync(new URL('tests/', root), { recursive: true }).map((file) => `tests/${String(file).split('\\').join('/')}`)
  .filter((file) => file.endsWith('.test.mjs'));

test('npm run test:unit runs every test file of tests/', () => {
  const script = JSON.parse(readFileSync(new URL('package.json', root), 'utf8')).scripts['test:unit'];
  const globs = [...script.matchAll(/"(tests\/[^"]+)"/g)].map((match) => match[1]);
  assert.ok(globs.length > 0, script);
  assert.deepEqual(files.filter((file) => !globs.some((glob) => matchesGlob(file, glob))), []);
  // The full check (scripts/check.mjs) runs the same files. The game logic tests (tests/game/*.spec.mjs, named
  // *.spec.mjs on purpose) are run by `npm run test:unit` only.
  const check = readFileSync(new URL('scripts/check.mjs', root), 'utf8');
  for (const glob of globs.filter((item) => !item.endsWith('.spec.mjs'))) assert.ok(check.includes(`'${glob}'`), glob);
});

test('the quick set (tests/*.test.mjs) runs no build: tests that build a project copy are in tests/build/', () => {
  const quick = files.filter((file) => matchesGlob(file, 'tests/*.test.mjs') && file !== 'tests/test-set.test.mjs');
  assert.ok(quick.length > 0);
  const building = quick.filter((file) => /build-fixture\.mjs|scripts\/build\.mjs|playwright/i.test(readFileSync(new URL(file, root), 'utf8')));
  assert.deepEqual(building, []);
});

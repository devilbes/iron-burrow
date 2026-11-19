// scripts/levels-hash.mjs: the content hash of the committed sample level range equals the one
// recorded in it; JCS details; the script writes a missing hash and --check fails on a stale one.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { canonicalJson, levelsHash } from '../scripts/levels-hash.mjs';

const SAMPLE = fileURLToPath(new URL('../configs/remote/levels.main/r_0001_0005.json', import.meta.url));
const SCRIPT = fileURLToPath(new URL('../scripts/levels-hash.mjs', import.meta.url));
const sample = JSON.parse(readFileSync(SAMPLE, 'utf8'));

test('the committed sample carries the hash the script computes', () => {
  assert.equal(levelsHash(sample.data), sample.data.server.contentHash);
});

test('JCS: sorted keys, no whitespace, ECMAScript numbers, server ignored', () => {
  assert.equal(canonicalJson({ b: [1, 1e21, 0.1, -0], a: 'é\n', c: null }), '{"a":"é\\n","b":[1,1e+21,0.1,0],"c":null}');
  assert.equal(levelsHash({ kind: 'range', server: { a: 1 } }), levelsHash({ kind: 'range' }));
});

test('the script writes a missing hash and --check reports a stale one', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'levels-hash-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'configs/remote/levels.main'), { recursive: true });
  const file = join(root, 'configs/remote/levels.main/r_0001_0005.json');
  const { contentHash: _hash, ...server } = sample.data.server;
  writeFileSync(file, JSON.stringify({ ...sample, data: { ...sample.data, server } }));
  const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: root, encoding: 'utf8' });
  assert.notEqual(run('--check').status, 0);
  assert.equal(run().status, 0);
  assert.equal(JSON.parse(readFileSync(file, 'utf8')).data.server.contentHash, sample.data.server.contentHash);
  assert.equal(run('--check').status, 0);
});

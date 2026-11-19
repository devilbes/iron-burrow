// scripts/assets.mjs (npm run assets): the 1x picture is exactly half of the 2x one, averaged with
// alpha as weight; an odd 2x side is a named problem; nothing is rewritten when it is already
// right; --check lists every problem and changes nothing; --defringe takes the key color out of
// the edges. Every picture here is made by the test in a temp dir.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { assets, defringe, halve, keyColor, options, report } from '../scripts/assets.mjs';
import { decodeWebp } from '../scripts/webp.mjs';
import { decodePng, encodePng } from './helpers/png.mjs';

const template = fileURLToPath(new URL('../', import.meta.url));
const script = join(template, 'scripts/assets.mjs');
const skip = !existsSync(join(template, 'node_modules/sharp')) && 'sharp is not installed (npm install)';

const RED = [200, 40, 40, 255], GREEN = [0, 255, 0, 255], CLEAR = [0, 0, 0, 0];
/** Pixels that differ everywhere, the same on every run; some transparent, some half. */
const noise = (seed = 1) => (x, y) => {
  const n = (v) => ((x * 73 + y * 151 + v * 47 + seed * 31) * 2654435761 >>> 8) & 255;
  return [n(1), n(2), n(3), [0, 255, 255, n(4)][n(5) & 3]];
};
/** An opaque red square with its left top corner at (from, from) on transparency whose hidden color is green. */
const sprite = (from, to) => (x, y) => (x >= from && x < to && y >= from && y < to ? RED : [0, 255, 0, 0]);

/** A project in a temp dir with `files`: `{ "<path>": [width, height, at] | Buffer }`. */
function project(t, files = {}) {
  const root = mkdtempSync(join(tmpdir(), 'assets-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [path, value] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), Buffer.isBuffer(value) ? value : encodePng(...value));
  }
  return root;
}
const read = (root, file) => decodePng(readFileSync(join(root, file)));
const pixels = (picture) => { const out = []; for (let y = 0; y < picture.height; y++) for (let x = 0; x < picture.width; x++) out.push(picture.at(x, y)); return out; };
const kinds = (result) => result.problems.map((each) => `${each.kind} ${each.file}`);
const states = (result) => Object.fromEntries(result.rows.map((row) => [row.file, row.state]));

test('the 1x picture is exactly half: each pixel is the 2×2 average weighted by alpha', { skip }, async (t) => {
  const at = noise();
  const root = project(t, { 'assets/game/hero-2x.png': [16, 10, at] });
  const result = await assets(root);
  assert.deepEqual(result.problems, []);
  assert.deepEqual(states(result), { 'assets/game/hero-2x.png': 'ok', 'assets/game/hero.png': 'written' });
  const half = read(root, 'assets/game/hero.png');
  assert.deepEqual([half.width, half.height], [8, 5]);
  for (let y = 0; y < 5; y++) for (let x = 0; x < 8; x++) {
    const four = [at(x * 2, y * 2), at(x * 2 + 1, y * 2), at(x * 2, y * 2 + 1), at(x * 2 + 1, y * 2 + 1)];
    const weight = four.reduce((sum, p) => sum + p[3], 0);
    const alpha = Math.round(weight / 4);
    const expected = alpha ? [...[0, 1, 2].map((k) => Math.round(four.reduce((sum, p) => sum + p[k] * p[3], 0) / weight)), alpha] : CLEAR;
    assert.deepEqual(half.at(x, y), expected, `pixel ${x},${y}`);
  }
});

test('an odd 2x side is a problem that names the file and the nearest even size; nothing is written', { skip }, async (t) => {
  const root = project(t, { 'assets/game/fx-2x.png': [129, 128, () => RED], 'assets/game/ok-2x.png': [4, 4, () => RED] });
  const result = await assets(root);
  assert.deepEqual(kinds(result), ['odd assets/game/fx-2x.png']);
  assert.match(result.problems[0].text, /2x is 129x128.*even.*128 or 130 wide.*130x128/);
  assert.ok(!existsSync(join(root, 'assets/game/fx.png')));
  assert.ok(existsSync(join(root, 'assets/game/ok.png')), 'the other pictures are still made');
  assert.match(report(result), /PROBLEM assets\/game\/fx-2x\.png: 2x is 129x128/);
});

test('edges of a transparent sprite keep the color of the sprite: the hidden color under transparency does not leak', { skip }, async (t) => {
  // The square starts at an odd pixel: its border falls in the middle of the 2×2 blocks.
  const root = project(t, { 'assets/game/gem-2x.png': [16, 16, sprite(3, 13)] });
  assert.deepEqual((await assets(root)).problems, []);
  const half = pixels(read(root, 'assets/game/gem.png'));
  const alphas = new Set(half.map((p) => p[3]));
  assert.deepEqual([...alphas].sort((a, b) => a - b), [0, 64, 128, 255], 'corner a quarter, side a half, inside full');
  for (const p of half) assert.deepEqual(p.slice(0, 3), p[3] ? RED.slice(0, 3) : [0, 0, 0], `pixel ${p}`);
});

test('a second run rewrites nothing', { skip }, async (t) => {
  const root = project(t, { 'assets/game/a-2x.png': [8, 8, noise(2)], 'assets/ui/b-2x.png': [6, 4, noise(3)] });
  await assets(root, { webp: true });
  const files = ['assets/game/a.png', 'assets/game/a.webp', 'assets/game/a-2x.webp', 'assets/ui/b.png'];
  const before = files.map((file) => [statSync(join(root, file)).mtimeMs, readFileSync(join(root, file)).toString('base64')]);
  const again = await assets(root);
  assert.deepEqual(again.problems, []);
  assert.deepEqual([...new Set(again.rows.map((row) => row.state))], ['ok']);
  assert.deepEqual(files.map((file) => [statSync(join(root, file)).mtimeMs, readFileSync(join(root, file)).toString('base64')]), before);
});

test('--check lists every problem at once and changes nothing', { skip }, async (t) => {
  const root = project(t, {
    'assets/game/missing-2x.png': [8, 8, noise(1)],
    'assets/game/same-2x.png': [128, 128, noise(2)], 'assets/game/same.png': [128, 128, noise(2)],
    'assets/game/odd-2x.png': [9, 8, noise(3)],
    'assets/ui/alone.png': [4, 4, noise(4)],
    'assets/ui/stale-2x.png': [8, 8, noise(5)], 'assets/ui/stale.png': [4, 4, noise(6)],
    'assets/skin/good-2x.png': [8, 8, noise(7)], 'assets/skin/good.png': [4, 4, (x, y) => [...halve(Buffer.from(Array.from({ length: 64 }, (_, i) => noise(7)(i % 8, i >> 3)).flat()), 8, 8).subarray((y * 4 + x) * 4, (y * 4 + x) * 4 + 4)]],
    'assets/skin/icons-recolored.png': [5, 5, noise(8)], 'assets/skin/scene.png': [7, 5, noise(8)],
    'assets/source/sketch.png': [7, 7, noise(9)],
  });
  const before = readFileSync(join(root, 'assets/game/same.png'));
  const result = await assets(root, { check: true });
  assert.deepEqual(kinds(result), ['missing assets/game/missing.png', 'odd assets/game/odd-2x.png',
    'size assets/game/same.png', 'single assets/ui/alone.png', 'differs assets/ui/stale.png']);
  assert.match(result.problems[2].text, /is 128x128, not half of assets\/game\/same-2x\.png \(128x128\): expected 64x64/);
  assert.ok(!existsSync(join(root, 'assets/game/missing.png')));
  assert.ok(readFileSync(join(root, 'assets/game/same.png')).equals(before));

  // The command: code 1, every file named; after `npm run assets` only what the author must redraw is left.
  const run = (...args) => spawnSync(process.execPath, [script, `--root=${root}`, ...args], { encoding: 'utf8' });
  const check = run('--check');
  assert.equal(check.status, 1, check.stderr);
  for (const each of result.problems) assert.ok(check.stdout.includes(`PROBLEM ${each.file}: `), each.file);
  assert.match(check.stdout, /assets --check FAILED in .*: 5 problems/);
  const write = run();
  assert.equal(write.status, 1, 'the odd picture and the one without 2x are still problems');
  assert.deepEqual(kinds(await assets(root, { check: true })), ['odd assets/game/odd-2x.png', 'single assets/ui/alone.png']);
  assert.deepEqual([read(root, 'assets/game/same.png').width, read(root, 'assets/game/same.png').height], [64, 64]);
  rmSync(join(root, 'assets/game/odd-2x.png')); rmSync(join(root, 'assets/ui/alone.png'));
  const clean = run('--check');
  assert.equal(clean.status, 0, clean.stdout);
  assert.match(clean.stdout, /assets --check ok/);
});

test('a picture without 2x: a problem in assets/game, assets/ui, assets/images; a single file elsewhere — but a 2x one there is a pair like any', { skip }, async (t) => {
  const root = project(t, {
    'assets/game/a.png': [4, 4, noise(1)], 'assets/ui/deep/b.webp': [4, 4, noise(2)], 'assets/images/c.png': [4, 4, noise(3)],
    'assets/skin/scene.png': [7, 5, noise(4)], 'assets/skin/icons/coins.png': [5, 5, noise(5)], 'assets/other/d.png': [3, 3, noise(6)],
    'assets/skin/frame-2x.png': [8, 8, noise(7)], 'assets/skin/frame.png': [8, 8, noise(7)],
    'assets/skin/odd-2x.png': [7, 8, noise(8)], 'assets/other/new-2x.png': [4, 4, noise(9)],
  });
  const result = await assets(root, { check: true });
  assert.deepEqual(kinds(result), ['single assets/game/a.png', 'single assets/images/c.png', 'missing assets/other/new.png',
    'size assets/skin/frame.png', 'odd assets/skin/odd-2x.png', 'single assets/ui/deep/b.webp']);
  assert.ok(!result.rows.some((row) => ['assets/skin/scene.png', 'assets/skin/icons/coins.png', 'assets/other/d.png'].includes(row.file)), 'single files are not looked at');
  const scene = readFileSync(join(root, 'assets/skin/scene.png'));
  await assets(root);
  assert.ok(readFileSync(join(root, 'assets/skin/scene.png')).equals(scene));
  assert.deepEqual([read(root, 'assets/skin/frame.png').width, read(root, 'assets/other/new.png').width], [4, 2]);
});

test('a 2x picture changed after its 1x, or a 1x edited by hand, is found by its pixels', { skip }, async (t) => {
  const root = project(t, { 'assets/game/a-2x.png': [8, 8, noise(1)] });
  await assets(root);
  assert.deepEqual((await assets(root, { check: true })).problems, []);
  writeFileSync(join(root, 'assets/game/a-2x.png'), encodePng(8, 8, (x, y) => (x === 5 && y === 5 ? RED : noise(1)(x, y))));
  assert.deepEqual(kinds(await assets(root, { check: true })), ['differs assets/game/a.png']);
  assert.equal(states(await assets(root))['assets/game/a.png'], 'written');
  assert.deepEqual((await assets(root, { check: true })).problems, []);
  const half = read(root, 'assets/game/a.png');
  writeFileSync(join(root, 'assets/game/a.png'), encodePng(4, 4, (x, y) => (x || y ? half.at(x, y) : GREEN)));
  assert.deepEqual(kinds(await assets(root, { check: true })), ['differs assets/game/a.png']);
});

test('--webp: both WebP files of a PNG, kept equal to it afterwards; a lossy one within the tolerance', { skip }, async (t) => {
  const smooth = (x, y) => [x * 8, y * 8, 120, x > 3 ? 255 : 0];
  const root = project(t, { 'assets/game/a-2x.png': [8, 8, noise(1)], 'assets/ui/b-2x.png': [32, 32, smooth] });
  await assets(root, { webp: true, only: ['assets/game'] });
  await assets(root, { webp: 80, only: ['assets/ui/b-2x.png'] });
  const double = decodeWebp(readFileSync(join(root, 'assets/game/a-2x.webp')));
  const half = decodeWebp(readFileSync(join(root, 'assets/game/a.webp')));
  assert.deepEqual([double.width, double.height, half.width, half.height], [8, 8, 4, 4]);
  const png = read(root, 'assets/game/a.png');
  for (let i = 0; i < 16; i++) assert.deepEqual([...half.px.subarray(i * 4, i * 4 + 4)].map((v, k, p) => (p[3] ? v : 0)), png.at(i % 4, i >> 2));
  assert.throws(() => decodeWebp(readFileSync(join(root, 'assets/ui/b.webp'))), /lossy/);
  assert.deepEqual((await assets(root, { check: true })).problems, []);
  // The PNG changes: its WebP files are stale without --webp too, and are made again.
  writeFileSync(join(root, 'assets/game/a-2x.png'), encodePng(8, 8, noise(2)));
  writeFileSync(join(root, 'assets/ui/b-2x.png'), encodePng(32, 32, (x, y) => [255 - x * 8, 0, y * 8, 255]));
  assert.deepEqual(kinds(await assets(root, { check: true })), ['differs assets/game/a-2x.webp', 'differs assets/game/a.png',
    'differs assets/game/a.webp', 'differs assets/ui/b-2x.webp', 'differs assets/ui/b.png', 'differs assets/ui/b.webp']);
  await assets(root);
  assert.deepEqual((await assets(root, { check: true })).problems, []);
  assert.throws(() => decodeWebp(readFileSync(join(root, 'assets/ui/b.webp'))), /lossy/, 'a lossy file stays lossy');
});

test('defringe: a green ring around a sprite goes, the sprite stays', () => {
  // 32×32: red 8..23; around it one pixel of red half mixed with the key, then two pixels of pure key.
  const ring = (x, y) => Math.max(8 - x, x - 23, 8 - y, y - 23);
  const mixed = [100, 147, 20, 255];
  const at = (x, y) => (ring(x, y) <= 0 ? (x === 16 && y === 16 ? GREEN : RED) : ring(x, y) === 1 ? mixed : ring(x, y) <= 3 ? GREEN : CLEAR);
  const px = Buffer.from(Array.from({ length: 32 * 32 }, (_, i) => at(i % 32, i >> 5)).flat());
  const changed = defringe(px, 32, 32, { key: [0, 255, 0], width: 4 });
  const get = (x, y) => [...px.subarray((y * 32 + x) * 4, (y * 32 + x) * 4 + 4)];
  assert.equal(changed, 22 * 22 - 16 * 16, 'the three rings, nothing of the sprite');
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const [r, g, b, a] = get(x, y);
    if (ring(x, y) >= 2) assert.deepEqual([r, g, b, a], CLEAR, `pure key ${x},${y}`);
    else if (ring(x, y) === 1) {
      assert.deepEqual([r, g, b, a], [200, 40, 40, 128], `half mixed ${x},${y}: the color of the sprite, half transparent`);
    } else if (x === 16 && y === 16) assert.deepEqual([r, g, b, a], GREEN, 'green far from the edge is the picture');
    else assert.deepEqual([r, g, b, a], RED, `sprite ${x},${y}`);
  }
  assert.equal(defringe(px, 32, 32, { key: [0, 255, 0], width: 4 }), 0, 'a second pass changes nothing');
  // No color of the picture near: by the spill alone.
  const lone = Buffer.from([0, 0, 0, 0, 100, 147, 20, 255, 0, 0, 0, 0]);
  assert.equal(defringe(lone, 3, 1), 1);
  assert.deepEqual([...lone.subarray(4, 8)], [123, 123, 25, 208]);
  // Another key: magenta.
  const pink = Buffer.from([255, 0, 255, 255, 0, 0, 0, 0, 10, 200, 10, 255, 0, 0, 0, 0]);
  assert.equal(defringe(pink, 4, 1, { key: keyColor('#ff00ff'), width: 2 }), 1);
  assert.deepEqual([...pink], [0, 0, 0, 0, 0, 0, 0, 0, 10, 200, 10, 255, 0, 0, 0, 0]);
  assert.throws(() => keyColor('ffffff'), /not a key color/);
  assert.throws(() => keyColor('green'), /not a color/);
});

test('--defringe rewrites the 2x picture and makes the 1x from it; without it the picture is as drawn', { skip }, async (t) => {
  const at = (x, y) => { const d = Math.max(4 - x, x - 11, 4 - y, y - 11); return d <= 0 ? RED : d <= 2 ? GREEN : CLEAR; };
  const root = project(t, { 'assets/game/a-2x.png': [16, 16, at], 'assets/game/b-2x.png': [16, 16, at] });
  const greenish = (file) => pixels(read(root, file)).filter(([r, g, b, a]) => a && g > Math.max(r, b)).length;
  await assets(root);
  assert.ok(greenish('assets/game/a.png') > 0);
  const result = await assets(root, { defringe: { key: [0, 255, 0], width: 4 }, only: ['assets/game/a-2x.png'] });
  assert.deepEqual(states(result), { 'assets/game/a-2x.png': 'defringed', 'assets/game/a.png': 'written' });
  assert.deepEqual([greenish('assets/game/a-2x.png'), greenish('assets/game/a.png')], [0, 0]);
  assert.ok(greenish('assets/game/b-2x.png') > 0, 'a file that was not named is not touched');
  assert.deepEqual((await assets(root, { check: true })).problems, []);
  const again = await assets(root, { defringe: { key: [0, 255, 0], width: 4 }, only: ['assets/game/a-2x.png'] });
  assert.deepEqual(states(again), { 'assets/game/a-2x.png': 'ok', 'assets/game/a.png': 'ok' });
});

test('options of the command', () => {
  assert.deepEqual(options([]), { check: false, webp: false, only: [] });
  assert.deepEqual(options(['--defringe=ff00ff', '--defringe-width=2', 'assets/game', '--webp=80']),
    { check: false, webp: 80, only: ['assets/game'], defringe: { key: [255, 0, 255], width: 2 } });
  assert.deepEqual(options(['--defringe']).defringe, { key: [0, 255, 0], width: 4 });
  for (const [argv, message] of [[['--chek'], /unknown option --chek/], [['--webp=0'], /not a quality/],
    [['--defringe-width=3'], /goes with --defringe/], [['--check', '--defringe'], /writes nothing/]]) {
    assert.throws(() => options(argv), message);
  }
});

test('the pictures of the project are pairs made by npm run assets', { skip }, async () => {
  assert.deepEqual((await assets(template, { check: true })).problems.map((each) => `${each.file}: ${each.text}`), [], 'npm run assets');
});

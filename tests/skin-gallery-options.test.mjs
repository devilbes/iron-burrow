// Options of the skin gallery (tests/skin-gallery/options.mjs), without a browser: what a run
// draws, when it is partial, and that a partial run never reads as the acceptance.
import assert from 'node:assert/strict';
import test from 'node:test';
import { SIZES, galleryOptions, galleryPlan, galleryVerdict, shotOptions } from './skin-gallery/options.mjs';

const VIEWS = ['home', 'game', 'shop', 'daily', 'login'];

test('no options: every view in the three sizes, the full run', () => {
  const options = galleryOptions([], {});
  assert.deepEqual(options, { only: undefined, sizes: undefined, jobs: undefined, strict: false });
  assert.deepEqual(galleryPlan(options, VIEWS), { views: VIEWS, sizes: SIZES, partial: false });
  assert.deepEqual(SIZES, [[390, 844], [844, 390], [1280, 720]]);
});

test('--only and --size choose views and sizes; the run is partial', () => {
  const options = galleryOptions(['--only', 'daily,shop', '--size', '844x390'], { SKIN_STRICT: '1' });
  assert.equal(options.strict, true);
  // The gallery's own order, not the order asked.
  assert.deepEqual(galleryPlan(options, VIEWS), { views: ['shop', 'daily'], sizes: [[844, 390]], partial: true });
  assert.equal(galleryPlan(galleryOptions(['--only=shop'], {}), VIEWS).partial, true);
  assert.equal(galleryPlan(galleryOptions(['--size=390x844,1280x720'], {}), VIEWS).partial, true);
  assert.deepEqual(galleryOptions(['--only', 'shop', '--only', 'daily'], {}).only, ['shop', 'daily']);
});

test('VIEWS, SIZES and JOBS are the same options; the command line wins', () => {
  const env = { VIEWS: 'home, shop', SIZES: '390x844', JOBS: '2' };
  assert.deepEqual(galleryOptions([], env), { only: ['home', 'shop'], sizes: [[390, 844]], jobs: 2, strict: false });
  assert.deepEqual(galleryOptions(['--only', 'game', '--jobs', '6'], env), { only: ['game'], sizes: [[390, 844]], jobs: 6, strict: false });
});

test('every view and every size named one by one is still the full run', () => {
  const options = galleryOptions(['--only', VIEWS.join(','), '--size', '1280x720,390x844,844x390'], {});
  assert.equal(galleryPlan(options, VIEWS).partial, false);
  // A size outside the three is drawn, but the run is partial.
  assert.equal(galleryPlan(galleryOptions(['--size', '390x844,844x390,1280x720,1920x1080'], {}), VIEWS).partial, true);
});

test('wrong options fail with what is known', () => {
  assert.throws(() => galleryOptions(['--views', 'shop'], {}), /unknown option --views/);
  assert.throws(() => galleryOptions(['--only'], {}), /--only needs a value/);
  assert.throws(() => galleryOptions(['--only', '--size', '1x1'], {}), /--only needs a value/);
  assert.throws(() => galleryOptions(['--size', 'phone'], {}), /not <width>x<height>/);
  assert.throws(() => galleryOptions(['--jobs', '0'], {}), /not a whole number/);
  assert.throws(() => galleryPlan(galleryOptions(['--only', 'shop,daily-rewards'], {}), VIEWS), /no such view: daily-rewards \(views: home, game, shop, daily, login\)/);
});

test('a partial run never says PASS, and under SKIN_STRICT=1 never exits 0', () => {
  assert.deepEqual(galleryVerdict({ partial: false, strict: true, problems: 0 }), { word: 'PASS', code: 0 });
  assert.deepEqual(galleryVerdict({ partial: false, strict: true, problems: 2 }), { word: 'FAILED', code: 1 });
  for (const strict of [false, true]) {
    for (const problems of [0, 3]) {
      const { word, code } = galleryVerdict({ partial: true, strict, problems });
      assert.doesNotMatch(word, /PASS/);
      assert.match(word, /partial run/i);
      assert.equal(code, problems ? 1 : strict ? 2 : 0);
    }
  }
});

test('single screen shot: one route in one size, home in 390x844 at level 1 by default', () => {
  assert.deepEqual(shotOptions([]), { route: 'home', size: [390, 844], level: 1, watch: false });
  assert.deepEqual(shotOptions(['--route', 'game', '--size=844x390', '--level', '3', '--watch']),
    { route: 'game', size: [844, 390], level: 3, watch: true });
  // Every size at once is the gallery's job, not a shot's.
  assert.throws(() => shotOptions(['--size', '844x390,390x844']), /one size per shot/);
  assert.throws(() => shotOptions(['--size', '844']), /not <width>x<height>/);
  assert.throws(() => shotOptions(['--route']), /needs a value/);
  assert.throws(() => shotOptions(['--route', '../x']), /not a route name/);
  assert.throws(() => shotOptions(['--level', '0']), /whole number from 1/);
  assert.throws(() => shotOptions(['--only', 'shop']), /unknown option/);
});

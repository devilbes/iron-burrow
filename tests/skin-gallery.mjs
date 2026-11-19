// Skin gallery (tests/skin-gallery/gallery.js) in a browser, after `npm run build`: every view in
// 390x844, 844x390 and 1280x720 (several pages draw at once), screenshots of the game skin, and the "stock still visible"
// report — each view is drawn twice, under stock ManyPlay and under the game skin, and every
// visible element whose color (text, background, border, shadow, fill) is still the stock one is
// listed, as are views where nothing differs at all (colors, fonts, border images).
//   PLAYWRIGHT=/path/to/node_modules/playwright [SHOTS=tmp/shots] node tests/skin-gallery.mjs
// A partial run, for looking at the views just changed (tests/skin-gallery/options.mjs):
//   … node tests/skin-gallery.mjs --only shop,daily --size 844x390   (or VIEWS=shop,daily SIZES=844x390)
// It says so in its first and last lines, never prints PASS, writes report-partial.json and with
// SKIN_STRICT=1 never exits 0: the acceptance is the run of every view in every size.
// `--jobs <n>` (JOBS): pages drawing at once, by default up to 4 (not more than the processors).
// A report by default (the neutral template is stock by design); SKIN_STRICT=1 fails on any stock
// color or picture left, any view identical to stock or any kit component the theme does not reach.
// Icons shown must be listed in tests/skin-gallery/visible-icons.json (the readiness check and
// scripts/skin-icons.mjs --sheet read it): a new one fails the run in every mode. So do the checks
// of gallery.js in every view and size: a 9-slice element smaller than its slices, a window title
// off the window's middle or under the close button, a reward tile without the declared picture of
// its item (src/skin/art.ts ITEMS) or with the name over the picture, a profile line with an id,
// a locale code or a dash, or label/value columns that do not line up; on the home views a HUD tile
// without a picture or an accessible name, on the wrong side for its kind, over another tile or
// the top bar, cut off in a column that does not scroll, an offer without its countdown, a top
// bar counter cut or over another, or a «+» on a counter that opens nothing (or none where it opens
// something); in a view with a window or an overlay (`game-window`, `game-overlay` and every kit
// window) a dim that is not the viewport edge to edge or a top bar not under it, and a game window
// (`ctx.window.open`) that is not the kit dialog (tests/skin-gallery/modal-layers.js).
// With the `buttons` view the raster buttons tinted by kind are drawn too, with test pictures made
// in the run (tests/skin-gallery/tinted-buttons.mjs; screenshots `buttons-tinted-*.png`): one
// picture for every kind, colors of the variables, edges not stretched, nothing outside the
// outline — a failure in every mode. TINT_ENGINES=chromium,firefox,webkit: in those browsers.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { availableParallelism } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { galleryOptions, galleryPlan, galleryVerdict } from './skin-gallery/options.mjs';
import { distIsStale, openStage } from './skin-gallery/stage.mjs';
import { TEST_ART, tintedButtons } from './skin-gallery/tinted-buttons.mjs';

if (!process.env.PLAYWRIGHT) throw new Error('PLAYWRIGHT (path to the playwright package) is required');
const playwright = await import(pathToFileURL(resolve(process.env.PLAYWRIGHT, 'index.mjs')).href);
const { chromium } = playwright;
const started = performance.now();
const options = galleryOptions(process.argv.slice(2), process.env);
const { strict } = options;
/** The stock ManyPlay icon atlases: in the kit (skin-bundles/manyplay, assets/manyplay) or the skin-manyplay package. */
const STOCK_ART = /\/@manygamescorp\/(skin-manyplay\/|ui-kit\/dist\/(skin-bundles\/manyplay|assets\/manyplay)\/)/;
const shots = resolve(process.env.SHOTS ?? 'tmp/shots', 'gallery');
await mkdir(shots, { recursive: true });
// The gallery shows dist/: a source changed after the build is not in it.
const stage = await openStage({ pictures: TEST_ART });
if (distIsStale()) console.log('WARNING: src/ or assets/ changed after the last build, dist/ is older: run npm run build first\n');
const { origin } = stage;
/** Views the kit draws in its own fixed look (ManyPlay ID): checked, but no skin is expected there. */
const FIXED = new Set(['login']);
const browser = await chromium.launch();
const problems = [];
const errors = [];
const notes = [];
const report = [];
let plan;
let pages = 1;
try {
  const requests = new Map();
  // One page: its own context, only the local server (the gallery works offline).
  const open = async () => {
    const context = await browser.newContext({ locale: 'en-US', reducedMotion: 'reduce' });
    const tab = await context.newPage();
    tab.on('pageerror', (e) => errors.push(e.message));
    // Requests of the page, for `draw` to wait out: a view is not drawn while a picture still loads.
    const net = { flying: new Set(), count: 0 };
    tab.on('request', (request) => { net.flying.add(request); net.count++; });
    for (const done of ['requestfinished', 'requestfailed']) tab.on(done, (request) => net.flying.delete(request));
    requests.set(tab, net);
    await context.route((url) => !url.href.startsWith(origin), (route) => { errors.push(`network ${route.request().url()}`); return route.abort(); });
    return tab;
  };
  const draw = async (tab, skin, view, [w, h]) => {
    await tab.setViewportSize({ width: w, height: h });
    await tab.goto(`${origin}/?skin=${skin}&view=${view}`);
    await tab.waitForFunction(() => window.gallery?.ready || window.gallery?.error, null, { timeout: 20000 });
    const failure = await tab.evaluate(() => window.gallery.error);
    if (failure) throw new Error(`${view} (${skin}): ${failure}`);
    // Drawn and still, instead of a fixed pause: nothing loading, then gallery.js `settled` (fonts,
    // transitions, the same over frames) with nothing requested meanwhile.
    const net = requests.get(tab);
    for (let round = 1; ; round++) {
      while (net.flying.size) await new Promise((next) => setTimeout(next, 10));
      const seen = net.count;
      if (await tab.evaluate(() => window.gallery.settled()) && net.count === seen && !net.flying.size) break;
      if (round === 3) { notes.push(`${view} ${w}x${h} (${skin}): still changing after ${round} tries, taken as it is`); break; }
    }
    return tab.evaluate(() => window.gallery.fingerprint());
  };
  const first = await open();
  await first.goto(`${origin}/?skin=stock&view=home`);
  await first.waitForFunction(() => window.gallery);
  plan = galleryPlan(options, await first.evaluate(() => window.gallery.views));
  if (plan.partial) {
    console.log(`PARTIAL RUN, not the acceptance: views ${plan.views.join(', ')}; sizes ${plan.sizes.map((size) => size.join('x')).join(', ')}\n`);
  }
  /** One view in one size: under stock, under the game skin, the screenshot, the checks, the report line. */
  const one = async (tab, view, size) => {
    const found = [];
    const stock = await draw(tab, 'stock', view, size);
    const game = await draw(tab, 'game', view, size);
    await tab.screenshot({ path: `${shots}/${view}-${size[0]}x${size[1]}.png` });
    // What the player must be able to read (gallery.js `checks`): fails in every mode.
    for (const problem of await tab.evaluate((name) => window.gallery.checks(name), view)) {
      found.push(`${view} ${size.join('x')}: ${problem}`);
    }
    // Paired by DOM order; elements only the stock draws (labels the shell hides) do not count.
    const before = new Map(stock.map((el) => [el.key, el]));
    const left = []; let same = true;
    for (const el of game) {
      const old = before.get(el.key);
      if (!old || JSON.stringify([old.look, old.font, old.borderImage, old.art]) !== JSON.stringify([el.look, el.font, el.borderImage, el.art])) same = false;
      if (!old) continue;
      const props = Object.keys(el.look).filter((prop) => old.look[prop] === el.look[prop]);
      if (props.length) left.push({ zone: el.zone, element: el.label, props: Object.fromEntries(props.map((p) => [p, el.look[p]])) });
    }
    const unthemed = game.filter((el) => 'theme' in el && !el.theme).map((el) => el.label);
    // Stock pictures left (the ManyPlay icon sheet): by icon key where the kit marks it.
    const stockArt = [...new Set(game.filter((el) => STOCK_ART.test(el.art)).map((el) => el.icon ?? el.art))];
    const icons = [...new Set(game.filter((el) => el.art && el.icon).map((el) => el.icon))];
    if (FIXED.has(view)) return { found };
    // Pictures of the game's items (src/skin/art.ts ITEMS) are not kit icons of the skin.
    const own = new Set(await tab.evaluate(() => window.gallery.items));
    return { found, line: { view, size: size.join('x'), elements: game.length, stockColored: left.length, identical: same, unthemed,
      icons: icons.filter((key) => !own.has(key)), stockArt, left } };
  };
  // Every size and view is a job; the pages take them in turn, the results keep the jobs' order.
  const jobs = plan.sizes.flatMap((size) => plan.views.map((view) => [view, size]));
  const results = new Array(jobs.length);
  pages = Math.max(1, Math.min(options.jobs ?? Math.min(4, availableParallelism()), jobs.length));
  let next = 0;
  await Promise.all(Array.from({ length: pages }, async (_, i) => {
    const tab = i ? await open() : first;
    while (next < jobs.length) { const at = next++; results[at] = await one(tab, ...jobs[at]); }
  }));
  for (const result of results) { problems.push(...result.found); if (result.line) report.push(result.line); }
  if (errors.length) problems.push(`page errors: ${[...new Set(errors)].join(' | ')}`);
  // Raster buttons tinted by kind, with test pictures (TINT_ENGINES: also firefox, webkit).
  if (plan.views.includes('buttons')) {
    for (const name of (process.env.TINT_ENGINES ?? 'chromium').split(',')) {
      problems.push(...await tintedButtons({ engine: playwright[name], name, origin, shots, sizes: plan.sizes }));
    }
  }
} finally {
  await browser.close();
  stage.close();
}
const reportFile = resolve(shots, plan.partial ? 'report-partial.json' : 'report.json');
await writeFile(reportFile, JSON.stringify(report, null, 2));
console.log('view                size      elements  stock-colored  stock-art  identical  no-theme');
for (const r of report) {
  console.log(`${r.view.padEnd(20)}${r.size.padEnd(10)}${String(r.elements).padStart(8)}${String(r.stockColored).padStart(15)}`
    + `${String(r.stockArt.length).padStart(11)}${(r.identical ? 'yes' : 'no').padStart(11)}${String(r.unthemed.length).padStart(10)}`);
}
const identical = [...new Set(report.filter((r) => r.identical).map((r) => r.view))];
const art = [...new Set(report.flatMap((r) => r.stockArt))].sort();
const icons = [...new Set(report.flatMap((r) => r.icons))].sort();
console.log(`\nicons shown: ${icons.length} (${icons.join(' ')})`);
console.log(`stock pictures (scripts/skin-icons.mjs, src/skin/art.ts): ${art.join(' ') || 'none'}`);
// The list the readiness check and scripts/skin-icons.mjs --sheet use.
const listed = JSON.parse(await readFile(resolve('tests/skin-gallery/visible-icons.json'), 'utf8'));
const unlisted = icons.filter((key) => !listed.includes(key));
if (unlisted.length) problems.push(`icons missing in tests/skin-gallery/visible-icons.json: ${unlisted.join(' ')}`);
console.log(`\nstock still visible: ${identical.length ? identical.join(', ') : 'none'} identical to stock;`
  + ` ${report.reduce((n, r) => n + r.stockColored, 0)} stock-colored elements in ${plan.partial ? 'the sizes drawn' : 'all sizes'} (details: ${reportFile})`);
if (strict) {
  if (identical.length) problems.push(`identical to stock: ${identical.join(', ')}`);
  const colored = report.filter((r) => r.stockColored).map((r) => `${r.view} ${r.size}: ${r.stockColored}`);
  if (colored.length) problems.push(`stock colors left: ${colored.join(', ')}`);
  const unthemed = report.filter((r) => r.unthemed.length).map((r) => `${r.view}: ${r.unthemed.join(' ')}`);
  if (unthemed.length) problems.push(`theme.css not in: ${unthemed.join('; ')}`);
  if (art.length) problems.push(`stock pictures left: ${art.length}`);
}
for (const note of notes) console.log('note', note);
console.log(`${plan.views.length} views x ${plan.sizes.length} sizes in ${((performance.now() - started) / 1000).toFixed(1)} s, ${pages} pages at once`);
for (const problem of problems) console.log('FAIL', problem);
const verdict = galleryVerdict({ partial: plan.partial, strict, problems: problems.length });
console.log(verdict.word, `screenshots: ${shots}`);
process.exitCode = verdict.code;

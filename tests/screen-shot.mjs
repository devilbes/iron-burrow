// One screen of the game in one size, as a PNG — the look at a screen while editing it:
//   PLAYWRIGHT=/path/to/node_modules/playwright [SHOTS=tmp/shots] node tests/screen-shot.mjs --route game --size 844x390
//   npm run shot -- --route game --size 844x390 [--level 3] [--watch]
// The screen is drawn in the page of the skin gallery (tests/skin-gallery/gallery.js): the built
// shell with the game skin, top bar and HUD, test data, no SDK start and no network; the level
// services of `ctx.game` answer from configs/remote/levels.<set>/ (tests/skin-gallery/test-ports.js).
// dist/ older than the sources is bundled first (scripts/build.mjs --no-typecheck). `--watch` keeps
// the browser open and writes the same file again after every change of src/, assets/ or
// index.html: a second per shot instead of a new browser each time; stop it with Ctrl+C.
// The PNG is <SHOTS>/screens/<route>-<width>x<height>.png. A look, not a check: the checks of all
// views in all sizes are the gallery (tests/skin-gallery.mjs), the real start is browser-startup.mjs.
import { spawnSync } from 'node:child_process';
import { existsSync, watch } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { shotOptions } from './skin-gallery/options.mjs';
import { distIsStale, openStage } from './skin-gallery/stage.mjs';

let options;
try { options = shotOptions(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exit(2); }
if (!process.env.PLAYWRIGHT) { console.error('PLAYWRIGHT (path to the playwright package) is required'); process.exit(2); }
const { chromium } = await import(pathToFileURL(resolve(process.env.PLAYWRIGHT, 'index.mjs')).href);
const { route, size: [width, height], level } = options;
const dir = resolve(process.env.SHOTS ?? 'tmp/shots', 'screens');
const file = resolve(dir, `${route}-${width}x${height}.png`);
await mkdir(dir, { recursive: true });

/** dist/ from the sources as they are now, without the type check (`npm run check` and `npm run check:fast` do that one). */
function bundleDist() {
  const result = spawnSync(process.execPath, ['scripts/build.mjs', '--no-typecheck'], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`bundle failed:\n${result.stdout}${result.stderr}`.trimEnd());
}

if (distIsStale()) bundleDist();
const stage = await openStage();
const browser = await chromium.launch();
const context = await browser.newContext({ locale: 'en-US', reducedMotion: 'reduce', viewport: { width, height } });
const tab = await context.newPage();
const errors = [];
const flying = new Set();
tab.on('pageerror', (error) => errors.push(error.message));
tab.on('request', (request) => flying.add(request));
for (const done of ['requestfinished', 'requestfailed']) tab.on(done, (request) => flying.delete(request));
// Only the local server: the page works offline.
await context.route((url) => !url.href.startsWith(stage.origin), (request) => {
  errors.push(`network ${request.request().url()}`);
  return request.abort();
});

/** Draws the route and writes the PNG; `false` when the page reported an error. */
async function shoot() {
  const from = performance.now();
  errors.length = 0;
  await tab.goto(`${stage.origin}/?skin=game&route=${route}&level=${level}`);
  await tab.waitForFunction(() => window.gallery?.ready || window.gallery?.error, null, { timeout: 20000 });
  const failure = await tab.evaluate(() => window.gallery.error);
  if (failure) errors.push(failure);
  // Drawn and still, instead of a fixed pause: nothing loading, then gallery.js `settled`.
  else {
    while (flying.size) await new Promise((next) => setTimeout(next, 10));
    if (!await tab.evaluate(() => window.gallery.settled())) console.log('note: the screen still changes (an endless animation?), taken as it is');
  }
  await tab.screenshot({ path: file });
  for (const error of new Set(errors)) console.log('FAIL', error);
  console.log(`${errors.length ? 'FAILED' : 'shot'} ${file} (${route}, ${width}x${height}, level ${level}; ${((performance.now() - from) / 1000).toFixed(1)} s)`);
  return errors.length === 0;
}

let ok = false;
try {
  ok = await shoot();
  if (options.watch) {
    console.log('watching src/, assets/, index.html — Ctrl+C to stop');
    // One redraw per burst of changes; a change during a redraw gives one more.
    let pending = null, busy = false, timer;
    const redraw = async () => {
      if (busy) return;
      busy = true;
      while (pending) {
        const code = pending === 'code';
        pending = null;
        try {
          // A .ts of src/ is bundled into the page itself; anything else (CSS, pictures, the page) is dist/.
          if (!code) bundleDist();
          await stage.bundle();
          await shoot();
        } catch (error) { console.log('FAIL', error.message); }
      }
      busy = false;
    };
    const changed = (code) => {
      pending = code && pending !== 'files' ? 'code' : 'files';
      clearTimeout(timer);
      timer = setTimeout(redraw, 80);
    };
    for (const path of ['src', 'assets', 'index.html']) {
      if (existsSync(path)) watch(path, { recursive: path !== 'index.html' }, (_event, name) => changed(path === 'src' && /\.ts$/.test(name ?? '')));
    }
    await new Promise((stop) => process.once('SIGINT', stop));
  }
} finally {
  await browser.close();
  stage.close();
}
process.exit(ok ? 0 : 1);

// The local page the skin gallery (tests/skin-gallery.mjs) and the single screen shot
// (tests/screen-shot.mjs) draw in: gallery.js bundled with the game's modules of src/ (imported as
// /app/<path>.js, like the build bundles them) and served from /app/ next to dist/app/, so URLs
// from import.meta.url (theme.css, assets) resolve the same; everything else is dist/ as built.
// No network: the SDK comes from dist/vendor/ through the import map of dist/index.html.
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { build } from 'esbuild';

const TYPES = { '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' };

const newest = (dir) => readdirSync(dir, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile())
  .reduce((latest, entry) => Math.max(latest, statSync(join(entry.parentPath, entry.name)).mtimeMs), 0);

/** The page shows dist/: `true` when there is none or a source (src/, assets/, index.html) changed after the build. */
export function distIsStale() {
  const built = resolve('dist/index.html');
  if (!existsSync(built)) return true;
  const sources = Math.max(newest('src'), existsSync('assets') ? newest('assets') : 0, statSync('index.html').mtimeMs);
  return sources > statSync(built).mtimeMs;
}

/**
 * Starts the local server of the page: `{ origin, bundle(), close() }`. `bundle()` bundles gallery.js
 * from src/ again (after an edit); `pictures` — PNG buffers served as /test-art/<name>.png.
 */
export async function openStage({ pictures = {} } = {}) {
  const dist = resolve('dist');
  const gallery = resolve('tests/skin-gallery');
  const records = resolve('configs/remote');
  if (!existsSync(resolve(dist, 'index.html'))) throw new Error('dist/index.html is missing: run npm run build');
  const out = await mkdtemp(join(tmpdir(), 'skin-gallery-'));
  process.once('exit', () => { void rm(out, { recursive: true, force: true }); });
  const fromSrc = { name: 'game-modules', setup(b) {
    b.onResolve({ filter: /^\/app\// }, (args) => ({ path: resolve('src', args.path.slice(5).replace(/\.js$/, '.ts')) }));
  } };
  const bundle = () => build({ entryPoints: [resolve(gallery, 'gallery.js')], outfile: join(out, 'gallery.js'), bundle: true,
    format: 'esm', platform: 'browser', target: 'es2022', external: ['@manygamescorp/*'], plugins: [fromSrc],
    tsconfig: 'tsconfig.sdk.json', logLevel: 'warning' });
  await bundle();
  // The import map is read on every request of the page: a build in between may have replaced dist/.
  const page = async () => {
    const importMap = /<script type="importmap">[\s\S]*?<\/script>/.exec(await readFile(resolve(dist, 'index.html'), 'utf8'))?.[0];
    if (!importMap) throw new Error('dist/index.html has no import map: run npm run build');
    return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Skin gallery</title>
<style>html,body{height:100%;margin:0}#app{position:fixed;inset:0}</style>${importMap}
<script type="module" src="/app/gallery.js"></script></head><body><div id="app"></div></body></html>`;
  };
  await page();
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (path === '/') {
      try { res.writeHead(200, { 'content-type': 'text/html' }).end(await page()); }
      catch (error) { res.writeHead(500, { 'content-type': 'text/plain' }).end(error.message); }
      return;
    }
    // Test pictures (tinted-buttons.mjs): made in memory, never files.
    const art = /^\/test-art\/([a-z-]+)\.png$/.exec(path)?.[1];
    if (art && pictures[art]) { res.writeHead(200, { 'content-type': 'image/png' }).end(pictures[art]); return; }
    // Records of configs/remote/ (the level records of test-ports.js), read only.
    const [root, rest] = path === '/app/gallery.js' ? [out, 'gallery.js']
      : path.startsWith('/records/') ? [records, path.slice('/records/'.length)] : [dist, path.slice(1)];
    const file = resolve(root, rest);
    if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    try { const body = await readFile(file); res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(body); }
    catch { res.writeHead(404).end(); }
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  return { origin: `http://127.0.0.1:${server.address().port}`, bundle, close: () => server.close() };
}

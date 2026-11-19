// End-to-end smoke of the built game against the API of platform.json (dist/platform.json):
// boot, home (no bottom bar: the template's menu is empty), Play of home → the game placeholder →
// Close asks in a game window (`ctx.window.open`: the kit dialog of the skin, the game's body in
// it) → Stay keeps the level, Leave goes home, then every service window opened
// through its entry (HUD, top bar) and closed again, the «+» of the coins opens the shop; while a
// window is open its dim covers the viewport edge to edge, top bar included, in 1280x720, 844x390
// and 390x844 (tests/skin-gallery/modal-layers.js); no console errors on the way. Screenshots
// at 1440x900, 844x390 and 390x844. A new guest is created on the stand on every run. Needs
// Network budget: API requests by method and path during boot + 10 s idle stay within BUDGET
// (a regression to polling fails), and the whole run reads progress once and never touches the
// cloud save. Needs Playwright with Chromium outside the project:
//   PLAYWRIGHT=/path/to/node_modules/playwright [SHOTS=tmp/shots] node tests/browser-startup.mjs
// Exit code 1 when a step fails.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

if (!process.env.PLAYWRIGHT) throw new Error('PLAYWRIGHT (path to the playwright package) is required');
const { chromium } = await import(pathToFileURL(resolve(process.env.PLAYWRIGHT, 'index.mjs')).href);
const root = resolve('dist');
const shots = resolve(process.env.SHOTS ?? 'tmp/shots');
await mkdir(shots, { recursive: true });
const types = { '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.html': 'text/html' };
const server = createServer(async (req, res) => {
  let path = new URL(req.url, 'http://localhost').pathname;
  if (path.endsWith('/')) path += 'index.html';
  const file = resolve(root, `.${decodeURIComponent(path)}`);
  if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
  try { res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' }); res.end(await readFile(file)); }
  catch { res.writeHead(404).end(); }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'en-US' });
const errors = []; const failed = [];
// The stand refuses the realtime WebSocket handshake from a local origin (403); the realtime
// module then uses its event stream. Served from the app's own origin the socket opens.
const LOCAL_SOCKET = /WebSocket connection to '[^']*\/v1\/realtime\/ws' failed: .*403/;
page.on('console', (m) => { if (m.type() === 'error' && !LOCAL_SOCKET.test(m.text())) errors.push(m.text()); });
const requests = [];
page.on('request', (r) => {
  const { pathname } = new URL(r.url());
  if (pathname.startsWith('/v1/')) requests.push(`${r.method()} ${pathname}`);
});
// Most requests a path may get during boot + 10 s idle; any other API path: once.
//   configs/fetch: the SDK's boot reads — default records, module overrides, localization;
//   inventory/me: the start read (realtime announces later changes, nothing re-reads them);
//   realtime/frames: at most one heartbeat of the realtime stream in 10 s;
//   progress/me/init: one read of every track the game uses; game-states/me: never (no save).
//   auth/oauth/config: the ManyPlay ID window reads the sign-in providers each time it opens.
const BUDGET = { 'POST /v1/configs/fetch': 3, 'POST /v1/progress/me/init': 1,
  'GET /v1/game-states/me': 0, 'PUT /v1/game-states/me': 0, 'POST /v1/realtime/frames': 1,
  'GET /v1/auth/oauth/config': 2 };
const overBudget = (list, budget) => Object.entries(Object.groupBy(list, (key) => key))
  .filter(([key, hits]) => hits.length > (budget[key] ?? 1)).map(([key, hits]) => `${key} ×${hits.length}`);
page.on('pageerror', (e) => errors.push(e.message));
const sizes = [[1440, 900], [844, 390], [390, 844]];
const shoot = async (name, all = false) => {
  for (const [w, h] of all ? sizes : [sizes[0]]) {
    await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(600);
    await page.screenshot({ path: `${shots}/${name}-${w}x${h}.png` });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
};
const dialogs = () => page.getByRole('dialog').count();
// The dim of an open window covers the viewport (±1 px), top bar included, in every size.
const DIM_SIZES = [[1280, 720], [844, 390], [390, 844]];
const checkDim = async (name) => {
  const found = [];
  for (const [w, h] of DIM_SIZES) {
    await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(400);
    const measured = await page.evaluate(() => globalThis.modalLayers.measure());
    if (!measured.open) found.push(`${w}x${h}: no window open`);
    found.push(...(await page.evaluate(() => globalThis.modalLayers.problems())).map((item) => `${w}x${h}: ${item}`));
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  if (found.length) throw new Error(`${name}: ${found.join('; ')}`);
};
const closeAll = async () => {
  for (let i = 0; i < 4 && await dialogs() > 0; i++) {
    const close = page.getByRole('dialog').last().getByRole('button', { name: /^(close|закрыть)$/i }).first();
    if (await close.count()) await close.click({ timeout: 3000 }).catch(() => page.keyboard.press('Escape'));
    else await page.keyboard.press('Escape');
    await page.waitForTimeout(800);
  }
};
// The player card: avatar, name and the game's lines (PROFILE_STATS), labels and values in two
// columns, no ids, codes or dashes.
const checkProfile = async () => {
  const card = page.locator('[data-testid="player-card"]');
  await card.waitFor({ timeout: 10000 });
  const lines = await card.evaluate((el) => [...el.querySelectorAll('[data-part=system-profile] dd')].map((dd) => ({
    text: dd.textContent.trim(), right: Math.round(dd.getBoundingClientRect().right),
    left: Math.round(dd.previousElementSibling.getBoundingClientRect().left) })));
  const bad = lines.filter((line) => !line.text || line.text === '—' || /^[0-9a-f]{16,}$/i.test(line.text)
    || /^[a-z]{2}(?:-[A-Za-z]{2,4})?$/.test(line.text));
  if (bad.length) throw new Error(`profile lines: ${bad.map((line) => line.text).join(', ')}`);
  if (new Set(lines.map((line) => line.right)).size > 1 || new Set(lines.map((line) => line.left)).size > 1) {
    throw new Error('profile lines are not in columns');
  }
  if (await page.getByRole('dialog').last().getByRole('button', { name: /refresh/i }).count()) throw new Error('refresh button shown');
};
const step = async (name, run) => {
  try { await run(); console.log('ok  ', name); } catch (error) { failed.push(name); console.log('FAIL', name, String(error.message).split('\n')[0]); }
};
// Entries of the service windows by their accessible names (English locale): HUD tiles (shop,
// daily rewards, leaderboard), top bar buttons (profile, settings). The inventory has no entry on screen.
const TILES = { shop: 'Shop', daily: 'Daily rewards', leaderboard: 'Leaderboard', profile: 'Profile',
  settings: 'Settings' };
// Boot screens on a slow network, in every size: the first paint is the neutral loading line of
// index.html (no skin color, no stock blue), the SDK loads under it, then the game's loading screen
// (the kit preloader already in the game skin: its first drawn frame carries the shell's scene
// layer and the page color of theme.css) — painted before the line is removed — and home.
// Screenshots: boot/<stage>-<w>x<h>.png.
const THEME = readFileSync(resolve('src/skin/theme.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const themeWindow = /--mp-window-background:\s*(#[0-9a-f]{6})/i.exec(THEME)?.[1];
const rgb = (hex) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;
const bootScreens = async ([w, h]) => {
  const context = await browser.newContext({ viewport: { width: w, height: h }, locale: 'en-US' });
  try {
    const tab = await context.newPage();
    const cdp = await context.newCDPSession(tab);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150,
      downloadThroughput: 4e6 / 8, uploadThroughput: 1e6 / 8 });
    await tab.addInitScript(() => {
      const find = () => document.getElementById('preloader')?.shadowRoot?.querySelector('.mp-preloader');
      const watch = () => {
        const el = find();
        if (el && !el.hidden) {
          const style = getComputedStyle(el);
          const line = document.getElementById('boot-loader');
          globalThis.firstLoader = { color: style.backgroundColor, image: style.backgroundImage,
            lineOver: Boolean(line && !line.hidden) };
          return;
        }
        requestAnimationFrame(watch);
      };
      requestAnimationFrame(watch);
    });
    const shot = (stage) => tab.screenshot({ path: `${shots}/boot/${stage}-${w}x${h}.png` });
    await tab.goto(url, { waitUntil: 'commit' });
    await tab.locator('#boot-loader').waitFor({ timeout: 10000 });
    const first = await tab.evaluate(() => ({ page: getComputedStyle(document.body).backgroundColor,
      title: document.title, line: getComputedStyle(document.getElementById('boot-loader')).display }));
    await shot('first-paint');
    if (first.page !== 'rgb(14, 14, 16)' || first.line === 'none') throw new Error(`first paint: ${JSON.stringify(first)}`);
    if (!first.title || /ManyPlay/.test(first.title)) throw new Error(`title ${first.title}`);
    await tab.locator('#sdk-status').waitFor({ state: 'attached', timeout: 30000 });
    if (await tab.locator('#boot-loader').isVisible()) await shot('sdk-loading');
    await tab.waitForFunction(() => globalThis.firstLoader && !document.getElementById('boot-loader'), null, { timeout: 60000 });
    await shot('game-loader');
    const loader = await tab.evaluate(() => globalThis.firstLoader);
    if (!loader.lineOver) throw new Error('the neutral line was gone before the game loader painted');
    if (!loader.image.includes('gradient')) throw new Error(`game loader drawn without the game skin: ${loader.image}`);
    if (themeWindow && loader.color !== rgb(themeWindow)) throw new Error(`game loader color ${loader.color}, theme ${themeWindow}`);
    await tab.waitForFunction(() => document.body.dataset.sdkState, null, { timeout: 90000 });
    await tab.locator('[data-testid="home-play"]').waitFor({ timeout: 30000 });
    for (let i = 0; i < 4 && await tab.getByRole('dialog').count(); i++) { await tab.keyboard.press('Escape'); await tab.waitForTimeout(600); }
    await tab.waitForTimeout(800);
    await shot('home');
  } finally { await context.close(); }
};
try {
  await mkdir(`${shots}/boot`, { recursive: true });
  for (const size of sizes) await step(`boot screens ${size.join('x')}: neutral first paint, game loader in the skin, home`, () => bootScreens(size));
  await page.goto(url);
  await page.addScriptTag({ path: resolve('tests/skin-gallery/modal-layers.js') });
  await page.waitForFunction(() => document.body.dataset.sdkState, null, { timeout: 30000 });
  await step('boot ready', async () => {
    const state = await page.evaluate(() => document.body.dataset.sdkState);
    if (state !== 'ready') throw new Error(`sdk state ${state}`);
  });
  await step('network budget of boot + 10 s idle', async () => {
    await page.waitForTimeout(10_000);
    const over = overBudget(requests, BUDGET);
    if (over.length) throw new Error(`over budget: ${over.join(', ')}`);
  });
  await closeAll();
  await step('home screen', async () => {
    await page.locator('[data-testid="home-play"]').waitFor();
    await shoot('home', true);
  });
  await step('no bottom bar on home, its row takes no room', async () => {
    const rows = await page.evaluate(() => [...document.querySelectorAll('.mpg-shell [data-slot^="bottomBar"]')]
      .map((el) => el.getBoundingClientRect().height));
    if (rows.some((height) => height > 0)) throw new Error(`bottom bar rows: ${rows.join(', ')}px`);
  });
  await step('game placeholder; Close asks in a game window (kit dialog, full-screen dim): Stay, then Leave home', async () => {
    await page.locator('[data-testid="home-play"]').click();
    const text = await page.locator('[data-testid="game-placeholder"]').innerText({ timeout: 10000 });
    if (text.trim() !== 'Game template') throw new Error(`placeholder text: ${text}`);
    await shoot('game', true);
    await page.locator('[data-testid="game-close"]').click();
    await page.getByRole('dialog', { name: 'Leave the level?' }).waitFor({ timeout: 10000 });
    await page.waitForTimeout(600);
    const kit = await page.evaluate(() => globalThis.modalLayers.gameWindow('Leave the level?', { actions: 2 }));
    if (kit.length) throw new Error(kit.join('; '));
    // The game's body: its own view (shadow root) in the window's slot.
    const body = await page.locator('[data-part="game-window-body"]').evaluate((el) =>
      [...el.children].map((child) => child.shadowRoot?.textContent ?? child.textContent).join(''));
    if (body.trim() !== 'The progress of this level will be lost.') throw new Error(`window body: ${body}`);
    await checkDim('leave window');
    await page.setViewportSize({ width: 1280, height: 720 }); await page.waitForTimeout(600);
    await page.screenshot({ path: `${shots}/game-window-1280x720.png` });
    await page.setViewportSize({ width: 1440, height: 900 });
    await shoot('game-window', true);
    await page.getByRole('button', { name: 'Stay', exact: true }).click();
    await page.waitForTimeout(800);
    if (await dialogs() > 0) throw new Error('Stay did not close the window');
    if (!await page.locator('[data-testid="game-placeholder"]').count()) throw new Error('Stay left the level');
    await page.locator('[data-testid="game-close"]').click();
    await page.getByRole('button', { name: 'Leave', exact: true }).click({ timeout: 10000 });
    await page.locator('[data-testid="home-play"]').waitFor({ timeout: 10000 });
    await page.waitForTimeout(800);
    if (await dialogs() > 0) throw new Error('the window stayed after Leave');
  });
  for (const [name, label] of Object.entries(TILES)) {
    await step(`window ${name}`, async () => {
      await closeAll();
      await page.getByRole('button', { name: label, exact: true }).first().click({ timeout: 10000 });
      await page.getByRole('dialog').first().waitFor({ timeout: 10000 });
      await page.waitForTimeout(1500);
      await checkDim(`window ${name}`);
      await shoot(name, name === 'shop');
      if (name === 'profile') await checkProfile();
      await closeAll();
      if (await dialogs() > 0) throw new Error('window did not close');
    });
  }
  await step('the «+» of the coins opens the shop', async () => {
    await closeAll();
    const shops = () => page.locator('[data-element="starter.window.shop"]').count();
    await page.locator('[data-testid="hud.currency.item_coins.add"]').click({ timeout: 10000 });
    await page.getByRole('dialog').first().waitFor({ timeout: 10000 });
    await page.waitForTimeout(1000);
    if (await shops() !== 1) throw new Error('the «+» opened no shop');
    await closeAll();
    if (await dialogs() > 0) throw new Error('shop did not close');
  });
  await step('settings: «Sign in» opens the ManyPlay ID window', async () => {
    await closeAll();
    const before = requests.length;
    await page.getByRole('button', { name: TILES.settings, exact: true }).first().click({ timeout: 10000 });
    await page.locator('[data-testid="settings.account"]').click({ timeout: 10000 });
    // The kit's sign-in screen (no e-mail is typed: the check stops at the window and its first request).
    await page.getByRole('button', { name: /sign in with email/i }).waitFor({ timeout: 10000 });
    if (!requests.slice(before).includes('GET /v1/auth/oauth/config')) throw new Error('no sign-in providers request');
    await shoot('sign-in');
    await closeAll();
    if (await dialogs() > 0) throw new Error('sign-in window did not close');
  });
  await step('whole run: one progress read, no cloud save', async () => {
    const over = overBudget(requests.filter((key) => /progress\/me\/init|game-states/.test(key)), BUDGET);
    if (over.length) throw new Error(`over budget: ${over.join(', ')}`);
  });
  await step('no console errors', async () => { if (errors.length) throw new Error(errors.join(' | ')); });
  await step('a Russian browser gets the game\'s one language everywhere (no ru published)', async () => {
    const ru = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'ru-RU' });
    try {
      await ru.goto(url);
      await ru.waitForFunction(() => document.body.dataset.sdkState, null, { timeout: 30000 });
      const lang = await ru.evaluate(() => document.documentElement.lang);
      if (lang !== 'en') throw new Error(`page language ${lang}`);
      for (let i = 0; i < 4 && await ru.getByRole('dialog').count(); i++) { await ru.keyboard.press('Escape'); await ru.waitForTimeout(600); }
      await ru.getByRole('button', { name: TILES.settings, exact: true }).first().click({ timeout: 10000 });
      const text = await ru.getByRole('dialog').first().innerText({ timeout: 10000 });
      if (/[а-яё]/i.test(text.replace('Русский', ''))) throw new Error(`kit window not in English: ${text.replace(/\s+/g, ' ')}`);
    } finally { await ru.close(); }
  });
} finally {
  await browser.close();
  server.close();
}
console.log(failed.length ? `FAILED: ${failed.join(', ')}` : 'PASS', `screenshots: ${shots}`);
process.exitCode = failed.length ? 1 : 0;

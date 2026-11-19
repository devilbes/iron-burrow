// Player pass over the built game (dist/) against the stand API of platform.json, as a new guest
// in each size: every screen and window, levels 1–3 to a server-verified win, a defeat, the pause,
// the network count per level. Screens → docs/game/shots/<size>-<nn>-<name>.png (and the mockup of
// the screen next to it, `<size>-<nn>-<name>.mockup.png`, when design/mockups has one); the log →
// docs/game/shots/<size>-log.json.
//   node docs/game/tools/play.mjs [--sizes 1440x900,844x390,390x844] [--only-ui]
// Wins: the stand checks the level end (levels.main server.durationMs.min = 58 s, wall clock from the
// attempt's begin), so the pass holds the pause window ~60 s and then presses the test build's
// «QA: Win» (shown only in the test environment). The server answer (`verified`, stars, rewards) is
// read from the network and written to the log.
import { createServer } from 'node:http';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const PW = process.env.PLAYWRIGHT ?? '/app/node_modules/playwright-core';
const { chromium } = await import(`${PW}/index.mjs`);
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const SIZES = opt('--sizes', '1440x900,844x390,390x844').split(',').map((s) => s.split('x').map(Number));
const ONLY_UI = args.includes('--only-ui');
/** Straight to stage 1: the map, the stage window, the tutorial and the field — no windows tour, no win. */
const QUICK = args.includes('--quick-game');
const HOLD_MS = Number(opt('--hold', '61000'));
const OUT = resolve(process.env.OUT ?? 'docs/game/shots');
mkdirSync(OUT, { recursive: true });

const root = resolve(process.env.DIST ?? 'dist');
const types = { '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.html': 'text/html', '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg', '.m4a': 'audio/mp4' };
const server = createServer(async (req, res) => {
  let path = new URL(req.url, 'http://localhost').pathname;
  if (path.endsWith('/')) path += 'index.html';
  const file = resolve(root, `.${decodeURIComponent(path)}`);
  if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
  try { const body = await readFile(file); res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404).end(); }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const url = `http://127.0.0.1:${server.address().port}/`;

/** Mockup of a screen (design/mockups/contact), by the screen name of a shot. */
const MOCKUP = { lobby: 'main-lobby', stagemap: 'main-stage-map', game: 'main-game', win: 'results-stage-clear',
  defeat: 'results-defeat', tutorial: 'main-game' };
const mockupSize = (w, h) => (w === 1440 ? '1440x900' : w > h ? '844x390' : '390x844');

async function pass([w, h]) {
  const size = `${w}x${h}`;
  const touch = w < 1000;
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: w, height: h }, locale: 'en-US',
    hasTouch: touch, isMobile: false, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const log = { size, steps: [], errors: [], levels: [], requests: [], sockets: [], verdicts: [] };
  let phase = 'boot';
  page.on('console', (m) => { if (m.type() === 'error') log.errors.push(`[${phase}] ${m.text().slice(0, 300)}`); });
  page.on('pageerror', (e) => log.errors.push(`[${phase}] pageerror ${e.message}`));
  page.on('websocket', (ws) => { log.sockets.push({ phase, url: ws.url() }); ws.on('close', () => log.sockets.push({ phase, closed: ws.url() })); });
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.pathname.startsWith('/v1/')) log.requests.push({ phase, call: `${r.method()} ${u.pathname}` });
  });
  page.on('response', async (r) => {
    const u = new URL(r.url());
    if (r.request().method() === 'POST' && /\/v1\/progress\/me\/actions$/.test(u.pathname)) {
      let body = null; let sent = null;
      try { body = await r.json(); } catch { /* not json */ }
      try { sent = r.request().postDataJSON(); } catch { /* none */ }
      log.levels.push({ phase, status: r.status(), sent, body });
    }
  });

  let n = 0;
  const shot = async (name, kind) => {
    n += 1;
    const file = `${size}-${String(n).padStart(2, '0')}-${name}.png`;
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/${file}` });
    const mock = kind && MOCKUP[kind] ? `design/mockups/contact/${MOCKUP[kind]}-${mockupSize(w, h)}.png` : null;
    if (mock && existsSync(mock)) copyFileSync(mock, `${OUT}/${file.replace(/\.png$/, '.mockup.png')}`);
    // Layout facts of the shot: page scroll, elements over the viewport edge, open dialogs.
    const facts = await page.evaluate(() => {
      const out = { scroll: document.documentElement.scrollHeight > innerHeight + 1 || document.documentElement.scrollWidth > innerWidth + 1,
        dialogs: [], offscreen: [] };
      const walk = (node) => {
        for (const el of node.children ?? []) {
          const r = el.getBoundingClientRect();
          const visible = r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
          if (visible && el.matches('[role=dialog]')) out.dialogs.push({ label: el.getAttribute('aria-label'),
            box: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], scrollH: el.scrollHeight, clientH: el.clientHeight });
          if (visible && el.matches('button,[role=button],h1,h2,p') && (r.bottom > innerHeight + 1 || r.right > innerWidth + 1 || r.top < -1 || r.left < -1)) {
            out.offscreen.push(`${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 30)}" [${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}]`);
          }
          walk(el);
          if (el.shadowRoot) walk(el.shadowRoot);
        }
      };
      walk(document.body);
      return out;
    });
    log.steps.push({ shot: file, phase, ...facts });
    return file;
  };
  const step = async (name, fn) => {
    phase = name;
    try { await fn(); } catch (error) { log.errors.push(`[${name}] STEP FAILED: ${String(error.message ?? error).split('\n')[0]}`); }
  };
  const dialog = () => page.locator('[role=dialog]').last();
  const hasDialog = async () => (await page.locator('[role=dialog]').count()) > 0;
  const action = (id) => page.locator(`[data-testid$=".action.${id}"]`).last();
  const press = async (locator) => { await locator.waitFor({ state: 'visible', timeout: 20000 }); await locator.click(); };
  /** Closes every open window: its close button, else its last button, else Escape. */
  const closeAll = async () => {
    for (let i = 0; i < 6 && await hasDialog(); i += 1) {
      const d = dialog();
      const close = d.locator('.dialog-close, [data-part=window-close]');
      if (await close.count() && await close.first().isVisible()) await close.first().click();
      else {
        const buttons = d.locator('button:visible');
        if (await buttons.count()) await buttons.last().click(); else await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(600);
    }
    // the shell's own window (profile)
    const shellClose = page.locator('[data-part=window-close]');
    if (await shellClose.count() && await shellClose.first().isVisible()) { await shellClose.first().click(); await page.waitForTimeout(400); }
  };
  /** Closes the top window as a player would: its main button (Great, Collect, OK, Continue), else ×, else Escape. */
  const dismiss = async () => {
    const d = dialog();
    const names = await d.locator('button').evaluateAll((list) => list.map((b) => (b.textContent ?? '').trim() || b.getAttribute('aria-label') || '?'));
    log.steps.push({ dismiss: names });
    const main = d.getByRole('button', { name: /^(great|collect|ok|continue|claim|got it)$/i });
    try { await main.last().click({ timeout: 5000 }); await page.waitForTimeout(800); return; } catch { /* next way */ }
    try { await d.locator('.dialog-close').first().click({ timeout: 5000 }); await page.waitForTimeout(800); return; } catch { /* next way */ }
    await page.keyboard.press('Escape'); await page.waitForTimeout(800);
  };
  const waitDialog = async (timeout = 20000) => { await page.locator('[role=dialog]').first().waitFor({ state: 'visible', timeout }); await page.waitForTimeout(800); };

  await step('boot', async () => {
    await page.goto(url);
    await page.locator('[data-testid=app-ready]').waitFor({ timeout: 90000 });
  });
  await step('grant', async () => {
    await waitDialog(30000);
    await shot('start-grant');
    await press(action('grant-collect'));
    await page.waitForTimeout(2500);
    await shot('grant-reward');
    await dismiss();
    await closeAll();
  });
  await step('lobby', async () => { await page.waitForTimeout(1000); await shot('lobby', 'lobby'); });
  if (QUICK) {
    await step('map', async () => { await press(page.locator('[data-testid=lobby-play]')); await page.locator('[data-testid=stagemap-play]').waitFor(); await page.waitForTimeout(1200); await shot('stagemap', 'stagemap'); await press(page.locator('[data-testid=stagemap-play]')); });
    await step('quick', async () => {
      await waitDialog(); await shot('prestage'); await press(action('prestage-start'));
      await page.locator('[data-testid=game-field]').waitFor({ timeout: 30000 });
      await page.waitForTimeout(1500); await shot('tutorial-1', 'tutorial');
      for (let k = 0; k < 4; k += 1) {
        const next = page.locator('[data-testid=tutorial-next]');
        if (await next.count()) { await next.first().click(); await page.waitForTimeout(1200); await shot(`tutorial-${k + 2}`, 'tutorial'); }
      }
      await page.waitForTimeout(6000); await shot('game-level1', 'game');
      log.boxes = await page.evaluate(() => Object.fromEntries(['[data-slot=screen]', '[data-slot="topBar.left"]', '[data-slot="topBar.right"]', '[data-slot="topBar.center"]']
        .map((sel) => { const r = document.querySelector(sel)?.getBoundingClientRect(); return [sel, r ? [r.x, r.y, r.width, r.height] : null]; })
        .concat((() => { const out = []; const walk = (n) => { for (const el of n.children ?? []) { if (el.matches('.game,.field-box,canvas.field,[data-screen=game],[data-element=game]')) { const r = el.getBoundingClientRect(); out.push([el.className || el.tagName, [r.x, r.y, r.width, r.height, el.clientHeight]]); } walk(el); if (el.shadowRoot) walk(el.shadowRoot); } }; walk(document.body); return out; })())));
      await press(page.locator('[data-testid=qa-lose]')); await waitDialog(30000); await page.waitForTimeout(1200); await shot('defeat', 'defeat');
    });
    await finish(); return log;
  }
  await step('profile', async () => { await press(page.locator('[data-testid="hud.profile"]')); await page.waitForTimeout(2000); await shot('profile'); await closeAll(); });
  await step('settings', async () => {
    await press(page.locator('[data-testid="hud.settings"]')); await waitDialog(); await shot('settings');
    const sign = page.getByRole('button', { name: /^\s*(sign in|log in)\s*$/i });
    if (await sign.count()) { await sign.first().click(); await page.waitForTimeout(2500); await shot('login'); }
    else log.errors.push('[settings] no Sign in button');
    await closeAll();
  });
  await step('daily', async () => { await press(page.locator('[data-testid="hud.daily-rewards"]')); await waitDialog(); await shot('daily'); await closeAll(); });
  await step('offer-tile', async () => {
    const tile = page.locator('[data-part="hud.right"] [data-testid^="hud.offer"]');
    if (!(await tile.count())) { log.errors.push('[offer-tile] no offer tile on the HUD'); return; }
    await shot('lobby-offer-tile', 'lobby');
    await tile.first().click(); await waitDialog(); await shot('offer'); await closeAll();
  });
  await step('boards', async () => { await press(page.locator('[data-testid="hud.boards"]')); await waitDialog(); await page.waitForTimeout(1500); await shot('boards'); await closeAll(); });
  await step('shop', async () => {
    await press(page.locator('[data-testid="hud.store"]')); await waitDialog(); await page.waitForTimeout(1500); await shot('shop');
    const buy = page.locator('[data-testid=shop-buy]');
    if (await buy.count()) { await buy.first().click(); await page.waitForTimeout(4000); await shot('shop-buy'); }
    await closeAll();
  });
  await step('sound', async () => { await press(page.locator('[data-testid=lobby-sound]')); await waitDialog(); await shot('sound'); await closeAll(); });
  if (ONLY_UI) { await finish(); return log; }

  /** Plays the selected stage to a verified win: pause ~60 s (the server's minimum), QA: Win. */
  const playStage = async (stage, tutorial) => {
    await step(`level${stage}-start`, async () => {
      await waitDialog(); await shot(`level${stage}-prestage`);
      await press(action('prestage-start'));
      await page.locator('[data-testid=game-field]').waitFor({ timeout: 30000 });
      await page.waitForTimeout(1500);
    });
    const started = Date.now();
    if (tutorial) {
      await step('tutorial', async () => {
        await shot('tutorial-1', 'tutorial');
        for (let i = 0; i < 2; i += 1) {
          const next = page.locator('[data-testid=tutorial-next]');
          if (await next.count()) { await next.first().click(); await page.waitForTimeout(900); }
        }
        await shot('tutorial-mid', 'tutorial');
        for (let i = 0; i < 2; i += 1) {
          const next = page.locator('[data-testid=tutorial-next]');
          if (await next.count()) { await next.first().click(); await page.waitForTimeout(900); }
        }
        await shot('tutorial-core', 'tutorial');
      });
    }
    await step(`level${stage}-play`, async () => { await page.waitForTimeout(2500); await shot(`game-level${stage}`, 'game'); });
    await step(`level${stage}-pause`, async () => {
      await press(page.locator('[data-testid=hud-pause]'));
      await waitDialog();
      if (stage === 1) await shot('pause');
      const left = HOLD_MS - (Date.now() - started);
      if (left > 0) await page.waitForTimeout(left);
      await press(action('pause-resume'));
      await page.waitForTimeout(800);
      if (stage === 1) await shot('after-resume', 'game');
    });
    await step(`level${stage}-win`, async () => {
      await press(page.locator('[data-testid=qa-win]'));
      await waitDialog(30000);
      await page.waitForTimeout(2500);
      await shot(`win-level${stage}`, 'win');
    });
  };

  await step('map', async () => { await press(page.locator('[data-testid=lobby-play]')); await page.locator('[data-testid=stagemap-play]').waitFor(); await page.waitForTimeout(1200); await shot('stagemap', 'stagemap'); await press(page.locator('[data-testid=stagemap-play]')); });
  await playStage(1, true);
  for (const stage of [2, 3]) {
    await step(`level${stage - 1}-next`, async () => {
      await action('clear-next').click({ timeout: 10000 }).catch((e) => log.errors.push(`[next] ${String(e.message).split('\n')[0]}`));
      await page.waitForTimeout(2500);
      // the reward window comes right after the result window
      if (await hasDialog() && !(await page.locator('[data-testid$=".action.prestage-start"]').count())) {
        await shot(`reward-after-level${stage - 1}`);
        await dismiss(); await page.waitForTimeout(1500);
      }
    });
    await playStage(stage, false);
  }
  await step('after-level3', async () => {
    await press(action('clear-map'));
    await page.waitForTimeout(2500);
    if (await hasDialog()) { await shot('reward-after-level3'); await closeAll(); }
    await page.locator('[data-testid=stagemap-play]').waitFor();
    await page.waitForTimeout(1200);
    await shot('stagemap-after-3', 'stagemap');
  });
  await step('defeat', async () => {
    await press(page.locator('[data-testid=stagemap-play]'));
    await waitDialog(); await press(action('prestage-start'));
    await page.locator('[data-testid=game-field]').waitFor();
    await page.waitForTimeout(2000);
    await press(page.locator('[data-testid=qa-lose]'));
    await waitDialog(30000); await page.waitForTimeout(1500);
    await shot('defeat', 'defeat');
    await press(action('defeat-retry'));
    await page.waitForTimeout(3000);
    if (await hasDialog()) { await shot('offer-after-defeat'); await closeAll(); }
  });
  await step('quit', async () => {
    if (await page.locator('[data-testid=hud-pause]').count()) {
      await press(page.locator('[data-testid=hud-pause]')); await waitDialog(); await press(action('pause-quit'));
      await page.waitForTimeout(2500);
      if (await hasDialog()) await closeAll();
    }
    const back = page.locator('[data-testid=stagemap-back]');
    if (await back.count()) { await back.click(); await page.waitForTimeout(1500); }
    await page.locator('[data-testid=app-ready]').waitFor({ timeout: 20000 });
    await shot('lobby-final', 'lobby');
    await press(page.locator('[data-testid="hud.profile"]')); await page.waitForTimeout(2000); await shot('profile-final'); await closeAll();
  });
  await finish();
  return log;

  async function finish() {
    phase = 'end';
    log.verdicts = log.levels.map((one) => ({ phase: one.phase, status: one.status,
      kind: one.sent?.type ?? one.sent?.action ?? null,
      verified: one.body?.level?.verified ?? null, stars: one.body?.level?.stars ?? null }));
    writeFileSync(`${OUT}/${size}-log.json`, JSON.stringify(log, null, 1));
    await browser.close();
  }
}

const logs = await Promise.all(SIZES.map((s) => pass(s).catch((error) => ({ size: s.join('x'), fatal: String(error) }))));
for (const log of logs) {
  console.log(`== ${log.size}${log.fatal ? ` FATAL ${log.fatal}` : ''}`);
  if (log.fatal) continue;
  console.log(`shots ${log.steps.length}, errors ${log.errors.length}`, log.boxes ? JSON.stringify(log.boxes) : '');
  for (const e of log.errors) console.log('  ', e);
  for (const s of log.steps) if (s.scroll || s.offscreen.length) console.log('  layout', s.shot, s.scroll ? 'PAGE SCROLL' : '', s.offscreen.join('; '));
  for (const v of log.levels) console.log('  level end', v.phase, v.status, JSON.stringify(v.body).slice(0, 400));
}
server.close();

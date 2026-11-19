// Gallery of the kit components the player sees in this game, for checking a skin: the built
// shell (top bar, HUD, game screens; no bottom menu, as the template ships) and every window it
// opens, with test data, no SDK and no network. `home-menu` adds a bottom menu of three test
// items, for a game that has one (`MENU`, src/screens/index.ts). `home-hud` shows a HUD and top bar
// a game extended (`HUD`, `TOP_BAR`): an event, an offer with a countdown, a second resource;
// `home-hud-full` more tiles than a landscape phone column holds. HUD and top bar are placed by
// the shell's own rules (src/shell/hud-plan.ts). `game-window` — the game screen with a window the
// game opens through `ctx.window.open` (src/shell/windows/game.ts) with test content: rating stars,
// score rows of its own, two buttons; `game-overlay` — a screen overlay (`ctx.overlay`); `buttons` —
// every button kind (main, second, price, danger, disabled) content-wide and stretched. In every
// view with a window or an overlay the dim must cover the viewport edge to edge, top bar included
// (modal-layers.js). Bundled with the game's modules of src/ (imported as /app/<path>.js) and
// served by tests/skin-gallery.mjs next to dist/:
//   /?skin=game|stock&view=<id>   one view (VIEWS below) under the game skin or stock ManyPlay.
//   …&route=<route>&level=<n>      a screen of the game by its route (src/screens/index.ts) instead of
//                                  the view's own, with test level services (test-ports.js) at level n —
//                                  what tests/screen-shot.mjs draws.
//   …&tint=base|overlay            the game skin plus the test pictures of raster buttons
//                                  (tests/skin-gallery/tinted-buttons.mjs serves them): `button-base`,
//                                  with `overlay` also `button-overlay` (src/shell/button-tint.ts).
// Sets window.gallery = { ready, error, views, settled(), fingerprint(), checks() }.
import { useSkin } from '@manygamescorp/ui-kit/skin';
import { manyplaySkin } from '/app/shell/manyplay.js';
import { createUiShell } from '@manygamescorp/ui-kit/shell';
import { createTopBarRegistry } from '@manygamescorp/ui-kit/services/topbar';
import { createHudRegistry } from '@manygamescorp/ui-kit/services/hud-registry';
import { createBottomMenuRegistry } from '@manygamescorp/ui-kit/services/bottommenu';
import { preloader } from '@manygamescorp/ui-kit/services/preloader';
import { shopWindow } from '@manygamescorp/ui-kit/services/iap-windows';
import { dailyReward } from '@manygamescorp/ui-kit/services/progress';
import { leaderboardWindow } from '@manygamescorp/ui-kit/services/leaderboard-window';
import { login } from '@manygamescorp/ui-kit/services/login';
import { popup, confirm } from '@manygamescorp/ui-kit/services/popup';
import { error } from '@manygamescorp/ui-kit/services/error';
import { settings } from '@manygamescorp/ui-kit/services/settings';
import { rewardWindow } from '@manygamescorp/ui-kit/services/reward-window';
import { adoptDocumentTheme, fontsUrl, gameSkin, loadTheme } from '/app/shell/skin.js';
import { routeContext, screensModule } from '/app/shell/router.js';
import { bootText } from '/app/boot/strings.js';
import { createItemCatalog } from '/app/shell/item-catalog.js';
import { SKIN } from '/app/skin/index.js';
import { playerCard } from '/app/shell/windows/player.js';
import { HUD, TOP_BAR, screens } from '/app/screens/index.js';
import { mountView, view } from '/app/screens/ui.js';
import { icon } from '@manygamescorp/ui-kit/icon';
import { createGameWindows, createOverlays } from '/app/shell/windows/game.js';
import { createWindowOrder } from '/app/shell/windows/order.js';
import './modal-layers.js';
import { testPorts } from './test-ports.js';
import { barCounters, gameTileSpec, hudLayout, hudOrder, isGameTile, moduleCounter } from '/app/shell/hud-plan.js';

const NOW = Date.UTC(2026, 10, 16, 12);
const common = { ready: true, busy: false, lang: 'en', playerKey: '12' };
/** The four boosters of Iron Burrow (configs/remote/inventory.catalog/, GDD 15) and their names. */
const BOOSTERS = [['bst_bubble', 'Bubble Shield'], ['bst_shockwave', 'Shockwave'], ['bst_fortify', 'Steel Fortress'],
  ['bst_hull', 'Spare Hull']];
const NAME = Object.fromEntries(BOOSTERS);
/** A pack of the shop (GDD 16 iap.packs): what it grants of each booster. */
const pack = (key, name, price, grants, placement) => ({ key, name, kind: 'iap', available: true, placement,
  priceText: price, variant: { key: 'default', entities: grants.map(([id, amount]) => ({ id, name: NAME[id], amount })) } });
const PACKS = [pack('hull_pack', 'Hull Pack', '$1.99', [['bst_hull', 5]], 'shop_bundles'),
  pack('field_kit', 'Field Kit', '$4.99', BOOSTERS.map(([id]) => [id, 6]), 'shop_bundles'),
  pack('starter_crate', 'Starter Crate', '$0.99', BOOSTERS.map(([id]) => [id, 3]), 'shop_special')];
const STATUS = ['claimed', 'claimed', 'available', 'locked', 'locked', 'locked', 'locked'];
/** Daily rewards of CONTRACT §8.2: D1 bubble · D2 shockwave · D3 fortify · D4 hull · D5 bubble 2 · D6 shockwave · D7 hull 2. */
const DAILY = [['bst_bubble', 1], ['bst_shockwave', 1], ['bst_fortify', 1], ['bst_hull', 1], ['bst_bubble', 2],
  ['bst_shockwave', 1], ['bst_hull', 2]];
/** Pictures of the game's items as the shell resolves them (`ITEMS` of src/skin/art.ts). */
const items = createItemCatalog(() => { throw new Error('no SDK in the gallery'); });
/** A granted line as the reward window gets it in the game: catalog name, picture of `ITEMS`. */
const granted = (id, kind, quantity, name) => ({ id, kind, quantity, name,
  ...(items.icon(id) ? { icon: items.icon(id) } : {}) });
/** The sample item: a booster of the catalog (configs/remote/inventory.catalog/bst_bubble.json). */
const SAMPLE_ITEM = 'bst_bubble';

/** View → kit window opened over the home screen: [component name, export, kind, props]. */
const WINDOWS = {
  shop: ['shopWindow', shopWindow, 'window', { offers: PACKS, now: NOW, currencies: [], purchasingOfferKeys: [] }],
  daily: ['dailyReward', dailyReward, 'window', { trackKey: 'daily_login', nextInMs: 51_720_000,
    days: STATUS.map((status, i) => ({ key: `day_${i + 1}`, title: `Day ${i + 1}`, amount: DAILY[i][1],
      icon: items.icon(DAILY[i][0]) ?? 'gift', status,
      // The big 7th day is the wide cell, as src/shell/windows/daily.ts gives it (7 days, the last).
      ...(i === 6 ? { wide: true } : {}) })) }],
  leaderboard: ['leaderboardWindow', leaderboardWindow, 'window', { tab: 'weekly',
    tabs: [{ id: 'weekly', label: 'Weekly' }], me: { rank: 12, score: 340 }, meGid: 12,
    entries: Array.from({ length: 10 }, (_, i) => ({ rank: i + 1, gid: 100 + i, score: 2000 - i * 150,
      name: `Player ${100 + i}` })) }],
  profile: ['profile', playerCard, 'window', { name: 'Player 12',
    stats: [{ field: 'levelsCompleted', label: 'Levels completed', value: '7' },
      { field: 'highestScore', label: 'Best score', value: '6,040' }] }],
  settings: ['settings', settings, 'popup', { languages: [{ id: 'en', label: 'English' }, { id: 'ru', label: 'Русский' }] }],
  login: ['login', login, 'window', { state: { step: 'start', providers: [], busy: false, conflict: false,
    created: false, linked: [], linkable: [], child: false }, game: 'Game', platform: 'web',
  orientation: 'auto', now: () => NOW }],
  popup: ['popup', popup, 'popup', { title: 'Daily gift', header: { icon: 'gift' },
    content: [{ kind: 'text', text: 'Come back tomorrow for one more gift.' }], actions: [{ id: 'ok', label: 'OK' }] }],
  confirm: ['confirm', confirm, 'popup', { title: 'Buy Field Kit', subject: '6 of each booster', details: 'You have 2 Spare Hulls',
    price: '$4.99', icon: 'shop' }],
  error: ['error', error, 'system', { code: 'NETWORK_ERROR', retry: true }],
  reward: ['rewardWindow', rewardWindow, 'reward', { items: [granted(SAMPLE_ITEM, 'item', 2, NAME[SAMPLE_ITEM]),
    granted('bst_hull', 'item', 1, NAME.bst_hull)] }],
};
/** A level result as a game shows it through `ctx.window.open`: the kit window, the game's rows. */
const RESULT = { title: 'Level 7 complete', header: { stars: 2 },
  actions: [{ id: 'next', label: 'Next level' }, { id: 'menu', label: 'Menu' }] };
// One soft underlay for the whole group, no outline; the rows have no plate of their own.
const RESULT_CSS = '.result{display:grid;gap:2px;margin:0;padding:8px 12px;list-style:none;min-width:min(16rem,100%);'
  + 'border-radius:var(--mp-radius-field);background:color-mix(in srgb,var(--mp-surface) 70%,transparent)}'
  + '.result li{display:flex;justify-content:space-between;gap:16px;padding:6px 0}'
  + '.result b{color:var(--mp-gold);font-variant-numeric:tabular-nums}';
const resultBody = (root) => mountView(root, 'result', () => view('ul', { class: 'result', 'data-testid': 'result-rows' },
  ...[['Score', '1,240'], ['Best', '2,050'], ['Moves left', '3']].map(([label, value]) =>
    view('li', {}, view('span', {}, label), view('b', {}, value)))), { styles: RESULT_CSS });
// ---- Windows of Iron Burrow the game opens through `ctx.window.open` (GDD 20 S04, S06, S07, S08, S09,
// S16; mockups design/mockups/results/*): kit windows with the game's content, as the screens step
// will draw it — item pictures from `ITEMS` big and first in their place, no frame inside the frame
// (a group sits on one soft underlay without an outline), numbers in the display font.
const GAME_CSS = '.gw{display:flex;flex-direction:column;align-items:center;gap:12px;min-width:min(17rem,100%);text-align:center}'
  + '.gw p{margin:0}.gw-eyebrow{font:600 12px/1.3 var(--mp-font-ui);letter-spacing:.12em;text-transform:uppercase;color:var(--mp-text-3)}'
  + '.gw-text{color:var(--mp-text-2)}'
  + '.gw-prize{display:flex;flex-direction:column;align-items:center;gap:4px}'
  + '.gw-art{position:relative;display:grid;place-items:center}'
  + '.gw-art [data-part=icon]{filter:drop-shadow(0 6px 10px color-mix(in srgb,var(--mp-night) 70%,transparent))}'
  + '.gw-count{position:absolute;right:-4px;bottom:0;font:400 22px/1 var(--mp-font-display);color:var(--mp-text);'
  + 'text-shadow:0 2px 0 var(--mp-night)}'
  + '.gw-name{font:700 16px/1.2 var(--mp-font-ui)}'
  + '.gw-rows{display:grid;gap:2px;width:100%;margin:0;padding:8px 14px;list-style:none;border-radius:var(--mp-radius-field);'
  + 'background:color-mix(in srgb,var(--mp-surface) 70%,transparent)}'
  + '.gw-rows li{display:flex;justify-content:space-between;gap:16px;padding:4px 0;color:var(--mp-text-2)}'
  + '.gw-rows b{color:var(--mp-text);font-variant-numeric:tabular-nums}'
  + '.gw-total{display:flex;align-items:baseline;justify-content:space-between;width:100%;padding:0 14px}'
  + '.gw-total strong{font:400 30px/1 var(--mp-font-display);color:var(--mp-gold)}'
  + '.gw-best{align-self:flex-end;padding:0 14px;font:600 13px/1 var(--mp-font-ui);color:var(--mp-gold)}'
  + '.gw-stats{display:flex;justify-content:center;gap:32px;width:100%}'
  + '.gw-stat{display:flex;flex-direction:column;gap:4px}.gw-stat span{font-size:13px;color:var(--mp-text-3)}'
  + '.gw-stat strong{font:400 30px/1 var(--mp-font-display);color:var(--mp-text)}'
  + '.gw-tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;width:100%;margin:0;padding:10px 8px;'
  + 'list-style:none;border-radius:var(--mp-radius-field);background:color-mix(in srgb,var(--mp-surface) 70%,transparent)}'
  + '.gw-tiles li{display:flex;flex-direction:column;align-items:center;gap:2px}'
  + '.gw-tiles b{font:400 18px/1 var(--mp-font-display);color:var(--mp-text)}'
  + '.gw-line{display:flex;align-items:center;gap:12px;width:100%;padding:6px 14px;border-radius:var(--mp-radius-field);'
  + 'background:color-mix(in srgb,var(--mp-surface) 70%,transparent);text-align:left}'
  + '.gw-line span{flex:1;color:var(--mp-text-2)}.gw-line b{color:var(--mp-text)}'
  // A phone on its side is low (the kit's dialog ≤ the viewport): the picture smaller, the rows in two
  // columns, the best mark beside the total — the body stays inside the frame.
  + '@media (orientation:landscape) and (max-height:32em){.gw{gap:6px}.gw-art [data-part=icon]{width:64px;height:64px}'
  + '.gw-rows{grid-template-columns:1fr 1fr;column-gap:20px;padding:6px 14px}.gw-rows li{padding:2px 0}'
  + '.gw-total strong{font-size:24px}.gw-best{margin-top:-4px}}';
const gameBody = (name, render) => (root) => mountView(root, name, () => view('div', { class: 'gw' }, ...render()),
  { styles: GAME_CSS });
const prize = (id, count, size = 128) => view('div', { class: 'gw-prize' },
  view('div', { class: 'gw-art' }, icon(id, size), count ? view('span', { class: 'gw-count' }, `×${count}`) : null),
  view('p', { class: 'gw-name' }, NAME[id]));
const rows = (list) => view('ul', { class: 'gw-rows' },
  ...list.map(([label, value]) => view('li', {}, view('span', {}, label), view('b', {}, value))));
const stat = (label, value) => view('div', { class: 'gw-stat' }, view('span', {}, label), view('strong', {}, value));
/** View → [route under it, window spec]. */
const GAME_WINDOWS = {
  'stage-clear': ['game', { title: 'Stage Clear!', header: { stars: 3 }, dismissible: false,
    body: gameBody('stage-clear', () => [view('p', { class: 'gw-eyebrow' }, 'Stage 3 · Clay Tunnels'), prize('bst_bubble', 2),
      rows([['Rustbugs', '3,200'], ['Power-ups', '1,500'], ['Clear bonus', '1,000'], ['Lives left ×3', '1,500']]),
      view('div', { class: 'gw-total' }, view('span', {}, 'Score'), view('strong', {}, '7,200')),
      view('p', { class: 'gw-best' }, 'New best!')]),
    actions: [{ id: 'next', label: 'Next Stage' }, { id: 'replay', label: 'Replay' }, { id: 'map', label: 'Map' }] }],
  defeat: ['game', { title: 'Core lost', dismissible: false,
    body: gameBody('defeat', () => [view('p', { class: 'gw-eyebrow' }, 'Run report · Stage 7'),
      view('p', { class: 'gw-text' }, 'The Core was destroyed.'),
      view('div', { class: 'gw-stats' }, stat('Final score', '1,840'), stat('Stage reached', '7')),
      view('div', { class: 'gw-line' }, icon('bst_hull', 56), view('span', {}, 'Continue uses 1 Spare Hull'), view('b', {}, '2 left'))]),
    actions: [{ id: 'continue', label: 'Continue' }, { id: 'retry', label: 'Retry' }, { id: 'map', label: 'Stage Map' }] }],
  pause: ['game', { title: 'Paused', text: 'Stage 7 · Clay Tunnels. The Core waits for you.',
    actions: [{ id: 'resume', label: 'Resume' }, { id: 'restart', label: 'Restart' }, { id: 'quit', label: 'Quit' }] }],
  prestage: ['map', { title: 'Stage 7', header: { stars: 2 },
    body: gameBody('prestage', () => [view('p', { class: 'gw-text' }, 'Defend the Core from 20 Rustbugs.'),
      rows([['Best score', '6,040'], ['Spare Hull before start', '+1 life']]),
      view('ul', { class: 'gw-tiles' }, ...BOOSTERS.map(([id], i) => view('li', {}, icon(id, 64), view('b', {}, `×${[2, 1, 1, 2][i]}`))))]),
    actions: [{ id: 'start', label: 'Start' }, { id: 'shop', label: 'Get boosters' }] }],
  'siege-result': ['game', { title: 'Siege over', dismissible: false,
    body: gameBody('siege-result', () => [view('p', { class: 'gw-eyebrow' }, 'Pit Siege · this week'),
      view('div', { class: 'gw-stats' }, stat('Wave', '14'), stat('Score', '12,480')),
      rows([['Best this week', '12,480'], ['Rank', '#37']])]),
    actions: [{ id: 'again', label: 'Play Again' }, { id: 'boards', label: 'Leaderboards' }, { id: 'lobby', label: 'Lobby' }] }],
  'booster-info': ['game', { title: 'Bubble Shield',
    body: gameBody('booster-info', () => [prize('bst_bubble', 0, 144),
      view('p', { class: 'gw-text' }, "You can't be hurt for 10 s. Up to 2 per stage."), rows([['You have', '2']])]),
    actions: [{ id: 'more', label: 'Get more' }] }],
};

/** Button kinds as the kit draws them: [kind, classes, label, disabled]. */
const BUTTONS = [['primary', 'mp-button mp-button--primary', 'Play'], ['secondary', 'mp-button mp-button--secondary', 'Menu'],
  ['buy', 'mp-button iap-buy', '$4.99'], ['danger', 'mp-button mp-button--critical', 'Delete'],
  ['disabled', 'mp-button mp-button--primary', 'Locked', true]];
// The stock look of the kinds an own screen has no rule for (the kit windows have them in their sheets).
const BUTTONS_CSS = '.kinds{display:flex;flex-wrap:wrap;align-items:flex-start;gap:16px;padding:16px}'
  + '.kinds-column{display:flex;flex-direction:column;gap:8px;width:min(20rem,100%);padding:12px;'
  + 'border-radius:var(--mp-radius-card);background:var(--mp-night)}'
  + '.kinds-column[data-width=narrow]{width:9rem}'
  + '.kinds-column[data-width=narrow] .mp-button{align-self:flex-start;width:auto}'
  + '.kinds .mp-button{min-height:var(--mp-button-h);font-size:1rem}'
  + '.mp-button--secondary{background:transparent;color:var(--mp-text);border-color:var(--mp-line-strong)}'
  + '.iap-buy{background:var(--mp-violet-deep);color:var(--mp-on-accent)}'
  + '.mp-button--critical{background:var(--mp-coral);color:var(--mp-on-accent)}'
  + '.mp-button:disabled{opacity:.45}';
const buttonKinds = (root) => mountView(root, 'buttons', () => view('section', { class: 'kinds' },
  ...['narrow', 'wide'].map((width) => view('div', { class: 'kinds-column', 'data-width': width },
    ...BUTTONS.map(([kind, classes, label, disabled]) => view('button', { type: 'button', class: classes,
      'data-kind': kind, ...(disabled ? { disabled: true } : {}) }, label))))), { styles: BUTTONS_CSS });
/** Views of the game's own layers: [route, what is opened over it]. */
const LAYERS = {
  'game-window': ['game', (ctx) => ctx.window.open({ ...RESULT, body: resultBody })],
  'game-overlay': ['home', (ctx) => ctx.overlay({ draw: (root) => mountView(root, 'tip', () => view('section', { class: 'hero' },
    view('p', { class: 'hero-title' }, 'Tap a tile to start'))) })],
  buttons: ['home', (ctx) => ctx.overlay({ draw: buttonKinds })],
  ...Object.fromEntries(Object.entries(GAME_WINDOWS).map(([id, [route, spec]]) => [id, [route, (ctx) => ctx.window.open(spec)]])),
};

/** Every view: covered component(s) → how it is shown. */
export const VIEWS = ['home', 'home-menu', 'home-hud', 'home-hud-full', 'map', 'game', 'preloader', 'preloader-error',
  ...Object.keys(WINDOWS), ...Object.keys(LAYERS)];

/** Test items of the `home-menu` view: the raised center and two side slots. */
const MENU = [
  { id: 'menu.play', icon: 'play', label: 'screen.home.play', slot: 'center', variant: 'raised' },
  { id: 'menu.leaderboard', icon: 'trophy', label: 'Leaderboard', slot: 2 },
  { id: 'menu.shop', icon: 'shop', label: 'Shop', slot: 4 },
];

/** Tiles platform modules register (owner, icon, label) as the gallery draws them. */
const MODULE_TILES = {
  'daily-rewards': ['daily', 'gift', 'Daily rewards', { badge: { kind: 'dot' } }],
  leaderboards: ['leaderboards', 'trophy', 'Leaderboard', {}],
  shop: ['iap', 'shop', 'Shop', {}],
};
/** A game that extended the HUD and the top bar: an event, an offer ending in 5 h, gems. */
const EXTRA_HUD = [
  ...HUD,
  { id: 'event', kind: 'activity', icon: 'calendar', label: 'Halloween event' },
  { id: 'offer-flash', kind: 'money', icon: 'flame', label: 'Flash sale', offer: true },
];
/** Gems open nothing (`open: false`): their counter shows no «+». */
// A game may declare no counter at all (Iron Burrow: TOP_BAR is empty), then gems are the only one.
const EXTRA_BAR = [...TOP_BAR.slice(0, 1), { kind: 'item', id: 'item_gems', label: 'Gems', icon: 'gems', open: false }, ...TOP_BAR.slice(1)];
/** More tiles than a column of a landscape phone holds (844x390: four). */
const FULL_HUD = [
  ...EXTRA_HUD,
  { id: 'quests', kind: 'activity', icon: 'quest', label: 'Tasks' },
  { id: 'season', kind: 'activity', icon: 'medal', label: 'Season' },
  { id: 'club', kind: 'activity', icon: 'heart', label: 'Club' },
  { id: 'offer-starter', kind: 'money', icon: 'gift', label: 'Starter pack', offer: true },
  { id: 'deal-gems', kind: 'money', icon: 'gems', label: 'Gem deal' },
  { id: 'piggy', kind: 'money', icon: 'coins', label: 'Piggy bank' },
  { id: 'vip', kind: 'money', icon: 'boost', label: 'VIP' },
];
const DECLARED = { 'home-hud': [EXTRA_HUD, EXTRA_BAR], 'home-hud-full': [FULL_HUD, EXTRA_BAR] };
/** Values of the top bar counters by item. */
const QUANTITY = { item_coins: 1250, item_gems: 85 };

function zones(menu, [entries, resources] = [HUD, TOP_BAR]) {
  const now = () => NOW;
  const topBar = createTopBarRegistry({ now });
  const hud = createHudRegistry({ now, layout: () => hudLayout(entries, undefined) });
  const bottomMenu = createBottomMenuRegistry({ now, slots: 5 });
  const counters = barCounters(resources, entries);
  topBar.add({ id: 'profile', slot: 'left', icon: 'user', label: 'shell.bar.profile', order: 10, contexts: ['main'] }, 'game');
  for (const counter of counters.filter((item) => item.item)) {
    topBar.add({ id: counter.id, slot: 'left', icon: counter.icon, label: counter.label, value: QUANTITY[counter.item] ?? 0,
      order: counter.order, contexts: ['main', 'core'] }, 'game');
  }
  // What the profile service registers, as the shell lets it in.
  const level = moduleCounter({ id: 'level', icon: 'star', label: 'Level', value: 7, contexts: ['main'] }, counters);
  if (level) topBar.add(level, 'profile');
  topBar.add({ id: 'settings', slot: 'right', icon: 'hud-settings', label: 'shell.bar.settings', order: 90, contexts: ['main'] }, 'game');
  const order = hudOrder(entries);
  for (const entry of entries) {
    if (isGameTile(entry)) {
      hud.add({ ...gameTileSpec(entry, order.get(entry.id)),
        ...(entry.offer ? { timer: NOW + 5 * 3_600_000 } : {}) }, 'game');
    } else if (MODULE_TILES[entry.id]) {
      const [owner, icon, label, extra] = MODULE_TILES[entry.id];
      hud.add({ id: entry.id, slot: 'right', icon, label, ...extra }, owner);
    }
  }
  if (menu) for (const item of MENU) bottomMenu.add({ ...item, contexts: ['main'], onClick: () => undefined }, 'game');
  return { topBar, hud, bottomMenu };
}

function mountShell(root, route, menu, declared, level) {
  let shell;
  const windows = createGameWindows(() => shell, createWindowOrder());
  const overlays = createOverlays(() => root.querySelector('.mpg-shell') ?? undefined);
  const ctx = { t: (key, params) => bootText(key, params), go: (to) => shell?.navigate(to), game: testPorts(level),
    window: windows.windows, overlay: (options) => overlays.open(options), onSuspend: () => () => undefined };
  shell = createUiShell(root, { title: bootText('shell.title'), text: (key) => bootText(key), lang: 'en',
    home: 'home', installed: () => true, topBarContext: routeContext, ...zones(menu, declared) });
  shell.add(windows.module);
  shell.add(screensModule(() => ctx, () => undefined, () => { windows.release(); overlays.clear(); }));
  shell.ctx = ctx;
  const contributes = Object.entries(WINDOWS).map(([id, [component, , kind]]) => ({ id: `gallery.${id}`,
    kind: kind === 'window' ? 'window' : 'popup', component,
    ...(kind === 'window' ? { slot: 'overlay', popupKind: 'content' } : kind === 'popup' ? {} : { slot: kind }) }));
  shell.add({ manifest: { id: 'gallery', ui: { contributes } },
    components: Object.fromEntries(Object.values(WINDOWS).map(([component, view]) => [component, view])),
    props: (elementId) => ({ ...common, ...WINDOWS[elementId.slice('gallery.'.length)]?.[3] }) });
  shell.navigate(route);
  return shell;
}

/**
 * The game skin with the test pictures of raster buttons: one grayscale picture for every kind,
 * each kind in a color of its own (far apart in hue, so a wrong one shows).
 */
const TINT_COLORS = { primary: '#C8872E', secondary: '#8A7A66', buy: '#4CA64C', danger: '#C8452E' };
const TINT_THEME = `:root,:host,.mpg-shell{--game-button-slice:24;--game-button-edge:12px;--game-button-text:#FFFFFF;${
  Object.entries(TINT_COLORS).map(([kind, color]) => `--game-button-${kind}:${color}`).join(';')}}`;
async function tintedSkin(tint) {
  const art = (name) => `${location.origin}/test-art/${name}.png`;
  return gameSkin(`${await loadTheme()}\n${TINT_THEME}`, { ...SKIN, assets: { ...SKIN.assets, 'button-base': art('button-base'),
    ...(tint === 'overlay' ? { 'button-overlay': art('button-overlay') } : {}) } });
}

async function show(skin, view, tint, asked, level) {
  adoptDocumentTheme(document, fontsUrl());
  const fonts = fontsUrl();
  await useSkin(skin === 'stock' ? manyplaySkin(fonts ? { url: fonts } : {})
    : tint ? await tintedSkin(tint) : gameSkin(await loadTheme()));
  const root = document.getElementById('app');
  if (view.startsWith('preloader')) {
    preloader.mount(root, { ...common, elementId: 'preloader', game: bootText('shell.title'), loading: true,
      progress: 40, status: bootText('shell.loading.status'), caption: bootText('shell.loading.caption'),
      ...(view === 'preloader-error' ? { error: bootText('shell.error.boot', { code: 'NETWORK_ERROR' }) } : {}),
      emitIntent: () => undefined });
    return;
  }
  if (asked && !(asked in screens)) throw new Error(`no route "${asked}" (routes of src/screens/index.ts: ${Object.keys(screens).join(', ')})`);
  // `map`: the S03 Stage Map route over its own scene (`scene-map` of src/skin/art.ts).
  const route = asked ?? LAYERS[view]?.[0] ?? (view === 'game' || view === 'map' ? view : 'home');
  const shell = mountShell(root, route, view === 'home-menu', DECLARED[view], level);
  if (WINDOWS[view]) shell.open(`gallery.${view}`);
  LAYERS[view]?.[1](shell.ctx);
  // The screens' context of the view, for a check by hand in the page (`gallery.ctx.window.open(…)`).
  window.gallery.ctx = shell.ctx;
}

// ---- fingerprint: colors and look of every visible element, in DOM order through shadow roots

const canvas = document.createElement('canvas');
canvas.width = canvas.height = 1;
const paint = canvas.getContext('2d', { willReadFrequently: true });
const COLOR = /(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\((?:[^()]|\([^()]*\))*\)|#[0-9a-f]{3,8}\b/gi;
/** Every color in a computed value as rendered RGBA; transparent ones dropped. */
function colors(value) {
  return (value.match(COLOR) ?? []).map((color) => {
    paint.clearRect(0, 0, 1, 1); paint.fillStyle = '#000'; paint.fillStyle = color; paint.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = paint.getImageData(0, 0, 1, 1).data;
    return a ? `${r},${g},${b},${a}` : '';
  }).filter(Boolean);
}
const SHAPES = new Set(['path', 'circle', 'rect', 'ellipse', 'polygon', 'polyline', 'line', 'text', 'use']);

function* walk(node) {
  for (const child of node.children) { yield child; if (child.shadowRoot) yield* walk(child.shadowRoot); yield* walk(child); }
}
function zone(el) {
  for (let node = el; node; node = node.parentElement ?? node.getRootNode().host) {
    if (node.dataset?.slot) return node.dataset.slot;
    if (node.dataset?.screen) return `screen ${node.dataset.screen}`;
  }
  return 'page';
}
/** Elements with their color sets per property, font, border image and art URL. */
function fingerprint() {
  const out = [];
  let i = 0;
  for (const el of walk(document.body)) {
    i++;
    const box = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    if (box.width < 2 || box.height < 2 || s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) continue;
    const text = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    const props = { 'background-color': s.backgroundColor, 'background-image': s.backgroundImage,
      'box-shadow': s.boxShadow, 'text-shadow': s.textShadow, 'border-image-source': s.borderImageSource };
    for (const side of ['top', 'right', 'bottom', 'left']) {
      if (parseFloat(s[`border-${side}-width`]) > 0) props[`border-${side}-color`] = s[`border-${side}-color`];
    }
    if (text) props.color = s.color;
    if (SHAPES.has(el.localName)) { props.fill = s.fill; props.stroke = s.stroke; }
    const look = {};
    for (const [prop, value] of Object.entries(props)) { const list = colors(value); if (list.length) look[prop] = list.join(' '); }
    const art = el.getAttribute('href') ?? el.getAttribute('src') ?? '';
    const icon = art ? el.closest('[data-icon]')?.dataset.icon ?? el.parentElement?.closest('[data-icon]')?.dataset.icon : undefined;
    out.push({ key: `${i}:${el.localName}.${[...el.classList].join('.')}`, zone: zone(el),
      label: `${el.localName}${el.dataset.part ? `[data-part=${el.dataset.part}]` : ''}${el.classList.length ? `.${[...el.classList].join('.')}` : ''}`,
      look, font: text ? s.fontFamily : '', borderImage: s.borderImageSource, art, ...(icon ? { icon } : {}),
      ...(el.shadowRoot ? { theme: getComputedStyle(el).getPropertyValue('--game-shade').trim() } : {}) });
  }
  return out;
}

// ---- settled: the view is drawn and no longer changes (what the runner waits for, no fixed pause)

const frame = () => new Promise((done) => {
  // A page that is not the front one may get no frames: the timer is the fallback.
  const timer = setTimeout(done, 100);
  requestAnimationFrame(() => { clearTimeout(timer); done(); });
});
/** An <img> still loading (through shadow roots). Requests in flight are the runner's to wait for. */
const loading = () => all('img').some((img) => !img.complete);
/** Transitions and animations that end (through shadow roots); endless ones are not waited for. */
function running() {
  const roots = [document];
  for (const el of walk(document.body)) if (el.shadowRoot) roots.push(el.shadowRoot);
  return roots.flatMap((root) => root.getAnimations()).some((each) => (each.playState === 'running' || each.playState === 'pending')
    && Number.isFinite(each.effect?.getComputedTiming().endTime ?? Infinity));
}
/** Everything the fingerprint and the checks read: looks and boxes of every element. */
function state() {
  const boxes = [];
  for (const el of walk(document.body)) { const r = el.getBoundingClientRect(); boxes.push(`${r.x},${r.y},${r.width},${r.height}`); }
  return JSON.stringify([fingerprint(), boxes]);
}
/**
 * Resolves when the view is drawn: fonts loaded, no <img> loading, no transition running and the
 * page the same over three frames in a row. `false` when it still changes after `limit` ms.
 * No picture is loaded or decoded here a second time: the page is measured as the player gets it.
 */
async function settled(limit = 5000) {
  const end = performance.now() + limit;
  let last = '';
  let same = 0;
  while (performance.now() < end) {
    await document.fonts.ready;
    await frame();
    if (loading() || running() || document.fonts.status !== 'loaded') { same = 0; last = ''; continue; }
    const now = state();
    same = now === last ? same + 1 : 0;
    last = now;
    if (same >= 2) return true;
  }
  return false;
}

// ---- checks of a view (tests/skin-gallery.mjs fails on any): what the player must be able to read

/** Elements matching `selector` in the document and every open shadow root. */
function all(selector) {
  const roots = [document];
  for (const el of walk(document.body)) if (el.shadowRoot) roots.push(el.shadowRoot);
  return roots.flatMap((root) => [...root.querySelectorAll(selector)]);
}
const rect = (el) => el.getBoundingClientRect();
const overlap = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5
  && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;
const visible = (el) => { const r = rect(el); const s = getComputedStyle(el);
  return r.width > 1 && r.height > 1 && s.display !== 'none' && s.visibility !== 'hidden'; };
/** Kit picture keys of a category (an item without its own picture), never the game's. */
const CATEGORY = new Set(['bag', 'gift', 'star', 'chest-bronze', 'sparkle']);

/** The part of `r` inside `clip` (a scrolled column shows only that), or null. */
const within = (r, clip) => {
  const box = { left: Math.max(r.left, clip.left), right: Math.min(r.right, clip.right),
    top: Math.max(r.top, clip.top), bottom: Math.min(r.bottom, clip.bottom) };
  return box.right - box.left > 0.5 && box.bottom - box.top > 0.5 ? box : null;
};

/**
 * HUD columns and the top bar: every tile has a picture and an accessible name; no tile over
 * another, over the top bar or out of the window; a column holds what fits and scrolls the rest
 * (the kit's own overflow), the first entries of the declaration always in sight; the side of each
 * tile is the one of its kind; an offer tile shows its countdown.
 */
function hudChecks(view) {
  const found = [];
  const [entries] = DECLARED[view] ?? [HUD];
  // Top bar items as shown: a group clips what does not fit in its row (src/shell/skin.ts).
  const bar = [];
  for (const group of all('.hud[data-slot=top]').filter(visible)) {
    for (const item of group.querySelectorAll('.hud-item, .hud-add')) {
      if (!visible(item)) continue;
      // The group's clip margin (4px) keeps what stands a little over the row: the plus of a capsule.
      const g = rect(group);
      const part = within(rect(item), { left: g.left - 4, right: g.right + 4, top: g.top - 4, bottom: g.bottom + 4 });
      if (!part) continue;
      if (part.bottom - part.top < rect(item).height - 0.5 || part.right - part.left < rect(item).width - 0.5) {
        found.push(`top bar ${item.dataset.testid}: cut`);
      }
      bar.push(part);
    }
  }
  bar.forEach((a, i) => { if (bar.slice(i + 1).some((b) => overlap(a, b))) found.push('top bar: items over each other'); });
  const barBottom = Math.max(0, ...bar.map((r) => r.bottom));
  const shown = [];
  for (const side of ['left', 'right']) {
    const column = all(`.hud[data-slot=${side}]`).find(visible);
    const tiles = column ? [...column.querySelectorAll('.hud-item')] : [];
    const kind = side === 'left' ? 'activity' : 'money';
    const declared = entries.filter((entry) => entry.kind === kind).map((entry) => entry.id);
    const ids = tiles.map((tile) => tile.dataset.testid?.slice(4));
    if (JSON.stringify(ids) !== JSON.stringify(declared)) found.push(`HUD ${side}: ${ids.join(',')} instead of ${declared.join(',')}`);
    if (!column) continue;
    const clip = rect(column);
    if (clip.top < barBottom - 0.5) found.push(`HUD ${side}: column over the top bar`);
    if (clip.bottom > innerHeight + 0.5 || clip.left < -0.5 || clip.right > innerWidth + 0.5) found.push(`HUD ${side}: column out of the window`);
    let inSight = 0;
    for (const tile of tiles) {
      const id = tile.dataset.testid;
      if (!tile.getAttribute('aria-label')?.trim()) found.push(`${id}: no accessible name`);
      const art = tile.querySelector('.hud-glyph svg, .hud-glyph img');
      if (!art || rect(art).width < 8) found.push(`${id}: no picture`);
      const part = within(rect(tile), clip);
      if (!part) continue;
      const whole = part.bottom - part.top >= rect(tile).height - 0.5;
      if (whole && inSight === shown.filter((item) => item.side === side).length) inSight++;
      shown.push({ id, side, part });
    }
    // Tiles beyond the first ones in sight are reached by scrolling the column.
    if (inSight < tiles.length && column.scrollHeight <= column.clientHeight + 1) found.push(`HUD ${side}: tiles cut off and the column does not scroll`);
    if (inSight === 0 && tiles.length) found.push(`HUD ${side}: no whole tile in sight`);
  }
  shown.forEach((a, i) => {
    for (const b of shown.slice(i + 1)) if (overlap(a.part, b.part)) found.push(`${a.id} over ${b.id}`);
    for (const r of bar) if (overlap(a.part, r)) found.push(`${a.id} over the top bar`);
  });
  // The «+» of an item counter: there when the counter opens something, never otherwise.
  for (const counter of barCounters(DECLARED[view]?.[1] ?? TOP_BAR, entries).filter((item) => item.item)) {
    const plus = all(`[data-testid="hud.${counter.id}.add"]`).filter(visible);
    if (counter.open && !plus.length) found.push(`top bar ${counter.item}: no «+» (it opens ${JSON.stringify(counter.open)})`);
    if (!counter.open && all('.hud-add').some((el) => visible(el) && el.closest('.hud-capsule')?.querySelector(`[data-testid="hud.${counter.id}"]`))) {
      found.push(`top bar ${counter.item}: a «+» that opens nothing`);
    }
  }
  for (const entry of entries.filter((item) => item.offer)) {
    const timer = all(`[data-testid="hud.${entry.id}.timer"]`)[0];
    if (!timer || !visible(timer)) found.push(`hud.${entry.id}: no countdown`);
  }
  return found;
}

/** Problems of the shown view, as text; [] when it reads right. */
function checks(view) {
  const found = [];
  // A 9-slice picture never squashed: an element is not smaller than its slices.
  for (const el of all('*')) {
    const s = getComputedStyle(el);
    if (s.borderImageSource === 'none' || !visible(el)) continue;
    const r = rect(el);
    // border-image-width: a number is a multiple of the border width, a length is itself, a
    // percentage is of the box; `auto` is the slice, read as the border width.
    const sides = ['top', 'right', 'bottom', 'left'];
    const given = s.borderImageWidth.split(/\s+/);
    const box = given.length === 1 ? [0, 0, 0, 0] : given.length === 2 ? [0, 1, 0, 1] : given.length === 3 ? [0, 1, 2, 1] : [0, 1, 2, 3];
    const widths = sides.map((side, i) => {
      const value = given[box[i]];
      const border = parseFloat(s[`border-${side}-width`]) || 0;
      if (value.endsWith('px')) return parseFloat(value);
      if (value.endsWith('%')) return parseFloat(value) / 100 * (i % 2 ? r.width : r.height);
      return value === 'auto' ? border : (parseFloat(value) || 0) * border;
    });
    if (r.height + 0.5 < widths[0] + widths[2] || r.width + 0.5 < widths[1] + widths[3]) {
      found.push(`border image squashed: ${el.localName}.${[...el.classList].join('.')} ${Math.round(r.width)}x${Math.round(r.height)} < slices ${widths.join('/')}`);
    }
  }
  // Window head: the title in the middle of the window, clear of the close button.
  for (const head of all('.dialog>.dialog-head, [data-part=window]>[data-part=window-head]')) {
    const title = head.querySelector('[data-skin-slot=title], [data-part=window-title]');
    const close = head.querySelector('.dialog-close, [data-part=window-close]');
    if (!title || !visible(title) || getComputedStyle(head).display === 'contents') continue;
    const frame = rect(head.parentElement);
    const t = rect(title);
    const range = document.createRange(); range.selectNodeContents(title);
    const text = range.getBoundingClientRect();
    if (Math.abs((t.left + t.right) / 2 - (frame.left + frame.right) / 2) > 2) found.push(`title off center: ${title.textContent}`);
    if (close && visible(close) && overlap(text, rect(close))) found.push(`title under the close button: ${title.textContent}`);
  }
  if (view === 'reward') {
    const tiles = all('.reward-grid-item');
    if (!tiles.length) found.push('reward: no item tile');
    for (const tile of tiles) {
      const entry = tile.querySelector('.reward-grid-entry');
      entry?.focus({ preventScroll: true });
      const art = tile.querySelector('.reward-art [data-icon], .reward-art img');
      const name = tile.querySelector('.reward-name');
      const id = tile.dataset.rewardId;
      const key = art?.dataset.icon;
      if (!art) found.push(`reward ${id}: no picture`);
      else if (!key || CATEGORY.has(key) || (items.icon(id) && key !== items.icon(id))) {
        found.push(`reward ${id}: picture ${key ?? 'none'} is not the declared one (${items.icon(id) ?? 'ITEMS has none'})`);
      }
      if (!name || !visible(name) || !name.textContent.trim()) found.push(`reward ${id}: name not shown`);
      else if (art && overlap(rect(name), rect(art))) found.push(`reward ${id}: name over the picture`);
      entry?.blur();
    }
  }
  if (view.startsWith('home')) found.push(...hudChecks(view));
  // A window or an overlay is open: its dim covers the viewport, top bar included.
  found.push(...globalThis.modalLayers.problems());
  if ((WINDOWS[view] || LAYERS[view]) && !globalThis.modalLayers.measure().open) found.push('no window or overlay open');
  if (view === 'game-window') found.push(...globalThis.modalLayers.gameWindow(RESULT.title, { actions: RESULT.actions.length }));
  const spec = GAME_WINDOWS[view]?.[1];
  if (spec) {
    found.push(...globalThis.modalLayers.gameWindow(spec.title, { actions: spec.actions.length, body: Boolean(spec.body),
      close: spec.dismissible !== false }));
  }
  if (view === 'profile') {
    const terms = all('[data-part=system-profile] dt');
    const values = all('[data-part=system-profile] dd');
    for (const dd of values) {
      const text = dd.textContent.trim();
      if (/^[0-9a-f]{16,}$/i.test(text)) found.push(`profile: technical value ${text}`);
      if (/^[a-z]{2}(?:-[A-Za-z]{2,4})?$/.test(text)) found.push(`profile: locale code ${text}`);
      if (!text || text === '—') found.push(`profile: empty line ${dd.dataset.field}`);
    }
    const lefts = new Set(terms.map((el) => Math.round(rect(el).left)));
    const rights = new Set(values.map((el) => Math.round(rect(el).right)));
    if (lefts.size > 1 || rights.size > 1) found.push(`profile: lines not in columns (labels at ${[...lefts]}, values end at ${[...rights]})`);
    terms.forEach((dt, i) => { if (values[i] && overlap(rect(dt), rect(values[i]))) found.push(`profile: label over value ${dt.textContent}`); });
  }
  return found;
}

const params = new URLSearchParams(location.search);
window.gallery = { ready: false, views: VIEWS, settled, fingerprint, checks, all, tintColors: TINT_COLORS,
  // The skin itself declares raster buttons (src/skin/art.ts `button-base`).
  rasterButtons: 'button-base' in SKIN.assets,
  // Pictures of the game's items and offers (an offer's is the icon of its HUD tile), not kit icons.
  items: [...Object.keys(SKIN.items), ...Object.keys(SKIN.offers).map((key) => `offer-${key}`)] };
show(params.get('skin') ?? 'game', params.get('view') ?? 'home', params.get('tint'), params.get('route') ?? undefined,
  Number(params.get('level')) || 1).then(() => { window.gallery.ready = true; },
  (cause) => { window.gallery.error = String(cause?.message ?? cause); });

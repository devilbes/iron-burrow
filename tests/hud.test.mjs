// The game's HUD entries and top bar counters (`HUD`, `TOP_BAR` of src/screens/index.ts) as the
// kit registries take them (src/shell/hud-plan.ts): the side rule, the order, what the published
// `ui.hud/layout` record may and may not change, offer tiles, and the readiness of the
// declaration — every game tile and counter with a picture of the skin and a localized name.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { stockIcons } from '../scripts/stock-skin.mjs';
import { flatten, readStrings } from '../scripts/strings.mjs';
import { transpile } from './helpers/boot-modules.mjs';

const load = transpile(['shell/hud-plan', 'screens/index', 'boot/ids', 'skin/art', 'skin/icons', 'shell/icon-aliases']);
const plan = await load('shell/hud-plan');
const { HUD, TOP_BAR } = await load('screens/index');
const { hudLayout, hudProblems, offerPlacements, offerTile, barCounters, barProblems, moduleCounter, isGameTile, counterOpen } = plan;
const root = new URL('../', import.meta.url);

const sides = (layout) => Object.fromEntries(Object.entries(layout.items).map(([id, item]) => [id, `${item.slot} ${item.order}`]));

test('side by meaning: activities left, money right, in declaration order per column', () => {
  const layout = hudLayout([
    { id: 'daily-rewards', kind: 'activity' }, { id: 'shop', kind: 'money' },
    { id: 'event', kind: 'activity', icon: 'star', label: 'x' },
    { id: 'offer-starter', kind: 'money', icon: 'gift', label: 'x', offer: true },
  ], undefined);
  assert.equal(layout.unlisted, 'hide');
  assert.deepEqual(sides(layout), { 'daily-rewards': 'left 10', shop: 'right 10', event: 'left 20', 'offer-starter': 'right 20' });
});

// Holds for any game: the template's own entries and whatever a game declares instead.
test('the declared HUD: no problems, every activity on the left, every money entry on the right', () => {
  assert.deepEqual(hudProblems(HUD), []);
  const layout = hudLayout(HUD, undefined);
  for (const entry of HUD) {
    const item = layout.items[entry.id];
    assert.ok(item, `${entry.id}: declared but not placed`);
    assert.equal(item.slot, entry.kind === 'money' ? 'right' : 'left', `${entry.id}: ${entry.kind} on the wrong side`);
  }
  assert.equal(Object.keys(layout.items).length, HUD.length, 'nothing but the declared entries');
});

test('the published record hides or segments a declared tile, never moves or adds one', () => {
  const published = { unlisted: 'show', items: {
    shop: { slot: 'left', order: 1, visible: false },
    leaderboards: { filters: { segment: 'a' }, badge: { kind: 'dot' } },
    inventory: { slot: 'left', visible: true },
    profile: { visible: true },
  } };
  const layout = hudLayout(HUD, published);
  assert.equal(layout.unlisted, 'hide');
  assert.deepEqual(layout.items.shop, { slot: 'right', order: 10, visible: false });
  assert.deepEqual(layout.items.leaderboards, { slot: 'left', order: 20, visible: true, filters: { segment: 'a' }, badge: { kind: 'dot' } });
  assert.equal(layout.items.inventory, undefined);
  assert.equal(layout.items.profile, undefined);
});

test('run-time state: hidden tiles and offer pictures', () => {
  const entries = [...HUD, { id: 'offer-starter', kind: 'money', icon: 'gift', label: 'x', offer: true }];
  const layout = hudLayout(entries, undefined, new Set(['leaderboards']), new Map([['offer-starter', 'offer-starter_pack']]));
  assert.equal(layout.items.leaderboards.visible, false);
  assert.equal(layout.items['offer-starter'].icon, 'offer-starter_pack');
  assert.equal(layout.items['offer-starter'].visible, true);
});

test('declaration problems are named', () => {
  const problems = hudProblems([
    { id: 'event', kind: 'activity' , icon: 'star' },
    { id: 'quests', kind: 'activity', label: 'x' },
    { id: 'shop', kind: 'money', icon: 'shop' },
    { id: 'inventory', kind: 'money' },
    { id: 'deal', kind: 'activity', icon: 'gift', label: 'x', offer: true },
    { id: 'event', kind: 'left', icon: 'star', label: 'x' },
    { id: 'Bad Id', kind: 'money', icon: 'gift', label: 'x' },
  ]);
  for (const part of ['HUD event: no label', 'HUD quests: no icon', 'HUD shop: a module tile', 'HUD inventory: not a HUD entry',
    'HUD deal: an offer is money', 'HUD event: declared twice', 'HUD event: kind must be', 'HUD Bad Id: id must match']) {
    assert.ok(problems.some((problem) => problem.startsWith(part)), `${part} in ${problems.join(' | ')}`);
  }
});

test('an offer tile finds its placements in the ui.windows/main triggers (element or hud:item:opened)', () => {
  const windows = { triggers: [
    { id: 'a', on: { element: 'hud:offer-starter' }, do: [{ module: 'iap', action: 'offer', params: { placement: 'placement_starter' } }] },
    { id: 'b', on: { event: 'hud:item:opened' }, payload: { id: 'offer-starter' },
      do: [{ module: 'iap', action: 'offer', params: { placement: 'placement_flash' } }, { module: 'iap', action: 'main' }] },
    { id: 'c', on: { element: 'hud:shop' }, do: [{ module: 'iap', action: 'main' }] },
  ] };
  assert.deepEqual(offerPlacements(windows, 'offer-starter'), ['placement_starter', 'placement_flash']);
  assert.deepEqual(offerPlacements(windows, 'shop'), []);
  assert.deepEqual(offerPlacements(undefined, 'shop'), []);
});

test('an offer tile shows the first available offer: its picture, its end as a countdown; none — hidden', () => {
  const now = Date.UTC(2026, 10, 16, 12);
  const at = (h) => new Date(now + h * 3_600_000).toISOString();
  const offers = [{ key: 'gone', available: false }, { key: 'ended', available: true, endsAt: at(-1) },
    { key: 'flash', available: true, endsAt: at(5) }, { key: 'starter', available: true }];
  assert.deepEqual(offerTile(offers, { flash: 'offers/flash.png' }, now),
    { visible: true, offerKey: 'flash', icon: 'offer-flash', endsAt: now + 5 * 3_600_000 });
  assert.deepEqual(offerTile(offers.slice(3), {}, now), { visible: true, offerKey: 'starter' });
  assert.deepEqual(offerTile(offers.slice(0, 2), {}, now), { visible: false });
});

test('top bar: declared counters in order after the profile; module currencies dropped, the level placed', () => {
  const counters = barCounters([{ kind: 'item', id: 'item_coins', label: 'a' }, { kind: 'item', id: 'item_stars', label: 'b', icon: 'star' },
    { kind: 'level', label: 'c' }], [{ id: 'shop', kind: 'money' }]);
  const shop = { element: 'hud:shop' };
  assert.deepEqual(counters, [
    { id: 'currency.item_coins', item: 'item_coins', icon: 'item_coins', label: 'a', order: 20, open: shop },
    { id: 'currency.item_stars', item: 'item_stars', icon: 'star', label: 'b', order: 30, open: shop },
    { id: 'level', order: 40, label: 'c' }]);
  const level = { id: 'level', icon: 'star', label: 'sdk.topbar.level', slot: 'right', contexts: ['main'] };
  assert.deepEqual(moduleCounter(level, counters), { ...level, slot: 'left', order: 40, label: 'c', contexts: ['main', 'core'] });
  assert.equal(moduleCounter({ id: 'currency.item_coins', icon: 'coins', label: 'x' }, counters), undefined);
  assert.equal(moduleCounter(level, barCounters([{ kind: 'item', id: 'item_coins', label: 'a' }])), undefined);
  assert.deepEqual(barProblems([{ kind: 'item', id: 'x' }, { kind: 'level' }, { kind: 'level' }]),
    ['TOP_BAR x: no label', 'TOP_BAR level: declared twice']);
});

test('top bar: a counter and its «+» open the shop by default, or what the entry says; nothing — no «+»', () => {
  const withShop = [{ id: 'shop', kind: 'money' }];
  const coins = { kind: 'item', id: 'item_coins', label: 'a' };
  assert.deepEqual(counterOpen(coins, withShop), { element: 'hud:shop' });
  assert.equal(counterOpen(coins, [{ id: 'daily-rewards', kind: 'activity' }]), undefined, 'no shop declared: nothing to open');
  assert.equal(counterOpen({ ...coins, open: false }, withShop), undefined);
  assert.deepEqual(counterOpen({ ...coins, open: { element: 'hud:offer-gems' } }, []), { element: 'hud:offer-gems' });
  assert.deepEqual(counterOpen({ ...coins, open: { route: 'game' } }, withShop), { route: 'game' });
  assert.equal(counterOpen({ kind: 'level' }, withShop), undefined);
  // The kit draws the «+» on `currency.*` capsules only: a counter with nothing to open is not one.
  const [plain, plus] = barCounters([{ ...coins, open: false }, { kind: 'item', id: 'item_gems', label: 'g' }], withShop);
  assert.equal(plain.id, 'item_coins');
  assert.equal(plain.open, undefined);
  assert.equal(plus.id, 'currency.item_gems');
  assert.deepEqual(barProblems([{ kind: 'item', id: 'level', label: 'x', open: false }]),
    ['TOP_BAR level: an item id the top bar uses for its own button']);
});

// Holds for any game: a declared counter opens what its entry says, the shop by default when the
// game has one, and nothing otherwise.
test('the declared top bar: no problems; every counter opens what counterOpen gives for its entry', () => {
  assert.deepEqual(barProblems(TOP_BAR), []);
  const counters = barCounters(TOP_BAR, HUD);
  const items = TOP_BAR.filter((entry) => entry.kind === 'item');
  for (const entry of items) {
    const counter = counters.find((one) => one.item === entry.id);
    assert.ok(counter, `${entry.id}: declared but not in the top bar`);
    assert.deepEqual(counter.open, counterOpen(entry, HUD), `${entry.id}: opens something else`);
    assert.equal(counter.id.startsWith('currency.'), counter.open !== undefined, `${entry.id}: the «+» only with something to open`);
  }
});

// ---- readiness: what the player sees of the declaration

const strings = flatten(readStrings(fileURLToPath(root)).record.en);
const { ITEMS } = await load('skin/art');
const { ICONS } = await load('skin/icons');
const { ICON_ALIASES } = await load('shell/icon-aliases');
const stock = await stockIcons(root);
/** A skin icon key the kit can draw: a stock or game icon, an alias of the shell, an item of ITEMS. */
const drawable = (key) => Boolean(key) && (Object.hasOwn(stock, `icon-${key}`) || Object.hasOwn(ICONS, `icon-${key}`)
  || Object.hasOwn(ICON_ALIASES, `icon-${key}`) || Object.hasOwn(ITEMS, key));

test('readiness: every game tile and counter has a picture of the skin and a localized name', { skip: !stock && 'no SDK packages (vendor/)' }, () => {
  const problems = [...hudProblems(HUD), ...barProblems(TOP_BAR)];
  for (const entry of HUD.filter(isGameTile)) {
    if (entry.icon && !drawable(entry.icon)) problems.push(`HUD ${entry.id}: icon ${entry.icon} is not in the skin`);
    if (entry.label && !Object.hasOwn(strings, entry.label)) problems.push(`HUD ${entry.id}: label ${entry.label} is not in the strings record (configs/remote/localization/)`);
  }
  for (const counter of barCounters(TOP_BAR, HUD)) {
    if (counter.icon && !drawable(counter.icon)) problems.push(`TOP_BAR ${counter.id}: icon ${counter.icon} is not in the skin (ITEMS has no picture of ${counter.item})`);
    if (counter.label && !Object.hasOwn(strings, counter.label)) problems.push(`TOP_BAR ${counter.id}: label ${counter.label} is not in the strings record (configs/remote/localization/)`);
  }
  assert.deepEqual(problems, [], 'HUD / TOP_BAR of src/screens/index.ts');
});

// Readiness of the game skin (src/skin/), without a browser: theme.css sets every color input
// of the stock skin (src/shell/stock-colors.ts) and none of the variables the stock sheets derive;
// art and font files exist and are used; sheets keep to the rules; the skin fits its weight.
// SKIN_STRICT=1 also fails while any stock color keeps its stock value or any icon the gallery
// shows (tests/skin-gallery/visible-icons.json) still comes from the stock atlas (a skin not yet
// done; the neutral template is stock by design), or while an item of the inventory catalog
// (configs/remote/inventory.catalog/) has no picture of the game (ITEMS of src/skin/art.ts: a file,
// not a stock `icon:`) or no localized title. The look itself: tests/skin-gallery.mjs.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { stockIcons as stockAssets } from '../scripts/stock-skin.mjs';
import { transpile } from './helpers/boot-modules.mjs';

const load = transpile(['skin/index', 'skin/art', 'skin/icons', 'skin/sheets', 'shell/stock-colors', 'shell/icon-aliases']);
const { SKIN, SKIN_WEIGHT_LIMIT } = await load('skin/index');
const { STOCK_COLORS, STOCK_DERIVED } = await load('shell/stock-colors');
const { gameAssets, itemArt, ICON_REF } = await load('shell/icon-aliases');
const root = new URL('../', import.meta.url);
const ART = new URL('assets/skin/', root);
const theme = readFileSync(new URL('src/skin/theme.css', root), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const sheets = [SKIN.common, ...Object.values(SKIN.css)];
const keys = (() => {
  const file = new URL('vendor/@manygamescorp/ui-kit/dist/skin-keys.json', root);
  return existsSync(file) ? new Set(JSON.parse(readFileSync(file, 'utf8')).keys) : undefined;
})();

/** theme.css: variable → { value, host } (host: set in a rule that reaches kit components). */
const vars = new Map();
for (const [, selector, body] of theme.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  for (const [, name, value] of body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+)/g)) {
    vars.set(name, { value: value.trim(), host: /:host/.test(selector) || vars.get(name)?.host === true });
  }
}
/** A value with its variables filled in. */
const fill = (value, depth = 0) => (depth > 20 ? value : value.replace(/var\(\s*(--[a-z0-9-]+)\s*\)/g,
  (all, name) => (vars.has(name) ? fill(vars.get(name).value, depth + 1) : all)));
const rgba = (hex, alpha = 1) => {
  const h = hex.length === 4 ? hex.slice(1).split('').map((c) => c + c).join('') : hex.slice(1, 7);
  return `${[0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',')},${+alpha}`;
};
/** Every color as `r,g,b,a`, color-mix with transparent included, spaces dropped. */
const resolve = (value) => fill(value).toLowerCase()
  .replace(/color-mix\(\s*in srgb\s*,\s*(#[0-9a-f]{3,6})\s+([\d.]+)%\s*,\s*transparent\s*\)/g, (all, hex, p) => rgba(hex, p / 100))
  .replace(/#[0-9a-f]{6}(?![0-9a-f])|#[0-9a-f]{3}(?![0-9a-f])/g, (hex) => rgba(hex))
  .replace(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/g, (all, r, g, b, a = '1') => `${+r},${+g},${+b},${+a}`)
  .replace(/\s+/g, '');
/** A stock color whose value in theme.css still renders the stock value. */
const unchanged = (name) => vars.has(name) && resolve(vars.get(name).value) === resolve(STOCK_COLORS[name]);

/** Icons the gallery shows (tests/skin-gallery.mjs keeps the list) that still come from the stock atlas. */
async function stockIcons() {
  const stock = await stockAssets(root);
  if (!stock) return undefined;
  const assets = { ...stock, ...gameAssets(stock, SKIN.assets) };
  const atlas = (url) => url?.replace(/#.*$/, '');
  const visible = JSON.parse(readFileSync(new URL('tests/skin-gallery/visible-icons.json', root), 'utf8'));
  return visible.filter((key) => {
    const url = assets[`icon-${key}`] ?? (key === 'close' ? assets.close : undefined);
    return !url || Object.values(stock).some((each) => atlas(each) === atlas(url));
  });
}
const iconsLeft = await stockIcons();

function files(dir, base = dir.replace(/\/$/, '')) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path, base) : [path.slice(base.length + 1)];
  });
}

test('theme.css sets every color input of the stock skin', () => {
  const missing = Object.keys(STOCK_COLORS).filter((name) => !vars.has(name));
  assert.deepEqual(missing, [], `add to src/skin/theme.css: ${missing.join(', ')}`);
});

test('theme.css sets the focal point of the scene art', () => {
  assert.ok(vars.has('--game-scene-position'), 'add --game-scene-position to src/skin/theme.css');
  assert.ok(routes.length > 0, 'Route of src/screens/index.ts not found');
});

test('theme.css does not set on :host what the stock sheets derive (set their --mp-card-* inputs)', () => {
  const wrong = STOCK_DERIVED.filter((name) => vars.get(name)?.host);
  assert.deepEqual(wrong, []);
});

test('strict (SKIN_STRICT=1): every stock color is changed', { skip: process.env.SKIN_STRICT !== '1' }, () => {
  const stock = Object.keys(STOCK_COLORS).filter(unchanged);
  assert.deepEqual(stock, [], `still stock: ${stock.join(', ')}`);
});

test('icons the player sees: stock ones listed; SKIN_STRICT=1: none left', { skip: !iconsLeft && 'no SDK packages (vendor/)' }, (t) => {
  if (iconsLeft.length) t.diagnostic(`stock icons (scripts/skin-icons.mjs, src/skin/art.ts): ${iconsLeft.join(' ')}`);
  if (process.env.SKIN_STRICT === '1') assert.deepEqual(iconsLeft, [], `still stock: ${iconsLeft.join(' ')}`);
});

test('art and font files exist, and every file in assets/skin/ is declared', () => {
  const pictures = [...Object.values(SKIN.items), ...Object.values(SKIN.offers)].filter((value) => !value.startsWith(ICON_REF));
  const declared = [...Object.values(SKIN.assets), ...pictures, ...SKIN.fonts.map((font) => font.url)].map((path) => path.replace(/#.*$/, ''));
  const missing = declared.filter((path) => !existsSync(new URL(path, ART)));
  assert.deepEqual(missing, [], `missing in assets/skin/: ${missing.join(', ')}`);
  const unused = files(new URL(ART).pathname).filter((path) => !declared.includes(path));
  assert.deepEqual(unused, [], `not declared in src/skin/art.ts: ${unused.join(', ')}`);
});

/** Routes of the screens (`Route`, src/screens/index.ts): `scene-<route>` is that screen's scene art. */
const routes = [.../export type Route\s*=([^;]+);/.exec(readFileSync(new URL('src/screens/index.ts', root), 'utf8'))?.[1]
  .matchAll(/'([^']+)'/g) ?? []].map((m) => m[1]);

test('every declared picture is used: by the kit, the shell (scene), a sheet or as skin:<key> in the code', { skip: !keys && 'no SDK packages (vendor/)' }, () => {
  const code = files(new URL('src/', root).pathname).filter((path) => path.endsWith('.ts'))
    .map((path) => readFileSync(new URL(`src/${path}`, root), 'utf8')).join('\n');
  const used = (key) => keys?.has(`asset:${key}`) || /^(icon-|offer-)/.test(key)
    || ['close', 'bar-track', 'bar-fill', 'page-texture', 'page-frame', 'scene', 'button-base', 'button-overlay', ...routes.map((r) => `scene-${r}`)].includes(key)
    || [theme, ...sheets].some((css) => css.includes(`var(--kit-asset-${key})`)) || code.includes(`skin:${key}`);
  const unused = Object.keys(SKIN.assets).filter((key) => !used(key));
  assert.deepEqual(unused, []);
});

test('component sheets target kit components', { skip: !keys && 'no SDK packages (vendor/)' }, () => {
  const unknown = Object.keys(SKIN.css).filter((name) => !keys.has(`component:${name}`));
  assert.deepEqual(unknown, []);
});

test('font families in theme.css and the sheets are declared, and every declared one is used', () => {
  const stock = new Set(['Onest', 'Unbounded', 'Segoe UI']);
  const declared = new Set(SKIN.fonts.map((font) => font.family));
  const named = new Set([theme, ...sheets].flatMap((css) => [...css.matchAll(/["']([^"']+)["']/g)].map((m) => m[1]))
    .filter((name) => !/[/.]/.test(name)));
  assert.deepEqual([...named].filter((name) => !declared.has(name) && !stock.has(name)), []);
  assert.deepEqual([...declared].filter((name) => !named.has(name)), []);
});

test('sheets: no literal colors, !important, data-testid, nth-child or pixel-width media queries', () => {
  const rules = [[/#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklch)\(|\b(?:white|black|red|blue|green|gold|gray|grey)\b/i, 'literal color'],
    [/!important/, '!important'], [/data-testid/, 'data-testid'], [/nth-(?:last-)?(?:child|of-type)/, 'nth-child'],
    [/@media[^{]*(?:width|height)\s*:\s*\d+px/, 'pixel-width media query']];
  const found = Object.entries({ COMMON: SKIN.common, ...SKIN.css })
    .flatMap(([name, css]) => rules.filter(([pattern]) => pattern.test(css)).map(([, what]) => `${name}: ${what}`));
  assert.deepEqual(found, []);
});

test('every .css file of the skin is attached', () => {
  const css = [...files(new URL('src/skin/', root).pathname), ...files(new URL(ART).pathname)].filter((path) => path.endsWith('.css'));
  assert.deepEqual(css.filter((path) => path !== 'theme.css'), [], 'sheets live in src/skin/sheets.ts');
  assert.ok(SKIN.theme.endsWith('/theme.css'));
});

test('the skin fits SKIN_WEIGHT_LIMIT', () => {
  const art = files(new URL(ART).pathname).reduce((sum, path) => sum + statSync(new URL(path, ART)).size, 0);
  const text = [theme, ...sheets].reduce((sum, css) => sum + Buffer.byteLength(css), 0);
  assert.ok(art + text <= SKIN_WEIGHT_LIMIT, `${art + text} bytes > ${SKIN_WEIGHT_LIMIT}`);
});

/** Items of the inventory catalog samples: id, title key, and what the player sees of them. */
const catalog = files(new URL('configs/remote/inventory.catalog/', root).pathname).filter((path) => path.endsWith('.json'))
  .map((path) => JSON.parse(readFileSync(new URL(`configs/remote/inventory.catalog/${path}`, root), 'utf8')));
const strings = JSON.parse(readFileSync(new URL('configs/remote/localization/strings.json', root), 'utf8'));
const titled = (key) => Object.values(strings).some((tree) => typeof key === 'string'
  && typeof key.split('.').reduce((node, part) => (node && typeof node === 'object' ? node[part] : undefined), tree) === 'string');
const offers = files(new URL('configs/remote/iap.offers/', root).pathname).filter((path) => path.endsWith('.json'))
  .map((path) => path.replace(/\.json$/, ''));

test('items of the catalog: a picture in ITEMS and a localized title; SKIN_STRICT=1: own pictures, none missing', (t) => {
  const keys = (value) => value.startsWith(ICON_REF) ? 'kit icon' : 'own picture';
  const noPicture = catalog.filter((item) => !Object.hasOwn(SKIN.items, item.itemId)).map((item) => item.itemId);
  const stockPicture = catalog.filter((item) => Object.hasOwn(SKIN.items, item.itemId) && keys(SKIN.items[item.itemId]) === 'kit icon')
    .map((item) => `${item.itemId} (${SKIN.items[item.itemId]})`);
  const noTitle = catalog.filter((item) => !titled(item.display?.titleKey)).map((item) => item.itemId);
  const unknown = Object.keys(SKIN.items).filter((id) => !catalog.some((item) => item.itemId === id));
  if (noPicture.length) t.diagnostic(`items without a picture (the kit shows its category picture): ${noPicture.join(' ')}`);
  if (stockPicture.length) t.diagnostic(`items with a stock kit icon, not the game's own picture: ${stockPicture.join(' ')}`);
  if (noTitle.length) t.diagnostic(`items without a localized title (display.titleKey): ${noTitle.join(' ')}`);
  assert.deepEqual(unknown, [], 'ITEMS names items that are not in configs/remote/inventory.catalog/');
  assert.deepEqual(Object.keys(SKIN.offers).filter((key) => !offers.includes(key)), [],
    'OFFERS names offers that are not in configs/remote/iap.offers/');
  if (process.env.SKIN_STRICT === '1') {
    assert.deepEqual([...noPicture, ...stockPicture, ...noTitle], [], 'items the player cannot recognize');
  }
});

test('item and offer pictures become the skin assets the kit draws', () => {
  const { files: own, aliases } = itemArt({ item_a: 'items/a.png', item_b: 'icon:gift' },
    { offer_x: 'offers/x.png' }, 'item_a');
  assert.deepEqual(own, { 'icon-item_a': 'items/a.png', 'offer-offer_x': 'offers/x.png' });
  assert.deepEqual(aliases, { 'icon-item_b': 'icon-gift', 'icon-offer-offer_x': 'offer-offer_x', 'icon-coins': 'icon-item_a' });
  const assets = gameAssets({ 'icon-gift': 'stock.png#sprite=0,0,1,1,2,2', 'icon-coins': 'stock.png' },
    { ...own }, aliases);
  assert.equal(assets['icon-item_b'], 'stock.png#sprite=0,0,1,1,2,2');
  assert.equal(assets['icon-coins'], 'items/a.png');
  // The offer picture is also the icon of its HUD tile (`offer-<key>`).
  assert.equal(assets['icon-offer-offer_x'], 'offers/x.png');
});

// The first paint (index.html, before any script): the neutral inline loading line, nothing of the
// stock skin — no stock color, no request (no src/href besides the entry script), no brand text.
test('index.html: neutral inline loader from the first paint, no stock blue', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<div id="boot-loader"[^>]*>/, 'no inline loader (#boot-loader)');
  assert.match(html, /<style>[\s\S]*#boot-loader\{[^}]*position:fixed/, 'the loader has no inline style');
  const stock = Object.values(STOCK_COLORS).filter((value) => /^#[0-9a-f]{3,8}$/i.test(value))
    .filter((value) => !/^#f{3}(?:f{3})?$/i.test(value)).map((value) => value.toLowerCase());
  const found = stock.filter((value) => html.toLowerCase().includes(value));
  assert.deepEqual(found, [], `stock colors in index.html: ${found.join(' ')}`);
  assert.doesNotMatch(html, /ManyPlay/i);
  const refs = [...html.matchAll(/\s(?:src|href)="([^"]*)"/g)].map((match) => match[1]);
  assert.deepEqual(refs, ['./app/main.js'], `requests before the entry: ${refs.join(' ')}`);
});

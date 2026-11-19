// Raster buttons of the skin (src/shell/button-tint.ts), without a browser: off until the skin
// declares `button-base`; with it every button kind is drawn from that one picture and differs by
// its color variable of theme.css only; the overlay is added only when declared. How it looks in
// a browser (colors, texture, edges at two widths): tests/skin-gallery.mjs, view `buttons`.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { transpile } from './helpers/boot-modules.mjs';
import { decodePng, encodePng } from './helpers/png.mjs';

const load = transpile(['shell/button-tint', 'skin/art', 'skin/icons']);
const { buttonTintCss, BUTTON_KINDS, BUTTON_BASE, BUTTON_OVERLAY } = await load('shell/button-tint');
const { ASSETS } = await load('skin/art');
const theme = readFileSync(new URL('../src/skin/theme.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const kinds = Object.keys(BUTTON_KINDS);
const on = buttonTintCss({ [BUTTON_BASE]: 'button.webp' });

test('no button-base in the skin: no rule at all', () => {
  assert.equal(buttonTintCss({}), '');
  assert.equal(buttonTintCss({ frame: 'frame.webp', [BUTTON_OVERLAY]: 'rim.webp' }), '', 'the overlay alone turns nothing on');
  if (!(BUTTON_BASE in ASSETS)) assert.equal(buttonTintCss(ASSETS), '', 'the skin of src/skin/ declares no button-base');
});

test('every kind: the same picture, its own color variable', () => {
  assert.deepEqual(kinds, ['primary', 'secondary', 'buy', 'danger']);
  // The only pictures in the rules: the base (and no picture per kind).
  assert.deepEqual([...new Set(on.match(/var\(--kit-asset-[a-z-]+\)/g))], [`var(--kit-asset-${BUTTON_BASE})`]);
  for (const kind of kinds) {
    const rule = `:is(${BUTTON_KINDS[kind].join(',')}){--game-button-tint:var(--game-button-${kind});`;
    assert.ok(on.includes(rule), `${kind}: no rule that gives the kind its color`);
    assert.equal(on.split(`var(--game-button-${kind})`).length, 2, `${kind}: its color is read once, by that rule`);
  }
  // One list of all kinds carries the picture, the 9-slice and the states.
  const all = `:is(${kinds.flatMap((kind) => BUTTON_KINDS[kind]).join(',')})`;
  const drawn = on.split(all).slice(1);
  assert.ok(drawn.length >= 5, 'the rules of the picture are written for all kinds at once');
  assert.match(drawn[0], /border-image:var\(--kit-asset-button-base\) var\(--game-button-slice\) fill\/var\(--game-button-edge\)/);
  assert.ok(on.includes('::before{') && on.includes('background:var(--game-button-tint)') && on.includes('drop-shadow(0 512px 0 var(--game-button-tint))'),
    'the color layer reads the kind variable (9-slice mask, and the drop shadow where there is no such mask)');
  assert.match(on, /:hover\{[^}]*brightness\(/);
  assert.match(on, /:active\{[^}]*translateY\(/);
  assert.match(on, /:is\(:disabled,\[aria-disabled=true\]\)\{[^}]*grayscale\(1\)/);
  assert.doesNotMatch(on, /width:|min-width|flex:/, 'the width of a button stays the kit\'s');
});

test('colors only as variables; text and brand buttons are left alone', () => {
  assert.doesNotMatch(on, /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\(|!important/i);
  assert.ok(on.includes(':not(.mp-button--text,.mp-button--social,.std-action--text)'));
});

test('the overlay: one more untinted layer, only when declared', () => {
  assert.doesNotMatch(on, /::after|button-overlay/);
  const both = buttonTintCss({ [BUTTON_BASE]: 'button.webp', [BUTTON_OVERLAY]: 'rim.webp' });
  const after = /::after\{([^}]*)\}/.exec(both)?.[1] ?? '';
  assert.match(after, /border-image:var\(--kit-asset-button-overlay\) var\(--game-button-overlay-slice,var\(--game-button-slice\)\) fill/);
  assert.doesNotMatch(after, /tint|blend|filter/, 'the overlay is not tinted');
  assert.equal(both.replace(/:is\([^{]*\)[^{]*::after\{[^}]*\}/, ''), on, 'nothing else changes with the overlay');
});

test('theme.css has the variables the raster buttons read', () => {
  const names = ['--game-button-slice', '--game-button-edge', '--game-button-text', ...kinds.map((kind) => `--game-button-${kind}`)];
  assert.deepEqual(names.filter((name) => !new RegExp(`${name}\\s*:`).test(theme)), []);
});

test('png helper: what is written is what is read', () => {
  const picture = decodePng(encodePng(5, 3, (x, y) => [x * 50, y * 100, 255 - x * 50, x === 2 ? 0 : 255]));
  assert.deepEqual([picture.width, picture.height], [5, 3]);
  assert.deepEqual(picture.at(4, 2), [200, 200, 55, 255]);
  assert.deepEqual(picture.at(2, 1), [100, 100, 155, 0]);
});

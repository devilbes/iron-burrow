// Raster buttons tinted by kind (src/shell/button-tint.ts), in a browser: the `buttons` view of
// the gallery under the game skin plus two test pictures made here, never files of the template —
// a grayscale plate with an uneven outline, a bevel and a grain, and an overlay (a rim, rivets).
// Checked: every kind is the same picture and differs by its color variable only; the colors on
// screen are the variables'; the texture shows; nothing is painted outside the outline; the edges
// are the same pixels on a content-wide and a stretched button (9-slice, corners not stretched);
// a disabled button has no color; the overlay lies on top untinted; and without `button-base` in
// the skin the buttons carry none of it.
import { encodePng, decodePng } from '../helpers/png.mjs';

/** The test picture: drawn at 2x, `slice` in its pixels, `edge` as shown. */
const ART = { width: 96, height: 64, slice: 24, edge: 12 };
const RIVET = [236, 226, 196];
const noise = (x, y) => { const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return v - Math.floor(v); };
/** Depth inside the uneven outline (> 0 inside), in picture pixels. */
function inside(x, y) {
  const r = 18;
  const cx = Math.min(Math.max(x, r), ART.width - r); const cy = Math.min(Math.max(y, r), ART.height - r);
  return r - 3 - Math.hypot(x - cx, y - cy) + 2.2 * Math.sin(x * 0.45) * Math.cos(y * 0.5) + 1.2 * Math.sin((x + y) * 0.9);
}
/** Grayscale base: no hue, mid-gray in the middle, light top and dark bottom edge, grain; alpha by the outline. */
const base = () => encodePng(ART.width, ART.height, (x, y) => {
  const d = inside(x + 0.5, y + 0.5);
  const half = ART.height / 2;
  const rim = Math.max(0, 1 - d / 9);
  const bevel = y < half ? rim * 70 * (1 - y / half) : -rim * 80 * ((y - half) / half);
  const grain = Math.sin(y * 1.7 + Math.sin(x * 0.21) * 2.4) * 14 + (noise(x, y) - 0.5) * 16;
  const v = Math.max(0, Math.min(255, Math.round(128 + bevel + grain)));
  return [v, v, v, Math.round(Math.max(0, Math.min(1, d)) * 255)];
});
/** Overlay: a dark rim along the outline and a light rivet at each side, transparent elsewhere. */
const overlay = () => encodePng(ART.width, ART.height, (x, y) => {
  const d = inside(x + 0.5, y + 0.5);
  if ([12, ART.width - 12].some((cx) => Math.hypot(x + 0.5 - cx, y + 0.5 - ART.height / 2) < 3.2)) return [...RIVET, 255];
  return [40, 28, 18, Math.round((d > 0 && d < 3.5 ? Math.min(1, d) * Math.min(1, 3.5 - d) : 0) * 255)];
});
/** Served by the gallery runner as /test-art/<name>.png. */
export const TEST_ART = { 'button-base': base(), 'button-overlay': overlay() };

const hex = (color) => [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
const far = (a, b) => Math.max(...a.slice(0, 3).map((v, i) => Math.abs(v - b[i])));
/** What the page knows of its buttons: box, kind, column and the styles the mechanism sets. */
const facts = () => window.gallery.all('.kinds-column button').map((el) => {
  const r = el.getBoundingClientRect();
  const s = getComputedStyle(el);
  const before = getComputedStyle(el, '::before');
  const after = getComputedStyle(el, '::after');
  return { kind: el.dataset.kind, width: el.parentElement.dataset.width, x: r.x, y: r.y, w: r.width, h: r.height,
    source: s.borderImageSource, slice: s.borderImageSlice, edge: s.borderImageWidth, tint: s.getPropertyValue('--game-button-tint').trim(),
    silhouette: before.content !== 'none', overlay: after.content !== 'none' ? after.borderImageSource : 'none' };
});

/**
 * Draws the `buttons` view with the test pictures in `engine` (a Playwright browser type) at every
 * size, writes `<shots>/buttons-tinted[-<engine>]-<w>x<h>.png`; returns the problems found.
 */
export async function tintedButtons({ engine, name, origin, shots, sizes }) {
  const problems = [];
  const browser = await engine.launch();
  try {
    const tab = await (await browser.newContext({ locale: 'en-US', reducedMotion: 'reduce' })).newPage();
    const draw = async (tint, [w, h]) => {
      await tab.setViewportSize({ width: w, height: h });
      await tab.goto(`${origin}/?skin=game&view=buttons${tint ? `&tint=${tint}` : ''}`);
      await tab.waitForFunction(() => window.gallery?.ready || window.gallery?.error, null, { timeout: 20000 });
      const failure = await tab.evaluate(() => window.gallery.error);
      if (failure) throw new Error(`buttons (tint ${tint}): ${failure}`);
      await tab.waitForLoadState('networkidle');
      await tab.evaluate(() => window.gallery.settled());
      return tab.evaluate(facts);
    };
    for (const size of sizes) {
      const where = `buttons tinted ${name} ${size.join('x')}`;
      const fail = (text) => problems.push(`${where}: ${text}`);
      const buttons = await draw('base', size);
      const colors = await tab.evaluate(() => window.gallery.tintColors);
      const file = `${shots}/buttons-tinted${name === 'chromium' ? '' : `-${name}`}-${size.join('x')}.png`;
      const shot = decodePng(await tab.screenshot({ path: file }));
      if (buttons.length !== 10) { fail(`${buttons.length} buttons, not five kinds in two widths`); continue; }
      // One picture, one 9-slice for every kind; the kinds differ by the color variable only.
      const sources = new Set(buttons.map((b) => b.source));
      if (sources.size !== 1 || !/\/test-art\/button-base\.png/.test([...sources][0])) fail(`not one picture for all kinds: ${[...sources].join(' ')}`);
      if (buttons.some((b) => b.slice !== `${ART.slice} fill` || b.edge !== `${ART.edge}px` || !b.silhouette)) {
        fail(`slices differ: ${[...new Set(buttons.map((b) => `${b.slice} / ${b.edge}`))].join(', ')}`);
      }
      for (const b of buttons) {
        const expected = colors[b.kind === 'disabled' ? 'primary' : b.kind];
        if (b.tint.toLowerCase() !== expected.toLowerCase()) fail(`${b.kind}: color ${b.tint}, not ${expected}`);
        if (b.w < 2 * ART.edge || b.h < 2 * ART.edge) fail(`${b.kind}: smaller than its edges`);
      }
      for (const kind of Object.keys(colors).concat('disabled')) {
        const narrow = buttons.find((b) => b.kind === kind && b.width === 'narrow');
        const wide = buttons.find((b) => b.kind === kind && b.width === 'wide');
        if (!(wide.w > narrow.w * 1.5)) { fail(`${kind}: two widths expected, ${narrow.w} and ${wide.w}`); continue; }
        // 9-slice: both edges of the stretched button are the pixels of the content-wide one.
        const strip = (b, right) => { const out = []; const x0 = Math.round(right ? b.x + b.w - ART.edge : b.x); const y0 = Math.round(b.y);
          for (let y = 0; y < Math.round(b.h); y++) for (let x = 0; x < ART.edge; x++) out.push(shot.at(x0 + x, y0 + y).join()); return out; };
        for (const right of [false, true]) {
          const a = strip(narrow, right); const b = strip(wide, right);
          const differ = a.filter((pixel, i) => pixel !== b[i]).length;
          if (a.length !== b.length || differ > a.length * 0.02) fail(`${kind}: ${right ? 'right' : 'left'} edge stretched (${differ} of ${a.length} pixels differ between the widths)`);
        }
        // Nothing outside the outline: the corner of the box is the panel behind it.
        const corner = shot.at(Math.round(wide.x), Math.round(wide.y)); const panel = shot.at(Math.round(wide.x) - 4, Math.round(wide.y));
        if (far(corner, panel) > 6) fail(`${kind}: painted outside the outline (${corner} over ${panel})`);
        // The plate left of the label: its mean is the kind's color, its grain shows.
        const area = []; const x0 = Math.round(wide.x + wide.w * 0.15); const y0 = Math.round(wide.y + wide.h * 0.3);
        for (let y = 0; y < Math.round(wide.h * 0.4); y++) for (let x = 0; x < Math.round(wide.w * 0.2); x++) area.push(shot.at(x0 + x, y0 + y));
        const mean = [0, 1, 2].map((i) => area.reduce((sum, p) => sum + p[i], 0) / area.length);
        const light = area.map((p) => (p[0] + p[1] + p[2]) / 3); const avg = light.reduce((a, b) => a + b, 0) / light.length;
        const grain = Math.sqrt(light.reduce((sum, v) => sum + (v - avg) ** 2, 0) / light.length);
        if (grain < 3) fail(`${kind}: no texture (deviation ${grain.toFixed(1)})`);
        const chroma = Math.max(...mean) - Math.min(...mean);
        if (kind === 'disabled') { if (chroma > 10) fail(`disabled: still colored (${mean.map(Math.round)})`); }
        else if (far(mean, hex(colors[kind])) > 32) fail(`${kind}: on screen ${mean.map(Math.round)}, variable ${hex(colors[kind])}`);
      }
    }
    // The overlay: on top of every kind, untinted (a rivet keeps its own color on a tinted plate).
    const size = sizes.at(-1);
    const withOverlay = await draw('overlay', size);
    const shot = decodePng(await tab.screenshot({ path: `${shots}/buttons-tinted-overlay${name === 'chromium' ? '' : `-${name}`}-${size.join('x')}.png` }));
    for (const b of withOverlay.filter((each) => each.kind !== 'disabled')) {
      const rivet = shot.at(Math.round(b.x + 6), Math.round(b.y + b.h / 2));
      if (!/\/test-art\/button-overlay\.png/.test(b.overlay) || far(rivet, RIVET) > 24) {
        problems.push(`buttons tinted ${name}: ${b.kind} ${b.width}: overlay not on top untinted (${b.overlay}, rivet ${rivet})`);
      }
    }
    // Off: a skin without `button-base` gets none of it.
    const plain = await draw('', size);
    if (!await tab.evaluate(() => window.gallery.rasterButtons)) {
      const touched = plain.filter((b) => b.source !== 'none' || b.silhouette || b.overlay !== 'none' || b.tint);
      if (touched.length) problems.push(`buttons ${name}: raster button rules without button-base in the skin (${touched.map((b) => b.kind).join(' ')})`);
    }
  } finally { await browser.close(); }
  return problems;
}

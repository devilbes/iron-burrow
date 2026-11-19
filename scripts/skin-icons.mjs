// Icons of the game skin (src/skin/icons.ts, read by src/skin/art.ts). Mechanical, offline.
//   node scripts/skin-icons.mjs
//     Recolors the stock icon atlases of the SDK in vendor/ (scripts/stock-skin.mjs: three lossless
//     WebP of ui-kit/skins/manyplay, or one PNG of skin-manyplay in older SDKs) to the palette of
//     src/skin/theme.css and points every stock icon key at the recolored PNG of its atlas
//     (assets/skin/icons-recolored.png for one atlas, icons-recolored-<atlas>.png for several) with
//     the same coordinates. Per pixel, in OKLCH: hue turned, chroma scaled and lightness moved by
//     the stock → theme change of the nearest palette colors (ANCHORS), weighted by closeness in
//     hue and lightness; grays, faces and the sign-in provider logos stay. While the anchors keep
//     their stock values it writes nothing and removes what it wrote before (the neutral template
//     carries no art). Run again after every palette change.
//   node scripts/skin-icons.mjs --sheet my-icons.png --columns 5 [--keys coins,gift,…]
//     A sheet drawn by the game (assets/skin/<file>, PNG, a grid filled row by row): points
//     icon-<key> of each cell at it. Default keys: the icons this template shows
//     (tests/skin-gallery/visible-icons.json), in that order.
// Entries of a sheet win over the recolored atlas; single files go to ASSETS in src/skin/art.ts.
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { crc32, deflateSync, inflateSync } from 'node:zlib';
import { parseArgs } from 'node:util';
import { stockIcons } from './stock-skin.mjs';
import { decodeWebp } from './webp.mjs';

const root = new URL('../', import.meta.url);
const ART = new URL('assets/skin/', root);
const OUT = 'icons-recolored';
/** Files this script writes: icons-recolored.png, icons-recolored-<atlas>.png. */
const WRITTEN = /^icons-recolored(?:-[a-z0-9-]+)?\.png$/;
const GENERATED = new URL('src/skin/icons.ts', root);
/** Palette colors the stock icons are drawn in (src/skin/theme.css names). */
const ANCHORS = ['--mp-card-accent', '--mp-card-accent-text', '--mp-chest-violet-deep', '--mp-card-background',
  '--mp-card-surface', '--mp-card-gold', '--mp-gold-edge', '--mp-chest-bronze', '--mp-wood', '--mp-wood-dark',
  '--mp-card-success', '--mp-chest-green-deep', '--mp-card-error', '--mp-card-info', '--mp-game-1', '--mp-game-4',
  '--mp-game-5'];

// ---- PNG: 8-bit RGBA, non-interlaced (the stock atlas); any 8-bit PNG for sizes only

function png(buffer) {
  if (buffer.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  const chunks = []; let ihdr;
  for (let at = 8; at < buffer.length;) {
    const length = buffer.readUInt32BE(at); const type = buffer.toString('latin1', at + 4, at + 8);
    const data = buffer.subarray(at + 8, at + 8 + length);
    if (type === 'IHDR') ihdr = data; else if (type === 'IDAT') chunks.push(data);
    at += 12 + length;
  }
  return { width: ihdr.readUInt32BE(0), height: ihdr.readUInt32BE(4), depth: ihdr[8], color: ihdr[9],
    interlace: ihdr[12], data: chunks };
}

const paeth = (a, b, c) => { const p = a + b - c; const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };

function decode(buffer) {
  const { width, height, depth, color, interlace, data } = png(buffer);
  if (depth !== 8 || color !== 6 || interlace) throw new Error('expected an 8-bit RGBA PNG without interlace');
  const raw = inflateSync(Buffer.concat(data)); const stride = width * 4; const px = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]; const row = y * (stride + 1) + 1; const out = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? px[out + x - 4] : 0, b = y ? px[out - stride + x] : 0, c = x >= 4 && y ? px[out - stride + x - 4] : 0;
      px[out + x] = raw[row + x] + [0, a, b, (a + b) >> 1, paeth(a, b, c)][filter];
    }
  }
  return { width, height, px };
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0); out.write(type, 4, 'latin1'); data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

/** Per row the filter with the smallest sum of bytes (the usual heuristic), deflate level 9. */
function encode({ width, height, px }) {
  const stride = width * 4; const raw = Buffer.alloc(height * (stride + 1)); const row = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    let best = Infinity; const at = y * stride;
    for (let filter = 0; filter < 5; filter++) {
      let sum = 0;
      for (let x = 0; x < stride; x++) {
        const a = x >= 4 ? px[at + x - 4] : 0, b = y ? px[at - stride + x] : 0, c = x >= 4 && y ? px[at - stride + x - 4] : 0;
        const v = (px[at + x] - [0, a, b, (a + b) >> 1, paeth(a, b, c)][filter]) & 255;
        row[x] = v; sum += v < 128 ? v : 256 - v;
      }
      if (sum < best) { best = sum; raw[y * (stride + 1)] = filter; row.copy(raw, y * (stride + 1) + 1); }
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// ---- colors: sRGB ↔ OKLCH

const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function oklch([r, g, b]) {
  [r, g, b] = [r, g, b].map((c) => lin(c / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), (Math.atan2(B, A) * 180 / Math.PI + 360) % 360];
}
function srgb([L, C, H]) {
  const A = C * Math.cos(H * Math.PI / 180), B = C * Math.sin(H * Math.PI / 180);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map((c) => gam(c) * 255);
}
/** In gamut by lowering chroma, same lightness and hue. */
function fit(lch) {
  const ok = (rgb) => rgb.every((c) => c > -0.5 && c < 255.5);
  if (ok(srgb(lch))) return srgb(lch).map(Math.round);
  let [lo, hi] = [0, lch[1]];
  for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (ok(srgb([lch[0], mid, lch[2]]))) lo = mid; else hi = mid; }
  return srgb([lch[0], lo, lch[2]]).map((c) => Math.max(0, Math.min(255, Math.round(c))));
}

/** `#rgb`, `#rrggbb` or `rgb()/rgba()` → [r, g, b]; anything else → undefined. */
function rgbOf(value) {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
  if (hex) { const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1]; return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); }
  const fn = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(value);
  return fn ? fn.slice(1, 4).map(Number) : undefined;
}

/** theme.css and stock values of the anchors → [{ from, to }] in OKLCH. */
function anchors() {
  const css = readFileSync(new URL('src/skin/theme.css', root), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const vars = new Map([...css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;}]+)/g)].map(([, name, value]) => [name, value.trim()]));
  const fill = (value, depth = 0) => (depth > 20 ? value
    : value.replace(/^var\(\s*(--[a-z0-9-]+)\s*\)$/, (all, name) => (vars.has(name) ? fill(vars.get(name), depth + 1) : all)));
  const stock = new Map([...readFileSync(new URL('src/shell/stock-colors.ts', root), 'utf8')
    .matchAll(/"(--[a-z0-9-]+)": "([^"]+)"/g)].map(([, name, value]) => [name, value]));
  return ANCHORS.map((name) => {
    const [from, to] = [stock.get(name), vars.has(name) ? fill(vars.get(name)) : undefined].map((v) => v && rgbOf(v));
    if (!from) throw new Error(`no stock color for ${name} in src/shell/stock-colors.ts`);
    if (!to) throw new Error(`${name} in src/skin/theme.css: expected a #hex or rgb() color`);
    return { name, from: oklch(from), to: oklch(to), same: from.join() === to.join() };
  });
}

/** Face color of the stock icons (icon-user), OKLCH: faces keep their tone. */
const SKIN_TONE = oklch([255, 212, 178]);
const turn = (a, b) => ((b - a + 540) % 360) - 180;

/** Stock pixel → game pixel; grays (chroma < 0.02) and skin tones stay, chroma 0.02–0.06 fades in. */
function recolorer(list) {
  const cache = new Map();
  return (r, g, b) => {
    const id = (r << 16) | (g << 8) | b;
    let out = cache.get(id);
    if (out) return out;
    const [L, C, H] = oklch([r, g, b]);
    const [l, c, h] = SKIN_TONE;
    const mix = Math.min(1, Math.max(0, (C - 0.02) / 0.04))
      * Math.max(0, 1 - 1.5 * Math.exp(-((turn(h, H) / 20) ** 2) - (((l - L) / 0.15) ** 2) - (((c - C) / 0.04) ** 2)));
    if (!mix) { out = [r, g, b]; cache.set(id, out); return out; }
    let w = 0, dh = 0, dl = 0, k = 0;
    for (const { from, to } of list) {
      const weight = Math.exp(-((turn(from[2], H) / 25) ** 2) - (((from[0] - L) / 0.2) ** 2)) + 1e-9;
      w += weight; dh += weight * turn(from[2], to[2]); dl += weight * (to[0] - from[0]);
      k += weight * Math.min(2, to[1] / Math.max(from[1], 0.02));
    }
    out = fit([Math.min(1, Math.max(0, L + mix * dl / w)), C * (1 + mix * (k / w - 1)), (H + mix * dh / w + 360) % 360]);
    cache.set(id, out);
    return out;
  };
}

// ---- entries (src/skin/icons.ts)

function readEntries() {
  if (!existsSync(GENERATED)) return {};
  const body = /=\s*(\{[\s\S]*?\});/.exec(readFileSync(GENERATED, 'utf8'))?.[1];
  return body ? JSON.parse(body) : {};
}
function writeEntries(entries) {
  const sorted = Object.fromEntries(Object.entries(entries).sort(([a], [b]) => a.localeCompare(b)));
  const text = '// Written by scripts/skin-icons.mjs: do not edit. Icon keys of the game skin → files in assets/skin/\n'
    + '// (recolored stock atlas, the game\'s own sheet); src/skin/art.ts adds them to ASSETS.\n'
    + `export const ICONS: Readonly<Record<string, string>> = ${JSON.stringify(sorted, null, 2)};\n`;
  if (!existsSync(GENERATED) || readFileSync(GENERATED, 'utf8') !== text) writeFileSync(GENERATED, text);
  console.log(`src/skin/icons.ts: ${Object.keys(sorted).length} entries`);
}

const STOCK = await stockIcons(root);
if (!STOCK) throw new Error('no ManyPlay skin in vendor/: the SDK of the project first (scripts/sdk.mjs)');
const SPRITE = /^(.*)#sprite=(\d+(?:,\d+){5})$/;

/** Stock atlases: URL → { keys, file } — one PNG in older SDKs, three WebP in the kit. */
function atlases() {
  const byUrl = new Map();
  for (const [key, url] of Object.entries(STOCK)) {
    const [, atlas] = SPRITE.exec(url) ?? [];
    if (!atlas) continue;
    if (!byUrl.has(atlas)) byUrl.set(atlas, { keys: [] });
    byUrl.get(atlas).keys.push(key);
  }
  const list = [...byUrl].map(([url, { keys }]) => ({ url, keys }));
  for (const each of list) {
    const name = each.url.replace(/^.*\//, '').replace(/\.[a-z]+$/i, '').replace(/^icons-?/, '').toLowerCase();
    each.file = list.length === 1 ? `${OUT}.png` : `${OUT}-${name || list.indexOf(each)}.png`;
  }
  return list;
}

/** Atlas file → RGBA pixels: PNG or lossless WebP. */
function decodeImage(buffer) {
  return buffer.toString('latin1', 0, 4) === 'RIFF' ? decodeWebp(buffer) : decode(buffer);
}
const KEEP = /^icon-provider-/;

function recolor() {
  const list = anchors();
  const entries = Object.fromEntries(Object.entries(readEntries())
    .filter(([, url]) => !WRITTEN.test(url.replace(/#.*$/, ''))));
  // What an earlier run wrote (for this or another SDK's atlases) goes first.
  if (existsSync(ART)) for (const name of readdirSync(ART).filter((name) => WRITTEN.test(name))) rmSync(new URL(name, ART));
  if (list.every((a) => a.same)) {
    console.log('theme.css keeps the stock icon colors: no recolored atlas');
    writeEntries(entries);
    return;
  }
  const map = recolorer(list);
  mkdirSync(ART, { recursive: true });
  for (const atlas of atlases()) {
    const image = decodeImage(readFileSync(new URL(atlas.url)));
    const { px, width } = image;
    const stock = Buffer.from(px);
    for (let i = 0; i < px.length; i += 4) {
      if (!px[i + 3]) { px[i] = px[i + 1] = px[i + 2] = 0; continue; }
      const [r, g, b] = map(px[i], px[i + 1], px[i + 2]);
      px[i] = r; px[i + 1] = g; px[i + 2] = b;
    }
    // Sign-in provider logos keep their brand colors.
    for (const key of atlas.keys.filter((key) => KEEP.test(key))) {
      const [x, y, w, h] = SPRITE.exec(STOCK[key])[2].split(',').map(Number);
      for (let row = y; row < y + h; row++) stock.copy(px, (row * width + x) * 4, (row * width + x) * 4, (row * width + x + w) * 4);
    }
    const file = encode(image);
    writeFileSync(new URL(atlas.file, ART), file);
    console.log(`assets/skin/${atlas.file}: ${image.width}x${image.height}, ${file.length} bytes`);
    for (const key of atlas.keys) {
      if (!(key in entries)) entries[key] = `${atlas.file}#sprite=${SPRITE.exec(STOCK[key])[2]}`;
    }
  }
  console.log(`changed: ${list.filter((a) => !a.same).map((a) => a.name).join(' ')}`);
  writeEntries(entries);
}

function sheet(file, columns, keys) {
  const { width, height } = png(readFileSync(new URL(file, ART)));
  const rows = Math.ceil(keys.length / columns);
  if (!(columns > 0) || width % columns || height % rows) {
    throw new Error(`${file} ${width}x${height} does not split into ${columns} columns x ${rows} rows`);
  }
  const [w, h] = [width / columns, height / rows];
  const unknown = keys.filter((key) => !STOCK[`icon-${key}`]);
  if (unknown.length) console.warn(`not stock icon keys (kept anyway): ${unknown.join(' ')}`);
  const entries = readEntries();
  keys.forEach((key, i) => { entries[`icon-${key}`] = `${file}#sprite=${(i % columns) * w},${Math.floor(i / columns) * h},${w},${h},${width},${height}`; });
  writeEntries(entries);
}

const { values } = parseArgs({ options: { sheet: { type: 'string' }, columns: { type: 'string' }, keys: { type: 'string' } } });
if (values.sheet) {
  const keys = values.keys?.split(',').map((key) => key.trim().replace(/^icon-/, '')).filter(Boolean)
    ?? JSON.parse(readFileSync(new URL('tests/skin-gallery/visible-icons.json', root), 'utf8'));
  sheet(values.sheet, Number(values.columns), keys);
} else recolor();

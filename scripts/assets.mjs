// Pictures of assets/: the author draws only the 2x picture, `<name>-2x.<png|webp|jpg>`; every other
// file of the pair is made here and never by hand.
//   npm run assets                      for every 2x picture of assets/ (assets/source/ is not read):
//                                       the 1x `<name>.<ext>` — exactly half, each pixel the average of
//                                       2×2 pixels weighted by alpha (no dark or colored edge). A file
//                                       that is already right is not rewritten.
//   npm run assets -- --webp[=<1-100>]  also `<name>-2x.webp` and `<name>.webp` of every PNG: without
//                                       a number lossless, with one — lossy of that quality. WebP files
//                                       that already lie next to a 2x PNG are kept equal to it always.
//   npm run assets -- --defringe[=<rrggbb>] [--defringe-width=<px>] [<file or folder> …]
//                                       before halving, takes the key color (green 00ff00 unless
//                                       given) out of the pixels within <px> (4) of transparency in
//                                       the 2x pictures and rewrites them: the share of the key in a
//                                       pixel becomes transparency. Use a key the picture has no
//                                       color of, and name the files when others must stay as drawn.
//   npm run assets -- --check           writes nothing; code 1 with every problem at once: a 2x side
//                                       that is odd, a 1x that is missing, not half, or differs from
//                                       the halved 2x (stale or edited by hand), a picture without 2x
//                                       in assets/game/, assets/ui/, assets/images/ (in assets/skin/
//                                       and other folders a picture may be a single file).
// Lossless files (PNG, lossless WebP) are compared pixel by pixel, so the result does not depend on
// file times; lossy ones (JPEG, lossy WebP) — by the mean difference.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RASTER = /\.(png|webp|jpe?g)$/i;
const DOUBLE = /-2x$/;
/**
 * Folders where every picture is a pair: the pictures of the game screens and of its UI. Elsewhere
 * (assets/skin/ and any other folder) a picture without a 2x one is left as it is; a 2x picture
 * there is still halved and checked the same way.
 */
const PAIRS = /^assets\/(game|ui|images)\//;
/** Lossy files: the mean difference per channel (of 255) a re-encoded picture may have. */
const LOSSY_TOLERANCE = 6;
const LOSSY_QUALITY = 90;
const GREEN = [0, 255, 0];

let sharpModule;
async function sharp() {
  if (!sharpModule) {
    try { sharpModule = (await import('sharp')).default; } catch (error) {
      throw new Error(`assets: the sharp package is not installed (npm install): ${error.message}`);
    }
    sharpModule.cache(false);
    sharpModule.concurrency(1); // files side by side, one thread each
  }
  return sharpModule;
}

// ---- pixels (RGBA, 8 bit, straight alpha)

/**
 * Half of a picture with even sides: each pixel is the average of 2×2 weighted by alpha
 * (premultiplied), in whole numbers — the same bytes on every machine. Transparent pixels are 0.
 */
export function halve(px, width, height) {
  if (width % 2 || height % 2) throw new Error(`halve: ${width}x${height} has an odd side`);
  const w = width / 2, h = height / 2;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = (y * 2 * width + x * 2) * 4, b = a + 4, c = a + width * 4, d = c + 4;
      const sum = px[a + 3] + px[b + 3] + px[c + 3] + px[d + 3];
      const alpha = (sum + 2) >> 2;
      if (!alpha) continue;
      const o = (y * w + x) * 4;
      for (let k = 0; k < 3; k++) {
        const color = px[a + k] * px[a + 3] + px[b + k] * px[b + 3] + px[c + k] * px[c + 3] + px[d + k] * px[d + 3];
        out[o + k] = Math.floor((2 * color + sum) / (2 * sum));
      }
      out[o + 3] = alpha;
    }
  }
  return out;
}

/** `rrggbb` or `#rrggbb` → [r, g, b]; a key needs a channel it is strong in and one it is weak in. */
export function keyColor(text) {
  const match = /^#?([0-9a-f]{6})$/i.exec(text);
  if (!match) throw new Error(`--defringe: "${text}" is not a color, expected rrggbb (e.g. 00ff00)`);
  const key = [0, 2, 4].map((at) => parseInt(match[1].slice(at, at + 2), 16));
  if (key.every((v) => v >= 128) || key.every((v) => v < 128)) {
    throw new Error(`--defringe: ${match[1]} is not a key color: it needs a strong channel and a weak one (00ff00, ff00ff, 0000ff)`);
  }
  return key;
}

/**
 * Takes the key color out of the edge of a cut-out picture, in place; returns how many pixels changed.
 * A pixel within `width` pixels (by rows, columns and diagonals) of transparency that has spill of
 * the key — its weakest channel among the strong ones of the key minus its strongest among the weak
 * ones, for green g − max(r, b) — is read as a mix `share·color + (1 − share)·key`. The color is
 * that of the nearest opaque pixel without spill when the pixel lies between it and the key;
 * otherwise the share is measured by the spill against that of the key itself and the key part is
 * subtracted. The pixel gets the color, its alpha is multiplied by the share: a ring of pure key
 * disappears, a half-mixed pixel becomes half transparent with the color of the picture. Pixels
 * without spill, and all pixels farther from the edge, stay as they are.
 */
export function defringe(px, width, height, { key = GREEN, width: reach = 4 } = {}) {
  const strong = [0, 1, 2].filter((k) => key[k] >= 128), weak = [0, 1, 2].filter((k) => key[k] < 128);
  const spillOf = (at, of) => Math.min(...strong.map((k) => of[at + k])) - Math.max(...weak.map((k) => of[at + k]));
  const full = spillOf(0, key);
  // Distance to the nearest transparent pixel, two passes.
  const far = reach + 1;
  const distance = new Uint16Array(width * height);
  for (let i = 0; i < distance.length; i++) distance[i] = px[i * 4 + 3] < 16 ? 0 : far;
  const near = (i, x, y, dx, dy) => {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) return;
    const value = distance[ny * width + nx] + 1;
    if (value < distance[i]) distance[i] = value;
  };
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x; near(i, x, y, -1, 0); near(i, x, y, -1, -1); near(i, x, y, 0, -1); near(i, x, y, 1, -1);
  }
  for (let y = height - 1; y >= 0; y--) for (let x = width - 1; x >= 0; x--) {
    const i = y * width + x; near(i, x, y, 1, 0); near(i, x, y, 1, 1); near(i, x, y, 0, 1); near(i, x, y, -1, 1);
  }
  // The color of the picture next to a fringe pixel: the nearest opaque pixel without spill, looked
  // for in the picture as it was, ring by ring.
  const before = Buffer.from(px);
  const clear = (at) => before[at + 3] === 255 && spillOf(at, before) * 255 < full * 4;
  const inside = (x, y) => {
    for (let ring = 1; ring <= reach + 1; ring++) {
      for (let dy = -ring; dy <= ring; dy++) for (let dx = -ring; dx <= ring; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < width && ny < height && clear((ny * width + nx) * 4)) return (ny * width + nx) * 4;
      }
    }
    return -1;
  };
  let changed = 0;
  for (let i = 0; i < distance.length; i++) {
    const at = i * 4;
    if (!px[at + 3] || distance[i] > reach) continue;
    const spill = spillOf(at, before);
    if (spill * 255 < full * 4) continue; // under 4 of 255: rounding, not a fringe
    changed++;
    // With the color of the picture known, the share is where the pixel lies between the key and it.
    const from = inside(i % width, Math.floor(i / width));
    if (from >= 0) {
      let along = 0, length = 0;
      for (let k = 0; k < 3; k++) { const d = before[from + k] - key[k]; along += (before[at + k] - key[k]) * d; length += d * d; }
      const share = Math.max(0, Math.min(1, along / length));
      const off = Math.max(...[0, 1, 2].map((k) => Math.abs(before[at + k] - (share * before[from + k] + (1 - share) * key[k]))));
      if (off <= 32) {
        const alpha = Math.round(px[at + 3] * share);
        if (!alpha) px.fill(0, at, at + 4);
        else { for (let k = 0; k < 3; k++) px[at + k] = before[from + k]; px[at + 3] = alpha; }
        continue;
      }
    }
    // Otherwise by the spill alone: the key part out, the rest scaled back.
    const share = Math.max(0, 1 - spill / full);
    const alpha = Math.round(px[at + 3] * share);
    if (!alpha) { px.fill(0, at, at + 4); continue; }
    for (let k = 0; k < 3; k++) px[at + k] = Math.max(0, Math.min(255, Math.round((px[at + k] - (1 - share) * key[k]) / share)));
    px[at + 3] = alpha;
  }
  return changed;
}

/** Color under full transparency is not a part of the picture: zero before comparing. */
function clean(px) {
  for (let at = 0; at < px.length; at += 4) if (!px[at + 3]) px[at] = px[at + 1] = px[at + 2] = 0;
  return px;
}

/** Mean difference per channel, colors weighted by alpha. */
function difference(a, b) {
  let sum = 0;
  for (let at = 0; at < a.length; at += 4) {
    for (let k = 0; k < 3; k++) sum += Math.abs(a[at + k] * a[at + 3] - b[at + k] * b[at + 3]) / 255;
    sum += Math.abs(a[at + 3] - b[at + 3]);
  }
  return sum / a.length;
}

// ---- files

async function decode(file) {
  const { data, info } = await (await sharp())(readFileSync(file)).toColourspace('srgb').ensureAlpha()
    .raw({ depth: 'uchar' }).toBuffer({ resolveWithObject: true });
  if (info.channels !== 4) throw new Error(`${info.channels} channels, expected RGBA`);
  return { px: clean(data), width: info.width, height: info.height };
}

/** Is the file kept without loss: PNG always, WebP when its picture is a VP8L chunk. */
function lossless(file) {
  if (/\.png$/i.test(file)) return true;
  if (!/\.webp$/i.test(file)) return false;
  const bytes = readFileSync(file);
  for (let at = 12; at + 8 <= bytes.length;) {
    const type = bytes.toString('latin1', at, at + 4);
    if (type === 'VP8L') return true;
    if (type === 'VP8 ') return false;
    at += 8 + bytes.readUInt32LE(at + 4) + (bytes.readUInt32LE(at + 4) & 1);
  }
  return false;
}

async function encode(file, { px, width, height }, exact) {
  const image = (await sharp())(px, { raw: { width, height, channels: 4 } });
  if (/\.jpe?g$/i.test(file)) return image.flatten({ background: '#000000' }).jpeg({ quality: LOSSY_QUALITY, chromaSubsampling: '4:4:4' }).toBuffer();
  if (/\.png$/i.test(file)) return image.png({ compressionLevel: 9 }).toBuffer();
  return image.webp(exact === true ? { lossless: true } : { quality: exact || LOSSY_QUALITY, alphaQuality: 100 }).toBuffer();
}

/** Every raster picture of assets/ (not assets/source/), as paths from the root with `/`. */
function pictures(root) {
  const dir = join(root, 'assets');
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true }).map((file) => `assets/${String(file).split(sep).join('/')}`)
    .filter((file) => RASTER.test(file) && !file.startsWith('assets/source/') 
      && statSync(join(root, file)).isFile()).sort();
}

/**
 * Pairs of assets/ under `root`. Returns `{ rows, problems }`: a row per file looked at
 * (`{ file, state: 'ok' | 'written' | 'defringed' | 'problem' }`), a problem per fault
 * (`{ file, kind: 'odd' | 'missing' | 'size' | 'differs' | 'single' | 'unreadable', text }`).
 *   check     write nothing, report what would be written as problems
 *   webp      true — lossless WebP of every PNG, a number — lossy of that quality
 *   defringe  `{ key: [r, g, b], width }` — take the key color out of the edges of the 2x pictures
 *   only      files or folders (from the root): nothing else is looked at
 *   jobs      files in work at once
 */
export async function assets(root, { check = false, webp = false, defringe: fringe, only = [], jobs = availableParallelism() } = {}) {
  const rows = [], problems = [];
  const problem = (file, kind, text) => { problems.push({ file, kind, text }); rows.push({ file, state: 'problem' }); };
  const wanted = only.map((path) => relative(root, resolve(root, path)).split(sep).join('/'));
  const inScope = (file) => !wanted.length || wanted.some((path) => file === path || file.startsWith(`${path}/`));
  const files = pictures(root);
  const have = new Set(files);

  // One piece of work per 2x source: the PNG when there is one (a WebP 2x next to it is its copy).
  const work = [];
  for (const file of files) {
    const [, stem, ext] = /^(.*)\.([^.]+)$/.exec(file);
    if (!DOUBLE.test(stem)) {
      // A WebP next to a PNG pair is made from the PNG, its 2x with it.
      if (PAIRS.test(file) && !have.has(`${stem}-2x.${ext}`) && !(/^webp$/i.test(ext) && have.has(`${stem}-2x.png`)) && inScope(file)) {
        problem(file, 'single', `no 2x picture ${stem}-2x.${ext}: draw the 2x one, this file is made from it`);
      }
      continue;
    }
    const name = stem.replace(DOUBLE, '');
    if (!inScope(file) && !inScope(`${name}.${ext}`)) continue;
    const png = `${stem}.png`;
    if (/^webp$/i.test(ext) && have.has(png)) continue; // handled with its PNG
    const both = /^png$/i.test(ext) && (webp || have.has(`${stem}.webp`) || have.has(`${name}.webp`));
    work.push({ source: file, half: [`${name}.${ext}`, ...(both ? [`${name}.webp`] : [])], copies: both ? [`${stem}.webp`] : [] });
  }

  /** Brings `file` to `picture`: nothing when it already is, a problem in check mode, a write otherwise. */
  async function bring(file, picture, source) {
    const path = join(root, file);
    const present = existsSync(path);
    // WebP made new: as asked; a present one keeps its kind. A JPEG is lossy, a PNG is not.
    const exact = /\.png$/i.test(file) ? true : /\.jpe?g$/i.test(file) ? false
      : present ? lossless(path) : webp === false ? lossless(join(root, source)) : webp;
    let fault;
    if (!present) fault = ['missing', `missing: made from ${source}`];
    else {
      let now;
      try { now = await decode(path); } catch (error) { now = null; fault = ['unreadable', `cannot be read (${error.message})`]; }
      if (now && (now.width !== picture.width || now.height !== picture.height)) {
        fault = ['size', picture.double
          ? `is ${now.width}x${now.height}, not half of ${source} (${picture.double}): expected ${picture.width}x${picture.height}`
          : `is ${now.width}x${now.height}, ${source} is ${picture.width}x${picture.height}`];
      } else if (now && (exact === true ? !now.px.equals(picture.px) : difference(now.px, picture.px) > LOSSY_TOLERANCE)) {
        fault = ['differs', `differs from ${picture.double ? `the halved ${source}` : source}: stale or edited by hand`];
      }
    }
    if (!fault) { rows.push({ file, state: 'ok' }); return; }
    if (check) { problem(file, fault[0], `${fault[1]} — npm run assets`); return; }
    writeFileSync(path, await encode(file, picture, exact));
    rows.push({ file, state: 'written' });
  }

  async function one({ source, half, copies }) {
    let picture;
    try { picture = await decode(join(root, source)); } catch (error) { problem(source, 'unreadable', `cannot be read (${error.message})`); return; }
    const { width, height } = picture;
    if (width % 2 || height % 2) {
      const even = (n) => (n % 2 ? `${n - 1} or ${n + 1}` : `${n}`);
      problem(source, 'odd', `2x is ${width}x${height}: both sides must be even to halve exactly — make it ${even(width)} wide, ${even(height)} high (nearest: ${width + width % 2}x${height + height % 2})`);
      return;
    }
    let state = 'ok';
    if (fringe && !check && inScope(source) && lossless(join(root, source))) {
      if (defringe(picture.px, width, height, fringe)) {
        clean(picture.px);
        writeFileSync(join(root, source), await encode(source, picture, true));
        state = 'defringed';
      }
    }
    rows.push({ file: source, state });
    const halved = { px: halve(picture.px, width, height), width: width / 2, height: height / 2, double: `${width}x${height}` };
    await Promise.all([...copies.map((file) => bring(file, picture, source)), ...half.map((file) => bring(file, halved, source))]);
  }

  let next = 0;
  await Promise.all(Array.from({ length: Math.max(1, Math.min(jobs, work.length)) }, async () => {
    while (next < work.length) await one(work[next++]);
  }));
  rows.sort((a, b) => (a.file < b.file ? -1 : 1));
  problems.sort((a, b) => (a.file < b.file ? -1 : 1));
  return { rows, problems };
}

/** The table of a run: a line per folder, then every problem. */
export function report({ rows, problems }, { check = false } = {}) {
  const states = check ? ['ok', 'problem'] : ['ok', 'written', 'defringed', 'problem'];
  const titles = { ok: check ? 'ok' : 'up to date', written: 'written', defringed: 'defringed', problem: 'problems' };
  const folders = new Map();
  for (const { file, state } of rows) {
    const folder = dirname(file);
    const counts = folders.get(folder) ?? Object.fromEntries(states.map((each) => [each, 0]));
    counts[state]++; folders.set(folder, counts);
  }
  const total = Object.fromEntries(states.map((each) => [each, rows.filter((row) => row.state === each).length]));
  const table = [['folder', 'files', ...states.map((each) => titles[each])],
    ...[...folders, ['total', total]].map(([folder, counts]) => [folder, String(states.reduce((sum, each) => sum + counts[each], 0)), ...states.map((each) => String(counts[each]))])];
  const widths = table[0].map((_, column) => Math.max(...table.map((line) => line[column].length)));
  const lines = table.map((line) => line.map((cell, column) => (column ? cell.padStart(widths[column]) : cell.padEnd(widths[column]))).join('  ').trimEnd());
  if (!rows.length) lines.length = 0;
  if (!rows.length) lines.push('no pictures in assets/');
  for (const each of problems) lines.push(`PROBLEM ${each.file}: ${each.text}`);
  return lines.join('\n');
}

/** Options of the command line; throws on an unknown one. */
export function options(argv) {
  const out = { check: false, webp: false, only: [] };
  let width;
  for (const arg of argv) {
    const [flag, value] = arg.split(/=(.*)/s);
    if (!arg.startsWith('--')) out.only.push(arg);
    else if (flag === '--check' && value === undefined) out.check = true;
    else if (flag === '--webp') {
      out.webp = value === undefined ? true : Number(value);
      if (out.webp !== true && !(Number.isInteger(out.webp) && out.webp >= 1 && out.webp <= 100)) throw new Error(`--webp: "${value}" is not a quality, expected 1-100`);
    } else if (flag === '--defringe') out.defringe = { key: value === undefined ? GREEN : keyColor(value), width: 4 };
    else if (flag === '--defringe-width' && /^[1-9]\d?$/.test(value ?? '')) width = Number(value);
    else if (flag === '--root' && value) out.root = value;
    else throw new Error(`unknown option ${arg} (known: --check, --webp[=<1-100>], --defringe[=<rrggbb>], --defringe-width=<1-99>, <file or folder> …)`);
  }
  if (width !== undefined) { if (!out.defringe) throw new Error('--defringe-width goes with --defringe'); out.defringe.width = width; }
  if (out.check && (out.defringe || out.webp)) throw new Error('--check writes nothing: it does not go with --defringe or --webp');
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const started = performance.now();
  // Every processor decodes and encodes: the pool of node is 4 threads unless told before its first use.
  process.env.UV_THREADPOOL_SIZE ??= String(availableParallelism());
  try {
    const { root = fileURLToPath(new URL('../', import.meta.url)), ...rest } = options(process.argv.slice(2));
    // Paths are given from where the command runs; the pictures are those of the project.
    const result = await assets(root, { ...rest, only: rest.only.map((path) => resolve(path)) });
    console.log(report(result, rest));
    const seconds = `${((performance.now() - started) / 1000).toFixed(1)} s`;
    if (result.problems.length) {
      console.log(`\nassets${rest.check ? ' --check' : ''} FAILED in ${seconds}: ${result.problems.length} problems`);
      process.exit(1);
    }
    console.log(`\nassets${rest.check ? ' --check' : ''} ok in ${seconds}`);
  } catch (error) { console.error(error.message); process.exit(2); }
}

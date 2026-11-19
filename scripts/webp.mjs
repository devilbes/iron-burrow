// Lossless WebP (VP8L) → RGBA pixels, no dependencies: the stock icon atlases of the kit are
// lossless WebP (scripts/skin-icons.mjs recolors them offline). Lossy WebP (VP8 / VP8X with
// ALPH) is not read. Format: https://developers.google.com/speed/webp/docs/webp_lossless_bitstream_specification

/** LSB-first bit reader. */
class Bits {
  constructor(bytes) { this.bytes = bytes; this.at = 0; this.buf = 0; this.count = 0; }
  read(n) {
    let out = 0;
    for (let i = 0; i < n; i++) out |= this.bit() << i;
    return out >>> 0;
  }
  bit() {
    if (!this.count) {
      if (this.at >= this.bytes.length) throw new Error('webp: truncated data');
      this.buf = this.bytes[this.at++]; this.count = 8;
    }
    const b = this.buf & 1; this.buf >>= 1; this.count--;
    return b;
  }
}

/** Canonical prefix code from code lengths; a code of one symbol reads no bits. */
function prefixCode(lengths) {
  const used = [];
  for (let s = 0; s < lengths.length; s++) if (lengths[s]) used.push(s);
  if (!used.length) throw new Error('webp: empty prefix code');
  if (used.length === 1) return { single: used[0] };
  const count = new Uint16Array(16);
  for (const s of used) count[lengths[s]]++;
  const offs = new Uint16Array(16);
  for (let len = 1; len < 15; len++) offs[len + 1] = offs[len] + count[len];
  const symbol = new Uint16Array(used.length);
  for (const s of used) symbol[offs[lengths[s]]++] = s;
  return { count, symbol };
}

function decodeSymbol(bits, code) {
  if (code.single !== undefined) return code.single;
  let value = 0, first = 0, index = 0;
  for (let len = 1; len < 16; len++) {
    value |= bits.bit();
    const n = code.count[len];
    if (value - n < first) return code.symbol[index + value - first];
    index += n; first += n; first <<= 1; value <<= 1;
  }
  throw new Error('webp: bad prefix code');
}

const ORDER = [17, 18, 0, 1, 2, 3, 4, 5, 16, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

function readCode(bits, size) {
  const lengths = new Uint8Array(size);
  if (bits.read(1)) {
    const two = bits.read(1);
    lengths[bits.read(bits.read(1) ? 8 : 1)] = 1;
    if (two) lengths[bits.read(8)] = 1;
    return prefixCode(lengths);
  }
  const clen = new Uint8Array(19);
  const n = bits.read(4) + 4;
  for (let i = 0; i < n; i++) clen[ORDER[i]] = bits.read(3);
  const lengthCode = prefixCode(clen);
  let max = size;
  if (bits.read(1)) max = 2 + bits.read(2 + 2 * bits.read(3));
  let prev = 8;
  for (let s = 0; s < size;) {
    if (max-- === 0) break;
    const len = decodeSymbol(bits, lengthCode);
    if (len < 16) { lengths[s++] = len; if (len) prev = len; continue; }
    const [repeat, value] = len === 16 ? [3 + bits.read(2), prev] : len === 17 ? [3 + bits.read(3), 0] : [11 + bits.read(7), 0];
    if (s + repeat > size) throw new Error('webp: code lengths overflow');
    lengths.fill(value, s, s + repeat); s += repeat;
  }
  return prefixCode(lengths);
}

/** (dx, dy) of distance codes 1–120: dist = dx + dy * width. */
const NEAR = [0, 1, 1, 0, 1, 1, -1, 1, 0, 2, 2, 0, 1, 2, -1, 2, 2, 1, -2, 1, 2, 2, -2, 2, 0, 3, 3, 0, 1, 3, -1, 3, 3, 1,
  -3, 1, 2, 3, -2, 3, 3, 2, -3, 2, 0, 4, 4, 0, 1, 4, -1, 4, 4, 1, -4, 1, 3, 3, -3, 3, 2, 4, -2, 4, 4, 2, -4, 2, 0, 5,
  3, 4, -3, 4, 4, 3, -4, 3, 5, 0, 1, 5, -1, 5, 5, 1, -5, 1, 2, 5, -2, 5, 5, 2, -5, 2, 4, 4, -4, 4, 3, 5, -3, 5, 5, 3,
  -5, 3, 0, 6, 6, 0, 1, 6, -1, 6, 6, 1, -6, 1, 2, 6, -2, 6, 6, 2, -6, 2, 4, 5, -4, 5, 5, 4, -5, 4, 3, 6, -3, 6, 6, 3,
  -6, 3, 0, 7, 7, 0, 1, 7, -1, 7, 5, 5, -5, 5, 7, 1, -7, 1, 4, 6, -4, 6, 6, 4, -6, 4, 2, 7, -2, 7, 7, 2, -7, 2, 3, 7,
  -3, 7, 7, 3, -7, 3, 5, 6, -5, 6, 6, 5, -6, 5, 8, 0, 4, 7, -4, 7, 7, 4, -7, 4, 8, 1, 8, 2, 6, 6, -6, 6, 8, 3, 5, 7,
  -5, 7, 7, 5, -7, 5, 8, 4, 6, 7, -6, 7, 7, 6, -7, 6, 8, 5, 7, 7, -7, 7, 8, 6, 8, 7];
if (NEAR.length !== 240) throw new Error('webp: distance table');

const lz = (bits, prefix) => {
  if (prefix < 4) return prefix + 1;
  const extra = (prefix - 2) >> 1;
  return ((2 + (prefix & 1)) << extra) + bits.read(extra) + 1;
};
const div = (n, bits) => (n + (1 << bits) - 1) >> bits;

/** Entropy-coded image (`main`: with meta prefix codes) → ARGB per pixel. */
function image(bits, width, height, main) {
  const cacheBits = bits.read(1) ? bits.read(4) : 0;
  if (cacheBits > 11) throw new Error('webp: color cache');
  let metaBits = 0, meta, metaWidth = 0;
  if (main && bits.read(1)) {
    metaBits = bits.read(3) + 2; metaWidth = div(width, metaBits);
    meta = image(bits, metaWidth, div(height, metaBits), false);
  }
  let groups = 1;
  if (meta) for (let i = 0; i < meta.length; i++) { meta[i] = (meta[i] >> 8) & 0xffff; groups = Math.max(groups, meta[i] + 1); }
  const cacheSize = cacheBits ? 1 << cacheBits : 0;
  const codes = [];
  for (let g = 0; g < groups; g++) {
    codes.push([readCode(bits, 256 + 24 + cacheSize), readCode(bits, 256), readCode(bits, 256), readCode(bits, 256), readCode(bits, 40)]);
  }
  const cache = cacheSize ? new Uint32Array(cacheSize) : undefined;
  const shift = 32 - cacheBits;
  const px = new Uint32Array(width * height);
  const total = px.length;
  let last = 0; // pixels before `last` are in the cache
  const toCache = (to) => { for (; last < to; last++) cache[Math.imul(px[last], 0x1e35a7bd) >>> shift] = px[last]; };
  for (let at = 0; at < total;) {
    const x = at % width, y = (at - x) / width;
    const [green, red, blue, alpha, dist] = codes[meta ? meta[(y >> metaBits) * metaWidth + (x >> metaBits)] : 0];
    const s = decodeSymbol(bits, green);
    if (s < 256) {
      const r = decodeSymbol(bits, red), b = decodeSymbol(bits, blue), a = decodeSymbol(bits, alpha);
      px[at++] = ((a << 24) | (r << 16) | (s << 8) | b) >>> 0;
    } else if (s < 280) {
      const length = lz(bits, s - 256);
      const code = lz(bits, decodeSymbol(bits, dist));
      let d;
      if (code > 120) d = code - 120;
      else { d = NEAR[2 * (code - 1)] + NEAR[2 * (code - 1) + 1] * width; if (d < 1) d = 1; }
      if (d > at || at + length > total) throw new Error('webp: bad backward reference');
      for (let i = 0; i < length; i++, at++) px[at] = px[at - d];
    } else {
      if (!cache) throw new Error('webp: color cache not in use');
      toCache(at);
      px[at++] = cache[s - 280];
    }
    if (cache) toCache(at);
  }
  return px;
}

// ---- transforms

const add = (a, b) => ((((a >>> 24) + (b >>> 24)) & 255) << 24 | ((((a >> 16) & 255) + ((b >> 16) & 255)) & 255) << 16
  | ((((a >> 8) & 255) + ((b >> 8) & 255)) & 255) << 8 | (((a & 255) + (b & 255)) & 255)) >>> 0;
const avg = (a, b) => ((((a >>> 24) + (b >>> 24)) >> 1) << 24 | ((((a >> 16) & 255) + ((b >> 16) & 255)) >> 1) << 16
  | ((((a >> 8) & 255) + ((b >> 8) & 255)) >> 1) << 8 | (((a & 255) + (b & 255)) >> 1)) >>> 0;
const ch = (p, i) => (p >>> (24 - 8 * i)) & 255;
const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
const pack = (f) => ((f(0) << 24) | (f(1) << 16) | (f(2) << 8) | f(3)) >>> 0;
function select(L, T, TL) {
  let pL = 0, pT = 0;
  for (let i = 0; i < 4; i++) {
    const p = ch(L, i) + ch(T, i) - ch(TL, i);
    pL += Math.abs(p - ch(L, i)); pT += Math.abs(p - ch(T, i));
  }
  return pL < pT ? L : T;
}
const PREDICT = [
  () => 0xff000000, (L) => L, (L, T) => T, (L, T, TR) => TR, (L, T, TR, TL) => TL,
  (L, T, TR) => avg(avg(L, TR), T), (L, T, TR, TL) => avg(L, TL), (L, T) => avg(L, T),
  (L, T, TR, TL) => avg(TL, T), (L, T, TR) => avg(T, TR), (L, T, TR, TL) => avg(avg(L, TL), avg(T, TR)),
  (L, T, TR, TL) => select(L, T, TL),
  (L, T, TR, TL) => pack((i) => clamp(ch(L, i) + ch(T, i) - ch(TL, i))),
  (L, T, TR, TL) => { const a = avg(L, T); return pack((i) => clamp(ch(a, i) + Math.trunc((ch(a, i) - ch(TL, i)) / 2))); },
  () => 0xff000000, () => 0xff000000,
];

function unpredict(px, width, height, sizeBits, data) {
  const bw = div(width, sizeBits);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const at = y * width + x;
      let pred;
      if (!y) pred = x ? px[at - 1] : 0xff000000;
      else if (!x) pred = px[at - width];
      else {
        const mode = (data[(y >> sizeBits) * bw + (x >> sizeBits)] >> 8) & 15;
        pred = PREDICT[mode](px[at - 1], px[at - width], px[at - width + 1], px[at - width - 1]);
      }
      px[at] = add(px[at], pred);
    }
  }
}

const delta = (t, c) => ((t << 24 >> 24) * (c << 24 >> 24)) >> 5;
function uncolor(px, width, height, sizeBits, data) {
  const bw = div(width, sizeBits);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const at = y * width + x;
      const t = data[(y >> sizeBits) * bw + (x >> sizeBits)];
      const g2r = t & 255, g2b = (t >> 8) & 255, r2b = (t >> 16) & 255;
      const p = px[at], g = (p >> 8) & 255;
      const r = (((p >> 16) & 255) + delta(g2r, g)) & 255;
      const b = ((p & 255) + delta(g2b, g) + delta(r2b, r)) & 255;
      px[at] = ((p & 0xff00ff00) | (r << 16) | b) >>> 0;
    }
  }
}

function addGreen(px) {
  for (let i = 0; i < px.length; i++) {
    const p = px[i], g = (p >> 8) & 255;
    px[i] = ((p & 0xff00ff00) | ((((p >> 16) & 255) + g) & 255) << 16 | (((p & 255) + g) & 255)) >>> 0;
  }
}

function unindex(packed, packedWidth, width, height, widthBits, table) {
  const out = new Uint32Array(width * height);
  const per = 1 << widthBits, bitsPer = 8 >> widthBits, mask = (1 << bitsPer) - 1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const g = (packed[y * packedWidth + (x >> widthBits)] >> 8) & 255;
      const index = (g >> (bitsPer * (x & (per - 1)))) & mask;
      out[y * width + x] = index < table.length ? table[index] : 0;
    }
  }
  return out;
}

/** Lossless WebP file → { width, height, px } with px RGBA bytes (as the PNG reader of skin-icons.mjs). */
export function decodeWebp(buffer) {
  if (buffer.toString('latin1', 0, 4) !== 'RIFF' || buffer.toString('latin1', 8, 12) !== 'WEBP') throw new Error('not a WebP');
  let body;
  for (let at = 12; at + 8 <= buffer.length;) {
    const type = buffer.toString('latin1', at, at + 4); const size = buffer.readUInt32LE(at + 4);
    if (type === 'VP8L') { body = buffer.subarray(at + 8, at + 8 + size); break; }
    if (type === 'VP8 ' || type === 'ALPH') throw new Error('lossy WebP is not supported (lossless atlases only)');
    at += 8 + size + (size & 1);
  }
  if (!body || body[0] !== 0x2f) throw new Error('webp: no VP8L image');
  const bits = new Bits(body.subarray(1));
  const width = bits.read(14) + 1, height = bits.read(14) + 1;
  bits.read(1);
  if (bits.read(3)) throw new Error('webp: unknown VP8L version');
  const transforms = [];
  let xsize = width;
  while (bits.read(1)) {
    const type = bits.read(2);
    if (transforms.some((t) => t.type === type)) throw new Error('webp: repeated transform');
    if (type === 0 || type === 1) {
      const sizeBits = bits.read(3) + 2;
      transforms.push({ type, xsize, sizeBits, data: image(bits, div(xsize, sizeBits), div(height, sizeBits), false) });
    } else if (type === 2) transforms.push({ type, xsize });
    else {
      const size = bits.read(8) + 1;
      const table = image(bits, size, 1, false);
      for (let i = 1; i < size; i++) table[i] = add(table[i], table[i - 1]);
      const widthBits = size <= 2 ? 3 : size <= 4 ? 2 : size <= 16 ? 1 : 0;
      transforms.push({ type, xsize, widthBits, table });
      xsize = div(xsize, widthBits);
    }
  }
  let px = image(bits, xsize, height, true);
  for (const t of transforms.reverse()) {
    if (t.type === 0) unpredict(px, t.xsize, height, t.sizeBits, t.data);
    else if (t.type === 1) uncolor(px, t.xsize, height, t.sizeBits, t.data);
    else if (t.type === 2) addGreen(px);
    else { px = unindex(px, div(t.xsize, t.widthBits), t.xsize, height, t.widthBits, t.table); }
  }
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0; i < px.length; i++) {
    const p = px[i];
    out[4 * i] = (p >> 16) & 255; out[4 * i + 1] = (p >> 8) & 255; out[4 * i + 2] = p & 255; out[4 * i + 3] = p >>> 24;
  }
  return { width, height, px: out };
}

// PNG without a library, for tests that make a picture or read a screenshot: 8-bit RGBA out,
// 8-bit RGB/RGBA in (what a browser screenshot is).
import { deflateSync, inflateSync } from 'node:zlib';

const TABLE = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (bytes) => { let c = 0xffffffff; for (const b of bytes) c = TABLE[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0); out.write(type, 4, 'latin1'); data.copy(out, 8);
  out.writeUInt32BE(crc(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

/** A PNG file of `width` x `height`; `at(x, y)` gives the pixel as [r, g, b, a]. */
export function encodePng(width, height, at) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) raw.set(at(x, y), y * (width * 4 + 1) + 1 + x * 4);
  const head = Buffer.alloc(13); head.writeUInt32BE(width, 0); head.writeUInt32BE(height, 4); head.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head),
    chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

/** A PNG file as { width, height, at(x, y) → [r, g, b, a] }. */
export function decodePng(file) {
  const width = file.readUInt32BE(16); const height = file.readUInt32BE(20);
  const n = { 2: 3, 6: 4 }[file[25]];
  if (file[24] !== 8 || !n || file[28]) throw new Error('decodePng: 8-bit RGB or RGBA, not interlaced, expected');
  const parts = [];
  for (let at = 8; at < file.length;) {
    const size = file.readUInt32BE(at);
    if (file.toString('latin1', at + 4, at + 8) === 'IDAT') parts.push(file.subarray(at + 8, at + 8 + size));
    at += 12 + size;
  }
  const raw = inflateSync(Buffer.concat(parts));
  const row = width * n;
  const out = Buffer.alloc(row * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (row + 1)];
    for (let i = 0; i < row; i++) {
      const left = i >= n ? out[y * row + i - n] : 0;
      const up = y ? out[(y - 1) * row + i] : 0;
      const corner = y && i >= n ? out[(y - 1) * row + i - n] : 0;
      const p = left + up - corner;
      const paeth = Math.abs(p - left) <= Math.abs(p - up) && Math.abs(p - left) <= Math.abs(p - corner) ? left
        : Math.abs(p - up) <= Math.abs(p - corner) ? up : corner;
      out[y * row + i] = (raw[y * (row + 1) + 1 + i] + [0, left, up, (left + up) >> 1, paeth][filter]) & 255;
    }
  }
  return { width, height, at: (x, y) => [...out.subarray((y * width + x) * n, (y * width + x) * n + n), 255].slice(0, 4) };
}

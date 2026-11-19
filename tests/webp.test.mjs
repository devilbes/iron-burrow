// scripts/webp.mjs: lossless WebP decoded pixel for pixel as libwebp does (reference hashes of the
// RGBA pixels from libwebp), and the stock atlases of the SDK in vendor/ at the sizes their sprites name.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { stockIcons } from '../scripts/stock-skin.mjs';
import { decodeWebp } from '../scripts/webp.mjs';

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
/** 97x61, encoded by libwebp lossless: predictor and color transforms (gradient) and a 4-color palette (pixels packed 4 per byte). */
const SAMPLES = {
  gradient: ['UklGRtIAAABXRUJQVlA4TMUAAAAvYAAPEM1lRP9jFxH9DwuCtm2TbT9/4gERGGLSRFj/xh5sAwAsk9q2bZv/P5VlBZIAAPo/DIQ+oPQBow84fSDoA0kfKPpA0weGPrD0gaMPPH0Q6INIHyT6INMHhT6o9EGjDzp9MOiDSR8s+mDTB4c+uPTBow8+fQjoQ0gfIvoQ04eEPqT0IaMPOX0o6ENJHyr6UNOHhj609KGjDz19GOjDSB8m+j+MmT4s9GGlDxt92OnDQR9O+nDRh5s+PPThpQ8fffjpAQA=', '1211738508e01f8a70d6a8c44bcf30e22423e35c52eb5fd6b9989e2777a52d44'],
  palette: ['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', 'b45af0b8f7342835eac9d182b8b355e8589139a384d53a33f5b536afc54ea170'],
};

for (const [name, [base64, hash]] of Object.entries(SAMPLES)) {
  test(`lossless WebP: ${name}`, () => {
    const { width, height, px } = decodeWebp(Buffer.from(base64, 'base64'));
    assert.deepEqual([width, height, px.length], [97, 61, 97 * 61 * 4]);
    assert.equal(sha(px), hash);
  });
}

test('lossy WebP and other files are refused', () => {
  assert.throws(() => decodeWebp(Buffer.from('not an image')), /not a WebP/);
  const lossy = Buffer.concat([Buffer.from('RIFF\0\0\0\0WEBPVP8 '), Buffer.alloc(8)]);
  assert.throws(() => decodeWebp(lossy), /lossy WebP/);
});

const stock = await stockIcons();
const SPRITE = /^(.*)#sprite=\d+,\d+,\d+,\d+,(\d+),(\d+)$/;
test('stock atlases of vendor/ decode at the size of their sprites', { skip: !stock && 'no SDK packages (vendor/)' }, () => {
  const atlases = new Map(Object.values(stock).map((url) => SPRITE.exec(url)).filter(Boolean)
    .map(([, url, w, h]) => [url, [Number(w), Number(h)]]));
  for (const [url, size] of atlases) {
    if (!url.endsWith('.webp')) continue;
    const { width, height } = decodeWebp(readFileSync(new URL(url)));
    assert.deepEqual([width, height], size, url);
  }
});

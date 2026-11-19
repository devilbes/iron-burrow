// src/shell/stock-colors.ts is what scripts/stock-colors.mjs makes from the stock sheets of the
// kit in vendor/: a kit update with other colors fails here until the script is run again (and a
// new literal gets its variable in the script's NAMES).
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { stockSkin } from '../scripts/stock-skin.mjs';

const vendor = Boolean(stockSkin());

test('stock-colors.ts matches the kit', { skip: !vendor && 'no SDK packages (vendor/)' }, async () => {
  const { generate } = await import('../scripts/stock-colors.mjs');
  const current = readFileSync(new URL('../src/shell/stock-colors.ts', import.meta.url), 'utf8');
  assert.equal(current, await generate(), 'run: node scripts/stock-colors.mjs');
});

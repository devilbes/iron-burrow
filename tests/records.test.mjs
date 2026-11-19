// scripts/validate-records.mjs: the template's own records pass; a saved server schema
// (schemas/<scope>.json) is used before the SDK; scopes with neither are listed, never passed;
// the ids the code names (src/boot/ids.ts, TOP_BAR) are records of configs/remote/.
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { readRecords, schemaFile, validateRecords } from '../scripts/validate-records.mjs';
import { transpile } from './helpers/boot-modules.mjs';

const template = fileURLToPath(new URL('../', import.meta.url));
const vendor = existsSync(join(template, 'vendor/@manygamescorp/core'));
const ajv = existsSync(join(template, 'node_modules/ajv'));
const NO_SDK = 'no SDK packages (vendor/)';

/** A copy of the template's records with `files` on top: `{ "<path>": <json> | null (removed) }`. */
function project(t, files = {}) {
  const root = mkdtempSync(join(tmpdir(), 'records-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  cpSync(join(template, 'configs'), join(root, 'configs'), { recursive: true });
  cpSync(join(template, 'package.json'), join(root, 'package.json'));
  symlinkSync(join(template, 'node_modules'), join(root, 'node_modules'), 'dir');
  if (vendor) symlinkSync(join(template, 'vendor'), join(root, 'vendor'), 'dir');
  for (const [path, json] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    if (json === null) rmSync(join(root, path)); else writeFileSync(join(root, path), JSON.stringify(json));
  }
  return root;
}
const record = (path) => readRecords(template).records.find((item) => item.file === `configs/remote/${path}.json`).json;
const edited = (path, change) => { const json = structuredClone(record(path)); change(json); return { [`configs/remote/${path}.json`]: json }; };

test('the records of the project pass; every scope is validated or listed as not validated', async () => {
  const result = await validateRecords(template);
  assert.deepEqual(result.problems, [], 'npm run records');
  const { records } = readRecords(template);
  const listed = [...result.validated.values()].flat().length + [...result.unvalidated.values()].flat().length;
  assert.equal(listed + 1, records.length, 'each record is validated or listed (the strings record is checked by scripts/strings.mjs)');
});

test('the SDK reads what it ships a reader for', { skip: !vendor && NO_SDK }, async (t) => {
  const root = project(t, {
    ...edited('ui.hud/layout', (json) => { json.data.sides = {}; }),
    ...edited('iap.offers/offer_coins_small', (json) => { json.data.kind = 'gift'; }),
    ...edited('levels.main/set', (json) => { json.data.last = 6; }),
  });
  const { problems, validated } = await validateRecords(root);
  assert.deepEqual(problems.map((line) => line.split(': ').slice(0, 2).join(': ')).sort(), [
    'configs/remote/iap.offers/offer_coins_small.json: data', 'configs/remote/levels.main/set.json: data',
    'configs/remote/ui.hud/layout.json: data.sides']);
  assert.ok([...validated.keys()].every((source) => source.startsWith('SDK: ')));
});

test('a saved server schema goes first, by the scope name or its pattern', { skip: !ajv && 'ajv is not installed' }, async (t) => {
  const schema = { type: 'object', additionalProperties: false, required: ['kind'],
    properties: { kind: { enum: ['set', 'range'] }, first: { type: 'integer' }, last: { type: 'integer' } } };
  const root = project(t, { 'schemas/levels.*.json': { scope: 'levels.*', schemaVersion: 3, schema },
    'schemas/ui.hud.json': { type: 'object', properties: { unlisted: { const: 'show' } } } });
  assert.equal(schemaFile(root, 'levels.main'), 'schemas/levels.*.json');
  const { problems, validated } = await validateRecords(root);
  assert.ok(validated.has('schemas/levels.*.json (server schema)') && validated.has('schemas/ui.hud.json (server schema)'));
  assert.ok(problems.includes('configs/remote/ui.hud/layout.json: data.unlisted: must be equal to constant'), problems.join('\n'));
  assert.ok(problems.includes('configs/remote/levels.main/set.json: data: must NOT have additional properties "afterLast"'), problems.join('\n'));
  writeFileSync(join(root, 'schemas/levels.main.json'), JSON.stringify({ type: 'object' }));
  assert.equal(schemaFile(root, 'levels.main'), 'schemas/levels.main.json');
});

// The first range the level set indexes (level data is written by the levels step, not the template).
const firstRange = () => record('levels.main/set').data.index[0].key;

test('rules and links between records', async (t) => {
  const root = project(t, {
    ...edited('progress/progress_main', (json) => { json.data.profileProjection = {}; json.data.steps[0].reward[0].id = 'item_gems'; }),
    ...edited('iap.offers/offer_coins_small', (json) => { json.data.variants[0].productKey = 'product_none'; }),
    ...edited('iap.placements/placement_shop', (json) => { json.data.offers.push('offer_none'); json.name = 'iap.placements/shop'; }),
    ...edited('inventory.catalog/item_coins', (json) => { json.display.titleKey = 'item.gems.title'; }),
    [`configs/remote/levels.main/${firstRange()}.json`]: null,
  });
  const { problems } = await validateRecords(root);
  for (const start of [
    'configs/remote/progress/progress_main.json: data.profileProjection: ',
    'configs/remote/progress/progress_main.json: data.steps[0].reward[0].id: no inventory entity',
    'configs/remote/iap.offers/offer_coins_small.json: data.variants[0].productKey: no record',
    'configs/remote/iap.placements/placement_shop.json: data.offers[3]: no record',
    'configs/remote/iap.placements/placement_shop.json: name: ',
    'configs/remote/inventory.catalog/item_coins.json: display.titleKey: no text',
    'configs/remote/levels.main/set.json: data.index[0].key: no record',
  ]) assert.ok(problems.some((line) => line.startsWith(start)), `${start}\n${problems.join('\n')}`);
});

test('ids the code names are records: src/boot/ids.ts and the items of TOP_BAR', async () => {
  const load = transpile(['screens/index', 'boot/ids']);
  const ids = await load('boot/ids');
  const { TOP_BAR } = await load('screens/index');
  const have = new Set(readRecords(template).records.map((item) => `${item.scope}/${item.key}`));
  const named = [
    ...(typeof ids.CURRENCY === 'string' ? [`inventory.catalog/${ids.CURRENCY}`] : []),
    ...(typeof ids.LEADERBOARD === 'string' ? [`leaderboards/${ids.LEADERBOARD}`] : []),
    ...(typeof ids.SHOP_PLACEMENT === 'string' ? [`iap.placements/${ids.SHOP_PLACEMENT}`] : []),
    ...Object.values(ids.PROGRESS ?? {}).map((key) => `progress/${key}`),
    ...(ids.LEVEL_SET_RECORD ? [`${ids.LEVEL_SET_RECORD.scope}/${ids.LEVEL_SET_RECORD.key}`] : []),
    ...(TOP_BAR ?? []).filter((entry) => entry.kind === 'item').map((entry) => `inventory.catalog/${entry.id}`),
  ];
  assert.deepEqual(named.filter((path) => !have.has(path)), [], 'records of configs/remote/ the code names but the project lacks');
});

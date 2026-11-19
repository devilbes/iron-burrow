// Texts of the game: one source — the `localization/strings` record
// (configs/remote/localization/strings.json, merged by scripts/strings.mjs from the parts in
// configs/remote/localization/strings/). The bundled texts are that record, so what is left to
// check is the record against the keys the code uses and against LOCALES.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { flatten, FRAGMENTS, readStrings, RECORD, serialize } from '../scripts/strings.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = (path) => readFileSync(join(root, path), 'utf8');
const { record, fragments } = readStrings(root);
/** Where a text is added or removed. */
const EDIT = fragments ? `${FRAGMENTS}/<part>.json (then \`npm run strings\`)` : RECORD;

// src/boot/strings.ts: the base locale and the namespaces of the code's own texts; the other
// namespaces of the record (`item.*`, `offer.*`…) are named by service records, not by code.
const boot = source('src/boot/strings.ts');
const base = /export const DEFAULT_LOCALE = '([\w-]+)'/.exec(boot)?.[1];
const namespaces = JSON.parse(/export const CODE_NAMESPACES[^=]*=\s*(\[[^\]]*\])/.exec(boot)?.[1].replaceAll("'", '"') ?? '[]');
const keys = (tag) => Object.keys(flatten(record[tag]));
const ofCode = (key) => namespaces.includes(key.split('.')[0]);

// Every quoted key of the code's namespaces in src/**/*.ts (`t('…')`, `label: '…'`, `title: '…'`).
const sources = (dir) => readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) =>
  entry.isDirectory() ? sources(join(dir, entry.name)) : entry.name.endsWith('.ts') ? [join(dir, entry.name)] : []);
const pattern = new RegExp(`'((?:${namespaces.join('|')})\\.[\\w.]+)'`, 'g');
const used = new Map();
for (const file of sources('src')) {
  for (const match of source(file).matchAll(pattern)) used.set(match[1], [...(used.get(match[1]) ?? []), file]);
}

test('the record to upload is the merge of its parts', { skip: !fragments && `no ${FRAGMENTS}/: ${RECORD} is the one file` }, () => {
  assert.equal(source(RECORD), serialize(record), `${RECORD} is out of date: run \`npm run strings\` (never edit it by hand, edit ${FRAGMENTS}/<part>.json)`);
});

test('every key the code uses is in the record, every key of the record is used', () => {
  assert.ok(base && namespaces.length, 'src/boot/strings.ts exports DEFAULT_LOCALE and CODE_NAMESPACES');
  const have = new Set(keys(base));
  const missing = [...used.keys()].filter((key) => !have.has(key)).map((key) => `${key} (${[...new Set(used.get(key))].join(', ')})`);
  assert.deepEqual(missing, [], `keys the code uses without a text for "${base}": add them to ${EDIT}`);
  const unused = [...have].filter((key) => ofCode(key) && !used.has(key));
  assert.deepEqual(unused, [], `texts of "${base}" no code uses: remove them from ${EDIT} (or use the key whole, in single quotes)`);
});

test('the game has its title', () => {
  const title = flatten(record[base])['shell.title'];
  assert.ok(typeof title === 'string' && title.trim(), `shell.title for "${base}" is missing: add it to ${EDIT}`);
});

// LOCALES of src/screens/index.ts: the languages the SDK may pick (src/boot/start.ts gameLocales).
const locales = JSON.parse(/export const LOCALES[^=]*=\s*(\[[^\]]*\])/.exec(
  source('src/screens/index.ts'))?.[1].replaceAll("'", '"') ?? 'null');

test('LOCALES are the published locales of the record, each with every text', () => {
  assert.ok(Array.isArray(locales) && locales.includes(base), `LOCALES in src/screens/index.ts lists the base locale ${base}`);
  const index = JSON.parse(source('configs/remote/localization/locales.json'));
  const published = index.locales.filter((item) => item.status === 'published').map((item) => item.tag);
  assert.deepEqual([...locales].sort(), [...published].sort(), 'LOCALES = published tags of configs/remote/localization/locales.json');
  assert.ok(locales.includes(index.defaultLocale), 'defaultLocale of localization/locales is in LOCALES');
  const all = keys(base);
  const missing = locales.flatMap((tag) => {
    const have = new Set(keys(tag));
    return all.filter((key) => !have.has(key)).map((key) => `${tag}: ${key}`);
  });
  assert.deepEqual(missing, [], `texts of "${base}" a locale of LOCALES lacks: add them to ${EDIT}`);
});

// Механическая проверка образцов записей configs/remote/** до записи в сервисы: без сети.
// 1. Схема раздела. Источник истины — схема сервера, сохранённая в проект: schemas/<scope>.json
//    (JSON Schema, по которой сервер принимает запись; для levels.main подходит и levels.main.json,
//    и levels.*.json). Нет файла — проверка тем кодом, который SDK в vendor/ даёт для раздела
//    (таблица SDK ниже: так запись читает клиент). Нет ни того, ни другого — раздел печатается
//    как «not validated: no schema», а не «проходит». Источник печатается для каждого раздела.
// 2. Правила, на которых уже ломались игры (таблица RULES).
// 3. Связи между записями, которые видны из самих файлов (таблица LINKS): id, названный одной
//    записью, есть в другой; ключ текста, названный записью, есть в записи строк.
// Ошибка — строка `файл: путь в JSON: что не так`; код выхода 1. Запуск: `npm run records`.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { linkSdk, sdkState } from './sdk.mjs';
import { flatten, readStrings, RECORD as STRINGS_FILE } from './strings.mjs';

const ROOT = 'configs/remote';
const SCHEMAS = 'schemas';
const VENDOR = 'vendor/@manygamescorp';
const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const sdkModule = (root, path) => import(pathToFileURL(resolve(root, VENDOR, path)).href);

/**
 * What the SDK ships per scope: `match(scope, key)`, the vendor file and its function, and
 * `check(fn, data, key)` → problems as `[json path, message]`. These read a record the way the
 * client does; the server's own schema of a scope is not in the SDK.
 */
const SDK = [
  { name: 'localization/locales', match: (scope, key) => scope === 'localization' && key === 'locales',
    file: 'core/dist/l10n-sources.js', fn: 'validIndex',
    check: (validIndex, data) => (validIndex(data) ? []
      : [['', 'not a locale index: { defaultLocale?, locales: [{ tag, name, status: "published" }] } with canonical tags']]) },
  { name: 'ui.hud/layout', match: (scope, key) => scope === 'ui.hud' && key === 'layout',
    file: 'core/dist/hud.js', fn: 'parseHudLayout',
    check: (parseHudLayout, data) => {
      const issues = [];
      parseHudLayout(data, (issue) => issues.push(issue));
      const text = { TYPE: 'wrong type', PATTERN: 'value not allowed', RANGE: 'out of range', UNKNOWN: 'unknown field' };
      return issues.map((issue) => [issue.path, `${text[issue.code] ?? issue.code} (the SDK drops it)`]);
    } },
  { name: 'iap.offers/*', match: (scope) => scope === 'iap.offers',
    file: 'mod-iap/dist/catalog.js', fn: 'parseOffer',
    // A switched-off offer is a valid record the client skips: its shape is read as if it were on.
    check: (parseOffer, data) => (parseOffer(isObject(data) ? { ...data, enabled: true } : data) ? []
      : [['', 'the SDK cannot read this offer: kind paid|free|ad (ad needs format), variants 1–16, each with a key and a productKey or entities']]) },
  { name: 'iap.settings.products/*', match: (scope) => scope === 'iap.settings.products',
    file: 'mod-iap/dist/catalog.js', fn: 'parseProduct',
    check: (parseProduct, data, key) => (parseProduct(key, data, null) ? []
      : [['', 'the SDK cannot read this product: type consumable|non_consumable|subscription, entities [{ id, amount }], no skus']]) },
  { name: 'levels.*/set', match: (scope, key) => scope.startsWith('levels.') && key === 'set',
    file: 'mod-progress/dist/levels-validation.js', fn: 'readIndex',
    check: (readIndex, data) => {
      try { readIndex(data); return []; }
      catch (error) { return [['', `the SDK cannot read this level set (${error.code ?? error.message}): kind "set", first/last, index of r_<first>_<last> ranges covering every level without gaps`]]; }
    } },
];

/** Every record file: `{ file, scope, key, json, data }`; `data` is the envelope's `data` or the file itself. */
export function readRecords(root = '.') {
  const records = [], problems = [];
  const dir = join(root, ROOT);
  for (const scope of existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort() : []) {
    for (const name of readdirSync(join(dir, scope)).filter((entry) => entry.endsWith('.json')).sort()) {
      const file = `${ROOT}/${scope}/${name}`;
      try {
        const json = JSON.parse(readFileSync(join(root, file), 'utf8'));
        const envelope = isObject(json) && Object.hasOwn(json, 'data') && typeof json.name === 'string';
        records.push({ file, scope, key: name.slice(0, -'.json'.length), json, envelope, data: envelope ? json.data : json });
      } catch (error) { problems.push(`${file}: : not JSON (${error.message})`); }
    }
  }
  return { records, problems };
}

/** `schemas/<scope>.json`, then the patterns `a.b.*`, `a.*` of a dotted scope; undefined when none is saved. */
export function schemaFile(root, scope) {
  const parts = scope.split('.');
  const names = [scope, ...parts.slice(1).map((_, i) => `${parts.slice(0, parts.length - 1 - i).join('.')}.*`)];
  return names.map((name) => `${SCHEMAS}/${name}.json`).find((file) => existsSync(join(root, file)));
}

/** A compiled validator of a saved schema: the file is the JSON Schema itself or carries it in `schema`. */
function compileSchema(root, file) {
  const require = createRequire(pathToFileURL(resolve(root, 'package.json')));
  const saved = JSON.parse(readFileSync(join(root, file), 'utf8'));
  const schema = isObject(saved?.schema) ? saved.schema : saved;
  const draft2020 = typeof schema.$schema === 'string' && schema.$schema.includes('2020-12');
  let Ajv;
  try { Ajv = require(draft2020 ? 'ajv/dist/2020.js' : 'ajv'); }
  catch { throw new Error(`${file}: the JSON Schema validator (ajv, devDependencies) is not installed: run \`npm install\``); }
  const validate = new (Ajv.default ?? Ajv)({ allErrors: true, strict: false, validateFormats: false }).compile(schema);
  return (data) => (validate(data) ? [] : validate.errors.map((error) => [
    error.instancePath.split('/').slice(1).map((part) => (/^\d+$/.test(part) ? `[${part}]` : `.${part}`)).join('').replace(/^\./, ''),
    `${error.message}${error.params?.additionalProperty ? ` "${error.params.additionalProperty}"` : ''}`
      + `${error.params?.allowedValues ? `: ${error.params.allowedValues.join(' | ')}` : ''}`]));
}

const dataPath = (record, path) => [record.envelope ? 'data' : '', path].filter(Boolean).join(path.startsWith('[') ? '' : '.');

/** One record by its scope's schema: `{ source, problems }`; `source` undefined — nothing to validate it with. */
async function validateOne(root, record, cache, vendor) {
  const file = schemaFile(root, record.scope);
  if (file) {
    if (!cache.has(file)) cache.set(file, compileSchema(root, file));
    return { source: `${file} (server schema)`, problems: cache.get(file)(record.data) };
  }
  const rule = SDK.find((item) => item.match(record.scope, record.key));
  if (!vendor || !rule || !existsSync(join(root, VENDOR, rule.file))) return { source: undefined, problems: [] };
  const fn = (await sdkModule(root, rule.file))[rule.fn];
  if (typeof fn !== 'function') throw new Error(`${VENDOR}/${rule.file}: no ${rule.fn}() in this SDK version`);
  return { source: `SDK: ${rule.file.split('/')[0]} ${rule.fn}() — ${rule.name}`, problems: rule.check(fn, record.data, record.key) };
}

/** Schema part: `{ problems, validated, unvalidated, skipped }`; `validated` maps a source to its files. */
async function validateBySchemas(root, records) {
  const problems = [], validated = new Map(), unvalidated = new Map(), cache = new Map();
  const vendor = existsSync(join(root, VENDOR));
  for (const record of records) {
    if (record.file === STRINGS_FILE && !schemaFile(root, record.scope)) continue;
    const { source, problems: found } = await validateOne(root, record, cache, vendor);
    const group = source ? validated : unvalidated;
    const label = source ?? record.scope;
    group.set(label, [...(group.get(label) ?? []), source ? record.file : record.key]);
    for (const [path, message] of found) problems.push(`${record.file}: ${dataPath(record, path)}: ${message}`);
  }
  return { problems, validated, unvalidated, skipped: vendor ? null : `no SDK packages in ${VENDOR}/` };
}

/** Hard rules a real game already broke on: the service rejects the record. */
const RULES = [
  { name: 'progress/progress_main: no data.profileProjection (the server rejects it with PROGRESS_CONFIG_SCHEMA)',
    of: ({ scope, key }) => scope === 'progress' && key === 'progress_main',
    check: ({ data }) => (isObject(data) && Object.hasOwn(data, 'profileProjection')
      ? [['data.profileProjection', 'unknown block: the progress service rejects the record with PROGRESS_CONFIG_SCHEMA, remove it']] : []) },
];

/** Every `[json path, value]` of a tree, depth first. */
function* walk(value, path = '') {
  yield [path, value];
  if (Array.isArray(value)) for (const [i, item] of value.entries()) yield* walk(item, `${path}[${i}]`);
  else if (isObject(value)) for (const [key, item] of Object.entries(value)) yield* walk(item, path ? `${path}.${key}` : key);
}

const TEXT_KEY = /^[A-Za-z][\w-]*(\.[\w-]+)+$/;
const TEXT_FIELDS = new Set(['titleKey', 'descriptionKey', 'l10n', 'title']);
const lastField = (path) => path.split('.').at(-1).replace(/\[\d+\]$/, '');

/** Links between records; each returns problems of one record. `has(scope, key)` — the file exists. */
const LINKS = [
  { name: 'name, scope and key of a record are its path <scope>/<key>.json', of: () => true,
    check: ({ json, envelope, scope, key }) => [
      ...(envelope && json.name !== `${scope}/${key}` ? [['name', `"${json.name}" is not this file's "${scope}/${key}"`]] : []),
      ...(envelope && Object.hasOwn(json, 'scope') && json.scope !== scope ? [['scope', `"${json.scope}" is not the directory "${scope}"`]] : []),
      ...(envelope && Object.hasOwn(json, 'key') && json.key !== key ? [['key', `"${json.key}" is not the file name "${key}"`]] : [])] },
  { name: 'inventory.catalog itemId and leaderboards leaderboardKey are the file name',
    of: ({ scope }) => scope === 'inventory.catalog' || scope === 'leaderboards',
    check: ({ scope, key, data }) => {
      const field = scope === 'leaderboards' ? 'leaderboardKey' : 'itemId';
      return isObject(data) && data[field] === key ? [] : [[field, `must be the file name "${key}"`]];
    } },
  { name: 'iap.offers variants[].productKey → iap.settings.products/<key>', of: ({ scope }) => scope === 'iap.offers',
    check: ({ data }, { has }) => (Array.isArray(data?.variants) ? data.variants : []).flatMap((variant, i) =>
      typeof variant?.productKey === 'string' && !has('iap.settings.products', variant.productKey)
        ? [[`data.variants[${i}].productKey`, `no record ${ROOT}/iap.settings.products/${variant.productKey}.json`]] : []) },
  { name: 'iap.placements offers[] → iap.offers/<key>', of: ({ scope }) => scope === 'iap.placements',
    check: ({ data }, { has }) => (Array.isArray(data?.offers) ? data.offers : []).flatMap((offer, i) =>
      typeof offer === 'string' && !has('iap.offers', offer) ? [[`data.offers[${i}]`, `no record ${ROOT}/iap.offers/${offer}.json`]] : []) },
  { name: 'entities[].id of products, offers and inventory.starter, reward[].id of progress steps → inventory.catalog/<id>',
    of: ({ scope }) => ['iap.settings.products', 'iap.offers', 'inventory.starter', 'progress'].includes(scope),
    check: ({ data, envelope, scope }, { has }) => [...walk(data, envelope ? 'data' : '')].flatMap(([path, value]) =>
      new RegExp(scope === 'progress' ? '\\.reward\\[\\d+\\]\\.id$' : '\\.entities\\[\\d+\\]\\.id$').test(path)
        && typeof value === 'string' && !has('inventory.catalog', value)
        ? [[path, `no inventory entity ${ROOT}/inventory.catalog/${value}.json`]] : []) },
  { name: 'levels.<set>/set index[] → levels.<set>/<range> with the same first and last',
    of: ({ scope, key }) => scope.startsWith('levels.') && key === 'set',
    check: ({ data, scope }, { get }) => (Array.isArray(data?.index) ? data.index : []).flatMap((range, i) => {
      const record = typeof range?.key === 'string' ? get(scope, range.key) : undefined;
      if (!record) return [[`data.index[${i}].key`, `no record ${ROOT}/${scope}/${range?.key}.json`]];
      return record.data?.first === range.first && record.data?.last === range.last ? []
        : [[`data.index[${i}]`, `first/last differ from ${record.file} (${record.data?.first}–${record.data?.last})`]];
    }) },
  { name: `text keys named by records (titleKey, descriptionKey, l10n, title) → ${STRINGS_FILE}, for the namespaces that file has`,
    of: ({ scope }) => scope !== 'localization',
    check: ({ data, envelope }, { texts, namespaces }) => [...walk(data, envelope ? 'data' : '')].flatMap(([path, value]) =>
      TEXT_FIELDS.has(lastField(path)) && typeof value === 'string' && TEXT_KEY.test(value)
        && namespaces.has(value.split('.')[0]) && !texts.some((key) => key === value || key.startsWith(`${value}.`))
        ? [[path, `no text or group of texts "${value}" in ${STRINGS_FILE} (add it to its parts, \`npm run strings\`)`]] : []) },
];

function validateLinks(root, records) {
  const problems = [];
  const byPath = new Map(records.map((record) => [`${record.scope}/${record.key}`, record]));
  let strings = {};
  try { strings = readStrings(root).record; } catch (error) { problems.push(`${STRINGS_FILE}: : ${error.message.replaceAll('\n', ' ')}`); }
  const context = { has: (scope, key) => byPath.has(`${scope}/${key}`), get: (scope, key) => byPath.get(`${scope}/${key}`),
    namespaces: new Set(Object.values(strings).flatMap((tree) => Object.keys(tree))),
    texts: Object.keys(flatten(Object.values(strings)[0] ?? {})) };
  for (const record of records) {
    for (const link of [...RULES, ...LINKS].filter((item) => item.of(record))) {
      for (const [path, message] of link.check(record, context)) problems.push(`${record.file}: ${path}: ${message}`);
    }
  }
  return problems;
}

/** Validates the records of the project in `root`: `{ files, problems, validated, unvalidated, skipped, rules, links }`. */
export async function validateRecords(root = '.') {
  const { records, problems } = readRecords(root);
  const sdk = await validateBySchemas(root, records);
  return { files: records.length, problems: [...problems, ...sdk.problems, ...validateLinks(root, records)],
    validated: sdk.validated, unvalidated: sdk.unvalidated, skipped: sdk.skipped, 
    rules: RULES.map((rule) => rule.name), links: LINKS.map((link) => link.name) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let result;
  try { linkSdk(sdkState().platform); result = await validateRecords(); }
  catch (error) { console.error(error.message); process.exit(1); }
  console.log(`records: ${result.files} files of ${ROOT}/`);
  if (result.skipped) console.log(`SKIPPED the SDK checks: ${result.skipped}`);
  for (const [source, files] of result.validated) console.log(`validated by ${source}: ${files.length}`);
  console.log(`checked by scripts/strings.mjs (shape of the tree, parts merged): ${STRINGS_FILE}`);
  for (const [scope, keys] of result.unvalidated) console.log(`not validated: no schema: ${scope} (${keys.join(', ')}) — no ${SCHEMAS}/${scope}.json, nothing in the SDK`);
  for (const name of result.rules) console.log(`rule checked: ${name}`);
  for (const name of result.links) console.log(`link checked: ${name}`);
  for (const problem of result.problems) console.error(problem);
  console.log(result.problems.length ? `FAIL: ${result.problems.length} problems` : 'ok: no problems in what was checked');
  process.exit(result.problems.length ? 1 : 0);
}

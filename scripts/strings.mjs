// Тексты игры: один источник — запись `localization/strings` в том виде, в каком её принимает
// сервис локализации: `{ "<язык>": { "<пространство>": { … дерево … } } }`.
// Части пишутся отдельными файлами той же схемы в configs/remote/localization/strings/<часть>.json;
// этот скрипт склеивает их (по имени файла, ключи — в порядке появления) в
// configs/remote/localization/strings.json — файл для заливки, из которого сборка берёт и
// встроенные тексты (src/boot/strings.ts). Один ключ с разным текстом в двух файлах — ошибка
// с именами файлов. Без каталога частей strings.json правят руками, скрипт его только проверяет.
// Запуск: `npm run strings` (его же вызывают `npm run build`, `npm run typecheck`, `npm run test:unit`).
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const RECORD = 'configs/remote/localization/strings.json';
export const FRAGMENTS = 'configs/remote/localization/strings';
const MAX_DEPTH = 8;

const isTree = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

/** `{ screen: { home: { play: "Play" } } }` → `{ "screen.home.play": "Play" }`. */
export function flatten(tree, prefix = '') {
  return Object.fromEntries(Object.entries(tree ?? {}).flatMap(([key, value]) => isTree(value)
    ? Object.entries(flatten(value, `${prefix}${key}.`)) : [[`${prefix}${key}`, value]]));
}

/** Names of the fragment files, sorted; empty when the game keeps the record as one file. */
export function fragmentFiles(root = '.') {
  const dir = join(root, FRAGMENTS);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => name.endsWith('.json')).sort().map((name) => `${FRAGMENTS}/${name}`);
}

function parse(root, file) {
  let data;
  try { data = JSON.parse(readFileSync(join(root, file), 'utf8')); }
  catch (error) { throw new Error(`${file}: not JSON (${error.message})`); }
  if (!isTree(data)) throw new Error(`${file}: expected { "<locale>": { … } }`);
  return data;
}

/** Problems of one file's shape: locale → tree of strings, segments without dots, depth ≤ 8. */
function shapeProblems(file, node, path = []) {
  return Object.entries(node).flatMap(([key, value]) => {
    const at = [...path, key];
    const where = `${file}: ${at[0]}${at.length > 1 ? `: ${at.slice(1).join('.')}` : ''}`;
    if (key === '' || key.includes('.')) return [`${where}: a key segment is empty or has a dot`];
    if (isTree(value)) return at.length > MAX_DEPTH ? [`${where}: deeper than ${MAX_DEPTH} levels`] : shapeProblems(file, value, at);
    if (path.length === 0) return [`${where}: a locale holds a tree, not a value`];
    return typeof value === 'string' ? [] : [`${where}: a text must be a string`];
  });
}

function mergeInto(target, source, file, owners, path, problems) {
  for (const [key, value] of Object.entries(source)) {
    const at = [...path, key];
    const id = at.join('\u0000');
    const name = `${at[0]}: ${at.slice(1).join('.')}`;
    if (!Object.hasOwn(target, key)) {
      target[key] = isTree(value) ? {} : value;
      owners.set(id, file);
    } else if (isTree(value) !== isTree(target[key])) {
      problems.push(`${name}: a text in one file and a group in another (${owners.get(id)}, ${file})`);
      continue;
    } else if (!isTree(value) && value !== target[key]) {
      problems.push(`${name}: defined twice with different text (${owners.get(id)}: ${JSON.stringify(target[key])}; ${file}: ${JSON.stringify(value)})`);
      continue;
    }
    if (isTree(value)) mergeInto(target[key], value, file, owners, at, problems);
  }
}

/**
 * The record of the project in `root`: `{ record, files, fragments }`. With fragments — their
 * merge, `files` are the fragments; without — strings.json itself. Throws one error listing every
 * problem with the file names.
 */
export function readStrings(root = '.') {
  const fragments = fragmentFiles(root);
  const files = fragments.length ? fragments : [RECORD];
  if (!fragments.length && !existsSync(join(root, RECORD))) {
    throw new Error(`${RECORD} is missing: write it or its parts in ${FRAGMENTS}/<part>.json`);
  }
  const record = {}, owners = new Map(), problems = [];
  for (const file of files) {
    const data = parse(root, file);
    const shape = shapeProblems(file, data);
    problems.push(...shape);
    if (!shape.length) mergeInto(record, data, file, owners, [], problems);
  }
  if (problems.length) throw new Error(`localization strings:\n  ${problems.join('\n  ')}`);
  return { record, files, fragments: fragments.length > 0 };
}

export const serialize = (record) => `${JSON.stringify(record, null, 2)}\n`;

/** Writes the merged record when it differs from the file; returns `{ record, files, written }`. */
export function writeStrings(root = '.') {
  const result = readStrings(root);
  const out = join(root, RECORD);
  const text = serialize(result.record);
  const written = result.fragments && (!existsSync(out) || readFileSync(out, 'utf8') !== text);
  if (written) writeFileSync(out, text);
  return { ...result, written };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { record, files, fragments, written } = writeStrings();
    const count = Object.entries(record).map(([tag, tree]) => `${tag} ${Object.keys(flatten(tree)).length}`).join(', ');
    console.log(fragments
      ? `strings: ${RECORD} ${written ? 'written' : 'up to date'} from ${files.length} files of ${FRAGMENTS}/ (${count})`
      : `strings: ${RECORD} checked (${count}); no ${FRAGMENTS}/ — the record is edited as one file`);
  } catch (error) { console.error(error.message); process.exit(1); }
}

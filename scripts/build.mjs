// Сборка проекта: `npm install && npm run build` → dist/ с dist/index.html.
// tsc только проверяет типы (без вывода); код собирает esbuild: вход src/main.ts (и src/boot/start.ts,
// когда у проекта есть SDK) → dist/app/main.js, dist/app/start.js и общие куски dist/app/chunk-<хэш>.js,
// склеенные, без неиспользуемого кода, минифицированные, карты — рядом во внешних .map (платформа
// уносит их в sourcemaps.zip, в www/ их нет). Пакеты SDK в бандл не входят: они лежат готовыми
// в vendor/@manygamescorp/ (их кладёт платформа по platform.json; lock-файла и зависимостей на них в package.json нет,
// scripts/sdk.mjs связывает их с node_modules), их import map
// vendor/@manygamescorp/importmap.json вставляется в index.html. CSS из src/ минифицируется на своём месте
// в dist/app/, index.html — тоже; тексты — запись configs/remote/localization/strings.json, её
// перед сборкой склеивает scripts/strings.mjs из частей; assets/ копируется как есть. platform.json в dist/
// подставляет платформа; локальный корневой копируется только для запуска у себя.
// `--no-typecheck` — тот же бандл без проверки типов: для `npm run check:fast` (scripts/check.mjs --fast), где типы
// проверяет scripts/typecheck.mjs (инкрементально). `npm run build` типы проверяет всегда; в prod флаг
// не действует.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { build, transform } from 'esbuild';
import ts from 'typescript';
import { linkSdk, sdkState, tsconfigOf } from './sdk.mjs';
import { writeStrings } from './strings.mjs';

const MARKER = '<!-- importmap -->';
const OUT = 'dist/app';

rmSync('dist', { recursive: true, force: true });
// Texts: the parts of configs/remote/localization/strings/ become the one record the code bundles.
let strings;
try { strings = writeStrings().record; } catch (error) { console.error(error.message); process.exit(1); }
const { platform, map, configured } = sdkState();
try { linkSdk(platform); } catch (error) { console.error(error.message); process.exit(1); }
const prod = platform?.environment === 'prod';
const typed = prod || !process.argv.includes('--no-typecheck');
const debugRoot = resolve('src/debug');
const isDebug = (file) => {
  const path = resolve(file);
  return path === debugRoot || path.startsWith(`${debugRoot}${sep}`);
};
const tsconfig = tsconfigOf(configured);
const config = ts.readConfigFile(tsconfig, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config ?? {}, ts.sys, process.cwd());
const configErrors = [...(config.error ? [config.error] : []), ...parsed.errors];
const host = { getCanonicalFileName: (file) => file, getCurrentDirectory: ts.sys.getCurrentDirectory, getNewLine: () => ts.sys.newLine };
function check(diagnostics) {
  if (!diagnostics.length) return;
  process.stderr.write(ts.formatDiagnosticsWithColorAndContext(diagnostics, host));
  process.exit(1);
}
check(configErrors);
const files = parsed.fileNames.filter((file) => !prod || !isDebug(file));
if (typed) {
  const program = ts.createProgram(files, { ...parsed.options, noEmit: true });
  if (prod && program.getSourceFiles().some((file) => isDebug(file.fileName))) {
    throw new Error('Prod build imports src/debug. Remove debug imports from production game code.');
  }
  check(ts.getPreEmitDiagnostics(program));
}

// Entries: the page entry; the SDK boot graph, which main.ts imports by name (`./start.js`, next
// to main.js) only once the SDK has loaded; the debug sources of src/debug*/ (not src/debug/ in
// prod), each under its own path, as tsc emitted them before. Everything else is reached by imports.
const entries = [{ in: 'src/main.ts', out: 'main' }];
if (configured) entries.push({ in: 'src/boot/start.ts', out: 'start' });
for (const file of files) {
  const path = relative('src', file).split(sep).join('/');
  if (/^debug[^/]*\//.test(path) && path.endsWith('.ts') && !path.endsWith('.d.ts')) {
    entries.push({ in: file, out: path.slice(0, -'.ts'.length) });
  }
}
const target = (ts.ScriptTarget[parsed.options.target ?? ts.ScriptTarget.ES2022] ?? 'ES2022').toLowerCase();
await build({
  entryPoints: entries,
  outdir: OUT,
  bundle: true,
  // Shared modules (strings, errors) stay one instance for main.js and start.js; dynamic import()
  // of the game's own modules becomes a separate chunk.
  splitting: true,
  format: 'esm',
  platform: 'browser',
  target,
  tsconfig,
  minify: true,
  // Code that resolves files by `new URL(…, import.meta.url)` (assets.ts, skin/index.ts) runs from
  // dist/app/: chunks stay in the same directory as the entries.
  chunkNames: '[name]-[hash]',
  sourcemap: 'external',
  sourcesContent: true,
  // The SDK comes from vendor/ through the import map of index.html.
  external: ['@manygamescorp/*'],
  charset: 'utf8',
  legalComments: 'none',
  logLevel: 'warning',
});

let html = readFileSync('index.html', 'utf8');
// The page title and language: the public name of the project (project.json `name`; without one
// the game's own `shell.title` of the base locale in the strings record), the base locale of
// src/boot/strings.ts.
const { name, lang } = pageIdentity();
html = html.replace(/<title>[^<]*<\/title>/, () => `<title>${escapeHtml(name)}</title>`)
  .replace(/<html lang="[^"]*"/, () => `<html lang="${escapeHtml(lang)}"`);
if (!html.includes(MARKER)) throw new Error(`index.html: marker ${MARKER} is missing`);
html = html.replace(MARKER, () => `<script type="importmap">${JSON.stringify({ imports: map.imports ?? {} })}</script>`);
writeFileSync('dist/index.html', await minifyHtml(html));

// Plain CSS of src/ (src/skin/theme.css) goes next to the bundles that load it by URL, each file on
// its own path, its local @import rules inlined, minified; url() references stay as written.
const keepUrls = { name: 'keep-urls', setup(b) {
  b.onResolve({ filter: /.*/ }, (args) => (args.kind === 'url-token' ? { path: args.path, external: true } : undefined));
} };
for (const file of readdirSync('src', { recursive: true })) {
  if (!file.endsWith('.css') || (prod && isDebug(`src/${file}`))) continue;
  const out = `${OUT}/${file.split(sep).join('/')}`;
  mkdirSync(dirname(out), { recursive: true });
  await build({ entryPoints: [`src/${file}`], outfile: out, bundle: true, minify: true, charset: 'utf8',
    legalComments: 'none', logLevel: 'warning', plugins: [keepUrls] });
}

for (const dir of ['vendor', 'assets']) {
  // The vendor lock describes the complete SDK inventory, including documentation.
  if (existsSync(dir)) cpSync(dir, `dist/${dir}`, { recursive: true, filter: (p) => dir === 'vendor' || !p.endsWith('README.md') });
}
if (existsSync('platform.json')) cpSync('platform.json', 'dist/platform.json');

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

/**
 * The page without comments and indentation: whitespace runs that contain a line break collapse
 * (between tags they go away), inline <style> is minified CSS. <script>, <pre> and <textarea>
 * keep their bytes; whitespace on one line (text between inline tags) stays as written.
 */
async function minifyHtml(source) {
  const raw = /<(script|style|pre|textarea)\b[^>]*>[^]*?<\/\1\s*>/gi;
  const markup = (text) => text.replace(/<!--[^]*?-->/g, '').replace(/>\s*\n\s*</g, '><').replace(/\s*\n\s*/g, ' ');
  let out = '', last = 0;
  for (const match of source.matchAll(raw)) {
    out += markup(source.slice(last, match.index));
    let block = match[0];
    if (match[1].toLowerCase() === 'style') {
      const open = block.indexOf('>') + 1, close = block.lastIndexOf('</');
      const css = (await transform(block.slice(open, close), { loader: 'css', minify: true, charset: 'utf8' })).code.trim();
      block = `${block.slice(0, open)}${css}${block.slice(close)}`;
    }
    out += block;
    last = match.index + match[0].length;
  }
  return `${(out + markup(source.slice(last))).trim()}\n`;
}

/** Name and language of the page (projects owns the public name; no private metadata enters the artifact). */
function pageIdentity() {
  const lang = /export const DEFAULT_LOCALE = '([\w-]+)'/.exec(readFileSync('src/boot/strings.ts', 'utf8'))?.[1];
  if (!lang) throw new Error('src/boot/strings.ts: DEFAULT_LOCALE is missing');
  const title = strings[lang]?.shell?.title;
  const project = existsSync('project.json') ? JSON.parse(readFileSync('project.json', 'utf8')) : null;
  const name = [project?.name, title].find((value) => typeof value === 'string' && value.trim());
  return { name: name?.trim() ?? '', lang };
}

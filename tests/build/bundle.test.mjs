// The bundle and the page the build writes: entries, chunks, maps, minified CSS and HTML, title.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fixture, passes, sdkInstalled, SKIP, template } from '../helpers/build-fixture.mjs';

const it = test;

it('bundles, minifies and maps the game code, CSS and page', (t) => {
  const game = fixture(t, 'test', {
    'src/main.ts': "import { bootText } from './boot/strings.js';\n"
      + "export const title = bootText('shell.status.loading');\n"
      + "export const later = () => import('./modules/later.js');\n",
    'src/modules/later.ts': 'export const unusedExport = 1;\nexport const later = "lazy chunk";\n',
    'src/skin/extra.css': '@import "./part.css";\n.a { color: #ffffff; background: url(../../assets/x.png); }\n',
    'src/skin/part.css': '/* part */\n.b  {  margin : 0px ; }\n',
  });
  passes(game.build());
  const app = join(game.root, 'dist/app');
  const files = readdirSync(app, { recursive: true }).map(String).sort();
  // Entries and chunks side by side in dist/app/, no file per source module, maps beside the code
  // (with installed SDK packages the boot entry start.js and its shared chunk are there too).
  const code = files.filter(file => file.endsWith('.js'));
  assert.ok(code.includes('main.js'));
  const lazy = code.filter(file => /^later-[A-Z0-9]+\.js$/.test(file));
  assert.equal(lazy.length, 1, code.join(','));
  assert.deepEqual(code.filter(file => file !== 'main.js' && file !== 'start.js' && !lazy.includes(file)
    && !/^chunk-[A-Z0-9]+\.js$/.test(file)), []);
  for (const file of code) assert.ok(files.includes(`${file}.map`), file);
  assert.equal(files.some(file => file.endsWith('.json')), false);
  const main = readFileSync(join(app, 'main.js'), 'utf8');
  assert.doesNotMatch(main, /sourceMappingURL/);
  assert.doesNotMatch(main, /\n {2}/);
  assert.match(readFileSync(join(app, lazy[0]), 'utf8'), /lazy chunk/);
  const map = JSON.parse(readFileSync(join(app, 'main.js.map'), 'utf8'));
  assert.ok(map.sources.some(source => source.endsWith('src/main.ts')), map.sources.join(','));
  // CSS: local @import inlined, minified, url() kept as written.
  const css = readFileSync(join(app, 'skin/extra.css'), 'utf8');
  assert.match(css, /\.b\{margin:0\}/);
  assert.match(css, /url\(\.\.\/\.\.\/assets\/x\.png\)/);
  assert.doesNotMatch(css, /part \*\/|@import/);
  const theme = readFileSync(join(game.root, 'src/skin/theme.css'), 'utf8');
  const built = readFileSync(join(app, 'skin/theme.css'), 'utf8');
  assert.ok(built.length < theme.length * 0.8, `${built.length} of ${theme.length}`);
  assert.doesNotMatch(built, /\/\*|\n./);
  // The page: no comments or indentation, the import map inline, the entry script kept.
  const html = readFileSync(join(game.root, 'dist/index.html'), 'utf8');
  assert.doesNotMatch(html, /<!--|\n\s/);
  assert.match(html, /<script type="importmap">\{"imports":\{\}\}<\/script>/);
  assert.match(html, /<script type="module" src="\.\/app\/main\.js"><\/script>/);
  assert.match(html, /<style>html,body\{/);
});

// Bundled code runs from dist/app/ whichever module it came from: a file URL built from
// import.meta.url names its path from there, i.e. its path under src/ (CSS keeps it in dist/app/).
it('import.meta.url file references of src/ resolve from dist/app/', () => {
  const src = join(template, 'src');
  const refs = readdirSync(src, { recursive: true }).map(String).filter(file => file.endsWith('.ts'))
    .flatMap(file => [...readFileSync(join(src, file), 'utf8')
      .matchAll(/new URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url\s*\)/g)].map(match => [file, match[1]]));
  assert.ok(refs.length > 0);
  for (const [file, ref] of refs) {
    if (ref.endsWith('/')) continue;
    assert.ok(existsSync(join(src, ref)), `${file}: ${ref} is not a path under src/`);
  }
});

test('starter artifact has visible baseline styles and uses the public project name safely',
  { skip: sdkInstalled ? false : SKIP }, t => {
  const game = fixture(t, 'test', {'project.json': JSON.stringify({name: 'Stars <&> "Game"'})});
  passes(game.build());
  const html = readFileSync(join(game.root, 'dist/index.html'), 'utf8');
  assert.match(html, /<title>Stars &lt;&amp;&gt; &quot;Game&quot;<\/title>/);
  // The SDK boot graph is one entry next to main.js; the SDK itself stays external (import map).
  const code = readdirSync(join(game.root, 'dist/app')).filter(file => file.endsWith('.js'))
    .map(file => readFileSync(join(game.root, 'dist/app', file), 'utf8')).join('\n');
  assert.ok(existsSync(join(game.root, 'dist/app/start.js')));
  assert.match(code, /createSdk/);
  assert.match(code, /uiKitModule/);
  assert.match(code, /["']@manygamescorp\/core\/kernel["']/);
  assert.doesNotMatch(code, /sourceMappingURL/);
});

// `shell.title` of the base locale (en) of the project: the parts of the strings record.
const stringsDir = join(template, 'configs/remote/localization/strings');
const projectTitle = readdirSync(stringsDir).filter(file => file.endsWith('.json'))
  .map(file => JSON.parse(readFileSync(join(stringsDir, file), 'utf8')).en?.shell?.title)
  .find(value => typeof value === 'string');
assert.ok(projectTitle, 'shell.title of the base locale is in a part of configs/remote/localization/strings/');

// The page before any script: the game's name (project.json, else `shell.title` of the base
// locale) and language, the neutral loading line inline — no stock title, no ManyPlay blue.
for (const [label, files, title] of [
  ['the project name', { 'project.json': JSON.stringify({ name: 'Moon Garden' }) }, 'Moon Garden'],
  ['the game title of the base locale without a project name', { 'project.json': JSON.stringify({ name: null }) }, projectTitle],
  ['a base locale other than English', {
    'project.json': '{}',
    'src/boot/strings.ts': readFileSync(join(template, 'src/boot/strings.ts'), 'utf8')
      .replace("DEFAULT_LOCALE = 'en'", "DEFAULT_LOCALE = 'pt'"),
    'configs/remote/localization/strings/title.pt.json': JSON.stringify({ pt: { shell: { title: 'Mondgarten' } } }),
  }, 'Mondgarten'],
]) it(`built page: title and language from ${label}, neutral first frame`, (t) => {
  const game = fixture(t, 'test', files);
  passes(game.build());
  const html = readFileSync(join(game.root, 'dist/index.html'), 'utf8');
  assert.match(html, new RegExp(`<title>${title}</title>`));
  assert.match(html, new RegExp(`<html lang="${files['src/boot/strings.ts'] ? 'pt' : 'en'}"`));
  assert.doesNotMatch(html, /ManyPlay Game|Loading…/);
  assert.doesNotMatch(html, /#11132e|#1a1d45/i);
  assert.match(html, /<div id="boot-loader"[^>]*><i><\/i><\/div>/);
});

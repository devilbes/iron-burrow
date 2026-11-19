// What the build copies into dist/: runtime assets and the SDK of vendor/, not source artwork.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { join, matchesGlob } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { fixture, passes, template } from '../helpers/build-fixture.mjs';

const it = test;

it('new template builds from an archive without design/source artwork and keeps runtime inputs', (t) => {
  // Offline archive projection using the template rules; git-worker owns archive limits/packaging.
  const rules = readFileSync(join(template, '.buildignore'), 'utf8').split(/\r?\n/)
    .map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  for (const rule of rules) {
    assert.ok(!rule.startsWith('!') && !rule.startsWith('/') && !rule.split('/').includes('..'), rule);
  }
  const sourceFiles = {
    'design/characters/hero.psd': 'layered source',
    'design/screens/menu.png': 'screen reference',
    'design/system/tokens.json': '{}',
    'assets/source/background.svg': '<svg>source</svg>',
  };
  const runtimeFiles = {
    'assets/generated/hero.svg': '<svg>runtime</svg>',
    'assets/audio/click.wav': 'runtime audio',
    'assets/texture.png': 'uploaded runtime image',
  };
  const excluded = path => rules.some(rule => matchesGlob(path, rule));
  for (const path of Object.keys(sourceFiles)) assert.equal(excluded(path), true, path);
  for (const path of [...Object.keys(runtimeFiles), 'src/main.ts', 'scripts/build.mjs',
    'package.json', 'tsconfig.json', 'platform.json', 'configs/remote/game.json',
    'vendor/@manygamescorp/core/index.js']) assert.equal(excluded(path), false, path);
  const archiveFiles = Object.fromEntries(Object.entries({ ...sourceFiles, ...runtimeFiles })
    .filter(([path]) => !excluded(path)));
  const game = fixture(t, 'test', archiveFiles);
  passes(game.build());
  for (const [path, content] of Object.entries(runtimeFiles)) {
    assert.equal(readFileSync(join(game.root, 'dist', path), 'utf8'), content, path);
  }
  for (const path of Object.keys(sourceFiles)) {
    assert.equal(existsSync(join(game.root, path)), false, path);
    assert.equal(existsSync(join(game.root, 'dist', path)), false, path);
  }
});

for (const environment of ['dev', 'test', 'prod']) {
  it(`${environment} build preserves every locked vendor file, including SDK README`, (t) => {
    const vendor = 'vendor/@manygamescorp';
    const files = {
      [`${vendor}/docs/README.md`]: '# SDK documentation\r\nПример SDK\r\n',
      [`${vendor}/docs/modules.md`]: '# Modules\n',
      [`${vendor}/docs/package.json`]: JSON.stringify({ name: '@manygamescorp/docs' }),
    };
    const lock = `${vendor}/vendor.lock.json`;
    const importMap = `${vendor}/importmap.json`;
    const game = fixture(t, environment, {
      ...files,
      [lock]: JSON.stringify({ coreVersion: '1.0.0-rc.26', packages: {}, files: Object.keys(files).sort() }),
      [importMap]: JSON.stringify({ imports: {} }),
      'assets/generated/README.md': 'Generation instructions',
      'assets/generated/tile.svg': '<svg/>',
      'assets/audio/README.md': 'Audio instructions',
      'assets/audio/click.wav': 'audio fixture',
    });
    passes(game.build());
    const inventory = JSON.parse(readFileSync(join(game.root, 'dist', lock)));
    for (const path of [...inventory.files, lock, importMap]) {
      assert.deepEqual(readFileSync(join(game.root, 'dist', path)), readFileSync(join(game.root, path)), path);
    }
    for (const dir of ['assets/generated', 'assets/audio']) {
      assert.equal(existsSync(join(game.root, 'dist', dir, 'README.md')), false);
    }
    assert.equal(readFileSync(join(game.root, 'dist/assets/generated/tile.svg'), 'utf8'), '<svg/>');
    assert.equal(readFileSync(join(game.root, 'dist/assets/audio/click.wav'), 'utf8'), 'audio fixture');
  });
}

for (const environment of ['dev', 'test', 'prod']) {
  it(`${environment} build preserves uploaded assets outside the generated/audio directories`, (t) => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=', 'base64');
    const files = {
      'assets/qa_fake_000.png': png,
      'assets/textures/hero@2x.png': png,
      'assets/source/background.svg': '<svg/>',
    };
    const game = fixture(t, environment, { ...files, 'assets/README.md': 'Asset instructions' });
    passes(game.build());
    for (const [path, content] of Object.entries(files)) {
      assert.deepEqual(readFileSync(join(game.root, 'dist', path)), Buffer.from(content), path);
    }
    assert.equal(existsSync(join(game.root, 'dist/assets/README.md')), false);
  });
}

it('assetUrl points into dist/assets/, where the build copies assets/', async (t) => {
  // The bundled entry runs from dist/app/ like every chunk: assets.ts resolves against it.
  const game = fixture(t, 'test', { 'assets/images/hero.png': 'image',
    'src/main.ts': "export { assetUrl } from './assets.js';" });
  passes(game.build());
  const { assetUrl } = await import(pathToFileURL(join(game.root, 'dist/app/main.js')).href);
  const url = assetUrl('images/hero.png');
  assert.equal(url, pathToFileURL(join(realpathSync(game.root), 'dist/assets/images/hero.png')).href);
  assert.equal(readFileSync(new URL(url), 'utf8'), 'image');
});

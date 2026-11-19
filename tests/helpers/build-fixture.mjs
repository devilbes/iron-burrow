// A copy of the template in a temp dir for the tests of tests/build/: each test builds its own
// project (its own platform.json, sources, assets), so the files of tests/build/ run side by side.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const template = fileURLToPath(new URL('../../', import.meta.url));
// Only the full SDK artifact requires platform-supplied packages. Portable builds and startup
// states must also work in a fresh template without vendor/.
export const sdkInstalled = existsSync(join(template, 'node_modules', '@manygamescorp', 'core'));
export const SKIP = 'SDK packages are not installed (vendor/ is placed by the platform when the project is created)';

/** `build(...args)` runs scripts/build.mjs of the copy; the copy goes away with the test. */
export function fixture(t, environment, files = {}) {
  const root = mkdtempSync(join(tmpdir(), 'projects-487-template-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const path of ['scripts', 'src', 'configs/remote', 'tsconfig.json', 'tsconfig.sdk.json', 'index.html', 'package.json']) {
    cpSync(join(template, path), join(root, path), { recursive: true });
  }
  symlinkSync(join(template, 'node_modules'), join(root, 'node_modules'), 'dir');
  if (environment !== undefined) writeFileSync(join(root, 'platform.json'), JSON.stringify({ environment }));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return {
    root,
    build(...args) {
      return spawnSync(process.execPath, ['scripts/build.mjs', ...args], { cwd: root, encoding: 'utf8', timeout: 30000 });
    },
  };
}

export function passes(result) {
  assert.equal(result.status, 0, `${result.error ?? ''}\n${result.stdout}\n${result.stderr}`);
}

/** scripts/typecheck.mjs of the copy: it picks the build's config, with an SDK the screens are checked too. */
export function typecheck(game) {
  return spawnSync(process.execPath, ['scripts/typecheck.mjs'], { cwd: game.root, encoding: 'utf8', timeout: 60000 });
}

// Startup of the built entry (dist/app/main.js) in node with stubbed SDK imports and a stub
// boot (`./start.js`): every startup state stays visible, failures log only code/status/rid.
export function startup(game, options = {}) {
  const execution = spawnSync(process.execPath, [
    join(template, 'tests/helpers/startup.mjs'),
    join(game.root, 'dist/app/main.js'),
    JSON.stringify(options),
  ], { encoding: 'utf8', timeout: 10000 });
  passes(execution);
  return JSON.parse(execution.stdout);
}

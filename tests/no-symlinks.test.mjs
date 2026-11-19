// The platform build cannot read a project archive that has a symbolic link in it
// (builds.create fails at «prepare»: BUILDS_PROJECT_NOT_READY, archive_unreadable, no log).
// So the project keeps none outside node_modules/, dist/ and vendor/ (the SDK packages the
// platform delivers; scripts/sdk.mjs links them into node_modules only).
import assert from 'node:assert/strict';
import test from 'node:test';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const SKIP = new Set(['node_modules', 'dist', 'vendor', '.git', '.cache', 'tmp', '.scratch']);

function links(dir = '') {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (dir === '' && SKIP.has(entry.name)) return [];
    if (entry.isSymbolicLink()) return [path];
    return entry.isDirectory() ? links(path) : [];
  });
}

test('the project has no symbolic links: the platform build cannot read an archive with one', () => {
  assert.deepEqual(links(), [], 'remove these links (and the code that creates them): the project root is not served, dist/ is');
});

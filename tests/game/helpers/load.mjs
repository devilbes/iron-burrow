// Transpiles src/modules/game/** (TypeScript, no SDK) into a temp dir once per process and
// imports it: the tests and the balance simulations run the same rules the game ships.
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

export const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const SRC = join(ROOT, 'src/modules/game');

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

let out;
function build() {
  if (out) return out;
  out = mkdtempSync(join(tmpdir(), 'game-'));
  for (const file of walk(SRC)) {
    const rel = relative(SRC, file);
    const target = join(out, rel);
    mkdirSync(dirname(target), { recursive: true });
    if (file.endsWith('.ts')) {
      const js = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext } }).outputText;
      writeFileSync(target.replace(/\.ts$/, '.js'), js);
    } else copyFileSync(file, target);
  }
  return out;
}

/** `import` of src/modules/game/<name>.ts (e.g. 'core/index'). */
export const load = (name) => import(pathToFileURL(join(build(), `${name}.js`)).href);

/** A stage file of configs/levels (campaign stage N or the Siege arena). */
export function stageFile(n) {
  const path = n === 'siege' ? 'configs/levels/siege/siege_pit.json' : `configs/levels/campaign/stage_${String(n).padStart(2, '0')}.json`;
  return JSON.parse(readFileSync(join(ROOT, path), 'utf8'));
}

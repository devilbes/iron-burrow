// Transpiles src/ files that run on the SDK into a temp dir for a test with a fake SDK: type
// imports disappear, the SDK values they import come from a small stub.
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, posix } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const SDK_STUB = 'export const SDK_RELOAD_REQUIRED = "sdk:reload:required";\n'
  + 'export class SDKError extends Error { constructor(code, options = {}) { super(code); '
  + 'this.code = code; this.retryable = options.retryable ?? false; this.httpStatus = options.httpStatus; } }\n';

/**
 * `names` relative to src/ without extension; returns `import` of one of them by name. A relative
 * import of a file not in `names` becomes a stub whose named exports are no-op functions (e.g. the
 * screens src/screens/index.ts lists, which draw with the kit).
 */
export function transpile(names) {
  const dir = mkdtempSync(join(tmpdir(), 'boot-'));
  writeFileSync(join(dir, 'sdk-stub.js'), SDK_STUB);
  const stub = pathToFileURL(join(dir, 'sdk-stub.js')).href;
  const missing = new Map();
  for (const name of names) {
    const source = readFileSync(new URL(`../../src/${name}.ts`, import.meta.url), 'utf8');
    const out = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext } }).outputText;
    mkdirSync(dirname(join(dir, `${name}.js`)), { recursive: true });
    writeFileSync(join(dir, `${name}.js`), out.replace(/'@manygamescorp\/core\/(kernel|error)'/g, `'${stub}'`));
    for (const [, list, from] of out.matchAll(/import\s*\{([^}]*)\}\s*from\s*'(\.[^']+)\.js'/g)) {
      const target = posix.join(posix.dirname(name), from);
      const exported = list.split(',').map((part) => part.trim().split(/\s+as\s+/)[0]).filter(Boolean);
      missing.set(target, new Set([...(missing.get(target) ?? []), ...exported]));
    }
  }
  for (const [target, exported] of missing) {
    if (names.includes(target)) continue;
    mkdirSync(dirname(join(dir, `${target}.js`)), { recursive: true });
    writeFileSync(join(dir, `${target}.js`), [...exported].map((name) => `export const ${name} = () => () => undefined;\n`).join(''));
  }
  return (name) => import(pathToFileURL(join(dir, `${name}.js`)).href);
}

export const BOOT = ['boot/game-ports', 'boot/grants', 'boot/progress-state', 'boot/ids', 'modules/game/index'];

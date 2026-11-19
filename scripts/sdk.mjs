// Which TypeScript config checks this project: tsconfig.sdk.json (all of src/ against the SDK
// types) once the project has an SDK — in platform.json, package.json or vendor/ — otherwise
// tsconfig.json (the portable entry and the game module). A project with an SDK never falls back
// to the portable check, so a missing or broken SDK install fails instead of passing silently.
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, symlinkSync } from 'node:fs';
import { resolve } from 'node:path';

export const IMPORT_MAP = 'vendor/@manygamescorp/importmap.json';

const json = (path) => (existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null);

/** `{ platform, map, configured }` of the project in the current directory. */
export function sdkState() {
  const platform = json('platform.json');
  const pkg = json('package.json') ?? {};
  const map = json(IMPORT_MAP) ?? { imports: {} };
  const configured = platform?.sdk != null
    || Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).some(name => name.startsWith('@manygamescorp/'))
    || Object.keys(map.imports ?? {}).some(name => name.startsWith('@manygamescorp/'))
    || existsSync('node_modules/@manygamescorp/core');
  return { platform, map, configured };
}

/** The TypeScript config to check and build with. */
export const tsconfigOf = (configured) => (configured ? 'tsconfig.sdk.json' : 'tsconfig.json');

const VENDOR = 'vendor/@manygamescorp';
const MODULES = 'node_modules/@manygamescorp';

/** Package names platform.json asks for: core, adapter, modules, UI Kit and its skin. */
function platformPackages(platform) {
  const sdk = platform?.sdk ?? {};
  const names = [sdk.package, sdk.adapter?.package, ...(sdk.modules ?? []).map((module) => module.package),
    platform?.uiKit?.package, platform?.uiKit?.skin?.package];
  return [...new Set(names.filter((name) => typeof name === 'string' && name.startsWith('@manygamescorp/')))];
}

/**
 * The SDK of a project is what platform.json names, delivered into vendor/@manygamescorp/; there
 * is no lock file and package.json does not list these packages. TypeScript and Node look
 * packages up in node_modules, so every vendor package is linked there before a check or a build.
 * A package platform.json names that is not in vendor/ stops with its name.
 */
export function linkSdk(platform) {
  if (!existsSync(VENDOR)) {
    const wanted = platformPackages(platform);
    if (wanted.length) throw new Error(`SDK packages of platform.json are not in ${VENDOR}/: ${wanted.join(', ')}`);
    return [];
  }
  const present = readdirSync(VENDOR).filter((name) => existsSync(`${VENDOR}/${name}/package.json`));
  const missing = platformPackages(platform).map((name) => name.split('/')[1]).filter((name) => !present.includes(name));
  if (missing.length) throw new Error(`SDK packages of platform.json are not in ${VENDOR}/: ${missing.join(', ')}`);
  mkdirSync(MODULES, { recursive: true });
  for (const name of present) {
    const target = `${MODULES}/${name}`;
    if (lstatSync(target, { throwIfNoEntry: false })) continue;
    symlinkSync(resolve(VENDOR, name), target, 'junction');
  }
  return present;
}

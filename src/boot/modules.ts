import type { ModuleDefinition } from '@manygamescorp/core/module';
import { parseSdkLock } from '@manygamescorp/core/loader';
import { SDKError } from '@manygamescorp/core/error';
import type { FakeOutcome, FakeSheet } from '@manygamescorp/mod-iap/fake-store';

/** Ports a package factory may need from the running game (filled after createSdk). */
export interface PackagePorts {
  /** Test-store payment sheet (fake store of the `web` platform), drawn by the UI Kit. */
  readonly pay: (sheet: FakeSheet) => Promise<FakeOutcome>;
}
type Factory = (ports: PackagePorts) => Promise<readonly ModuleDefinition[]>;

/**
 * Imports a package the platform delivers only when its module is enabled for the app. The
 * specifier is not a literal, so the type check and the build do not need the package; when
 * platform.json selects the module and the package is missing, the import fails at start with
 * the module id (`composeModules`).
 */
const delivered = <T>(specifier: string): Promise<T> => import(specifier) as Promise<T>;

/**
 * Package of platform.json `sdk.modules[].package` → SDK module factories it brings. The table is
 * the only place that knows how a package is wired; which packages run is decided by
 * platform.json. `@manygamescorp/ui-kit` is the shell: `boot/start.ts` installs it with the zones.
 */
export const PACKAGES: Readonly<Record<string, Factory>> = Object.freeze({
  '@manygamescorp/mod-profile-pack': async () => {
    const [kv, state] = await Promise.all([import('@manygamescorp/mod-profile-pack/kv'),
      import('@manygamescorp/mod-profile-pack/state')]);
    const ui = await import('@manygamescorp/mod-profile-pack/ui');
    return [kv.kvModule(), state.gameStateModule(), ui.profileUiModule()];
  },
  '@manygamescorp/mod-iap': async (ports) => {
    const [{ iapModule }, { fakeStore }] = await Promise.all([
      import('@manygamescorp/mod-iap/iap'), import('@manygamescorp/mod-iap/fake-store')]);
    // Store `fake_prices` of the test stand: the purchase sheet is the kit payment window.
    return [iapModule({ store: fakeStore({ ask: ports.pay }) })];
  },
  '@manygamescorp/mod-leaderboards': async () =>
    [(await import('@manygamescorp/mod-leaderboards/leaderboards')).leaderboardsModule()],
  '@manygamescorp/mod-inventory': async () =>
    [(await import('@manygamescorp/mod-inventory/inventory')).inventoryModule()],
  '@manygamescorp/mod-progress': async () => {
    const [progress, levels] = await Promise.all([import('@manygamescorp/mod-progress/progress'),
      import('@manygamescorp/mod-progress/levels')]);
    // `levels` (level sets from configs) ships in the progress package.
    return [progress.progressModule(), levels.levelsModule()];
  },
  '@manygamescorp/mod-hud': async () => [(await import('@manygamescorp/mod-hud/hud')).hudModule()],
  '@manygamescorp/mod-daily-rewards': async () =>
    [(await import('@manygamescorp/mod-daily-rewards/daily-rewards')).dailyRewardsModule()],
  // Server pushes (one socket per session): inventory grants, progress hints, config reloads.
  '@manygamescorp/mod-realtime': async () => [(await delivered<{ realtimeModule(): ModuleDefinition }>(
    '@manygamescorp/mod-realtime/realtime')).realtimeModule()],
  // `sdk.scheduling`: calendar and event inbox; no request until the game calls it.
  '@manygamescorp/mod-scheduling': async () => [(await delivered<{ schedulingModule(): ModuleDefinition }>(
    '@manygamescorp/mod-scheduling/scheduling')).schedulingModule()],
});

/** Installed with the shell zones (`shell/zones.ts`), not by this table. */
const SHELL_PACKAGE = '@manygamescorp/ui-kit';

/**
 * SDK modules selected by platform.json. A selected package this build cannot wire is a startup
 * error with a support id, never a silent gap.
 */
export interface Composition {
  readonly modules: readonly ModuleDefinition[];
  /** Package of a bundled module id. */
  readonly packageOf: (id: string) => string | undefined;
}

export async function composeModules(platformJson: unknown,
  ports: PackagePorts): Promise<Composition> {
  const modules: ModuleDefinition[] = [];
  const owners = new Map<string, string>();
  const seen = new Set<string>();
  const missing: string[] = [];
  for (const ref of parseSdkLock(platformJson).modules) {
    const name = ref.package;
    if (ref.source !== 'local' || typeof name !== 'string' || seen.has(name)) continue;
    seen.add(name);
    if (name === SHELL_PACKAGE) continue;
    const create = Object.hasOwn(PACKAGES, name) ? PACKAGES[name] : undefined;
    if (!create) { missing.push(String(ref.id ?? name)); continue; }
    try {
      for (const module of await create(ports)) { modules.push(module); owners.set(module.manifest.id, name); }
    } catch (cause) {
      throw new SDKError('SDK_MODULE_NOT_FOUND', { retryable: false, cause,
        message: `module ${String(ref.id)} is not available in this build` });
    }
  }
  if (missing.length > 0) {
    throw new SDKError('SDK_MODULE_NOT_FOUND', { retryable: false,
      message: `modules not wired in this build: ${missing.join(', ')}` });
  }
  return { modules, packageOf: (id) => owners.get(id) };
}

/** Settings of one platform.json module entry (e.g. `ui-kit`). */
export function moduleSettings(platformJson: unknown, id: string): Readonly<Record<string, unknown>> {
  const ref = parseSdkLock(platformJson).modules.find((entry) => entry.id === id);
  const settings = (ref as { settings?: unknown } | undefined)?.settings;
  return settings && typeof settings === 'object' ? settings as Record<string, unknown> : {};
}

/**
 * platform.json lists a package-level id for `@manygamescorp/mod-profile-pack` (`profile-pack`),
 * while the package brings the runtimes `kv`, `gamestate` and `profile-ui`. Core rc.30 does not
 * map that id to the bundled runtimes and tries to download `sdk/modules/profile-pack/…`
 * (404, module failed). The copy passed to the SDK lists, for such an entry, one entry per
 * bundled runtime of the same package with the defaults; platform.json itself is untouched.
 */
export function withBundledIds(platformJson: unknown, modules: readonly ModuleDefinition[],
  packageOf: (id: string) => string | undefined): unknown {
  const config = platformJson as { sdk?: { modules?: readonly Record<string, unknown>[] } } | null;
  const refs = config?.sdk?.modules;
  if (!config?.sdk || !Array.isArray(refs)) return platformJson;
  const bundled = new Set(modules.map((module) => module.manifest.id));
  const expanded = refs.flatMap((ref) => {
    const id = String(ref['id']);
    if (bundled.has(id) || ref['source'] !== 'local' || typeof ref['package'] !== 'string') return [ref];
    const runtimes = [...bundled].filter((runtime) => packageOf(runtime) === ref['package']
      && !refs.some((other) => other['id'] === runtime));
    // Package settings are not runtime settings: each runtime starts on its own defaults.
    const { settings: _settings, ...entry } = ref;
    return runtimes.length ? runtimes.map((runtime) => ({ ...entry, id: runtime })) : [ref];
  });
  return { ...config, sdk: { ...config.sdk, modules: expanded } };
}

import { AUTH_PLAYER_CHANGED, createSdk, SDK_RELOAD_REQUIRED, type Sdk, type SdkConfig } from '@manygamescorp/core/kernel';
import { defineModule, type ModuleDefinition } from '@manygamescorp/core/module';
import { web } from '@manygamescorp/platform-web/web';
import type { InventoryNamespace } from '@manygamescorp/mod-inventory/inventory';
import type { RewardDescribe } from '@manygamescorp/ui-kit/services/reward-window';
import { createUiShell, type UiShell } from '@manygamescorp/ui-kit/shell';
import { fakePaymentSheet } from '@manygamescorp/ui-kit/services/fake-payment';
import type { KitLocalization } from '@manygamescorp/ui-kit/services/localization';
import { preloader, type PreloaderProps } from '@manygamescorp/ui-kit/services/preloader';
import { createGameModule, GAME_MODULE_ID, type GamePorts } from '../modules/game/index.js';
import { bindNavigation, createZones, type Zones } from '../shell/zones.js';
import { bindHud } from '../shell/hud.js';
import { createScreenContext, HOME, routeContext, screensModule } from '../shell/router.js';
import { createGameWindows, createOverlays, createServiceWindows, createStandardWindows, createWindowOrder,
  type GameWindowsHost, type Overlays } from '../shell/windows/index.js';
import { createAccountWindow } from '../shell/windows/account.js';
import { createItemCatalog, type ItemCatalog } from '../shell/item-catalog.js';
import { LOCALES, ORIENTATION, type GameOrientation, type ScreenContext } from '../screens/index.js';
import { createSuspend, type Suspend } from '../shell/suspend.js';
import { adoptDocumentTheme, applyGameSkin, fontsUrl } from '../shell/skin.js';
import { composeModules, moduleSettings, withBundledIds } from './modules.js';
import { createGamePorts } from './game-ports.js';
import { MODULES } from './ids.js';
import { bootText, DEFAULT_LOCALE, registerStrings } from './strings.js';
import { failureCode, reportFailure } from './errors.js';
import { createGrantFollowUp, sendDailyLogin, type GrantFollowUp } from './grants.js';
import { createProgressStore, type ProgressStore } from './progress-state.js';

/** Version of the game sent with configs requests (`X.Y.Z`). */
const APP_VERSION = '1.0.0';

export interface Started { readonly sdk: Sdk; readonly shell: UiShell; dispose(): void }

/** The kit loading screen in `#preloader` in the game's skin: boot progress, startup error with «Retry». */
interface Cover {
  set(loading: boolean): void;
  progress(value: number): void;
  fail(message: string): void;
  /** Switches the texts to the SDK l10n once it exists. */
  retext(text: (key: string) => string, lang: string): void;
}

function createCover(host: HTMLElement): Cover {
  let text = (key: string): string => bootText(key);
  let lang = DEFAULT_LOCALE;
  let loading = true;
  let value = 0;
  let error: string | undefined;
  let mounted = false;
  const props = (): PreloaderProps => ({ elementId: 'preloader', lang, game: gameName(text),
    loading, progress: value, status: text('shell.loading.status'),
    caption: text('shell.loading.caption'), ...(error ? { error } : {}),
    emitIntent: (intent) => { if (intent === 'retry') globalThis.location.reload(); } });
  const render = (): void => {
    host.hidden = !loading && !error;
    host.dataset['state'] = error ? 'error' : loading ? 'loading' : 'idle';
    if (mounted) preloader.update(host, props());
    else { mounted = true; host.replaceChildren(); preloader.mount(host, props()); }
  };
  render();
  return {
    set(next) {
      if (next && !loading) value = 0;
      if (!next) value = 100;
      loading = next; render();
    },
    progress(next) {
      const clamped = Math.max(value, Math.min(100, Math.round(next)));
      if (clamped !== value) { value = clamped; render(); }
    },
    fail(message) { error = message; loading = false; render(); },
    retext(next, nextLang) { text = next; lang = nextLang; render(); },
  };
}

/** Resolves after the next frame has been painted. */
function painted(): Promise<void> {
  return new Promise((resolve) => { requestAnimationFrame(() => { requestAnimationFrame(() => resolve()); }); });
}

/**
 * Name of the game on the loading screen: the localized `shell.title`; without that text the page
 * title (the public name of the project, written by the build).
 */
function gameName(text: (key: string) => string): string {
  const title = text('shell.title');
  return title && title !== 'shell.title' ? title : document.title.trim() || title;
}

/** The SDK as the kit localization port (payment sheet). */
function kitLocalization(sdk: () => Sdk | undefined): KitLocalization {
  return { locale: () => sdk()?.l10n.locale() ?? DEFAULT_LOCALE,
    t: (key, params) => sdk()?.l10n.t(key, params) ?? key };
}

/** Name and picture of a granted item in the reward window (`ItemCatalog`: catalog title, `ITEMS`). */
function rewardDescribe(items: ItemCatalog): RewardDescribe {
  return (line) => {
    const name = items.name(line.id);
    const icon = items.icon(line.id);
    return { ...(name ? { name } : {}), ...(icon ? { icon } : {}) };
  };
}

/**
 * The languages the SDK may pick from: the base one and the game's `LOCALES`. Without this list
 * core l10n also offers every language a kit module brings its own texts in (the kit registers
 * `ru` and `en`), so a Russian browser got Russian kit windows over English game screens.
 */
export function gameLocales(): string[] {
  return [...new Set([DEFAULT_LOCALE, ...LOCALES])];
}

/**
 * The game is ready for a player (`AUTH_PLAYER_CHANGED` handled: inventory read, home shown):
 * the ManyPlay ID window waits for it after a sign-in or sign-out.
 */
interface PlayerReady {
  wait(gid: number): Promise<void>;
  /** The SDK reloads for another player (`SDK_RELOAD_REQUIRED`). */
  reload(): void;
  ready(gid: number | undefined): void;
}

function createPlayerReady(sdk: () => Sdk): PlayerReady {
  const waiting = new Map<number, (() => void)[]>();
  let reloading = false;
  return {
    reload() { reloading = true; },
    wait(gid) {
      if (!reloading && sdk().auth?.session?.gid === gid) return Promise.resolve();
      return new Promise((resolve) => { waiting.set(gid, [...(waiting.get(gid) ?? []), resolve]); });
    },
    ready(gid) {
      reloading = false;
      if (gid === undefined) return;
      for (const resolve of waiting.get(gid) ?? []) resolve();
      waiting.delete(gid);
    },
  };
}

/** Player change (logout, another account): cover the game, then show home for the new player. */
function bindPlayer(sdk: Sdk, shell: () => UiShell | undefined, cover: Cover,
  session: { progress: ProgressStore; grants: GrantFollowUp; player: PlayerReady }): void {
  sdk.bus.on(SDK_RELOAD_REQUIRED, () => { cover.set(true); session.progress.reset(); session.player.reload(); });
  sdk.bus.on(AUTH_PLAYER_CHANGED, () => {
    void sdk.getModule<InventoryNamespace>(MODULES.inventory).refresh().catch(() => undefined)
      .finally(() => {
        shell()?.refresh(); shell()?.navigate(HOME); cover.set(false);
        session.player.ready(sdk.auth?.session?.gid);
        void sendDailyLogin(sdk, session.progress, session.grants);
      });
  });
}

/**
 * Boot of the game: SDK modules from platform.json, shell zones, stock windows, presenters and
 * the game module → `boot()` → shell with the game screens. Everything the player sees before
 * the shell is the neutral line of index.html, then the kit loading screen in the game skin; a
 * failure stays on it with the error and «Retry».
 */
export async function start(root: HTMLElement, loader: HTMLElement,
  platformConfig: unknown): Promise<Started> {
  adoptDocumentTheme(document, fontsUrl());
  // The game's skin first, then its loading screen: the kit loader is never drawn in stock colors.
  // Until it has painted, the neutral line of index.html stays over it.
  await applyGameSkin();
  const cover = createCover(loader);
  await painted();
  document.getElementById('boot-loader')?.remove();
  const late: { sdk?: Sdk; shell?: UiShell } = {};
  const sdkRef = (): Sdk => { if (!late.sdk) throw new Error('SDK is not created'); return late.sdk; };
  try {
    const localization = kitLocalization(() => late.sdk);
    const { modules, packageOf } = await composeModules(platformConfig, {
      pay: (sheet) => fakePaymentSheet(sheet, undefined, localization) });
    cover.progress(20);
    const zones = createZones(sdkRef);
    const items = createItemCatalog(sdkRef);
    // The player's progress: read once per session, then changed only by the game's own actions.
    const session = { progress: createProgressStore(sdkRef), grants: createGrantFollowUp(sdkRef),
      player: createPlayerReady(sdkRef) };
    const windows = createServiceWindows(sdkRef, session.progress, items);
    const account = createAccountWindow(sdkRef, (gid) => session.player.wait(gid));
    // The game's windows and the kit reward window never stand one over the other (windows/order.ts).
    const order = createWindowOrder();
    const standard = createStandardWindows(sdkRef, () => late.shell, rewardDescribe(items), account, order);
    const gameWindows = createGameWindows(() => late.shell, order);
    const overlays = createOverlays(() => root.querySelector<HTMLElement>('.mpg-shell') ?? undefined);
    const game = defineModule<GamePorts>(createGameModule(() =>
      createGamePorts(sdkRef(), session.progress, session.grants)) as
      unknown as ModuleDefinition<GamePorts>);
    // `orientation`: the game's `ORIENTATION` for the SDK. An SDK that has no such option yet
    // ignores it — the declared orientation is then not enforced (recipes/orientation.md).
    const config: SdkConfig & { orientation?: GameOrientation } = {
      modules: [zones.module, ...modules, ...standard.sdkModules, windows.module, game], platform: web(),
      platformConfig: withBundledIds(platformConfig, modules, packageOf),
      moduleConfig: { [MODULES.uiKit]: moduleSettings(platformConfig, MODULES.uiKit) },
      l10n: { defaultLocale: DEFAULT_LOCALE, supported: gameLocales(), refresh: 'start-only' },
      http: { appVersion: APP_VERSION }, orientation: ORIENTATION };
    const sdk = createSdk(config);
    late.sdk = sdk;
    const suspend = createSuspend(() => sdk.bus);
    registerStrings(sdk.l10n);
    sdk.bus.on('sdk:module:failed', (event) => reportFailure('module failed', event));
    bindPlayer(sdk, () => late.shell, cover, session);
    await sdk.boot();
    cover.progress(60);
    cover.retext((key) => sdk.l10n.t(key), sdk.l10n.locale());
    cover.progress(90);
    const ctx = createScreenContext(() => sdk, () => late.shell, sdk.getModule<GamePorts>(GAME_MODULE_ID),
      { window: gameWindows.windows, overlay: (options) => overlays.open(options),
        onSuspend: suspend.onSuspend });
    const shell = mountShell(root, sdk, zones, ctx, [...standard.shellModules, windows.shell, account.shell,
      gameWindows.module], () => session.grants.settle(), { gameWindows, overlays, suspend });
    late.shell = shell;
    const offMenu = bindNavigation({ topBar: zones.topBar, bottomMenu: zones.bottomMenu, sdk: sdkRef,
      navigate: (route) => shell.navigate(route) });
    // The game's HUD entries and top bar counters (HUD, TOP_BAR of src/screens/index.ts).
    const offHud = bindHud({ hud: zones.hud, topBar: zones.topBar, state: zones.hudState, sdk: sdkRef, ctx: () => ctx });
    document.documentElement.lang = sdk.l10n.locale();
    // A language chosen in settings: the shell, kit windows and the page follow it.
    sdk.bus.on('l10n:locale:changed', () => {
      document.documentElement.lang = sdk.l10n.locale();
      shell.refresh({ lang: sdk.l10n.locale() });
    });
    cover.set(false);
    // Item names for the reward, shop and daily windows: the catalog, read once.
    void items.load().catch(() => undefined);
    void sendDailyLogin(sdk, session.progress, session.grants);
    return { sdk, shell, dispose: () => { offHud(); offMenu(); shell.dispose(); void sdk.destroy().catch(() => undefined); } };
  } catch (error) {
    reportFailure('start failed', error);
    cover.fail(bootText('shell.error.boot', { code: failureCode(error) }));
    late.shell?.dispose();
    throw error;
  }
}

function mountShell(root: HTMLElement, sdk: Sdk, zones: Zones, ctx: ScreenContext,
  services: Parameters<UiShell['add']>[0][], shown: () => void,
  layers: { gameWindows: GameWindowsHost; overlays: Overlays; suspend: Suspend }): UiShell {
  const installed = (id: string): boolean => sdk.modules().some((m) => m.id === id && m.state !== 'failed');
  const shell = createUiShell(root, { title: sdk.l10n.t('shell.title'), zones: zones.zones, installed,
    text: (key) => sdk.l10n.t(key), lang: sdk.l10n.locale(), home: HOME, state: sdk.uiState,
    topBar: zones.topBar, hud: zones.hud, bottomMenu: zones.bottomMenu, topBarContext: routeContext });
  for (const module of services) shell.add(module);
  // A screen left: the windows it opened, its overlays and its pause handlers go with it.
  shell.add(screensModule(() => ctx, shown, () => {
    layers.gameWindows.release(); layers.overlays.clear(); layers.suspend.clear();
  }));
  shell.navigate(HOME);
  return shell;
}

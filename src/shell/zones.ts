import { SDK_RELOAD_REQUIRED, type Sdk } from '@manygamescorp/core/kernel';
import { createUiZones, uiKitModule, type UiZones } from '@manygamescorp/ui-kit/module';
import { BOTTOMMENU_SLOT_TAKEN, createBottomMenuRegistry, type BottomMenuItemSpec, type BottomMenuRegistry,
  type BottomMenuSlot } from '@manygamescorp/ui-kit/services/bottommenu';
import { createHudRegistry, type HudRegistry } from '@manygamescorp/ui-kit/services/hud-registry';
import { createTopBarRegistry, type TopBarItemSpec, type TopBarRegistry } from '@manygamescorp/ui-kit/services/topbar';
import { CONFIG, ELEMENTS } from '../boot/ids.js';
import { HUD, MENU, TOP_BAR } from '../screens/index.js';
import { barCounters, hudLayout, moduleCounter, type BarCounter } from './hud-plan.js';

/**
 * Screen zones of the UI Kit and the game's entries in them:
 * - top bar, left: the profile button, then the counters of `TOP_BAR` (src/screens/index.ts);
 *   right: the settings button only;
 * - HUD: the entries of `HUD` (src/screens/index.ts) — activities in the left column, money in the
 *   right one, in their order; module tiles and the game's own (shell/hud.ts) alike. The published
 *   `ui.hud/layout` record may hide a declared tile or limit it to a segment, never move or add one;
 * - bottom menu: navigation of the game itself (`MENU`), none as shipped: no bar at all.
 * The inventory has no entry on screen: it is the service behind currency and rewards.
 * The `ui-kit` SDK module gets the same registries, so modules reach them through the SDK.
 */
export interface Zones {
  readonly topBar: TopBarRegistry;
  readonly hud: HudRegistry;
  /** Run-time state of the HUD entries (shell/hud.ts): tiles with nothing behind them, offer pictures. */
  readonly hudState: HudState;
  readonly bottomMenu: BottomMenuRegistry;
  readonly zones: UiZones;
  readonly module: ReturnType<typeof uiKitModule>;
}

export interface HudState {
  readonly hidden: Set<string>;
  readonly icons: Map<string, string>;
}

/** Owner name of the game's own items in the top bar, the HUD and the bottom menu. */
export const GAME_OWNER = 'game';
/** Lobby screens (`main` context, `shell/router.ts`); gameplay screens show no menu and no buttons. */
const LOBBY: readonly string[] = ['main'];

/**
 * Module items of the top bar as `TOP_BAR` declares them: the level only when listed, in its
 * place, on the left; a module's currency capsules are not shown (the shell draws the declared
 * item counters itself, shell/hud.ts). A dropped item is reported by the kit as a skipped slot.
 */
function declaredCounters(registry: TopBarRegistry, counters: readonly BarCounter[]): TopBarRegistry {
  return { ...registry, add: (spec, owner) => {
    if (owner === GAME_OWNER) return registry.add(spec, owner);
    const shown = moduleCounter(spec, counters);
    return shown ? registry.add(shown, owner) : false;
  } };
}

/** `sdk` is read lazily: zones are made before createSdk and used after it. */
export function createZones(sdk: () => Sdk): Zones {
  const now = (): number => sdk().time.now();
  const topBar = declaredCounters(createTopBarRegistry({ now }), barCounters(TOP_BAR, HUD));
  const hudState: HudState = { hidden: new Set(), icons: new Map() };
  // Every tile reports `hud:<tile>` when pressed; a `ui.windows/main` trigger opens its window.
  const hud = createHudRegistry({ now,
    layout: () => hudLayout(HUD, sdk().configs?.get(CONFIG.hud.scope, CONFIG.hud.key), hudState.hidden, hudState.icons),
    match: (filter) => sdk().filters.match(filter),
    opened: (id) => sdk().ui.elementAction(`hud:${id}`) });
  const bottomMenu = createBottomMenuRegistry({ now, slots: 5 });
  const zones = createUiZones({ now, registries: { topBar, hud, bottomMenu },
    modules: () => sdk().modules().map((m) => ({ id: m.id,
      ...(m.manifest.ui?.slots ? { ui: { slots: m.manifest.ui.slots } } : {}) })) });
  return { topBar, hud, hudState, bottomMenu, zones, module: uiKitModule(zones) };
}

/** A click reports the element; the `ui.windows/main` trigger of that element opens the window. */
const BAR_ITEMS: readonly (Omit<TopBarItemSpec, 'onClick' | 'contexts'> & { element: keyof typeof ELEMENTS })[] = [
  { id: 'profile', slot: 'left', icon: 'user', label: 'shell.bar.profile', order: 10, element: 'profile' },
  { id: 'settings', slot: 'right', icon: 'hud-settings', label: 'shell.bar.settings', order: 90, element: 'settings' },
];
/**
 * The game's menu (`MENU`, src/screens/index.ts), in `order`; empty means no bottom bar (a platform
 * module set to the bottom menu still shows it). The raised item takes the center; the others take
 * side slots left to right, spread evenly around it (`SIDE_SLOTS` by their count); a slot a module
 * holds is skipped for the next free one.
 */
type MenuEntry = Omit<BottomMenuItemSpec, 'onClick' | 'contexts' | 'slot'> & { center: boolean; route: string };
const MENU_ITEMS: readonly MenuEntry[] = MENU.map((item, index) => ({ item, index }))
  .sort((a, b) => (a.item.order ?? a.index) - (b.item.order ?? b.index))
  .map(({ item: { center, order: _order, ...item } }) => ({ ...item, center: center === true,
    ...(center ? { variant: 'raised' as const } : {}) }));
const SIDE = MENU_ITEMS.filter((item) => !item.center).length;
const SIDE_SLOTS: readonly BottomMenuSlot[] = ([[], [2], [2, 4], [1, 2, 4], [1, 2, 4, 5]] as const)[Math.min(SIDE, 4)]!;
const FREE_SLOTS: readonly BottomMenuSlot[] = [1, 2, 4, 5];
const slotTaken = (error: unknown): boolean => error instanceof Error && error.message.startsWith(BOTTOMMENU_SLOT_TAKEN);

export interface NavigationDeps {
  readonly topBar: TopBarRegistry;
  readonly bottomMenu: BottomMenuRegistry;
  readonly sdk: () => Sdk;
  readonly navigate: (route: string) => void;
}

function register(deps: NavigationDeps): void {
  for (const { element, ...spec } of BAR_ITEMS) {
    if (deps.topBar.items().some((item) => item.id === spec.id)) continue;
    deps.topBar.add({ ...spec, contexts: LOBBY, onClick: () => deps.sdk().ui.elementAction(ELEMENTS[element]) },
      GAME_OWNER);
  }
  let side = 0;
  for (const { route, center, ...spec } of MENU_ITEMS) {
    const item = { ...spec, contexts: LOBBY, onClick: () => deps.navigate(route) };
    const own = center ? undefined : SIDE_SLOTS[side++];
    // A module set to the bottom menu (daily-rewards `entry: bottomMenu`) took the slot first: it keeps it.
    for (const slot of center ? ['center' as const] : [...(own ? [own] : []), ...FREE_SLOTS.filter((s) => s !== own)]) {
      try { deps.bottomMenu.add({ ...item, slot }, GAME_OWNER); break; } catch (error) {
        if (!slotTaken(error)) throw error;
      }
    }
  }
}

/**
 * Registers the game's top bar buttons and bottom menu now and again whenever the kit resets
 * its registries (player change, ui-kit module restart).
 */
export function bindNavigation(deps: NavigationDeps): () => void {
  const remove = (): void => {
    for (const item of MENU_ITEMS) deps.bottomMenu.remove(item.id, GAME_OWNER);
    for (const item of BAR_ITEMS) deps.topBar.remove(item.id, GAME_OWNER);
  };
  register(deps);
  const off = deps.sdk().bus.on(SDK_RELOAD_REQUIRED, () => { remove(); register(deps); });
  const offChange = MENU_ITEMS.length === 0 ? () => undefined : deps.bottomMenu.onChange(() => {
    const present = deps.bottomMenu.slots().some((slot) => slot?.owner === GAME_OWNER);
    if (!present && LOBBY.includes(deps.bottomMenu.context())) register(deps);
  });
  return () => { off(); offChange(); remove(); };
}

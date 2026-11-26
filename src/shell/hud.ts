import { AUTH_PLAYER_CHANGED, SDK_RELOAD_REQUIRED, type Sdk } from '@manygamescorp/core/kernel';
import type { Iap } from '@manygamescorp/mod-iap/iap';
import type { InventoryNamespace } from '@manygamescorp/mod-inventory/inventory';
import type { HudRegistry } from '@manygamescorp/ui-kit/services/hud-registry';
import type { TopBarRegistry } from '@manygamescorp/ui-kit/services/topbar';
import { CONFIG, MODULES } from '../boot/ids.js';
import { HUD, TOP_BAR, type BarOpen, type HudEntry, type HudStatus, type ScreenContext } from '../screens/index.js';
import { SKIN } from '../skin/index.js';
import { barCounters, gameTileSpec, hudOrder, isGameTile, offerPlacements, offerTile } from './hud-plan.js';
import { GAME_OWNER, type HudState } from './zones.js';

/**
 * The game's HUD entries and top bar counters at run time (declared in src/screens/index.ts):
 * - registers the game's own tiles (module tiles are registered by their modules);
 * - offer tiles: shown only while the placement of their `ui.windows/main` trigger has an
 *   available offer, with its picture and its end time; read again on `iap:offers:updated`,
 *   a published record and when a countdown runs out;
 * - `status` of an entry: read again on its bus events — badge, countdown, visibility;
 * - item counters of the top bar: the player's quantity, on `inventory:state:changed`; a press on
 *   one (or its «+») opens what it declares — by default the shop (`counterOpen`, hud-plan.ts).
 * Everything is registered again for a new player (the kit resets its registries).
 */
export interface HudDeps {
  readonly hud: HudRegistry;
  readonly topBar: TopBarRegistry;
  readonly state: HudState;
  readonly sdk: () => Sdk;
  readonly ctx: () => ScreenContext;
}

/** Ids of the kit registries' «already there» errors: the item survived, nothing to do. */
const taken = (error: unknown): boolean => error instanceof Error && /taken/.test(error.message);
const quietly = (run: () => void): void => { try { run(); } catch { /* item gone with a reset */ } };

export function bindHud(deps: HudDeps): () => void {
  const { hud, topBar, state } = deps;
  const order = hudOrder(HUD);
  const games = HUD.filter(isGameTile);
  const offers = games.filter((entry) => entry.offer);
  const statuses = HUD.filter((entry) => entry.status);
  const counters = barCounters(TOP_BAR, HUD).filter((counter) => counter.item !== undefined);
  const ends = new Map<string, number>();
  let closed = false;

  const relayout = (): void => { if (!closed) hud.relayout(); };
  const show = (id: string, visible: boolean): boolean => {
    const was = !state.hidden.has(id);
    if (visible) state.hidden.delete(id); else state.hidden.add(id);
    return was !== visible;
  };

  const press = (entry: HudEntry): (() => void) | undefined => {
    const open = entry.open;
    if (!open) return undefined;
    return 'route' in open ? () => deps.ctx().go(open.route) : () => open.run(deps.ctx());
  };
  /** A press on a top bar counter or its «+». */
  const opens = (open: BarOpen | undefined): (() => void) | undefined => {
    if (!open) return undefined;
    if ('element' in open) return () => deps.sdk().ui.elementAction(open.element);
    return 'route' in open ? () => deps.ctx().go(open.route) : () => open.run(deps.ctx());
  };
  const registerTiles = (): void => {
    for (const entry of games) {
      // An offer tile stays hidden until its offers are read (right after this, `everything`).
      if (entry.offer) state.hidden.add(entry.id);
      const onClick = press(entry);
      try {
        hud.add({ ...gameTileSpec(entry, order.get(entry.id) ?? 0), ...(onClick ? { onClick } : {}) }, GAME_OWNER);
      } catch (error) { if (!taken(error)) throw error; }
    }
  };

  const readOffers = (): void => {
    if (closed || offers.length === 0) return;
    const sdk = deps.sdk();
    let iap: Iap | undefined;
    try { iap = sdk.getModule<Iap>(MODULES.iap); } catch { iap = undefined; }
    const windows = sdk.configs?.get(CONFIG.windows.scope, CONFIG.windows.key);
    const now = sdk.time.now();
    let changed = false;
    for (const entry of offers) {
      const list = offerPlacements(windows, entry.id).flatMap((placement) => {
        try { return iap?.offers({ placement }) ?? []; } catch { return []; }
      });
      const tile = offerTile(list, SKIN.offers, now);
      changed = show(entry.id, tile.visible) || changed;
      if (tile.icon !== state.icons.get(entry.id)) {
        if (tile.icon) state.icons.set(entry.id, tile.icon); else state.icons.delete(entry.id);
        changed = true;
      }
      if (tile.endsAt !== undefined) ends.set(entry.id, tile.endsAt); else ends.delete(entry.id);
      quietly(() => hud.setTimer(entry.id, tile.endsAt ?? null, GAME_OWNER));
    }
    if (changed) relayout();
  };

  const apply = (entry: HudEntry, status: HudStatus): void => {
    if (closed) return;
    if (show(entry.id, status.visible !== false)) relayout();
    if (!isGameTile(entry)) return;
    const badge = status.badge === undefined ? null
      : status.badge === 'dot' ? { kind: 'dot' as const } : { kind: 'count' as const, value: Math.max(0, Math.round(status.badge)) };
    quietly(() => hud.setBadge(entry.id, badge, GAME_OWNER));
    quietly(() => hud.setTimer(entry.id, status.endsAt ?? null, GAME_OWNER));
  };
  const readStatus = (entry: HudEntry): void => {
    if (closed || !entry.status) return;
    try {
      void Promise.resolve(entry.status.read(deps.ctx())).then((status) => apply(entry, status),
        (error: unknown) => console.warn(`HUD ${entry.id}: status failed`, error));
    } catch (error) { console.warn(`HUD ${entry.id}: status failed`, error); }
  };

  const readCounters = (): void => {
    if (closed || counters.length === 0) return;
    let inventory: InventoryNamespace | undefined;
    try { inventory = deps.sdk().getModule<InventoryNamespace>(MODULES.inventory); } catch { return; }
    for (const counter of counters) {
      let value: number | undefined;
      try { value = inventory?.quantity(counter.item ?? ''); } catch { value = undefined; }
      if (value === undefined) continue;
      // rc.54: the kit ignores a repeated add (returns false, no «taken» throw) — set the value first.
      try { topBar.setValue(counter.id, value, GAME_OWNER); continue; } catch { /* not registered yet */ }
      const onClick = opens(counter.open);
      try {
        topBar.add({ id: counter.id, slot: 'left', icon: counter.icon ?? '', label: counter.label ?? '',
          value, order: counter.order, contexts: ['main', 'core'], ...(onClick ? { onClick } : {}) }, GAME_OWNER);
      } catch (error) {
        if (!taken(error)) throw error;
        quietly(() => topBar.setValue(counter.id, value, GAME_OWNER));
      }
    }
  };

  const everything = (): void => {
    if (closed) return;
    registerTiles();
    readOffers();
    for (const entry of statuses) readStatus(entry);
    readCounters();
    relayout();
  };

  const bus = deps.sdk().bus;
  const offs = [
    bus.on(AUTH_PLAYER_CHANGED, everything),
    bus.on(SDK_RELOAD_REQUIRED, () => { ends.clear(); }),
    bus.on('inventory:state:changed', readCounters),
    ...(offers.length ? [bus.on('iap:offers:updated', readOffers), bus.on('configs:snapshot:updated', readOffers)] : []),
    ...statuses.flatMap((entry) => (entry.status?.on ?? []).map((event) => bus.on(event, () => readStatus(entry)))),
    hud.onChange((change) => {
      // The kit cleared its registries (ui-kit restart): the game's tiles go back in.
      if (change.reason === 'reset') queueMicrotask(everything);
      // A countdown of an offer ran out: the offer may be gone.
      if (change.reason === 'tick' && [...ends.values()].some((at) => at <= deps.sdk().time.now())) readOffers();
    }),
  ];
  everything();
  return () => {
    closed = true;
    for (const off of offs) off();
    for (const entry of games) hud.remove(entry.id, GAME_OWNER);
    for (const counter of counters) topBar.remove(counter.id, GAME_OWNER);
  };
}

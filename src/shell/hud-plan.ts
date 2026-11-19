// The game's HUD and top bar declarations (`HUD`, `TOP_BAR` of src/screens/index.ts) as the kit
// registries take them: pure functions, no SDK, no DOM (tests/hud.test.mjs).
import type { BarOpen, BarResource, HudEntry, HudKind } from '../screens/index.js';

export type HudSide = 'left' | 'right';

/** The side rule: activities on the left, money on the right. */
export const SIDE_OF: Readonly<Record<HudKind, HudSide>> = { activity: 'left', money: 'right' };

/** Tiles platform modules register themselves (`hud.registry@1`); a game entry may only place them. */
export const MODULE_TILES: readonly string[] = ['daily-rewards', 'leaderboards', 'shop', 'offers', 'progress'];
/** Module tiles that never go on the HUD: no inventory on screen, profile and settings live in the top bar. */
export const OFF_HUD: readonly string[] = ['inventory', 'profile', 'settings'];

/** Kit limits of a tile (ui-kit hud-contract): id pattern and icon key length. */
const HUD_ID = /^[a-z0-9][a-z0-9_.-]{0,63}$/;
const ICON_MAX = 32;
/** Order of the n-th entry of a column (declaration order). */
const step = (index: number): number => (index + 1) * 10;

/** A game's own tile (not a module's). */
export const isGameTile = (entry: HudEntry): boolean => !MODULE_TILES.includes(entry.id);

/** Problems of the declaration, as text; [] when every entry can be shown as declared. */
export function hudProblems(entries: readonly HudEntry[]): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const at = `HUD ${entry.id}`;
    if (!HUD_ID.test(entry.id)) found.push(`${at}: id must match ${HUD_ID}`);
    if (seen.has(entry.id)) found.push(`${at}: declared twice`);
    seen.add(entry.id);
    if (!Object.hasOwn(SIDE_OF, entry.kind)) found.push(`${at}: kind must be activity or money`);
    if (OFF_HUD.includes(entry.id)) found.push(`${at}: not a HUD entry (no inventory on screen; profile and settings are in the top bar)`);
    if (isGameTile(entry)) {
      if (!entry.icon) found.push(`${at}: no icon`);
      else if (entry.icon.length > ICON_MAX) found.push(`${at}: icon key longer than ${ICON_MAX}`);
      if (!entry.label) found.push(`${at}: no label`);
      if (entry.offer && entry.kind !== 'money') found.push(`${at}: an offer is money (right column)`);
      if (entry.offer && entry.open) found.push(`${at}: an offer tile opens the offer window of its trigger, not open`);
    } else {
      if (entry.icon || entry.label || entry.open || entry.offer) {
        found.push(`${at}: a module tile takes only id, kind and status (picture, name and window are the module's)`);
      }
    }
  }
  return found;
}

/** A tile of the layout record (`ui.hud/layout` → `items.<id>`), as the kit reads it. */
export interface LayoutEntry {
  readonly slot?: HudSide;
  readonly order?: number;
  readonly visible?: boolean;
  readonly filters?: unknown;
  readonly badge?: unknown;
  readonly label?: unknown;
  readonly icon?: string;
}
export interface Layout { readonly unlisted: 'hide'; readonly items: Readonly<Record<string, LayoutEntry>> }

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * The layout the HUD registry applies: side by `kind`, order by position, only declared tiles
 * (`unlisted: hide`). The published `ui.hud/layout` record still tunes a declared tile — hides it
 * (`visible: false`), shows it to a segment (`filters`), sets its badge, name or picture — but
 * never moves it to the other side or shows a tile the game did not declare. `hidden`: tiles whose
 * status says there is nothing behind them; `icons`: pictures set at run time (offer tiles).
 */
export function hudLayout(entries: readonly HudEntry[], published: unknown,
  hidden: ReadonlySet<string> = new Set(), icons: ReadonlyMap<string, string> = new Map()): Layout {
  const tuned = record(published) && record(published['items']) ? published['items'] : {};
  const count: Record<HudSide, number> = { left: 0, right: 0 };
  const items: Record<string, LayoutEntry> = {};
  for (const entry of entries) {
    const slot = SIDE_OF[entry.kind];
    if (!slot || items[entry.id] || OFF_HUD.includes(entry.id)) continue;
    const own = record(tuned[entry.id]) ? tuned[entry.id] as Record<string, unknown> : {};
    const icon = icons.get(entry.id) ?? (typeof own['icon'] === 'string' ? own['icon'] : undefined);
    items[entry.id] = { slot, order: step(count[slot]++),
      visible: !hidden.has(entry.id) && own['visible'] !== false,
      ...(own['filters'] !== undefined ? { filters: own['filters'] } : {}),
      ...(own['badge'] !== undefined ? { badge: own['badge'] } : {}),
      ...(own['label'] !== undefined ? { label: own['label'] } : {}),
      ...(icon ? { icon } : {}) };
  }
  return { unlisted: 'hide', items };
}

/** A game tile as the registry takes it (`HudItemSpec` without the click handler). */
export function gameTileSpec(entry: HudEntry, order: number): { id: string; icon: string; label: string;
  slot: HudSide; order: number; contexts: string[] } {
  return { id: entry.id, icon: entry.icon ?? '', label: entry.label ?? '', slot: SIDE_OF[entry.kind], order,
    contexts: ['main'] };
}

/** Order of each entry in its column (what `hudLayout` gives it). */
export function hudOrder(entries: readonly HudEntry[]): Map<string, number> {
  const layout = hudLayout(entries, undefined);
  return new Map(Object.entries(layout.items).map(([id, item]) => [id, item.order ?? 0]));
}

// ---- offers

/** A `ui.windows/main` trigger step that opens the offer window of an iap placement. */
const offerPlacement = (step: unknown): string | undefined => record(step) && step['module'] === 'iap'
  && step['action'] === 'offer' && record(step['params']) && typeof step['params']['placement'] === 'string'
  && step['params']['placement'] !== '' ? step['params']['placement'] : undefined;

/**
 * Placements a tile opens: steps `iap.offer {placement}` of the `ui.windows/main` triggers of the
 * tile — on its element `hud:<id>` or on the event `hud:item:opened` with `payload.id` (the rule
 * mod-iap applies to its own `offers` tile).
 */
export function offerPlacements(windows: unknown, tile: string): string[] {
  const triggers = record(windows) && Array.isArray(windows['triggers']) ? windows['triggers'] : [];
  const out: string[] = [];
  for (const rule of triggers) {
    if (!record(rule) || !record(rule['on']) || !Array.isArray(rule['do'])) continue;
    const on = rule['on'];
    const mine = on['element'] === `hud:${tile}`
      || (on['event'] === 'hud:item:opened' && record(rule['payload']) && rule['payload']['id'] === tile);
    if (!mine) continue;
    for (const placement of rule['do'].map(offerPlacement)) {
      if (placement && !out.includes(placement)) out.push(placement);
    }
  }
  return out;
}

/** What an offer tile shows: the first available offer of its placements, in their order. */
export interface OfferTile { readonly visible: boolean; readonly offerKey?: string; readonly icon?: string; readonly endsAt?: number }

/** Skin icon key of an offer picture (`OFFERS`): the shell adds `icon-offer-<key>` to the skin. */
export const offerIcon = (key: string): string => `offer-${key}`;

export function offerTile(offers: readonly { key: string; available: boolean; endsAt?: string }[],
  pictures: Readonly<Record<string, string>>, now: number): OfferTile {
  const offer = offers.find((item) => item.available
    && !(item.endsAt !== undefined && Date.parse(item.endsAt) <= now));
  if (!offer) return { visible: false };
  const ends = offer.endsAt === undefined ? NaN : Date.parse(offer.endsAt);
  const icon = offerIcon(offer.key);
  return { visible: true, offerKey: offer.key,
    ...(Object.hasOwn(pictures, offer.key) && icon.length <= ICON_MAX ? { icon } : {}),
    ...(Number.isFinite(ends) ? { endsAt: ends } : {}) };
}

// ---- top bar

/** Order of the profile button; counters follow it. */
export const PROFILE_ORDER = 10;
/**
 * Id of an item counter that opens something: the kit's currency capsule (`currency.<item>`) — the
 * kit draws its «+» and lands the reward coins on it. A counter with nothing to open goes by the
 * item id itself: no «+» (the kit draws one on every `currency.*` capsule and on nothing else), the
 * reward coins still find it (`hud.<item>`).
 */
export const counterId = (item: string): string => `currency.${item}`;
/** Id of the level counter the profile service registers. */
export const LEVEL_ID = 'level';
/** The element of the shop tile: its `ui.windows/main` trigger opens the shop window. */
export const SHOP_ELEMENT = 'hud:shop';

export interface BarCounter { readonly id: string; readonly item?: string; readonly icon?: string;
  readonly label?: string; readonly order: number;
  /** What a press on the counter or its «+» opens; none — nothing, no «+». */
  readonly open?: BarOpen }

/**
 * What an item counter opens: its own `open`, else the shop when `HUD` declares the shop tile;
 * `open: false` or no shop — nothing.
 */
export function counterOpen(resource: BarResource, hud: readonly HudEntry[]): BarOpen | undefined {
  if (resource.kind !== 'item' || resource.open === false) return undefined;
  if (resource.open) return resource.open;
  return hud.some((entry) => entry.id === 'shop') ? { element: SHOP_ELEMENT } : undefined;
}

/**
 * Counters of the top bar in order: item counters are the shell's, the level is the profile
 * service's. `hud`: the game's `HUD` (whether there is a shop to open).
 */
export function barCounters(resources: readonly BarResource[], hud: readonly HudEntry[] = []): BarCounter[] {
  return resources.map((resource, index) => {
    const order = PROFILE_ORDER + step(index);
    if (resource.kind === 'level') {
      return { id: LEVEL_ID, order, ...(resource.icon ? { icon: resource.icon } : {}),
        ...(resource.label ? { label: resource.label } : {}) };
    }
    const open = counterOpen(resource, hud);
    return { id: open ? counterId(resource.id) : resource.id, item: resource.id, icon: resource.icon ?? resource.id,
      label: resource.label, order, ...(open ? { open } : {}) };
  });
}

/** Problems of the top bar declaration, as text. */
export function barProblems(resources: readonly BarResource[]): string[] {
  const found: string[] = [];
  const ids = new Set<string>();
  for (const counter of barCounters(resources)) {
    if (ids.has(counter.id)) found.push(`TOP_BAR ${counter.id}: declared twice`);
    ids.add(counter.id);
    if (counter.item !== undefined && !counter.label) found.push(`TOP_BAR ${counter.item}: no label`);
    if (counter.icon && counter.icon.length > ICON_MAX) found.push(`TOP_BAR ${counter.id}: icon key longer than ${ICON_MAX}`);
    if (counter.item !== undefined && [LEVEL_ID, 'profile', 'settings'].includes(counter.id)) {
      found.push(`TOP_BAR ${counter.item}: an item id the top bar uses for its own button`);
    }
  }
  return found;
}

/**
 * A module's top bar item as the game shows it: item counters are the shell's own (a module's
 * `currency.*` is dropped), the level only when declared, with the declared order, name and
 * picture; every counter on the left, on lobby and gameplay screens. `undefined` — not shown.
 */
export function moduleCounter<S extends { id: string; icon: string; label: string }>(spec: S,
  counters: readonly BarCounter[]): (S & { slot: 'left'; order: number; contexts: string[] }) | undefined {
  if (spec.id.startsWith('currency.')) return undefined;
  const counter = counters.find((item) => item.id === spec.id && item.item === undefined);
  if (!counter) return undefined;
  return { ...spec, slot: 'left', order: counter.order, contexts: ['main', 'core'],
    ...(counter.icon ? { icon: counter.icon } : {}), ...(counter.label ? { label: counter.label } : {}) };
}

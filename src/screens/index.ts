// The screens of the game, by route, which of them are gameplay screens, and what a screen gets
// from the app. The game owns this file; src/shell/router.ts implements ScreenContext and mounts
// one screen at a time.
import { CURRENCY } from '../boot/ids.js';
import type { GamePorts } from '../modules/game/index.js';
import { mount as game } from './game.js';
import { mount as home } from './home.js';

export type Route = 'home' | 'game';

export interface ScreenContext {
  /** Localized text by key (the strings record: bundled, then the published one); `{name}` filled from params. */
  t(key: string, params?: Record<string, string | number>): string;
  go(route: Route): void;
  /** Platform services of a level (src/boot/game-ports.ts); the placeholder does not call them. */
  game: GamePorts;
  /**
   * The game's own windows — level complete, level failed, pause, booster intro, confirm — as kit
   * windows of the game skin: frame, title plate, close button, buttons and the dim over the whole
   * screen come from the skin; the content is the game's (`body`). A screen draws no window of its
   * own (docs/platform/recipes/add-a-screen.md). Windows still open when the screen is left close.
   */
  window: GameWindows;
  /**
   * A layer over the whole screen, top bar and HUD included, for what is not a window: a tutorial
   * spotlight, a loading veil. Under the windows; gone when the screen is left.
   */
  overlay(options?: OverlayOptions): GameOverlay;
  /**
   * Tells the game to stop and to go on: `true` while the player cannot play — the tab or the
   * app is in the background, or the device is held the other way than `ORIENTATION` and the SDK
   * covers the game with «rotate your device»; `false` when it is over. Stop the level clock,
   * physics and sound on `true`; nothing reloads, the screen keeps its state. Called at once with
   * `true` when set while suspended. Returns what removes the handler; handlers of a screen go
   * with it (docs/platform/recipes/orientation.md).
   */
  onSuspend(handler: (suspended: boolean) => void): () => void;
}

/** A button of a game window: `id` comes back as the window's result. */
export interface GameWindowAction {
  readonly id: string;
  /** Text of the button (`ctx.t(key)`). */
  readonly label: string;
  /** Kit button look: the first one is `primary` unless given, the others `secondary`. */
  readonly variant?: 'primary' | 'secondary' | 'text';
}

export interface GameWindowSpec {
  /** Title in the window head (`ctx.t(key)`). */
  readonly title: string;
  /** Picture over the content, drawn by the kit: a skin icon key and/or 0…3 rating stars. */
  readonly header?: { readonly icon?: string; readonly stars?: number };
  /** A line of text the kit draws (a confirm needs nothing more). */
  readonly text?: string;
  /**
   * The game's content inside the window frame (stars, score rows, reward tiles): draws into
   * `root` and returns what removes it. Draw with `mountView` of src/screens/ui.ts — its own shadow
   * root with the theme; no frame, backdrop or buttons of its own.
   */
  readonly body?: (root: HTMLElement) => void | (() => void);
  /** Up to three kit buttons, in this order. None: the kit's «Continue», result `close`. */
  readonly actions?: readonly GameWindowAction[];
  /** `false`: no close button, Esc and a tap on the dim do nothing — the player picks a button. */
  readonly dismissible?: boolean;
}

export interface GameWindowTicket {
  /** The `id` of the button pressed, or `close` (close button, Esc, dim, `close()`, screen left). */
  readonly result: Promise<string>;
  close(): void;
}

export interface GameWindows {
  /**
   * Opens a kit window of the game skin. The kit reward window and a game window never stand one
   * over the other: the one asked second waits until the first is closed (src/shell/windows/order.ts).
   */
  open(spec: GameWindowSpec): GameWindowTicket;
}

export interface OverlayOptions {
  /** Dim the screen under it with the theme's `--mp-card-overlay` (default true). */
  readonly dim?: boolean;
  /** Draws into the layer (`mountView` of src/screens/ui.ts); returns what removes it. */
  readonly draw?: (root: HTMLElement) => void | (() => void);
}

export interface GameOverlay {
  /** The layer: the whole viewport, edge to edge; it takes the taps while it is there. */
  readonly root: HTMLElement;
  remove(): void;
}

/** Draws a screen into `root`; returns the function that removes it and its subscriptions. */
export type ScreenMount = (root: HTMLElement, ctx: ScreenContext) => () => void;

export const screens: Record<Route, ScreenMount> = { home, game };

/** Gameplay routes: the shell shows them without the lobby HUD and bottom menu, with a compact top bar. */
export const GAMEPLAY: ReadonlySet<Route> = new Set<Route>(['game']);

/** An item of the bottom menu on lobby screens: kit icon key, localization key of the label, route it opens. */
export interface MenuItem {
  readonly id: string;
  readonly icon: string;
  readonly label: string;
  readonly route: Route;
  /** The raised button in the middle of the bar; other items fill the slots by `order`. */
  readonly center?: boolean;
  readonly order?: number;
}

/**
 * The bottom menu of the game. Empty (as shipped): no bottom bar at all, it takes no room —
 * navigation lives on the screens themselves (home has its own Play). Add items only when the
 * lobby has several sections to switch between; labels are keys of the strings record, e.g.
 * `{ id: 'menu.play', icon: 'play', label: <key of "Play">, route: 'game', center: true }`.
 * Up to four side items and one center item; a platform module set to the bottom menu
 * (daily-rewards `entry: bottomMenu`) shows the bar too and keeps the slot it took.
 */
export const MENU: readonly MenuItem[] = [];

/**
 * What a HUD entry is about; the side follows from it, the game never picks one:
 * `activity` — the left column (daily rewards, leaderboard, events, tasks);
 * `money` — the right column (shop, offers, deals).
 */
export type HudKind = 'activity' | 'money';

/** What a press on a game's own tile does, when no `ui.windows/main` trigger of it opens a kit window. */
export type HudOpen = { readonly route: Route } | { readonly run: (ctx: ScreenContext) => void };

/** Live state of a game's tile: `visible: false` takes it off the column. */
export interface HudStatus {
  readonly visible?: boolean;
  /** `'dot'` — something new; a number — a counter (0 clears it). */
  readonly badge?: 'dot' | number;
  /** Countdown to this time (epoch ms, server time); none when absent or past. */
  readonly endsAt?: number;
}

/**
 * An entry of the lobby HUD, one tile. Three sorts:
 * - a tile a platform module registers itself — id `daily-rewards`, `leaderboards` or `shop`
 *   (also `offers`, `progress`): only `id` and `kind`; picture, name and window are the module's;
 * - the game's own tile — any other id with `icon` (skin icon key, e.g. `gift`, `trophy`, `star`,
 *   or an item id of `ITEMS`, src/skin/art.ts) and `label` (localization key: the accessible name,
 *   the tile shows no text). A press reports `hud:<id>`: a `ui.windows/main` trigger of that
 *   element (or of the event `hud:item:opened` with `payload: { id }`) opens a kit window; `open`
 *   instead moves to a route of the game or runs the game's code;
 * - an offer tile — `offer: true`, `kind: 'money'`: the `ui.windows/main` trigger of the tile
 *   opens `iap.offer` with a placement; the tile is there only while that placement has an
 *   available offer, with the offer's picture (`OFFERS`) and its end time as a countdown.
 * Order in this list is the order in a column and the priority when a column is full.
 */
export interface HudEntry {
  readonly id: string;
  readonly kind: HudKind;
  readonly icon?: string;
  readonly label?: string;
  readonly open?: HudOpen;
  readonly offer?: true;
  /**
   * Badge, countdown and visibility of the tile, read again on each of the bus events `on` (and
   * at the start and for a new player); `visible` applies to module tiles too.
   */
  readonly status?: { readonly on: readonly string[]; read(ctx: ScreenContext): HudStatus | Promise<HudStatus> };
}

/**
 * The lobby HUD of the game. The template's defaults: daily rewards and the leaderboard on the
 * left, the shop on the right. Add the game's entries here (docs/platform/recipes/add-a-hud-entry.md),
 * e.g. an event `{ id: 'event', kind: 'activity', icon: 'star', label: <key> }` with a
 * `ui.windows/main` trigger of `hud:event`, or a limited offer
 * `{ id: 'offer-starter', kind: 'money', icon: 'gift', label: <key>, offer: true }`.
 * A module tile not listed here (inventory, profile, …) is not shown.
 */
export const HUD: readonly HudEntry[] = [
  { id: 'daily-rewards', kind: 'activity' },
  { id: 'leaderboards', kind: 'activity' },
  { id: 'shop', kind: 'money' },
];

/**
 * A counter of the top bar, on the left after the profile:
 * - `item` — the player's quantity of an inventory item (a currency or any countable item):
 *   `id` is its catalog id, `icon` defaults to the item's picture (`ITEMS`, src/skin/art.ts);
 * - `level` — the player's level (the profile service; the kit's star unless `icon` is given).
 * `label` is the localization key of its accessible name.
 * `open` of an item counter — what a press on it and on its «+» opens: by default the shop (the
 * `shop` entry of `HUD`, its `ui.windows/main` trigger of `hud:shop`); `{ element }` reports another
 * element to the triggers, `{ route }` / `{ run }` as a HUD tile; `false` — nothing. A counter with
 * nothing to open has no «+».
 */
export type BarOpen = HudOpen | { readonly element: string };

export type BarResource =
  | { readonly kind: 'item'; readonly id: string; readonly label: string; readonly icon?: string;
    readonly open?: BarOpen | false }
  | { readonly kind: 'level'; readonly label?: string; readonly icon?: string };

/** Counters of the top bar, in this order; nothing else is shown there (the right side is settings only). */
export const TOP_BAR: readonly BarResource[] = [
  { kind: 'item', id: CURRENCY, label: 'shell.currency.coins' },
  { kind: 'level' },
];

/**
 * Languages of the game: the base one (`en`, the bundled branch of the strings record) and every other language the
 * game has translated and published (`localization/locales` and a branch of `localization/strings`).
 * The player gets their own language when it is in this list, otherwise the base one — the game's
 * screens and every kit window alike (src/boot/start.ts). tests/strings.test.mjs checks the list
 * against configs/remote/localization/.
 */
export const LOCALES: readonly string[] = ['en'];

/**
 * The orientation the game is made for — a design decision of the game, by its genre and
 * mechanics: `'landscape'` (a side-scrolling platformer, a runner, a racing game),
 * `'portrait'` (a one-hand puzzle, a merge board, a card game), `'any'` — only when every screen
 * and the level itself are laid out for both. The SDK gets it at start (src/boot/start.ts): on a
 * phone or a tablet held the other way it covers the game with «rotate your device» and
 * `ctx.onSuspend` pauses the level; a desktop window is never covered. The application setting
 * of the platform (`orientation` of platform.json) is set to the same value on the platform, not
 * by the game (docs/platform/recipes/orientation.md; tests/orientation.test.mjs compares them).
 */
export type GameOrientation = 'any' | 'landscape' | 'portrait';
export const ORIENTATION: GameOrientation = 'any';

/** A line of the profile window: localization key of its label and where its value comes from. */
export interface ProfileStat {
  readonly label: string;
  /**
   * `levelsCompleted` — levels the player has won (the level progress); any other name is a
   * field of the player's profile summary (`sdk.profile.get()`: `highestScore`, `totalScore`,
   * `gamesPlayed`, `gamesWon`, `score`).
   */
  readonly value: string;
}

/**
 * The profile window shows the avatar, the name and these lines, in this order; a line without a
 * value is not shown. Keep it short and about the game: no ids, codes or technical values.
 */
export const PROFILE_STATS: readonly ProfileStat[] = [
  { label: 'screen.profile.levels', value: 'levelsCompleted' },
  { label: 'screen.profile.best', value: 'highestScore' },
];

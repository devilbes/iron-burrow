// The game seam and the API of Iron Burrow (docs/game/CONTRACT.md §3). Two layers:
// - GamePorts — platform services of a level, implemented in src/boot/game-ports.ts (do not change
//   its shape: boot builds it). Its level set is the campaign (`levels.main`).
// - IronBurrow — the game's own API for the screens: rules, the match loop, boosters, offers,
//   boards, settings and flags. The game module gets the SDK modules it needs through
//   `manifest.sdk.uses` (kind `game`, ModuleContext.sdk) — no SDK imports here, structural types
//   only; the pure rules live in files next to this one, without SDK and DOM.
// Screens reach it with `gameOf(ctx.game)`. This file holds the declarations and the stub; the
// game-logic step implements them (src/modules/game/**), the screens step only calls them.

/** A game's own cloud save (JSON object); a game narrows it. */
export type GameState = Readonly<Record<string, unknown>>;

/** The server's answer to the level end; the reward comes later as a grant (kit reward window). */
export interface LevelResult { readonly verified: boolean; readonly stars: number }

/** A level of the set as its record describes it. */
export interface Level {
  readonly n: number;
  /** Number of the last level of the set; `null` when the set has no end. */
  readonly last: number | null;
  /** Level id (`entries[].id` of the level record), the key of its progress step. */
  readonly id: string;
  /** The level's own entry of the level record (the game's numbers, JSON); a game narrows it. */
  readonly entry: unknown;
}

export interface GamePorts {
  /** The level to play: the first one not won yet (the last one again after the set ends). */
  currentLevel(): Promise<number>;
  /** Level `n` from the level records (fetched once per session, then from memory). */
  level(n: number): Promise<Level>;
  /** Starts a server-seeded attempt of the level; `seed` is the one the level end is verified against. */
  beginAttempt(level: number): Promise<{ readonly seed: string }>;
  /**
   * Reports the level end of the current attempt; returns as soon as the server answers. Iron
   * Burrow sends `moves` = lives lost (stars are the server's: D-LVL-03) and the stage score.
   */
  endLevel(level: number, won: boolean, stats: { moves: number; score: number }): Promise<LevelResult>;
  /** Opt-in cloud save (gamestate): read once per session, written at rare moments. */
  loadSave(): Promise<GameState | null>;
  save(state: GameState | null): Promise<void>;
  /** Analytics event (flat string and number params); never throws. */
  track(event: string, params?: Record<string, string | number>): void;
}

// ---------------------------------------------------------------- vocabulary

export type Layout = 'portrait' | 'landscape' | 'desktop';
export type Mode = 'campaign' | 'siege';
/** Inventory items (catalog ids; runtime values come from src/boot/ids.ts `BOOSTERS`, CR-01). */
export type BoosterId = 'bst_bubble' | 'bst_shockwave' | 'bst_fortify' | 'bst_hull';
/** The three boosters of the field HUD; Spare Hull is used only in Pre-stage and Defeat. */
export type FieldBooster = Exclude<BoosterId, 'bst_hull'>;
export type OfferKey = 'start_grant' | 'starter_crate' | 'hull_pack' | 'field_kit' | 'heavy_arsenal' | 'commander_cache';
export type Placement = 'shop' | 'defeat' | 'prestage' | 'starter_auto' | 'start_grant';
export type Board = 'siege_best' | 'campaign_score';
export type Period = 'weekly' | 'alltime';
/** Art set of the tiles: chapter 1 clay, 2 iron, 3 magma; Siege (`pit`) draws with magma. */
export type TileTheme = 'clay' | 'iron' | 'magma';
/** Tile codes of GDD 12 §1: empty, brick, steel, lava, roots, oil, Burrow Core. */
export type TileCode = '.' | 'B' | 'S' | 'L' | 'R' | 'O' | 'C';
export type EnemyKind = 'scout' | 'grunt' | 'gunner' | 'brute';
export type PowerUpKind = 'star' | 'bubble' | 'rebar' | 'quake' | 'freeze' | 'hull';
export type Dir = 'up' | 'down' | 'left' | 'right';
/** GDD 10 §1; the field shows `data-state` playing|paused|won|lost from it. */
export type Phase = 'intro' | 'playing' | 'paused' | 'cleared' | 'defeated' | 'continue';
export type DefeatReason = 'core' | 'lives';
export type BoosterState = 'ready' | 'active' | 'limit' | 'empty';
export type InputMode = 'keys' | 'touch';

export interface Reward { readonly item: BoosterId; readonly amount: number }

/** An entry of a level record (`levels.main` ranges, `levels.endless/r_0001_0001`), CONTRACT §8. */
export interface StageEntry {
  readonly id: string;
  readonly index?: number;
  readonly chapter?: 1 | 2 | 3;
  readonly theme: 'clay' | 'iron' | 'magma' | 'pit';
  readonly maxAlive?: number;
  readonly spawnInterval?: number;
  readonly grid: readonly string[];
  readonly quarters: readonly { readonly col: number; readonly row: number; readonly mask: number }[];
  readonly enemies?: readonly EnemyKind[];
}

// ---------------------------------------------------------------- lobby, map, pre-stage

export interface StageInfo {
  readonly n: number; readonly id: string; readonly chapter: 1 | 2 | 3;
  readonly state: 'locked' | 'open' | 'cleared'; readonly stars: 0 | 1 | 2 | 3; readonly best: number;
  /** Chapter final (10, 20, 30). */
  readonly finale: boolean;
}

export interface CampaignInfo {
  readonly stages: readonly StageInfo[];
  /** The farthest open stage («Play Stage N», D-20-10). */
  readonly next: number;
  readonly stars: number;
  readonly maxStars: number;
  readonly chapters: readonly { readonly n: 1 | 2 | 3; readonly open: boolean; readonly first: number; readonly last: number }[];
  /** Chapter the map opens on (gamestate `campaign.selected_chapter`, else the one of `next`). */
  readonly chapter: 1 | 2 | 3;
  readonly siege: { readonly unlocked: boolean; readonly unlockAfter: number };
}

/** How the player came to a stage: `next` carries the gun level (D-10-06). */
export type StageFrom = 'lobby' | 'map' | 'next' | 'replay' | 'retry';

export interface StageSetup { readonly mode: Mode; readonly n: number; readonly takeHull: boolean; readonly from: StageFrom }

export interface PreStageInfo {
  readonly mode: Mode;
  readonly n: number;
  /** Enemies to destroy (20; 0 in Siege — the goal is survival). */
  readonly goal: number;
  readonly best: number;
  readonly stars: 0 | 1 | 2 | 3;
  readonly hull: { readonly owned: number; readonly state: 'on' | 'off' | 'empty' };
  /** Show «Spare Hull: +1 life for this stage.» once (flag `tut.prestage_hint_shown`). */
  readonly hullHint: boolean;
  /** Stage 1 runs with the tutorial (S15). */
  readonly tutorial: boolean;
  /** What a first clear grants (display only, `game.rewards`); empty when already cleared. */
  readonly rewards: readonly Reward[];
}

// ---------------------------------------------------------------- match

/** Positions are integer units: 1 cell = 600 u, the field is 13 × 13 cells; `px/py` — previous tick. */
export interface TankView {
  readonly id: number; readonly x: number; readonly y: number; readonly px: number; readonly py: number;
  readonly dir: Dir; readonly moving: boolean; readonly spawning: boolean; }
export interface PlayerView extends TankView { readonly gun: 0 | 1 | 2 | 3; readonly shieldMs: number }
export interface EnemyView extends TankView {
  readonly kind: EnemyKind; readonly hp: number; readonly carrier: boolean; readonly frozen: boolean; }
export interface BulletView {
  readonly id: number; readonly x: number; readonly y: number; readonly px: number; readonly py: number;
  readonly dir: Dir; readonly owner: 'player' | 'enemy'; readonly heavy: boolean; }
export interface BoosterView {
  readonly id: FieldBooster; readonly count: number; readonly used: number; readonly limit: number;
  readonly state: BoosterState; readonly leftMs: number; readonly totalMs: number; }
export interface HudView {
  /** Enemies still to destroy: on the field + in the queue (wave in Siege). */
  readonly enemiesLeft: number;
  readonly queued: number;
  readonly lives: number;
  readonly score: number;
  readonly stage: number | null;
  readonly wave: number | null;
  readonly gun: 0 | 1 | 2 | 3;
  readonly boosters: readonly BoosterView[];
}
export interface TutorialView {
  readonly step: 1 | 2 | 3 | 4 | 5 | 6;
  /** Localization key of the hint for the current input mode (CONTRACT §11). */
  readonly text: string;
  readonly text2: string | null;
  readonly target: 'stick' | 'fire' | 'keys' | 'brick' | 'core' | 'enemy' | 'powerup' | 'boosters';
}
export interface MatchView {
  readonly tick: number;
  /** 0…1 between the last two ticks, for interpolation. */
  readonly alpha: number;
  readonly phase: Phase;
  readonly mode: Mode;
  readonly theme: TileTheme;
  /** 169 tiles row-major (row 0 on top). */
  readonly tiles: readonly TileCode[];
  /** 169 quarter masks of B/S (1 TL, 2 TR, 4 BL, 8 BR; 15 whole, 0 gone). */
  readonly quarters: readonly number[];
  readonly wall: { readonly steel: boolean; readonly leftMs: number; readonly totalMs: number };
  /** The three spawn points with the next enemy kind (visible queue) and whether one is appearing. */
  readonly spawns: readonly { readonly col: number; readonly row: number; readonly next: EnemyKind | null; readonly busy: boolean }[];
  readonly player: PlayerView | null;
  readonly enemies: readonly EnemyView[];
  readonly bullets: readonly BulletView[];
  readonly powerup: { readonly kind: PowerUpKind; readonly col: number; readonly row: number; readonly leftMs: number } | null;
  readonly freezeMs: number;
  readonly spawnHeld: boolean;
  readonly hud: HudView;
  readonly tutorial: TutorialView | null;
}

/** What happened in the ticks of one `advance` — for fx, sound, haptics, toasts (CONTRACT §7). */
export type MatchEvent =
  | { readonly type: 'intro'; readonly stage: number | null; readonly wave: number | null }
  | { readonly type: 'shot'; readonly owner: 'player' | 'enemy'; readonly heavy: boolean }
  | { readonly type: 'hit'; readonly target: 'brick' | 'steel' | 'edge' | 'shield' | 'bullet' | 'brute' | 'core-wall'; readonly col: number; readonly row: number }
  | { readonly type: 'steel-broken'; readonly col: number; readonly row: number }
  | { readonly type: 'enemy-spawn'; readonly kind: EnemyKind }
  | { readonly type: 'kill'; readonly kind: EnemyKind; readonly by: 'bullet' | 'shockwave' | 'quake'; readonly points: number; readonly col: number; readonly row: number }
  | { readonly type: 'powerup-spawn'; readonly kind: PowerUpKind; readonly col: number; readonly row: number }
  | { readonly type: 'pickup'; readonly kind: PowerUpKind; readonly points: number } | { readonly type: 'powerup-expired' }
  | { readonly type: 'effect-end'; readonly effect: 'freeze' | 'shield' | 'bubble' | 'fortify' | 'rebar' }
  | { readonly type: 'player-death'; readonly lives: number }
  | { readonly type: 'shield-warning' | 'player-spawn' | 'oil-slide' | 'core-threat' | 'core-alarm' | 'core-destroyed' }
  | { readonly type: 'booster'; readonly id: BoosterId }
  | { readonly type: 'booster-denied'; readonly id: FieldBooster; readonly reason: 'empty' | 'limit' | 'cooldown' | 'blocked' }
  | { readonly type: 'consume-failed'; readonly id: FieldBooster }
  | { readonly type: 'gun-up'; readonly level: 0 | 1 | 2 | 3 }
  | { readonly type: 'wave-start'; readonly wave: number }
  | { readonly type: 'wave-clear'; readonly wave: number; readonly bonus: number }
  | { readonly type: 'tutorial'; readonly step: 1 | 2 | 3 | 4 | 5 | 6 }
  | { readonly type: 'life-up' | 'last-enemy' | 'booster-hint' | 'cleared' }
  | { readonly type: 'defeated'; readonly reason: DefeatReason };

export type BoosterUse = 'applied' | 'empty' | 'limit' | 'cooldown' | 'blocked';

export interface DefeatInfo {
  readonly reason: DefeatReason; readonly continue: 'available' | 'empty' | 'used';
  /** Offers of `placement_defeat`, only when Continue is unused and Spare Hull = 0 (D-16-03). */
  readonly offers: readonly OfferKey[];
  readonly score: number; readonly wave: number | null;
}

export interface StageResult {
  readonly mode: Mode; readonly n: number; readonly result: 'clear' | 'defeat' | 'quit';
  readonly reason: DefeatReason | null; readonly score: number;
  readonly breakdown: { readonly kills: number; readonly pickups: number; readonly clear: number; readonly lives: number; readonly livesLeft: number; readonly waves: number };
  /** Server stars (0 unless verified). */
  readonly stars: 0 | 1 | 2 | 3; readonly verified: boolean; readonly best: number; readonly newBest: boolean;
  /** The grant this clear earns (display only; the kit reward window shows the real grant). */
  readonly rewards: readonly Reward[];
  readonly chapterDone: boolean; readonly campaignDone: boolean; readonly wave: number | null;
  /** Stage for «Next» (null after 30 and in Siege). */
  readonly next: number | null;
  /** Starter Crate auto window is due after this window closes (D-20-08). */
  readonly starterDue: boolean;
}

export interface Match {
  readonly mode: Mode; readonly n: number; readonly entry: StageEntry;
  view(): MatchView;
  /** Runs fixed 1/60 s ticks for the elapsed time (≤ 5 per call); nothing while paused. */
  advance(elapsedMs: number): readonly MatchEvent[];
  setInput(input: { readonly move: Dir | null; readonly fire: boolean }): void;
  setInputMode(mode: InputMode): void;
  useBooster(id: FieldBooster): BoosterUse;
  pause(): void; resume(): void; readonly paused: boolean;
  /** S15 «Got it» / «Skip» (Skip sets `tut.stage1_done`, releases the spawn hold). */
  tutorialNext(): void;
  tutorialSkip(): void;
  /** In phase `defeated`: what S08 shows. */
  defeat(): DefeatInfo | null;
  /** S08 Continue: consumes one Spare Hull after the server confirms it (D-10-07). */
  continueRun(): Promise<'continued' | 'empty' | 'used' | 'failed'>;
  /**
   * Ends the attempt: `final` after clear or the last defeat, `quit` from Pause. Sends the level
   * end where the rules say (CONTRACT §2) and returns what S07/S08/S09 show.
   */
  end(how: 'final' | 'quit'): Promise<StageResult>;
  /** Test environment only (`qa-win`, `qa-lose`); null elsewhere. */
  readonly qa: { win(): void; lose(): void } | null;
}

// ---------------------------------------------------------------- services

export interface OfferView {
  readonly key: OfferKey; readonly placement: Placement;
  /** Localized store price; null for the free grant or while the store is not loaded. */
  readonly price: string | null;
  readonly items: readonly Reward[]; readonly badge: 'best_value' | 'one_time' | null; readonly test: boolean; }
export interface PurchaseResult {
  readonly status: 'success' | 'failed' | 'cancelled' | 'pending'; readonly key: OfferKey; readonly items: readonly Reward[]; }
export interface BoardRow { readonly rank: number; readonly name: string; readonly score: number; readonly self: boolean }
export interface BoardPage {
  readonly board: Board; readonly period: Period; readonly rows: readonly BoardRow[];
  readonly self: BoardRow | null; readonly resetsAt: number | null; readonly guest: boolean; }
export interface SiegeStanding { readonly best: number | null; readonly rank: number | null; readonly newBest: boolean }
export interface Settings { readonly music: boolean; readonly sfx: boolean; readonly motion: boolean; readonly haptics: boolean }
export type Haptic = 'player-death' | 'core-destroyed' | 'pickup' | 'blast' | 'core-alarm';
export type GameErrorCode = 'offline' | 'refused' | 'unavailable';
/** What the API rejects with; `offline` — «Connection needed». */
export interface GameError extends Error { readonly code: GameErrorCode }

export interface IronBurrow extends GamePorts {
  /** `qa`: platform environment `test` (QA hooks); `haptics`: device can vibrate. */
  readonly env: { readonly qa: boolean; readonly haptics: boolean; readonly version: string };
  /** Configs, kv flags, progress, inventory and the save read once; resolves even offline. */
  ready(): Promise<void>;
  campaign(): Promise<CampaignInfo>;
  prestage(mode: Mode, n: number): Promise<PreStageInfo>;
  /** Keeps the setup for the game route; `start` begins it. */
  select(setup: StageSetup): void;
  selected(): StageSetup | null;
  /** Spare Hull (if taken) is consumed first, then `beginAttempt`; rejects with GameError. */
  start(): Promise<Match>;
  balances(): Readonly<Record<BoosterId, number>>;
  onBalances(listener: () => void): () => void;
  boosterLimits(id: BoosterId): { readonly stage: number; readonly siege: number; readonly durationS: number | null };
  /** The start grant to show in Lobby, or null when it was claimed (flag `onb.start_grant_done`). */
  startGrant(): Promise<readonly Reward[] | null>;
  claimStartGrant(): Promise<PurchaseResult>;
  offers(placement: Placement): Promise<readonly OfferView[]>;
  buy(key: OfferKey, placement: Placement): Promise<PurchaseResult>;
  /** Starter Crate auto window allowed now (24 h cooldown, ≤ 3 shows); `starterShown` records it. */
  starterDue(): Promise<boolean>;
  starterShown(): Promise<void>;
  board(board: Board, period: Period): Promise<BoardPage>;
  siegeStanding(score: number | null): Promise<SiegeStanding>;
  settings(): Settings;
  setSettings(patch: Partial<Settings>): Promise<void>;
  onSettings(listener: (settings: Settings) => void): () => void;
  /** kv flags of CONTRACT §2 (`booster_info.seen`, …): read from memory, written at once. */
  flag(name: string): boolean;
  setFlag(name: string): Promise<void>;
  haptic(kind: Haptic): void;
  /** Platform announcement for the Lobby banner (realtime notice), or null. */
  notice(): Promise<string | null>;
  online(): boolean;
  /** Analytics with boolean params (CONTRACT §10); never throws. */
  event(name: string, params?: Readonly<Record<string, string | number | boolean>>): void;
}

/** `data-layout` of GDD 20: aspect < 0.8 → portrait, width < 1024 → landscape, else desktop. */
export function layoutOf(width: number, height: number): Layout {
  if (height > 0 && width / height < 0.8) return 'portrait';
  return width < 1024 ? 'landscape' : 'desktop';
}

// ---------------------------------------------------------------- module (stub)

export const GAME_MODULE_ID = 'game';
const BRAND = Symbol.for('iron-burrow.game');

function notReady(name: string): never {
  const error = new Error(`game API «${name}» is not implemented yet (game-logic)`) as Error & { code: GameErrorCode };
  error.code = 'unavailable';
  throw error;
}

/**
 * The Iron Burrow API over plain ports. Stub: services answer «not implemented»; the game-logic
 * step replaces it (module context with `sdk.uses` in `init`, detached mode without it — the gallery).
 */
function createIronBurrow(ports: GamePorts): IronBurrow {
  const fail = (name: string) => () => notReady(name);
  const later = (name: string) => () => Promise.reject(new Error(`game API «${name}» is not implemented yet`));
  const api: IronBurrow = {
    currentLevel: () => ports.currentLevel(), level: (n) => ports.level(n),
    beginAttempt: (n) => ports.beginAttempt(n), endLevel: (n, won, stats) => ports.endLevel(n, won, stats),
    loadSave: () => ports.loadSave(), save: (state) => ports.save(state), track: (e, p) => ports.track(e, p),
    env: { qa: false, haptics: false, version: '0.0.0' },
    ready: () => Promise.resolve(), campaign: later('campaign'), prestage: later('prestage'),
    select: fail('select'), selected: () => null, start: later('start'),
    balances: () => ({ bst_bubble: 0, bst_shockwave: 0, bst_fortify: 0, bst_hull: 0 }),
    onBalances: () => () => undefined, boosterLimits: fail('boosterLimits'),
    startGrant: () => Promise.resolve(null), claimStartGrant: later('claimStartGrant'),
    offers: () => Promise.resolve([]), buy: later('buy'),
    starterDue: () => Promise.resolve(false), starterShown: () => Promise.resolve(),
    board: later('board'), siegeStanding: later('siegeStanding'),
    settings: () => ({ music: true, sfx: true, motion: false, haptics: true }),
    setSettings: () => Promise.resolve(), onSettings: () => () => undefined,
    flag: () => false, setFlag: () => Promise.resolve(), haptic: () => undefined,
    notice: () => Promise.resolve(null), online: () => true, event: () => undefined,
  };
  return Object.defineProperty(api, BRAND, { value: true });
}

/** The Iron Burrow API behind `ctx.game` (the module's API); plain ports (gallery, tests) get a detached one. */
export function gameOf(ports: GamePorts): IronBurrow {
  if ((ports as unknown as Record<symbol, unknown>)[BRAND] === true) return ports as IronBurrow;
  const known = detached.get(ports);
  if (known) return known;
  const made = createIronBurrow(ports);
  detached.set(ports, made);
  return made;
}
const detached = new WeakMap<GamePorts, IronBurrow>();

/** The SDK module of the game (`sdk.getModule(GAME_MODULE_ID)`); its API is IronBurrow (GamePorts and more). */
export function createGameModule(makePorts: () => GamePorts) {
  let game: IronBurrow | null = null;
  const api = (): IronBurrow => (game ??= createIronBurrow(makePorts()));
  return {
    manifest: {
      id: GAME_MODULE_ID,
      version: '1.0.0',
      kind: 'game',
      engines: { core: '^1.0.0' },
      // game-logic adds `sdk: { uses: [...] }` and permissions (CONTRACT §3.2).
      permissions: [],
      events: { emits: [], listens: [] },
      load: 'eager',
      targets: ['web', 'cordova'],
      entry: 'modules/game/index.js',
    },
    init(): void { api(); },
    api,
  } as const;
}

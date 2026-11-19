/**
 * Every service record id the game uses, in one place: code imports these constants and never
 * writes record ids as string literals. Values match the records published for the app.
 */
export const CONFIG = Object.freeze({
  /** Scope of progress tracks (keys in PROGRESS). */
  progress: { scope: 'progress' },
  /** HUD layout as published: hides a declared HUD entry or limits it to a segment (shell/hud-plan.ts). */
  hud: { scope: 'ui.hud', key: 'layout' },
  /** Window triggers: what a HUD tile or a top bar button opens (offer tiles read their placement here). */
  windows: { scope: 'ui.windows', key: 'main' },
} as const);

/** Level set: scope `levels.<set>`, opened through `sdk.levels.open(set)`. */
export const LEVEL_SET = 'main';

/** Level set record with the range of levels (`{ first, last }`). */
export const LEVEL_SET_RECORD = Object.freeze({ scope: `levels.${LEVEL_SET}`, key: 'set' } as const);

/** Progress keys: level progression (with the coin reward per level) and the daily track. */
export const PROGRESS = Object.freeze({ levels: 'progress_main', daily: 'reward_daily' } as const);

/** The only currency of the game (inventory catalog entity). */
export const CURRENCY = 'item_coins';

/** Leaderboard key (leaderboard definition). */
export const LEADERBOARD = 'leaderboard_weekly';

/** IAP placement whose offers the shop window shows. */
export const SHOP_PLACEMENT = 'placement_shop';
/**
 * Section of the stock shop window the offers of SHOP_PLACEMENT are shown in: the kit groups
 * offers by its own section keys (`shop_special|soft|hard|bundles|ads|other`) and drops other
 * placement names.
 */
export const SHOP_SECTION = 'shop_soft';

/**
 * Elements the top bar buttons report with `sdk.ui.elementAction`; a trigger of `ui.windows/main`
 * maps each to a module window. They keep the `hud:` ids of the published triggers. HUD tiles
 * report `hud:<tile id>` themselves (`shell/zones.ts`).
 */
export const ELEMENTS = Object.freeze({ profile: 'hud:profile', settings: 'hud:settings' } as const);

/** SDK module ids (platform.json `sdk.modules[].id` and the module namespaces on `sdk`). */
export const MODULES = Object.freeze({
  progress: 'progress', levels: 'levels', inventory: 'inventory', iap: 'iap',
  leaderboards: 'leaderboards', daily: 'daily-rewards', gamestate: 'gamestate', uiKit: 'ui-kit',
  realtime: 'realtime',
} as const);

/** Module whose `main` window the published `hud:profile` trigger opens (presented by the game). */
export const PROFILE_WINDOW_OWNER = 'profile-ui';

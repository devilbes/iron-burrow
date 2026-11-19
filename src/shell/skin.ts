import { defineSkin, useSkin, type Skin, type SkinHandle } from '@manygamescorp/ui-kit/skin';
import { MANYPLAY_CSS, manyplayFontFaces, manyplayFontsUrl, manyplaySkin } from './manyplay.js';
import { assetUrl } from '../assets.js';
import { screens } from '../screens/index.js';
import { SKIN, type GameSkin } from '../skin/index.js';
import { CURRENCY } from '../boot/ids.js';
import { gameAssets, itemArt } from './icon-aliases.js';
import { buttonTintCss } from './button-tint.js';
import { STOCK_COLOR_RULES } from './stock-colors.js';

/**
 * Look of the game: the ManyPlay skin (`ui-kit` setting `skin: manyplay`) with the shell's
 * additions and the game's own skin (src/skin/): theme.css and the common sheet in every kit
 * component (the kit's `*` target, adopted after each component's own sheet, so its variables win
 * over the token block every stock sheet starts with), the theme on the page too (`shell` target),
 * and the stock rules with literal colors repeated through variables (stock-colors.ts).
 */
const VISUALLY_HIDDEN = 'position:absolute!important;width:1px;height:1px;margin:-1px;'
  + 'padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0';

/** Fonts of the ManyPlay skin, resolved through the import map (`vendor/` of the build). */
export function fontsUrl(): string | undefined {
  return manyplayFontsUrl();
}

/**
 * HUD side tiles show the icon only: the label stays as the accessible name of the button, and
 * the tile is square with the icon in its middle (the kit's 80px tile leaves room for a label).
 * A column with more tiles than fit scrolls (the kit's own overflow, no scrollbar); the tiles
 * keep their size instead of the kit's squeeze to 56px, so the first ones stay whole and square.
 * The top bar: a counter that does not fit whole in its group goes to a second row, which is
 * not shown — counters never run under the settings button, `TOP_BAR` order is their priority
 * (40px: the kit's top bar item; the clip margin keeps the plus of a capsule whole).
 */
const SIDE = ['left', 'right'].map((slot) => `.hud[data-slot="${slot}"] .hud-item`).join(',');
const HUD_CSS = `${SIDE.replaceAll('.hud-item', '.hud-label')}{${VISUALLY_HIDDEN}}`
  + `${SIDE}{justify-content:center;height:64px;flex:0 0 64px}`
  + '.hud[data-slot=top]{flex-wrap:wrap;align-content:flex-start;max-height:40px;overflow:clip;overflow-clip-margin:4px}';

/**
 * In landscape the kit gives the raised center of the bottom menu a 40px item, so its caption
 * would sit under the raised circle: there the button keeps only its accessible name. In
 * portrait the caption fits under the circle and stays. The band of the menu is transparent over
 * the scene (`--game-bar-bottom`), so no caption stands bare on it: side items are plates in the
 * look of the top bar capsules, the caption of the raised center has a plate of its own.
 */
const PLATE = 'background:var(--mp-night);border:1px solid var(--mp-line)';
const MENU_CSS = '.bottommenu[data-orientation=landscape] [data-center][data-variant=raised] .hud-label'
  + `{${VISUALLY_HIDDEN}}`
  + '.bottommenu .bottommenu-slot:not([data-center]){padding:4px 2px}'
  + `.bottommenu .bottommenu-slot:not([data-center]) .hud-item{${PLATE}}`
  + '.bottommenu[data-orientation=landscape] .bottommenu-slot:not([data-center]) .hud-item{padding:0 12px}'
  + `.bottommenu [data-center][data-variant=raised] .hud-label{${PLATE};padding:0 6px;border-radius:var(--mp-radius-field)}`
  // No items (the game's `MENU` is empty and no module sits there, or a gameplay route): no bar.
  + '.bottommenu:not(:has(.hud-item)){display:none}';

/**
 * The scene: one layer under the whole shell, edge to edge, behind the top bar, the HUD, the
 * screen and the bottom menu (their bands are `--game-bar-*` of theme.css, transparent as
 * shipped). The art is the skin asset `scene` (src/skin/art.ts), a route's own one `scene-<route>`;
 * it covers the shell around `--game-scene-position`. Without art: the stock gradient of theme.css
 * (`--mp-bg-*`). The bottom bar row takes no room while the menu is hidden.
 */
const SCENE_CSS = '.mpg-shell{--game-scene-art:var(--kit-asset-scene,none);'
  + 'background:var(--game-scene-art) var(--game-scene-position,50% 50%)/cover no-repeat,var(--mp-shell-background)}'
  + Object.keys(screens).map((route) => `.mpg-shell:has([data-slot=screen] [data-route="${route}"])`
    + `{--game-scene-art:var(--kit-asset-scene-${route},var(--kit-asset-scene,none))}`).join('');

/**
 * Window head of every kit window: the title spans the whole window and stands in its middle,
 * the close button lies over the corner and takes no width from the title row; both sides keep
 * the same room for it (`--game-close-zone`, theme.css; 44px — the kit's 40px button and its
 * offset). A title plate or ribbon of the game skin is therefore centered on the window.
 * `corner-out` (outside the frame) is left as the kit draws it.
 */
const WINDOW_HEAD_CSS = '.dialog>.dialog-head{position:relative;justify-content:center;'
  + 'padding-inline:var(--game-close-zone,44px)}'
  + '.dialog>.dialog-head>[data-skin-slot=title]{flex:0 1 auto;min-width:0;text-align:center;overflow-wrap:anywhere}'
  + '.dialog>.dialog-head>.dialog-close:not([data-close=corner-out]){position:absolute;top:0;right:0;margin:-4px -4px 0 0}'
  + '.dialog>.dialog-head>.dialog-close[data-close=head-left]{left:0;right:auto;margin:-4px 0 0 -4px}';

/**
 * Reward tiles: the kit shows an item's name only as a hover/focus overlay on the tile
 * (`.reward-name`, `position:absolute;inset:0`) on a background from `--kit-reward-tooltip-bg`,
 * which the ManyPlay sheets never set, so the name lay bare over the picture — in the reward
 * window at once, with the mouse still over the tile after the tap that ended the level. The
 * overlay gets its plate back everywhere (shop offers keep the kit's tile); in the reward window the
 * name stands under the picture, always, and the amount under it.
 */
const REWARD_TILE_CSS = ':host{--kit-reward-tooltip-bg:var(--mp-raised);--kit-reward-tooltip-color:var(--mp-text)}'
  + '.reward-window .reward-grid .reward-grid-entry .reward-name,'
  + '.reward-window .reward-grid .reward-grid-entry:is(:hover,:focus) .reward-name{display:block;position:static;'
  + 'inset:auto;order:1;max-width:100%;padding:0;background:none;color:var(--mp-text-2);text-align:center;'
  + 'font-size:12px;line-height:16px}'
  + '.reward-window .reward-grid .reward-grid-entry .reward-amount{order:2}';

/**
 * Sparkles around the reward picture: the kit colors them by tone (`.mp-sparkle--gold path`), but
 * the ManyPlay `sparkle` icon is a black raster crop (`<image>`, no path), so they were black under
 * every skin. The shell draws them as a four-point star in the tone's color (`--mp-gold`,
 * `--mp-violet-text`, `--mp-text` of theme.css); the raster keeps the size.
 */
const SPARKLE_CSS = '.reward-burst .mp-sparkle{line-height:0;clip-path:polygon(50% 0,61% 39%,100% 50%,61% 61%,'
  + '50% 100%,39% 61%,0 50%,39% 39%)}'
  + '.reward-burst .mp-sparkle>*{display:block;visibility:hidden}'
  + '.reward-burst .mp-sparkle--gold{background:var(--mp-gold)}'
  + '.reward-burst .mp-sparkle--violet{background:var(--mp-violet-text)}'
  + '.reward-burst .mp-sparkle--white{background:var(--mp-text)}';

/**
 * Lines of a player card (`shell/windows/player.ts`): a two-column grid, labels left, values
 * right in one column in every size.
 */
const PROFILE_CSS = '[data-part=system-profile]{display:grid;grid-template-columns:minmax(0,1fr) auto;'
  + 'column-gap:16px;row-gap:8px;margin:0}'
  + '[data-part=system-profile]>.row{display:contents}'
  + '[data-part=system-profile] dt{min-width:0;color:var(--mp-text-2);overflow-wrap:anywhere}'
  + '[data-part=system-profile] dd{margin:0;text-align:end;font-weight:600;'
  + 'font-variant-numeric:tabular-nums;white-space:nowrap}';

/**
 * The game's loading screen (the kit `preloader`, boot/start.ts mounts it once the skin is on): the
 * scene of the game under a dim of the page color (`scene` of art.ts; without art the page color
 * alone), the colors of theme.css through stock-colors.ts. The stock ManyPlay mark is not drawn
 * unless the game declares its own `icon-brand-mark` picture.
 */
const PRELOADER_DIM = 'color-mix(in srgb,var(--mp-night) 55%,transparent)';
function preloaderCss(ownMark: boolean): string {
  return `.mp-preloader{background:linear-gradient(${PRELOADER_DIM},${PRELOADER_DIM}),`
    + 'var(--kit-asset-scene,none) var(--game-scene-position,50% 50%)/cover no-repeat,var(--mp-night)}'
    + (ownMark ? '' : '.mp-preloader__brand [data-icon=brand-mark]{display:none}');
}

/** Shell rules of every kit component (the `*` target, before theme.css and `COMMON`). */
const KIT_COMMON_CSS = WINDOW_HEAD_CSS + REWARD_TILE_CSS + SPARKLE_CSS;

/** A skin's `css` entry replaces the parent's sheet of that component: the parent text stays in front. */
function extendCss(base: Skin, component: string, rules: string): string {
  const sheet = base.css[component];
  return `${sheet && 'text' in sheet ? sheet.text : ''}\n${rules}`;
}

/**
 * Per component, after the ManyPlay sheet of it: the stock colors as variables, the shell's CSS,
 * the game's CSS. `*` (every component) and `shell` (the page) carry theme.css; `*` also the
 * raster buttons tinted by kind, when the skin declares their picture (button-tint.ts).
 */
function componentCss(base: Skin, theme: string, own: GameSkin): Record<string, string> {
  const rules: Record<string, string> = { ...STOCK_COLOR_RULES };
  const add = (component: string, css: string): void => { rules[component] = `${rules[component] ?? ''}\n${css}`; };
  add('hud', HUD_CSS); add('bottomMenu', MENU_CSS); add('shell', SCENE_CSS); add('profile', PROFILE_CSS);
  add('preloader', preloaderCss('icon-brand-mark' in own.assets));
  for (const [component, css] of Object.entries(own.css)) add(component, css);
  add('shell', theme);
  return { ...Object.fromEntries(Object.entries(rules).map(([component, css]) =>
    [component, extendCss(base, component, css)])),
  '*': `${KIT_COMMON_CSS}${buttonTintCss(own.assets)}\n${theme}\n${own.common}` };
}

/** The game skin; `theme` is the text of theme.css, `own` the skin of src/skin/ (a test passes its own). */
export function gameSkin(theme: string, own: GameSkin = SKIN): Skin {
  const url = fontsUrl();
  const base = manyplaySkin(url ? { url } : {});
  // Pictures of items and offers (src/skin/art.ts ITEMS, OFFERS) as the skin assets the kit draws.
  const items = itemArt(own.items, own.offers, CURRENCY);
  return defineSkin({ id: 'starter', extends: base, base: assetUrl('skin/'),
    assets: gameAssets(base.assets, { ...own.assets, ...items.files }, items.aliases), fonts: own.fonts, css: componentCss(base, theme, own),
    ...(own.closePosition ? { closePosition: own.closePosition } : {}),
    ...(own.displayTitle ? { displayTitle: own.displayTitle } : {}) });
}

/** theme.css of the build (one request to the game's own files). */
export async function loadTheme(): Promise<string> {
  const response = await fetch(SKIN.theme);
  if (!response.ok) throw new Error(`theme.css ${response.status}`);
  return response.text();
}

/** Installs the game skin; a failed skin keeps the neutral kit look and never stops the game. */
export async function applyGameSkin(): Promise<SkinHandle | undefined> {
  try { return await useSkin(gameSkin(await loadTheme())); } catch (error) {
    console.warn('skin not applied', (error as { message?: unknown })?.message);
    return undefined;
  }
}

/**
 * Layout of the kit shell for this game: navigation is on the screens (and the bottom menu, when
 * the game has one), so the shell's route list (menu toggle, left handle) and the right handle
 * are hidden; the shell's own settings gear is hidden for the game's settings button
 * (`shell/zones.ts`); the home screen shows the title,
 * so the top bar does not. The kit sizes its side columns by the top bar groups, which would push
 * the screen off center: the screen spans the whole middle row and the HUD columns stay overlays.
 */
const SHELL_LAYOUT = ".mpg-shell.mpg-shell [data-part='menu-toggle'],"
  + ".mpg-shell.mpg-shell [data-slot='leftHandle'],.mpg-shell.mpg-shell [data-slot='rightHandle'],"
  + ".mpg-shell.mpg-shell [data-slot='topBar.right']>[data-part='settings'],"
  + ".mpg-shell.mpg-shell [data-slot='topBar.center']>[data-part='title']{display:none}"
  + ".mpg-shell.mpg-shell [data-slot='screen']{grid-column:1 / -1}"
  + ".mpg-shell.mpg-shell [data-slot='screen']>[data-element]{height:100%}"
  // The shell's own window frame (e.g. the profile): the title centered, the close over the corner.
  + '.mpg-shell [data-part=window]>[data-part=window-head]{position:relative;justify-content:center;'
  + 'padding-inline:var(--game-close-zone,44px)}'
  + '.mpg-shell [data-part=window-head]>[data-part=window-title]{min-width:0;text-align:center;overflow-wrap:anywhere}'
  + '.mpg-shell [data-part=window-head]>[data-part=window-close]:not([data-close=corner-out]){position:absolute;top:0;right:0}'
  + '.mpg-shell [data-part=window-head]>[data-part=window-close][data-close=head-left]{left:0;right:auto}'
  // A screen's overlay (`ctx.overlay`, windows/game.ts): the whole viewport, over the top bar and
  // the HUD (z-index 1), under the window layers (3); the dim is the windows' one.
  + '.mpg-shell>[data-part=game-overlay]{position:fixed;inset:0;z-index:2}'
  + '.mpg-shell>[data-part=game-overlay][data-dim]{background:var(--mp-card-overlay)}';

/**
 * The page before the skin: the stock `--mp-*` tokens on `:root` (the page background reads
 * them; theme.css follows with the skin), the `@font-face` rules of the ManyPlay fonts (a shadow
 * root does not load its own faces) and the shell layout, as one constructed stylesheet.
 */
export function adoptDocumentTheme(doc: Document, fonts: string | undefined): void {
  const View = doc.defaultView as (Window & { CSSStyleSheet?: typeof CSSStyleSheet }) | null;
  if (!View?.CSSStyleSheet || !('replaceSync' in View.CSSStyleSheet.prototype)) return;
  const sheet = new View.CSSStyleSheet();
  const host = /:host\{([^}]*)\}/.exec(MANYPLAY_CSS);
  const faces = fonts ? manyplayFontFaces({ url: fonts }) : '';
  sheet.replaceSync(`${faces}\n${host ? `:root{${host[1]}}` : ''}\nhtml,body{background:var(--mp-night);`
    + `color:var(--mp-text);font-family:var(--mp-font-ui)}\n${SHELL_LAYOUT}`);
  doc.adoptedStyleSheets = [...doc.adoptedStyleSheets, sheet];
}

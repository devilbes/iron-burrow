// Raster parts and fonts of the game skin. Files go to assets/skin/ (the build copies them to
// dist/assets/skin/); paths here are relative to it. One file per kind of part, reused by every
// window: a key in ASSETS becomes var(--kit-asset-<key>) in the sheets, kit keys (icon-*,
// bar-*, page-*) are picked up by the kit itself. The kit downloads every declared file before
// the skin turns on, and one broken file cancels the skin: declare only what the sheets use.
// tests/skin-readiness.test.mjs checks files, references and weight (SKIN_WEIGHT_LIMIT, index.ts).
import type { SkinFont } from '@manygamescorp/ui-kit/skin';
import { ICONS } from './icons.js';

export const ASSETS: Readonly<Record<string, string>> = {
  // Icons (icon-<key>): src/skin/icons.ts, written by scripts/skin-icons.mjs — the stock atlas
  // recolored to theme.css and/or the game's own sheet; a single file per icon goes below and
  // wins, e.g. 'icon-coins': 'coins.png'. The gallery lists the stock icons the player still sees.
  ...ICONS,
  // frame: 'frame.webp',              // window frame, 9-slice: COMMON in sheets.ts
  // 'icon-close': 'close.webp',       // close button art (position: index.ts closePosition); the kit
  //                                  // key `close` is a fallback the stock icon-close always beats
  // 'button-base': 'button.webp',    // one grayscale button, 9-slice: every button kind is this
  //                                  // picture under its color (--game-button-* in theme.css)
  // 'button-overlay': 'button-rim.webp', // untinted picture over every button (a rim, rivets)
  // 'bar-track': 'bar-track.webp',    // progress bars, 9-slice by the kit (--kit-bar-slice/-edge in theme.css)
  // 'bar-fill': 'bar-fill.webp',
  // 'page-texture': 'texture.webp',   // page margins around the game (kit key)
  // scene: 'scene.webp',              // the scene: one picture under the whole game, edge to edge,
  //                                  // behind the bars and screens (src/shell/skin.ts); focal point:
  //                                  // --game-scene-position in theme.css
  // 'scene-game': 'scene-game.webp',  // the scene of one route (`scene-<route>`), e.g. gameplay
};

export const FONTS: readonly SkinFont[] = [
  // Two families at most, latin and cyrillic files apart; the family names are the ones the
  // --mp-font-* variables of theme.css use:
  // { family: 'Game Title', url: 'fonts/title-latin.woff2', weight: 800, unicodeRange: 'U+0000-00FF' },
  // { family: 'Game Title', url: 'fonts/title-cyrillic.woff2', weight: 800, unicodeRange: 'U+0400-045F' },
];

// Pictures of the game's items and offers — the one place for them. Every kit window takes them
// from here: the reward window (big picture and tile), the shop (offer card and the items in it),
// daily rewards, the top bar capsule of the currency.
//   key   — inventory catalog id (`itemId` of configs/remote/inventory.catalog/<id>.json) or offer
//           key (configs/remote/iap.offers/<key>.json);
//   value — a file in assets/skin/ (the game's own picture, e.g. 'items/rewind.png'), or
//           `icon:<kit key>`: a kit icon of the skin (stock ManyPlay art, recolored with the skin by
//           scripts/skin-icons.mjs).
// An item without an entry shows the kit's picture of its category (a bag for a booster, coins for
// a currency) — never the game's; tests/skin-readiness.test.mjs lists such items (strict: fails).
// The name under the picture is the catalog `display.titleKey` through localization.
export const ITEMS: Readonly<Record<string, string>> = {
  item_coins: 'icon:coins',
};

export const OFFERS: Readonly<Record<string, string>> = {
  // offer_coins_small: 'offers/coins-small.png',
};

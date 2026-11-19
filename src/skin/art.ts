// Raster parts and fonts of the game skin. Files go to assets/skin/ (the build copies them to
// dist/assets/skin/); paths here are relative to it. One file per kind of part, reused by every
// window: a key in ASSETS becomes var(--kit-asset-<key>) in the sheets, kit keys (icon-*,
// bar-*, page-*) are picked up by the kit itself. The kit downloads every declared file before
// the skin turns on, and one broken file cancels the skin: declare only what the sheets use.
// tests/skin-readiness.test.mjs checks files, references and weight (SKIN_WEIGHT_LIMIT, index.ts).
import type { SkinFont } from '@manygamescorp/ui-kit/skin';
import { ICONS } from './icons.js';

const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';

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
  // The scene (docs/skin/map.json part «Фон сцены»): one picture of the game's art under the whole
  // game, edge to edge, behind the transparent bars and screens (src/shell/skin.ts); focal point —
  // --game-scene-position in theme.css. From assets/game/scene*-2x.webp (2560x1600), 1920x1200 WebP:
  // a 1280x720 window covers it at 1280x800, so this is 1.5x of the largest display.
  scene: 'scene.webp',              // S02 Lobby: the cave with steel scaffolds over the magma
  'scene-map': 'scene-map.webp',    // S03 Stage Map: the tunnel to the Core
  'scene-game': 'scene-game.webp',  // S05 In-level: the dark tunnel wall around the field
};

export const FONTS: readonly SkinFont[] = [
  // Two families (UI_ART_BIBLE Typography, D-ART-03), @fontsource, SIL OFL 1.1; Latin files only —
  // the base language is en; the localization step adds Cyrillic files when a language needs them.
  { family: 'Russo One', url: 'fonts/russo-one-latin-400.woff2', weight: 400, unicodeRange: LATIN },
  { family: 'Exo 2', url: 'fonts/exo-2-latin-500.woff2', weight: 500, unicodeRange: LATIN },
  { family: 'Exo 2', url: 'fonts/exo-2-latin-700.woff2', weight: 700, unicodeRange: LATIN },
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
  // The four boosters of Iron Burrow (GDD 15, CONTRACT §8.3), icon_bst_* of the game's art
  // (assets/ui/items/*-2x.png, 320x320 → 256x256 WebP: shown up to 128px in the reward window).
  bst_bubble: 'items/bst_bubble.webp',
  bst_shockwave: 'items/bst_shockwave.webp',
  bst_fortify: 'items/bst_fortify.webp',
  bst_hull: 'items/bst_hull.webp',
};

export const OFFERS: Readonly<Record<string, string>> = {
  // offer_coins_small: 'offers/coins-small.png',
};

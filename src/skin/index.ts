// The game's own skin over ManyPlay, one place; src/shell/skin.ts consumes it. As shipped it is
// neutral (the template looks stock). Order of work (docs/platform/recipes/custom-window-skin.md):
// theme.css → COMMON → art → COMPONENTS → gallery → readiness.
import type { ClosePosition, DisplayTitleSpec, SkinFont } from '@manygamescorp/ui-kit/skin';
import { ASSETS, FONTS, ITEMS, OFFERS } from './art.js';
import { COMMON, COMPONENTS } from './sheets.js';

export interface GameSkin {
  /** theme.css: every color, radius and font variable (the build minifies it to dist/app/skin/). */
  readonly theme: string;
  readonly assets: Readonly<Record<string, string>>;
  /** Pictures of items (catalog id) and offers (offer key): a file in assets/skin/ or `icon:<kit key>`. */
  readonly items: Readonly<Record<string, string>>;
  readonly offers: Readonly<Record<string, string>>;
  readonly fonts: readonly SkinFont[];
  /** CSS for every kit component (the kit's `*` target). */
  readonly common: string;
  /** Kit component → CSS added after the ManyPlay sheet of it. */
  readonly css: Readonly<Record<string, string>>;
  /** Close button of every kit window (`head-right`, `head-left`, `corner-out`); art: asset `icon-close`. */
  readonly closePosition?: ClosePosition;
  /** Window titles as the kit's volumetric text title (look: `--kit-title-*` in theme.css). */
  readonly displayTitle?: DisplayTitleSpec | true;
}

// The bundled code runs from dist/app/ (scripts/build.mjs), whatever module it came from: URLs from
// import.meta.url are relative to that directory, where the build keeps src/'s CSS on its path.
export const SKIN: GameSkin = { theme: new URL('./skin/theme.css', import.meta.url).href,
  assets: ASSETS, items: ITEMS, offers: OFFERS, fonts: FONTS, common: COMMON, css: COMPONENTS };

/** Most bytes the skin may weigh: theme, sheets, art and fonts (tests/skin-readiness.test.mjs). */
export const SKIN_WEIGHT_LIMIT = 2 * 1024 * 1024;

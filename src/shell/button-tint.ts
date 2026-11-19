/**
 * Raster buttons from one grayscale picture: every button kind is the same 9-slice image
 * (`button-base` of src/skin/art.ts) under that kind's color of theme.css (`--game-button-<kind>`).
 * Off unless the skin declares `button-base`: without it this module adds no rule.
 *
 * Three layers of one button, all the same 9-slice (`--game-button-slice`, `--game-button-edge`):
 * 1. the button's own border image — the grayscale picture: volume and texture;
 * 2. `::before` — the picture's silhouette in the kind's color, blended over the picture
 *    (`--game-button-blend`; `overlay` leaves mid-gray as the pure color, lighter gray lightens,
 *    darker darkens). The silhouette has the picture's own alpha, so nothing shows outside an
 *    irregular outline. Chromium and Safari: the color under the 9-slice mask of the same picture
 *    (`-webkit-mask-box-image`, `mask-border`). Firefox has no 9-slice mask: there the silhouette
 *    is the zero-blur drop shadow of the picture, which stands `FAR` above the button and is cut
 *    off by the clip path (Safari neither paints a picture out of view nor blends a filtered
 *    layer, hence the two ways);
 * 3. `::after` — the optional untinted picture on top (`button-overlay`: a rim, rivets).
 * Hover and press are a brightness and a shift, disabled — no saturation.
 */

/** Button kind → kit selectors that draw it (plates only: text buttons and brand buttons stay as they are). */
export const BUTTON_KINDS: Readonly<Record<string, readonly string[]>> = {
  primary: ['.mp-button--primary', '.std-action--primary', '.dialog :not(td)>button:not([class],[data-variant])'],
  secondary: ['.mp-button--secondary', '.std-action--secondary', '.dialog :not(td)>button[data-variant=ghost]:not([class])'],
  buy: ['.iap-buy'],
  danger: ['.mp-button--critical', '.mp-button--danger'],
};

/** Skin assets of the mechanism (src/skin/art.ts `ASSETS`). */
export const BUTTON_BASE = 'button-base';
export const BUTTON_OVERLAY = 'button-overlay';

/** Browsers with a 9-slice mask (Chromium and Safari: `-webkit-mask-box-image`; `mask-border` where it exists). */
const MASK = '((-webkit-mask-box-image:none) or (mask-border:none))';
/** How far above the button the picture that casts the colored silhouette stands: more than any button is tall. */
const FAR = '512px';
/** Never a tinted plate: text-like and brand buttons of the kit. */
const NEVER = ':not(.mp-button--text,.mp-button--social,.std-action--text)';
/** The stock sheets color a hovered, pressed or selected button by longer selectors: this part outweighs them. */
const OVER = ':not(#stock)';

const image = (key: string, slice: string): string =>
  `var(--kit-asset-${key}) ${slice} fill/var(--game-button-edge)/0 var(--game-button-repeat,stretch)`;

/** Rules of the tinted buttons for every kit component (the `*` target); '' while the skin has no `button-base`. */
export function buttonTintCss(assets: Readonly<Record<string, string>>): string {
  if (!(BUTTON_BASE in assets)) return '';
  const kinds = Object.entries(BUTTON_KINDS);
  const all = `:is(${kinds.flatMap(([, selectors]) => selectors).join(',')})${NEVER}${OVER}`;
  const base = image(BUTTON_BASE, 'var(--game-button-slice)');
  const layer = `content:'';position:absolute;inset:-1px;z-index:-1;pointer-events:none;border:0 solid transparent`;
  return kinds.map(([kind, selectors]) => `:is(${selectors.join(',')}){--game-button-tint:var(--game-button-${kind});`
    + `--game-button-ink:var(--game-button-${kind}-text,var(--game-button-text))}`).join('')
    + `${all}{position:relative;isolation:isolate;background:none;box-shadow:none;border:1px solid transparent;`
    + `border-image:${base};color:var(--game-button-ink);`
    + 'filter:drop-shadow(var(--game-button-shadow,0 0 0 transparent));'
    + 'transition:filter .12s,transform .06s}'
    + `${all}::before{${layer};mix-blend-mode:var(--game-button-blend,overlay)}`
    + `@supports ${MASK}{${all}::before{background:var(--game-button-tint);`
    + `-webkit-mask-box-image:${base};mask-border:${base}}}`
    + `@supports not ${MASK}{${all}::before{top:calc(-1px - ${FAR});bottom:calc(${FAR} - 1px);border-image:${base};`
    + `filter:drop-shadow(0 ${FAR} 0 var(--game-button-tint));clip-path:inset(${FAR} 0 -${FAR} 0)}}`
    + (BUTTON_OVERLAY in assets ? `${all}::after{${layer};`
      + `border-image:${image(BUTTON_OVERLAY, 'var(--game-button-overlay-slice,var(--game-button-slice))')}}` : '')
    + `${all}:not(:disabled,[aria-disabled=true]):hover{background:none;`
    + 'filter:drop-shadow(var(--game-button-shadow,0 0 0 transparent)) brightness(var(--game-button-hover,1.08))}'
    + `${all}:not(:disabled,[aria-disabled=true]):active{transform:translateY(var(--game-button-press,1px));`
    + 'filter:drop-shadow(var(--game-button-shadow,0 0 0 transparent)) brightness(var(--game-button-pressed,.92))}'
    + `${all}:is(:disabled,[aria-disabled=true]){opacity:1;`
    + 'filter:drop-shadow(var(--game-button-shadow,0 0 0 transparent)) grayscale(1)}';
}

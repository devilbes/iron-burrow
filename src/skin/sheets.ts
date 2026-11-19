// Sheets of the game skin, added after the ManyPlay sheets (src/shell/skin.ts).
// COMMON is the kit's `*` target: it goes into every kit component and every own screen, so the
// window frame, header, buttons and close are described here once, never per window.
// COMPONENTS are short additions for single kit components (key = export name: `shopWindow`,
// `dailyReward`, `hud`…), only where COMMON is not enough.
// Rules: colors only as var(--…) of theme.css; hooks only `data-part` and the kit base classes;
// no !important, data-testid, nth-child or pixel-width media queries; window sizes stay the kit's.
// The kit adopts COMMON after a component's own sheet: a COMPONENTS rule that refines a COMMON
// rule needs one more selector part (e.g. `.dialog .dialog-head` over `.dialog-head`).
// Raster buttons are not written here: `button-base` in art.ts turns them on for every button kind.
export const COMMON = '';
// Example (frame from art.ts; --game-frame-* added to theme.css next to the colors):
// .dialog{border:var(--game-frame-width) solid transparent;
//   border-image:var(--kit-asset-frame) var(--game-frame-slice) / var(--game-frame-width)}
// .mp-button--primary{background:var(--mp-violet-deep);border-radius:var(--mp-radius-button)}

export const COMPONENTS: Readonly<Record<string, string>> = {
  // shopWindow: '[data-part=shop-buy]{font-family:var(--mp-font-display)}',
};

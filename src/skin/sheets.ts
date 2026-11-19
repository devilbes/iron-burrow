// Sheets of the game skin, added after the ManyPlay sheets (src/shell/skin.ts).
// COMMON is the kit's `*` target: it goes into every kit component and every own screen, so the
// window frame, header, buttons and close are described here once, never per window.
// COMPONENTS are short additions for single kit components (key = export name: `shopWindow`,
// `dailyReward`, `hud`…), only where COMMON is not enough.
// Rules: colors only as var(--…) of theme.css; hooks only `data-part` and the kit base classes;
// no !important, data-testid, nth-child or pixel-width media queries; window sizes stay the kit's.
// The kit adopts COMMON after a component's own sheet: a COMMON rule that must outweigh a longer
// stock selector (hover, state) carries `:not(#stock)`, the same weight the shell's raster buttons use.
//
// Iron Burrow (docs/skin/map.json `identity`, design/system/UI_ART_BIBLE.md Shape, Light and depth):
// smooth forged steel, enamel and magma glow — no raster, every part is code over the variables of
// theme.css (section 3a). The window is an armour plate with 45° cut corners (clip-path), a forged
// frame in two contours (outline, bevel, an inner glowing teal slit), rivets at its structural
// corners, a nameplate title that rises over the top edge, a square steel close plate, cast buttons
// with a lower face that sinks when pressed, and cut-corner plates for capsules, tiles and cards.
import { BUTTON_KINDS } from '../shell/button-tint.js';

const OVER = ':not(#stock)';
/** Diagonal of a 45° cut, as the distance a gradient runs from the corner to the cut line. */
const DIAG = '.7071';
const v = (name: string): string => `var(--${name})`;

/**
 * Outline of a plate with every corner cut by `cut`, and below it a trapezoid `room` deep that
 * continues the two lower cuts: the plate's own box shadow shows there, shaped like the plate
 * (clip-path clips a shadow, this keeps it).
 */
const platePath = (cut: string, room: string): string => `polygon(${cut} 0,calc(100% - ${cut}) 0,100% ${cut},`
  + `100% calc(100% - ${cut}),calc(100% - ${cut} - ${room}) calc(100% + ${room}),calc(${cut} + ${room}) calc(100% + ${room}),`
  + `0 calc(100% - ${cut}),0 ${cut})`;

// ---- Window: armour plate. The kit's dialog scrolls (overflow:auto), so nothing may stand outside
// it: the plate starts `--game-plate-overhang` below the top of the dialog and the band above it
// stays clear — there the nameplate and the close plate rise over the top edge. The clip path is
// the band, the cut plate and, around it, `--game-shadow-room` for the window's shadow.
const O = v('game-plate-overhang');
const C = v('game-cut-window');
const S = v('game-shadow-room');
const WINDOW_PATH = `polygon(evenodd,0 0,100% 0,100% ${O},calc(100% - ${C}) ${O},`
  + `calc(100% + ${S}) calc(${O} + ${C} + ${S}),calc(100% + ${S}) calc(100% - ${C} - ${S}),`
  + `calc(100% - ${C} - ${S}) calc(100% + ${S}),calc(${C} + ${S}) calc(100% + ${S}),`
  + `calc(0px - ${S}) calc(100% - ${C} - ${S}),calc(0px - ${S}) calc(${O} + ${C} + ${S}),${C} ${O},0 ${O})`;

/** One background layer: image, `position|size` (`|`: calc() of a place may divide); never repeated. */
type Layer = readonly [image: string, place: string];
const layers = (list: readonly Layer[]): string => `background-color:transparent;`
  + `background-image:${list.map(([image]) => image).join(',')};`
  + `background-position:${list.map(([, place]) => place.split('|')[0]).join(',')};`
  + `background-size:${list.map(([, place]) => place.split('|')[1]).join(',')};`
  + `background-repeat:no-repeat;background-origin:border-box;background-clip:border-box`;
const solid = (color: string): string => `linear-gradient(${color},${color})`;

/** The four corners of the plate (below the band): [horizontal side, vertical side, gradient angle]. */
const CORNERS = [['left', 'top', '135deg'], ['right', 'top', '225deg'], ['right', 'bottom', '315deg'], ['left', 'bottom', '45deg']] as const;
const at = (x: string, y: string, dx: string, dy: string): string => `${x} ${dx} ${y} ${y === 'top' ? `calc(${O} + ${dy})` : dy}`;

// Rivets: Ø --game-rivet, centre --game-rivet-offset from the cut along the corner's diagonal.
const RIVET_AT = `calc(${C} / 2 + ${v('game-rivet-offset')} * ${DIAG} - ${v('game-rivet')} / 2)`;
const RIVET = `radial-gradient(circle at 40% 36%,${v('game-frost')} 0 .5px,${v('mp-card-line-strong')} 1.3px 1.7px,`
  + `${v('mp-window-background')} 2.7px,transparent 3px)`;
// The slit: a line --game-slit-inset inside the edge, its corners cut parallel to the plate's.
const SLIT_D = `calc(${C} * ${DIAG} + ${v('game-slit-inset')})`;
const SLIT_END = `calc(${C} + ${v('game-slit-inset')} * .4142)`;
const SLIT_BOX = `calc(${SLIT_END} + 1px)`;
const slitDiag = (angle: string): string => `linear-gradient(${angle},transparent calc(${SLIT_D} - 2.5px),`
  + `${v('game-slit-glow')} calc(${SLIT_D} - 1px),${v('game-slit')} calc(${SLIT_D} - .5px) calc(${SLIT_D} + .5px),`
  + `${v('game-slit-glow')} calc(${SLIT_D} + 1px),transparent calc(${SLIT_D} + 2.5px))`;
const slitLine = (angle: string): string => `linear-gradient(${angle},transparent,${v('game-slit-glow')} 1.5px,`
  + `${v('game-slit')} 2px 3px,${v('game-slit-glow')} 3.5px,transparent)`;
// Outline and bevel along the cut: 1px slate_abyss, then 2px of the bevel (light above, dark below).
const EDGE_D = `calc(${C} * ${DIAG})`;
const edgeDiag = (angle: string, bevel: string): string => `linear-gradient(${angle},transparent ${EDGE_D},`
  + `${v('mp-window-background')} 0 calc(${EDGE_D} + ${v('game-frame-outline')}),${bevel} 0 `
  + `calc(${EDGE_D} + ${v('game-frame-outline')} + ${v('game-frame-bevel')}),transparent 0)`;
const EDGE_BOX = `calc(${C} + 6px)`;
const IN = v('game-frame-outline');
const BEVEL = v('game-frame-bevel');
const LIGHT = v('game-plate-light');
const DARK = v('game-plate-dark');

const WINDOW_LAYERS: Layer[] = [
  ...CORNERS.map(([x, y]) => [RIVET, `${at(x, y, RIVET_AT, RIVET_AT)}|${v('game-rivet')} ${v('game-rivet')}`] as Layer),
  ...CORNERS.map(([x, y, angle]) => [slitDiag(angle), `${at(x, y, '0px', '0px')}|${SLIT_BOX} ${SLIT_BOX}`] as Layer),
  [slitLine('180deg'), `left ${SLIT_END} top calc(${O} + ${v('game-slit-inset')} - 2px)|calc(100% - 2 * ${SLIT_END}) 5px`],
  [slitLine('0deg'), `left ${SLIT_END} bottom calc(${v('game-slit-inset')} - 2px)|calc(100% - 2 * ${SLIT_END}) 5px`],
  [slitLine('90deg'), `left calc(${v('game-slit-inset')} - 2px) top calc(${O} + ${SLIT_END})|5px calc(100% - ${O} - 2 * ${SLIT_END})`],
  [slitLine('270deg'), `right calc(${v('game-slit-inset')} - 2px) top calc(${O} + ${SLIT_END})|5px calc(100% - ${O} - 2 * ${SLIT_END})`],
  ...CORNERS.map(([x, y, angle]) => [edgeDiag(angle, y === 'top' ? LIGHT : DARK), `${at(x, y, '0px', '0px')}|${EDGE_BOX} ${EDGE_BOX}`] as Layer),
  [solid(LIGHT), `left 0 top calc(${O} + ${IN})|100% ${BEVEL}`],
  [solid(DARK), `left 0 bottom ${IN}|100% ${BEVEL}`],
  [solid(LIGHT), `left ${IN} top ${O}|${BEVEL} calc(100% - ${O})`],
  [solid(DARK), `right ${IN} top ${O}|${BEVEL} calc(100% - ${O})`],
  // The steel itself: slate_blue under the light at the top, slate_abyss in the shade at the bottom.
  [`linear-gradient(180deg,${v('mp-card-raised')},${v('mp-card-surface')} 18%,${v('mp-card-background')} 62%,`
    + `${v('mp-window-background')})`, `left ${IN} top calc(${O} + ${IN})|calc(100% - 2 * ${IN}) calc(100% - ${O} - 2 * ${IN})`],
  [solid(v('mp-window-background')), `left 0 top ${O}|100% calc(100% - ${O})`],
];

// ---- Nameplate (id-nameplate): slate_mid plate, 45° ends, a glowing magma line under the text.
const CH = v('game-plate-chamfer');
const PLATE_LAYERS: Layer[] = [
  [`linear-gradient(0deg,${v('game-magma-glow')},transparent)`, `center bottom|calc(100% - 2 * ${CH}) 10px`],
  [solid(v('mp-card-accent')), `center bottom|calc(100% - 2 * ${CH}) ${v('game-plate-line')}`],
  [solid(LIGHT), `center top|calc(100% - 2 * ${CH}) 1px`],
  [`linear-gradient(180deg,${v('mp-card-line-strong')},${v('mp-card-raised')} 40%,${v('mp-card-surface')})`, 'center|100% 100%'],
];
const TITLE_TEXT = `font-family:${v('mp-font-display')};font-weight:${v('kit-title-weight')};`
  + `text-transform:uppercase;letter-spacing:${v('kit-title-tracking')};color:${v('kit-title-top')};`
  + `text-shadow:0 ${v('kit-title-depth')} 0 ${v('mp-window-background')}`;
const PLATE_PATH = `polygon(${CH} 0,calc(100% - ${CH}) 0,100% ${CH},100% calc(100% - ${CH}),`
  + `calc(100% - ${CH}) 100%,${CH} 100%,0 calc(100% - ${CH}),0 ${CH})`;

// ---- Close (id-close-plate): a square steel plate with cut corners, a cross of two frost bars.
const BAR = (angle: string): string => `linear-gradient(${angle},transparent calc(50% - ${v('game-close-bar')} / 2),`
  + `${v('game-frost')} 0 calc(50% + ${v('game-close-bar')} / 2),transparent 0)`;
const CC = v('game-cut-close');
const CLOSE_LAYERS: Layer[] = [
  [BAR('45deg'), `center|${v('game-close-bar-len')} ${v('game-close-bar-len')}`],
  [BAR('135deg'), `center|${v('game-close-bar-len')} ${v('game-close-bar-len')}`],
  [`linear-gradient(180deg,${v('mp-card-line-strong')},${v('mp-card-raised')} 45%,${v('mp-card-surface')})`, 'center|100% 100%'],
];

/** Hooks of one kind of window: the kit's dialog (every kit window) or the shell's own frame (player card). */
interface Frame { readonly win: string; readonly head: string; readonly title: string; readonly close: string }
/** Plate, frame, nameplate and close of a window: one look, written once for both kinds of window. */
function frame({ win, head, title, close }: Frame): string {
  const shut = `${head}>${close}${OVER}`;
  return `${win}{border:0;border-radius:0;padding-top:0;${layers(WINDOW_LAYERS)};`
    + `clip-path:${WINDOW_PATH};box-shadow:${v('game-shadow-modal')}}`
    + `${win}:focus-visible{box-shadow:${v('game-shadow-modal')}}`
    // The head: as tall as the plate; plate and close cast one shadow (filter: their clip paths keep their shape).
    + `${head}{min-height:${v('game-plate-h')};align-items:flex-start;filter:drop-shadow(${v('game-shadow-floating')})}`
    + `${head}>${title}{box-sizing:border-box;display:flex;align-items:center;justify-content:center;`
    + `min-height:${v('game-plate-h')};margin:0;padding:4px ${v('game-plate-pad')} 6px;`
    + `font-size:${v('kit-title-size')};line-height:1.1;${TITLE_TEXT};${layers(PLATE_LAYERS)};clip-path:${PLATE_PATH}}`
    + `${shut}{width:${v('game-close-size')};height:${v('game-close-size')};min-height:0;padding:0;`
    + `top:calc(${O} - ${v('game-close-size')} / 2);right:${v('game-cut')};margin:0;border:0;border-radius:0;color:${v('game-frost')};`
    + `${layers(CLOSE_LAYERS)};clip-path:polygon(${CC} 0,calc(100% - ${CC}) 0,100% ${CC},100% calc(100% - ${CC}),`
    + `calc(100% - ${CC}) 100%,${CC} 100%,0 calc(100% - ${CC}),0 ${CC});`
    + `box-shadow:inset 0 ${BEVEL} 0 ${LIGHT},inset 0 calc(0px - ${BEVEL}) 0 ${DARK}}`
    + `${head}>${close}[data-close=head-left]${OVER}{left:${v('game-cut')};right:auto}`
    + `${shut}>*{visibility:hidden}`
    + `${shut}:hover{box-shadow:inset 0 0 0 1px ${v('mp-card-accent')},inset 0 0 8px ${v('game-magma-glow')}}`
    + `${shut}:focus-visible{outline:2px solid ${v('game-frost')};outline-offset:-4px}`;
}

const WINDOW = frame({ win: '.dialog-backdrop .dialog', head: '.dialog>.dialog-head', title: '[data-skin-slot=title]',
  close: '.dialog-close' })
  // The title of the home screen (src/screens/ui.ts) is the same forged nameplate.
  + `.hero-title${OVER}{border:0;border-radius:0;padding:10px calc(${v('game-plate-pad')} + 4px) 14px;${TITLE_TEXT};`
  + `${layers(PLATE_LAYERS)};clip-path:${PLATE_PATH};filter:drop-shadow(${v('game-shadow-floating')})}`;
/** The shell's own window frame (the player card): the page, not a kit component — the `shell` sheet. */
const SHELL_WINDOW = frame({ win: '.mpg-shell [data-part=window]:not([data-fullscreen])',
  head: '.mpg-shell [data-part=window]>[data-part=window-head]', title: '[data-part=window-title]',
  close: '[data-part=window-close]' });

// ---- Buttons (id-button-face): a cast plate with cut corners, the face lit from above, a 1px
// highlight on the top edge, the lower face in the kind's dark tone; pressed — it sinks and the
// face narrows. Kinds and their selectors are the shell's (src/shell/button-tint.ts BUTTON_KINDS).
const NEVER = ':not(.mp-button--text,.mp-button--social,.std-action--text)';
const KIND = Object.entries(BUTTON_KINDS);
// :where() — no weight beyond `#stock`: raster buttons (src/shell/button-tint.ts, once art.ts declares
// `button-base`) outweigh these rules, and the cut is dropped then: with the picture's variable the
// clip path is invalid (a shape and a url together), i.e. none.
const ANY = `:where(${KIND.flatMap(([, selectors]) => selectors).join(',')})${OVER}:where(${NEVER})`;
const RASTER_OFF = ' var(--kit-asset-button-base,)';
const BC = v('game-cut');
const BUTTON_LAYERS: Layer[] = [
  [solid(v('game-plate-shine')), `center top|calc(100% - 2 * ${BC}) 1px`],
  [solid('var(--_edge)'), `center bottom|100% var(--_face)`],
  ['linear-gradient(180deg,color-mix(in srgb,var(--_tint) 78%,var(--mp-card-fg)),var(--_tint) 55%,'
    + 'color-mix(in srgb,var(--_tint) 88%,var(--game-shade)))', 'center top|100% 100%'],
];
const BUTTONS = KIND.map(([kind, selectors]) => `:where(${selectors.join(',')}){--_tint:var(--game-button-${kind});`
  + `--_edge:var(--game-button-${kind}-edge);--_ink:var(--game-button-${kind}-text,var(--game-button-text))}`).join('')
  + `${ANY}{--_face:${v('game-button-face')};position:relative;border:0;border-radius:0;color:var(--_ink);`
  + `font-family:${v('mp-font-ui')};font-weight:700;letter-spacing:.02em;padding-bottom:var(--_face);`
  + `${layers(BUTTON_LAYERS)};box-shadow:${v('game-shadow-raised')};clip-path:${platePath(BC, '6px')}${RASTER_OFF};`
  + 'transition:transform .06s,filter .12s}'
  + `${ANY}:not(:disabled,[aria-disabled=true]):hover{${layers(BUTTON_LAYERS)};filter:brightness(1.08)}`
  + `.mp-button--primary${OVER}:not(:disabled):hover,.std-action--primary${OVER}:not(:disabled):hover{--_tint:${v('mp-card-accent-hover')}}`
  + `${ANY}:not(:disabled,[aria-disabled=true]):active{--_face:${v('game-button-face-pressed')};`
  + `transform:translateY(calc(${v('game-button-face')} - ${v('game-button-face-pressed')}));filter:brightness(.94)}`
  + `${ANY}:is(:disabled,[aria-disabled=true]){opacity:1;filter:grayscale(1) brightness(.7)}`
  + `${ANY}:focus-visible{outline:2px solid ${v('game-frost')};outline-offset:-5px}`;

// ---- Plates: top bar capsules and HUD tiles, shop cards, daily cells, the mine row of the
// leaderboard, small icon buttons — the same steel with cut corners (UI_ART_BIBLE Shape).
const PLATE_FILL: Layer[] = [
  [solid(LIGHT), `center top|calc(100% - 2 * ${BC}) 1px`],
  [`linear-gradient(180deg,${v('mp-card-raised')},${v('mp-card-surface')} 45%,${v('mp-card-background')})`, 'center|100% 100%'],
];
const PLATES = ['.hud-capsule', '.hud[data-slot=top]>.hud-item', '.hud[data-slot=left] .hud-item', '.hud[data-slot=right] .hud-item',
  '.bottommenu .hud-item', '.iap-pack', '.mp-icon-button'].map((s) => `${s}${OVER}`).join(',');
const PLATE = `:is(${PLATES}){border-radius:0;${layers(PLATE_FILL)};box-shadow:${v('game-shadow-raised')};`
  + `clip-path:${platePath(BC, '6px')}}`
  + `.hud-capsule${OVER} .hud-item${OVER}{background:none;box-shadow:none;clip-path:none}`
  // Badges of HUD tiles: a small orange plate inside the tile (a clipped tile would cut one outside it).
  + `.hud-badge${OVER}{top:3px;right:3px;border-radius:0;background:${v('mp-card-accent')};color:${v('mp-window-background')};`
  + `box-shadow:none;clip-path:polygon(${v('game-cut-badge')} 0,100% 0,100% calc(100% - ${v('game-cut-badge')}),`
  + `calc(100% - ${v('game-cut-badge')}) 100%,0 100%,0 ${v('game-cut-badge')})}`;

// ---- Progress (id-glow-inset): a sunk slate_abyss groove, liquid magma inside it.
const PROGRESS = `progress${OVER}{border:0;border-radius:${v('mp-radius-field')};background:${v('mp-window-background')};`
  + `box-shadow:inset 0 2px 3px ${v('game-shade-strong')}}`
  + `progress${OVER}::-webkit-progress-bar{background:transparent;border-radius:${v('mp-radius-field')}}`
  + `progress${OVER}::-webkit-progress-value{border-radius:${v('mp-radius-field')};`
  + `background:linear-gradient(90deg,${v('mp-card-accent')},${v('mp-card-accent-hover')});box-shadow:0 0 8px ${v('game-magma-glow')}}`
  + `progress${OVER}::-moz-progress-bar{border-radius:${v('mp-radius-field')};`
  + `background:linear-gradient(90deg,${v('mp-card-accent')},${v('mp-card-accent-hover')})}`;

/**
 * Rules for a low screen — a phone turned on its side, where the kit's windows have little height.
 * Not by `[data-orientation=landscape]`: the kit marks a 1280x720 desktop window landscape as well,
 * and there the room is ample. A height in em, not a pixel width (the recipe's rule is about widths).
 */
const LOW = (css: string): string => `@media (orientation:landscape) and (max-height:32em){${css}}`;

// ---- Inside a window only the window has a frame: groups part by room and, where needed, one soft
// underlay without an outline (`UNDERLAY`); item tiles are the picture and the count, no plate or
// outline of their own; item pictures are the main thing of their tile (--game-art-*).
const UNDERLAY = `border:0;border-radius:${v('mp-radius-field')};background:${v('game-underlay')};box-shadow:none`;
const ART = (size: string): string => `width:${size};height:${size};max-width:100%`;
const INNER = `.reward-grid .reward-grid-entry${OVER}{border:0;background:none;box-shadow:none}`
  + `.reward-grid .reward-grid-entry${OVER}:hover{background:${v('game-underlay')}}`
  + `.reward-grid .reward-art${OVER},.reward-grid .reward-art${OVER}>*{${ART(v('game-art-tile'))}}`
  + `.reward-grid .reward-amount${OVER}{font:400 16px/1.2 ${v('mp-font-display')};color:${v('mp-card-fg')}}`;

// ---- Divider (id-divider): a forged 4px slate_mid bar, a rivet at each end, a glowing teal dot in
// the middle; drawn as a block of its own before a section that follows another.
const DIVIDER_LAYERS: Layer[] = [
  [`radial-gradient(circle,${v('mp-card-success')} 0 1.5px,${v('game-slit-glow')} 2px,transparent 4px)`, 'center|10px 10px'],
  [RIVET, `left center|${v('game-rivet')} ${v('game-rivet')}`],
  [RIVET, `right center|${v('game-rivet')} ${v('game-rivet')}`],
  [`linear-gradient(180deg,${v('mp-card-line-strong')},${v('mp-card-raised')} 50%,${v('mp-card-background')})`,
    `center|calc(100% - ${v('game-rivet')}) 4px`],
];
const DIVIDER = `content:'';display:block;flex:none;height:10px;margin:8px 0 10px;${layers(DIVIDER_LAYERS)}`;

// ---- Action rows of every kit window: a button is as wide as its label within limits (never the
// width of the window), centred; the main action on a line of its own, second actions in a row
// under it (design/mockups/results/*: «Next Stage» over «Replay · Map»). The empty ::before is the
// line break between the two (order 1); the main action is order 0, second actions order 2.
const ROW = `.dialog :is(.std-actions,.window-actions)${OVER}`;
const SECOND = ':is(.std-action--secondary,.mp-button--secondary,[data-variant=ghost])';
// The kit pins the row to the bottom of a window that scrolls and fills it with the panel colour — a
// hard dark band across the steel (no fill matches a plate lit from above); the band goes.
const ACTIONS = `${ROW}{flex-flow:row wrap;justify-content:center;align-items:center;column-gap:8px;row-gap:0;background:none}`
  + `${ROW}::before{content:'';order:1;flex:0 0 100%;height:8px}`
  + `${ROW}>button{order:0;flex:0 1 auto;width:auto;min-width:min(${v('game-button-min-primary')},100%);`
  + `max-width:min(${v('game-button-max')},100%);min-height:${v('game-button-h-primary')};`
  + `padding-inline:${v('game-button-pad')};white-space:normal}`
  + `${ROW}>button${SECOND}{order:2;min-width:min(${v('game-button-min')},100%);min-height:48px;margin-bottom:8px}`
  // A low screen: the kit puts the row on one line, and so does the skin — main action first.
  + LOW(`${ROW}::before{display:none}${ROW}>button${SECOND}{margin-bottom:0}`
  + `${ROW}>button{flex:0 1 auto;min-width:min(${v('game-button-min-low')},100%);min-height:48px;margin-bottom:0;`
  + `padding-inline:${v('game-button-pad-tight')}}`)
  // The retry of an error alert, the same; the alert itself is a tinted underlay without an outline.
  + `.std-alert-retry${OVER}{align-self:center;width:auto;min-width:min(${v('game-button-min-primary')},100%);`
  + `max-width:min(${v('game-button-max')},100%);padding-inline:${v('game-button-pad')}}`
  + `.std-alert${OVER}{border:0;box-shadow:none}`
  // The retry of the loading screen's error: the same.
  + `.mp-preloader__copy>.mp-button${OVER}{width:fit-content;min-width:min(${v('game-button-min-primary')},100%);`
  + `max-width:min(${v('game-button-max')},100%);margin-inline:auto;padding-inline:${v('game-button-pad')}}`
  // Price buttons of the shop: the same limits, centred under their pack.
  + `.dialog :is(.iap-row,.iap-slide)>.iap-buy${OVER}{align-self:center;width:auto;min-width:min(${v('game-button-min')},100%);`
  + `max-width:min(${v('game-button-max')},100%);padding-inline:${v('game-button-pad')}}`;

// ---- Loading screen: the game's own sheet draws the brand mark (the Burrower), so the shell's mark
// shows; nothing to hide any more.
export const COMMON = WINDOW + BUTTONS + PLATE + PROGRESS + INNER + ACTIONS;

// ---- Shop (map part «Магазин», sheet): each pack is one calm underlay (no outline, no plate in a
// plate), its picture big at the head; the item tiles inside are bare; sections part by the divider.
const SHOP = `.iap-section>:is(.iap-slide,.iap-row){flex:none;${UNDERLAY};padding:12px 14px}`
  + `.iap-section+.iap-section::before{${DIVIDER}}`
  + `.iap-section>h4{font:400 13px/18px ${v('mp-font-display')};letter-spacing:.08em;text-transform:uppercase;`
  + `color:${v('mp-card-subtle')}}`
  + `.iap-row__title{font:400 17px/22px ${v('mp-font-display')}}`
  + `.iap-slide>[data-part=asset-image]{align-self:center;${ART(v('game-art-offer'))};object-fit:contain;`
  + `filter:drop-shadow(${v('game-shadow-floating')})}`
  + LOW(`.iap-slide>[data-part=asset-image]{${ART(v('game-art-offer-row'))}}`)
  + `.iap-row__icon{${ART(v('game-art-offer-row'))};border:0;background:none;box-shadow:none}`
  + `.iap-row__icon>*{${ART(v('game-art-offer-row'))};object-fit:contain}`;

// ---- Daily rewards (sheet): a cell is a cut plate of the soft underlay, no outline; today glows
// (the magma line of the nameplate under it, a warm fill); the big 7th day is the wide plate of the kit.
const DAY_GLOW: Layer[] = [
  [`linear-gradient(0deg,${v('game-magma-glow')},transparent)`, `center bottom|100% 14px`],
  [solid(v('mp-card-accent')), `center bottom|calc(100% - 2 * ${BC}) ${v('game-plate-line')}`],
  [`linear-gradient(180deg,color-mix(in srgb,${v('mp-card-accent')} 22%,${v('mp-card-surface')}),${v('mp-card-surface')})`, 'center|100% 100%'],
];
const DAILY = `.dialog .daily-day{border:0;border-radius:0;`
  + `background:${v('game-underlay')};box-shadow:none;clip-path:${platePath(BC, '0px')}}`
  + `.dialog .daily-day{height:auto;min-height:${v('game-day-h')}}`
  + LOW(`.dialog .daily-day{min-height:0}`)
  + `.dialog .daily-day[data-state=available]{border:0;${layers(DAY_GLOW)}}`
  + `.daily-day .daily-art,.daily-day .daily-art :is(.mp-art-icon,.mp-glyph,img){${ART(v('game-art-day'))}}`
  + `.dialog .daily-day[data-wide] .daily-art :is(.mp-art-icon,.mp-glyph,img){${ART(v('game-art-tile'))}}`
  + LOW(`.daily-day:not([data-wide]) .daily-art,`
  + `.daily-day:not([data-wide]) .daily-art :is(.mp-art-icon,.mp-glyph,img){${ART(v('game-art-day-low'))}}`)
  + `.daily-amount{font:400 16px/1.2 ${v('mp-font-display')}}`
  + `.daily-day :is(.daily-check,.daily-lock){top:4px;right:4px;border:0;border-radius:0;clip-path:polygon(${v('game-cut-badge')} 0,100% 0,`
  + `100% calc(100% - ${v('game-cut-badge')}),calc(100% - ${v('game-cut-badge')}) 100%,0 100%,0 ${v('game-cut-badge')})}`
  + `.daily-hint{${UNDERLAY}}`;

// ---- Leaderboard (sheet): one underlay under the whole table, rows bare; the podium steps are
// plates without an outline, tinted by their medal (amber, frost steel, brick); avatars are small
// cut plates like every carrier of the game, not circles; the player's own row — a teal underlay.
const AVATAR = `border:0;border-radius:0;clip-path:polygon(25% 0,75% 0,100% 25%,100% 75%,75% 100%,25% 100%,0 75%,0 25%)`;
const LEADERBOARD = `.lbw-table{${UNDERLAY};padding:4px 0}`
  + `.lbw-table>.lbw-row{border:0;border-radius:0;background:none;box-shadow:none}`
  + `.lbw-avatar{${AVATAR};font-family:${v('mp-font-display')};font-weight:400}`
  + `.lbw-pod .lbw-avatar{background:linear-gradient(180deg,${v('mp-card-raised')},${v('mp-card-background')});`
  + `box-shadow:inset 0 0 0 3px var(--_medal);color:${v('mp-card-fg')}}`
  + `.lbw-pod{--_medal:${v('game-medal-3')}}.lbw-pod[data-rank="1"]{--_medal:${v('game-medal-1')}}`
  + `.lbw-pod[data-rank="2"]{--_medal:${v('game-medal-2')}}`
  + `.lbw-step{border:0;border-radius:0;color:${v('mp-window-background')};font-family:${v('mp-font-display')};`
  + `background:linear-gradient(180deg,color-mix(in srgb,var(--_medal) 85%,${v('mp-card-fg')}),var(--_medal) 40%,`
  + `color-mix(in srgb,var(--_medal) 70%,${v('game-shade')}));box-shadow:${v('game-shadow-raised')};`
  + `clip-path:polygon(${BC} 0,calc(100% - ${BC}) 0,100% ${BC},100% 100%,0 100%,0 ${BC})}`
  // The lowest step (20px, rank 3 and every step in landscape): the number fits its height.
  + `.lbw-step{display:grid;place-items:center;line-height:1}.lbw-pod[data-rank="3"] .lbw-step{font-size:14px}`
  + `.lbw-mine{${UNDERLAY};background:${v('game-self')}}`
  + `.lbw-mine .lbw-avatar{background:${v('game-steel-teal')};color:${v('mp-card-fg')}}`
  + `.lbw-mine .lbw-rank{color:${v('mp-card-success')}}`;

// ---- Confirm (recolor): the subject is one underlay, its picture bare and big.
const CONFIRM = `.cf-item{${UNDERLAY}}.cf-tile{background:none;box-shadow:none;border:0}`
  // A landscape phone gives the kit's confirm window little height (even the stock subject runs under
  // its buttons there): the subject goes compact.
  + LOW(`.cf-item{padding-block:4px;min-height:0}.cf-tile,.cf-tile>*{width:40px;height:40px}`)
  + `.cf-price{font-family:${v('mp-font-display')};font-weight:400;color:${v('mp-card-gold')}}`;

// ---- Player card (recolor): the card is one underlay, the avatar a cut plate like the leaderboard's.
const PROFILE = `[data-part=player-card] .card{${UNDERLAY}}[data-part=player-card] .avatar{${AVATAR}}`;

// ---- Reward received (recolor + the shared rules above): the list of what came is one underlay.
const REWARD = `.reward-box{${UNDERLAY}}.reward-burst{border:0;background:none;box-shadow:none}`
  + `.reward-box .reward-grid .reward-art${OVER},.reward-box .reward-grid .reward-art${OVER}>*{${ART(v('game-art-reward'))}}`;

export const COMPONENTS: Readonly<Record<string, string>> = {
  // Not a sheet of its own: the common window of COMMON, for the one frame the shell draws itself.
  shell: SHELL_WINDOW,
  shopWindow: SHOP,
  dailyReward: DAILY,
  leaderboardWindow: LEADERBOARD,
  rewardWindow: REWARD,
  confirm: CONFIRM,
  profile: PROFILE,
};

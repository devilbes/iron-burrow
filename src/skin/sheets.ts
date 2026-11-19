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

const DIALOG = '.dialog-backdrop .dialog';
const HEAD = '.dialog>.dialog-head';
const WINDOW = `${DIALOG}{border:0;border-radius:0;padding-top:0;${layers(WINDOW_LAYERS)};`
  + `clip-path:${WINDOW_PATH};box-shadow:${v('game-shadow-modal')}}`
  + `${DIALOG}:focus-visible{box-shadow:${v('game-shadow-modal')}}`
  // The head: as tall as the plate; plate and close cast one raised shadow (filter: their own clip paths keep their shape).
  + `${HEAD}{min-height:${v('game-plate-h')};align-items:flex-start;filter:drop-shadow(${v('game-shadow-floating')})}`;

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
const TITLE = `${HEAD}>[data-skin-slot=title]{box-sizing:border-box;display:flex;align-items:center;justify-content:center;`
  + `min-height:${v('game-plate-h')};margin:0;padding:4px ${v('game-plate-pad')} 6px;`
  + `font-size:${v('kit-title-size')};line-height:1.1;${TITLE_TEXT};${layers(PLATE_LAYERS)};clip-path:${PLATE_PATH}}`
  // The title of the home screen (src/screens/ui.ts) is the same forged nameplate.
  + `.hero-title${OVER}{border:0;border-radius:0;padding:10px calc(${v('game-plate-pad')} + 4px) 14px;${TITLE_TEXT};`
  + `${layers(PLATE_LAYERS)};clip-path:${PLATE_PATH};filter:drop-shadow(${v('game-shadow-floating')})}`;

// ---- Close (id-close-plate): a square steel plate with cut corners, a cross of two frost bars.
const BAR = (angle: string): string => `linear-gradient(${angle},transparent calc(50% - ${v('game-close-bar')} / 2),`
  + `${v('game-frost')} 0 calc(50% + ${v('game-close-bar')} / 2),transparent 0)`;
const CC = v('game-cut-close');
const CLOSE_LAYERS: Layer[] = [
  [BAR('45deg'), `center|${v('game-close-bar-len')} ${v('game-close-bar-len')}`],
  [BAR('135deg'), `center|${v('game-close-bar-len')} ${v('game-close-bar-len')}`],
  [`linear-gradient(180deg,${v('mp-card-line-strong')},${v('mp-card-raised')} 45%,${v('mp-card-surface')})`, 'center|100% 100%'],
];
const CLOSE_SEL = `${HEAD}>.dialog-close${OVER}`;
const CLOSE = `${CLOSE_SEL}{width:${v('game-close-size')};height:${v('game-close-size')};min-height:0;`
  + `top:calc(${O} - ${v('game-close-size')} / 2);right:${v('game-cut')};margin:0;border:0;border-radius:0;color:${v('game-frost')};`
  + `${layers(CLOSE_LAYERS)};clip-path:polygon(${CC} 0,calc(100% - ${CC}) 0,100% ${CC},100% calc(100% - ${CC}),`
  + `calc(100% - ${CC}) 100%,${CC} 100%,0 calc(100% - ${CC}),0 ${CC});`
  + `box-shadow:inset 0 ${BEVEL} 0 ${LIGHT},inset 0 calc(0px - ${BEVEL}) 0 ${DARK}}`
  + `${HEAD}>.dialog-close[data-close=head-left]${OVER}{left:${v('game-cut')};right:auto}`
  + `${CLOSE_SEL}>*{visibility:hidden}`
  + `${CLOSE_SEL}:hover{box-shadow:inset 0 0 0 1px ${v('mp-card-accent')},inset 0 0 8px ${v('game-magma-glow')}}`
  + `${CLOSE_SEL}:focus-visible{outline:2px solid ${v('game-frost')};outline-offset:-4px}`;

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
  '.bottommenu .hud-item', '.iap-pack', '.daily-day', '.lbw-mine', '.mp-icon-button'].map((s) => `${s}${OVER}`).join(',');
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

export const COMMON = WINDOW + TITLE + CLOSE + BUTTONS + PLATE + PROGRESS;

export const COMPONENTS: Readonly<Record<string, string>> = {
  // shopWindow: '[data-part=shop-buy]{font-family:var(--mp-font-display)}',
};

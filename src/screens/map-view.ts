// S03 Stage Map view: the title plate and Back, the chapter tabs, the ten stage nodes of the
// selected chapter as a snake path (no scroll in any layout) and «Play Stage N» — on the shell's
// `scene-map`, no card of its own, text only on plates and buttons (CONTRACT §4, §6). Node art:
// `node_stage` / `node_finale` (frames locked, open, current, cleared), `node_lock`, `star_small`
// (earned, empty); a missing picture leaves the number on the node. Theme tokens only.
import type { CampaignInfo, Layout, StageInfo } from '../modules/game/index.js';
import type { ScreenContext } from './index.js';
import { gameArt, picture } from './media.js';
import { formatNumber, view, type ViewNode } from './ui.js';

export interface MapState {
  campaign: CampaignInfo | null;
  chapter: 1 | 2 | 3;
  layout: Layout;
  busy: boolean;
}

export interface MapActions {
  back(): void;
  play(): void;
  chapter(n: 1 | 2 | 3, open: boolean): void;
  node(stage: StageInfo): void;
}

/** Frames of the node sprites and of `star_small` (GDD 21 art list). */
const NODE_FRAMES = { locked: 0, open: 1, current: 2, cleared: 3, count: 4 } as const;
const STAR_FRAMES = { earned: 0, empty: 1, count: 2 } as const;
const MAX_STARS = 3;
/** Columns of the snake path by layout: two in portrait (the mockup), five on wide screens. */
const COLUMNS: Readonly<Record<Layout, number>> = { portrait: 2, landscape: 5, desktop: 5 };

/**
 * Frames of the sprite sheets and the columns of the path as rules (the view takes no inline
 * styles): a sheet is the background of its box, sized to all frames side by side; `data-frame`
 * moves it by whole frames (position f / (n - 1) of the strip). A row going back runs right to left.
 */
function spriteCss(): string {
  const rules: string[] = [];
  const sheets = [['.node-art', 'node_stage', NODE_FRAMES.count], ['.node[data-finale] .node-art', 'node_finale', NODE_FRAMES.count],
    ['.node-star', 'star_small', STAR_FRAMES.count]] as const;
  for (const [selector, id, frames] of sheets) {
    rules.push(`${selector}{background-image:url("${gameArt(id)}");background-size:${frames * 100}% 100%;`
      + 'background-repeat:no-repeat;background-position:0 0}');
    for (let frame = 1; frame < frames; frame += 1) {
      rules.push(`${selector}[data-frame="${frame}"]{background-position:${(frame / (frames - 1)) * 100}% 0}`);
    }
  }
  for (const [layout, cols] of Object.entries(COLUMNS)) {
    rules.push(`[data-layout=${layout}] .node-row{grid-template-columns:repeat(${cols},minmax(0,1fr))}`);
  }
  return rules.join('\n');
}

/**
 * Room of the HUD columns over the screen: a 64px tile (src/shell/skin.ts HUD_CSS) and a gap. The
 * head (Back · Campaign) stands between the HUD columns, the tabs under the HUD zone; every plate
 * is the forged steel of the skin (`hero-title` is the nameplate of COMMON).
 */
export const mapCss = (): string => `
.map{--hud-side:calc(64px + var(--mp-gap));--hud-zone:calc(2 * 64px + var(--mp-gap));--node:min(64px,7.5vh);
 --cut:var(--game-cut,8px);display:grid;height:100%;min-height:0;overflow:hidden;gap:.75em;
 grid-template-columns:minmax(0,1fr);grid-template-areas:"head" "tabs" "nodes" "play";
 grid-template-rows:auto auto minmax(0,1fr) auto;padding-bottom:var(--mp-gap)}
.head{grid-area:head;display:flex;align-items:center;justify-content:center;gap:.5em;
 min-height:var(--hud-zone);padding-inline:var(--hud-side);min-width:0}
.head .hero-title{margin:0;font-size:clamp(1.1rem,2.6vw,1.75rem);line-height:1.1;white-space:nowrap;min-width:0}
.back{flex:none;width:48px;min-width:48px;height:48px;min-height:48px;padding:0}
.back>span{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
.btn-art{flex:none;width:var(--mp-icon-m);height:var(--mp-icon-m);object-fit:contain}
.tabs{grid-area:tabs;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.5em;min-width:0}
.tab{position:relative;display:flex;align-items:center;justify-content:center;gap:.35em;min-height:48px;
 padding:.25em .5em;line-height:1.15;font-size:.85rem;white-space:nowrap;
 background:linear-gradient(180deg,var(--mp-card-raised),var(--mp-card-surface) 45%,var(--mp-card-background));
 color:var(--mp-card-fg);border:0;box-shadow:var(--game-shadow-raised);
 clip-path:polygon(var(--cut) 0,calc(100% - var(--cut)) 0,100% var(--cut),100% calc(100% - var(--cut)),
 calc(100% - var(--cut)) 100%,var(--cut) 100%,0 calc(100% - var(--cut)),0 var(--cut))}
.tab .tab-text{display:grid;min-width:0}
.tab .tab-text>span{overflow:hidden;text-overflow:ellipsis}
.tab small{display:none;font-size:.75rem;font-weight:500;color:var(--mp-card-subtle)}
.tab[aria-selected=true]{background:linear-gradient(180deg,color-mix(in srgb,var(--game-steel-teal) 78%,var(--mp-card-fg)),
 var(--game-steel-teal) 55%,color-mix(in srgb,var(--game-steel-teal) 80%,var(--mp-window-background)));
 box-shadow:inset 0 -3px 0 var(--mp-window-background)}
.tab[aria-selected=true] small{color:var(--mp-card-muted)}
.tab[data-state=locked]{color:var(--mp-card-subtle);background:var(--mp-card-background)}
.tab-lock{flex:none;width:20px;height:20px}
.nodes{grid-area:nodes;display:flex;flex-direction:column;justify-content:space-evenly;gap:.25em;min-height:0;
 min-width:0;margin:0;padding:0;list-style:none}
.node-row{display:grid;justify-items:center;align-items:center;gap:.25em;margin:0;padding:0;list-style:none}
.node-row[data-back]{direction:rtl}
.node-row>li{direction:ltr}
.node{display:grid;justify-items:center;gap:.15em;padding:0;border:0;background:none;color:var(--mp-text)}
.node-art{position:relative;display:grid;place-items:center;width:var(--node);height:var(--node);
 font-family:var(--mp-font-display);font-size:calc(var(--node) * .34);line-height:1;color:var(--mp-card-fg);
 text-shadow:0 2px 0 var(--mp-window-background),0 0 4px var(--mp-window-background)}
.node[data-state=locked] .node-art{color:var(--mp-card-subtle)}
.node[data-finale] .node-art{width:calc(var(--node) * 1.2);height:calc(var(--node) * 1.2)}
.node-lock{position:absolute;right:4%;bottom:4%;width:34%;height:34%;object-fit:contain}
.node-stars{display:flex;gap:2px;height:calc(var(--node) * .26)}
.node-star{display:block;width:calc(var(--node) * .26);height:calc(var(--node) * .26)}
.node[data-state=locked]{cursor:default}
.play{grid-area:play;width:100%;max-width:420px;justify-self:center}
[data-layout=landscape].map{--node:min(64px,15vh);padding-inline:var(--hud-side);gap:.5em;
 grid-template-columns:minmax(0,15.5rem) minmax(0,1fr);grid-template-areas:"head nodes" "tabs nodes" "play nodes";
 grid-template-rows:auto minmax(0,1fr) auto}
[data-layout=landscape] .head{min-height:0;padding-inline:0;justify-content:flex-start}
[data-layout=landscape] .head .hero-title{font-size:1.1rem;flex:1}
[data-layout=landscape] .tabs{grid-template-columns:minmax(0,1fr);align-content:center;gap:.4em}
[data-layout=landscape] .tab,[data-layout=desktop] .tab{justify-content:flex-start;padding-inline:.9em}
[data-layout=landscape] .tab small,[data-layout=desktop] .tab small{display:block}
[data-layout=desktop].map{--node:min(104px,11vh);padding-inline:var(--hud-side)}
[data-layout=desktop] .nodes{width:100%;max-width:1000px;justify-self:center}
[data-layout=desktop] .head{min-height:0}
[data-layout=desktop] .tabs{width:100%;max-width:820px;justify-self:center}
[data-layout=desktop] .tab{font-size:1rem;min-height:56px}
${spriteCss()}
`;

function chapterTitle(ctx: ScreenContext, n: 1 | 2 | 3): string {
  return ctx.t(`levels.chapter.c0${n}.title`);
}

function tabs(ctx: ScreenContext, state: MapState, on: MapActions): ViewNode {
  const chapters = state.campaign?.chapters ?? [];
  return view('div', { class: 'tabs', role: 'tablist' }, ...chapters.map((chapter) => {
    const sub = chapter.open ? ctx.t('screen.map.chapter', { n: chapter.n })
      : ctx.t('screen.map.chapter_locked', { n: chapter.first - 1 });
    return view('button', { type: 'button', class: 'tab', role: 'tab', 'data-testid': 'chapter-tab',
      'data-chapter': chapter.n, 'data-state': chapter.open ? 'open' : 'locked', title: sub,
      'aria-selected': chapter.n === state.chapter ? 'true' : 'false', onClick: () => on.chapter(chapter.n, chapter.open) },
    chapter.open ? null : picture(gameArt('node_lock'), '', { class: 'tab-lock', 'aria-hidden': 'true' }),
    view('span', { class: 'tab-text' }, view('span', {}, chapterTitle(ctx, chapter.n)), view('small', {}, sub)));
  }));
}

function nodeView(ctx: ScreenContext, stage: StageInfo, current: boolean, on: MapActions): ViewNode {
  const frame = stage.state === 'locked' ? NODE_FRAMES.locked : stage.state === 'cleared' ? NODE_FRAMES.cleared
    : current ? NODE_FRAMES.current : NODE_FRAMES.open;
  const stars: ViewNode[] = [];
  for (let i = 0; i < MAX_STARS && stage.state !== 'locked'; i += 1) {
    stars.push(view('span', { class: 'node-star', 'aria-hidden': 'true',
      'data-frame': i < stage.stars ? STAR_FRAMES.earned : STAR_FRAMES.empty },
    picture(gameArt('star_small'), '', { class: 'sheet' })));
  }
  return view('li', {},
    view('button', { type: 'button', class: 'node', 'data-testid': 'stage-node', 'data-stage': stage.n,
      'data-state': stage.state, 'data-stars': stage.stars, 'data-finale': stage.finale ? '' : undefined,
      'data-current': current ? '' : undefined, 'aria-label': ctx.t('screen.hud.stage', { n: stage.n }),
      'aria-disabled': stage.state === 'locked' ? 'true' : undefined, onClick: () => on.node(stage) },
    view('span', { class: 'node-art', 'data-frame': frame },
      view('b', {}, formatNumber(stage.n)),
      stage.state === 'locked' ? picture(gameArt('node_lock'), '', { class: 'node-lock', 'aria-hidden': 'true' }) : null),
    view('span', { class: 'node-stars', 'data-dynamic': '' }, ...stars)));
}

/** The stages of the selected chapter along a snake: left to right, then back, row by row. */
function nodes(ctx: ScreenContext, state: MapState, on: MapActions): ViewNode {
  const stages = (state.campaign?.stages ?? []).filter((stage) => stage.chapter === state.chapter);
  const cols = COLUMNS[state.layout];
  const next = state.campaign?.next ?? null;
  const rows: ViewNode[] = [];
  for (let start = 0; start < stages.length; start += cols) {
    const back = (start / cols) % 2 === 1;
    rows.push(view('li', {}, view('ol', { class: 'node-row', 'data-back': back ? '' : undefined },
      ...stages.slice(start, start + cols).map((stage) => nodeView(ctx, stage, stage.n === next, on)))));
  }
  return view('ol', { class: 'nodes', 'data-dynamic': '' }, ...rows);
}

export function renderMap(ctx: ScreenContext, state: MapState, on: MapActions): ViewNode {
  const next = state.campaign?.next ?? null;
  return view('section', { class: 'map', 'data-window': 'stage-map', 'data-layout': state.layout,
    'data-chapter': state.chapter, 'aria-busy': state.campaign ? undefined : 'true' },
  view('div', { class: 'head' },
    view('button', { type: 'button', class: 'mp-button mp-button--secondary back', 'data-testid': 'stagemap-back',
      'aria-label': ctx.t('screen.common.back'), title: ctx.t('screen.common.back'), onClick: () => on.back() },
    picture(gameArt('icon_back'), '', { class: 'btn-art', 'aria-hidden': 'true' }),
    view('span', {}, ctx.t('screen.common.back'))),
    view('h1', { class: 'hero-title' }, ctx.t('screen.map.title'))),
  tabs(ctx, state, on),
  nodes(ctx, state, on),
  view('button', { type: 'button', class: 'mp-button mp-button--primary play', 'data-testid': 'stagemap-play',
    'data-cta': 'primary', disabled: next === null || state.busy ? true : undefined, onClick: () => on.play() },
  view('span', { 'data-dynamic': '' }, next === null ? ctx.t('screen.lobby.play') : ctx.t('screen.map.play', { n: next }))));
}

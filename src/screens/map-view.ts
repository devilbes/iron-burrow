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
/** Columns of the snake path by layout. */
const COLUMNS: Readonly<Record<Layout, number>> = { portrait: 3, landscape: 5, desktop: 5 };

/** Room of the HUD columns over the screen: a 64px tile (src/shell/skin.ts HUD_CSS) and a gap. */
export const MAP_CSS = `
.map{--hud-side:calc(64px + var(--mp-gap));--hud-zone:calc(2 * 64px + var(--mp-gap));--node:min(64px,7.5vh);
 display:grid;height:100%;min-height:0;overflow:hidden;gap:.75em;grid-template-columns:minmax(0,1fr);
 grid-template-areas:"head" "tabs" "nodes" "play";grid-template-rows:auto auto minmax(0,1fr) auto}
.head{grid-area:head;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.5em;
 min-height:var(--hud-zone);padding-inline:var(--hud-side);min-width:0}
.head .title-plate{font-size:clamp(1.25rem,3vw,2rem)}
.back{width:auto}
.btn-art{flex:none;width:var(--mp-icon-m);height:var(--mp-icon-m);object-fit:contain}
.tabs{grid-area:tabs;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.5em;min-width:0}
.tab{display:grid;align-content:center;gap:.1em;min-height:44px;padding:.25em .5em;line-height:1.15;font-size:.85rem}
.tab small{font-size:.75rem;font-weight:500;opacity:.85}
.tab[aria-selected=true]{background:var(--mp-violet-deep);color:var(--mp-on-accent);border-color:transparent}
.tab[data-state=locked]{opacity:.7}
.nodes{grid-area:nodes;display:grid;gap:.25em;min-height:0;align-content:space-evenly;justify-content:space-evenly;
 margin:0;padding:0;list-style:none}
.node{display:grid;justify-items:center;gap:.1em;padding:0;border:0;background:none;color:var(--mp-text)}
.node-art{display:grid;place-items:center;width:var(--node);height:var(--node);background-repeat:no-repeat;
 background-size:400% 100%;font-family:var(--mp-font-display);font-size:calc(var(--node) * .32);
 text-shadow:0 1px 2px var(--mp-night)}
.node-art>*{grid-area:1/1}
.node[data-finale] .node-art{width:calc(var(--node) * 1.25);height:calc(var(--node) * 1.25)}
.node-lock{width:calc(var(--node) * .4);height:calc(var(--node) * .4);align-self:end;justify-self:end}
.node-stars{display:flex;gap:1px;height:calc(var(--node) * .25)}
.node-star{width:calc(var(--node) * .25);height:calc(var(--node) * .25);background-repeat:no-repeat;background-size:200% 100%}
.node[data-state=locked]{cursor:default}
.play{grid-area:play;width:100%;max-width:420px;justify-self:center}
[data-layout=landscape].map{--node:min(64px,15vh);padding-inline:var(--hud-side);gap:.5em;
 grid-template-columns:minmax(0,14rem) minmax(0,1fr);grid-template-areas:"head nodes" "tabs nodes" "play nodes";
 grid-template-rows:auto minmax(0,1fr) auto}
[data-layout=landscape] .head{flex-direction:row;min-height:0;padding-inline:0;justify-content:flex-start}
[data-layout=landscape] .back,[data-layout=desktop] .back{order:-1}
[data-layout=landscape] .head .title-plate{font-size:1.1rem;flex:1;min-width:0}
[data-layout=landscape] .tabs{grid-template-columns:minmax(0,1fr);align-content:center;gap:.35em}
[data-layout=desktop].map{--node:min(96px,10vh);padding-inline:var(--hud-side)}
[data-layout=desktop] .head{flex-direction:row;justify-content:center;min-height:0}
[data-layout=desktop] .tabs{width:100%;max-width:760px;justify-self:center}
[data-layout=desktop] .tab{font-size:1rem}
`;

function sprite(id: string, frame: number, frames: number): string {
  return `background-image:url("${gameArt(id)}");background-position:${(frame / (frames - 1)) * 100}% 0`;
}

function chapterTitle(ctx: ScreenContext, n: 1 | 2 | 3): string {
  return ctx.t(`levels.chapter.c0${n}.title`);
}

function tabs(ctx: ScreenContext, state: MapState, on: MapActions): ViewNode {
  const chapters = state.campaign?.chapters ?? [];
  return view('div', { class: 'tabs', role: 'tablist' }, ...chapters.map((chapter) => {
    const sub = chapter.open ? ctx.t('screen.map.chapter', { n: chapter.n })
      : ctx.t('screen.map.chapter_locked', { n: chapter.first - 1 });
    return view('button', { type: 'button', class: 'mp-button tab', role: 'tab', 'data-testid': 'chapter-tab',
      'data-chapter': chapter.n, 'data-state': chapter.open ? 'open' : 'locked',
      'aria-selected': chapter.n === state.chapter ? 'true' : 'false', onClick: () => on.chapter(chapter.n, chapter.open) },
    view('span', {}, chapterTitle(ctx, chapter.n)), view('small', {}, sub));
  }));
}

function nodeView(ctx: ScreenContext, stage: StageInfo, current: boolean, place: string, on: MapActions): ViewNode {
  const frame = stage.state === 'locked' ? NODE_FRAMES.locked : stage.state === 'cleared' ? NODE_FRAMES.cleared
    : current ? NODE_FRAMES.current : NODE_FRAMES.open;
  const stars: ViewNode[] = [];
  for (let i = 0; i < MAX_STARS && stage.state !== 'locked'; i += 1) {
    stars.push(view('span', { class: 'node-star', 'aria-hidden': 'true',
      style: sprite('star_small', i < stage.stars ? STAR_FRAMES.earned : STAR_FRAMES.empty, STAR_FRAMES.count) }));
  }
  return view('li', { style: place },
    view('button', { type: 'button', class: 'node', 'data-testid': 'stage-node', 'data-stage': stage.n,
      'data-state': stage.state, 'data-stars': stage.stars, 'data-finale': stage.finale ? '' : undefined,
      'data-current': current ? '' : undefined, 'aria-label': ctx.t('screen.hud.stage', { n: stage.n }),
      'aria-disabled': stage.state === 'locked' ? 'true' : undefined, onClick: () => on.node(stage) },
    view('span', { class: 'node-art', style: sprite(stage.finale ? 'node_finale' : 'node_stage', frame, NODE_FRAMES.count) },
      view('b', {}, formatNumber(stage.n)),
      stage.state === 'locked' ? picture(gameArt('node_lock'), '', { class: 'node-lock', 'aria-hidden': 'true' }) : null),
    view('span', { class: 'node-stars', 'data-dynamic': '' }, ...stars)));
}

/** The stages of the selected chapter along a snake: left to right, then back, row by row. */
function nodes(ctx: ScreenContext, state: MapState, on: MapActions): ViewNode {
  const stages = (state.campaign?.stages ?? []).filter((stage) => stage.chapter === state.chapter);
  const cols = COLUMNS[state.layout];
  const next = state.campaign?.next ?? null;
  return view('ol', { class: 'nodes', 'data-dynamic': '', style: `grid-template-columns:repeat(${cols},auto)` },
    ...stages.map((stage, i) => {
      const row = Math.floor(i / cols);
      const col = row % 2 === 0 ? i % cols : cols - 1 - (i % cols);
      return nodeView(ctx, stage, stage.n === next, `grid-row:${row + 1};grid-column:${col + 1}`, on);
    }));
}

export function renderMap(ctx: ScreenContext, state: MapState, on: MapActions): ViewNode {
  const next = state.campaign?.next ?? null;
  return view('section', { class: 'map', 'data-window': 'stage-map', 'data-layout': state.layout,
    'data-chapter': state.chapter, 'aria-busy': state.campaign ? undefined : 'true' },
  view('div', { class: 'head' },
    view('h1', { class: 'plate title-plate' }, ctx.t('screen.map.title')),
    view('button', { type: 'button', class: 'mp-button mp-button--small back', 'data-testid': 'stagemap-back',
      onClick: () => on.back() },
    picture(gameArt('icon_back'), '', { class: 'btn-art', 'aria-hidden': 'true' }),
    view('span', {}, ctx.t('screen.common.back')))),
  tabs(ctx, state, on),
  nodes(ctx, state, on),
  view('button', { type: 'button', class: 'mp-button mp-button--primary play', 'data-testid': 'stagemap-play',
    'data-cta': 'primary', disabled: next === null || state.busy ? true : undefined, onClick: () => on.play() },
  view('span', { 'data-dynamic': '' }, next === null ? ctx.t('screen.lobby.play') : ctx.t('screen.map.play', { n: next }))));
}

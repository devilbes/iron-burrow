// Shared parts of the stage windows (S04, S06–S09, S16, save-retry): the body styles (theme
// tokens only, no frame or dim — those are the kit's), a row of earned stars, a label/number row
// and the Spare Hull id. A body is laid out by the width of its own window (container query):
// one column in a narrow window, two columns when the window is wide enough.
import type { BoosterId, IronBurrow, Match } from '../modules/game/index.js';
import { icon, view, type ViewChild, type ViewNode } from './ui.js';

// The body takes the width the kit gives its window (520px on a landscape phone): it never asks
// for more, so nothing stands out of the frame. Two columns from 400px of body (landscape phone,
// desktop), one in a portrait window. Plates of a window body are sunk grooves of the armour plate
// (inset shadow, cut corners, no light 1px border — LOOK Н-36).
export const WINDOW_CSS = `
:host{height:auto}
.win{display:grid;gap:12px;container-type:inline-size;min-width:0}
.cols{display:grid;gap:12px 20px;grid-template-columns:minmax(0,1fr);align-items:start}
.col{display:grid;gap:8px;min-width:0;align-content:start}
@container (min-width: 400px){.cols{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}
.plate,.groove{margin:0;padding:.5em .9em;border:0;border-radius:0;background:var(--mp-window-background);
 box-shadow:inset 0 2px 3px var(--game-shade-strong),inset 0 -1px 0 var(--game-plate-light);
 clip-path:polygon(var(--game-cut-groove) 0,calc(100% - var(--game-cut-groove)) 0,100% var(--game-cut-groove),
 100% calc(100% - var(--game-cut-groove)),calc(100% - var(--game-cut-groove)) 100%,var(--game-cut-groove) 100%,
 0 calc(100% - var(--game-cut-groove)),0 var(--game-cut-groove))}
.rows{gap:2px}
.rows li{align-items:baseline;min-width:0}
.rows span{min-width:0;overflow-wrap:break-word}
.rows b{flex:none;white-space:nowrap}
.rows li.total{margin-top:4px;padding-top:6px;border-top:1px solid var(--mp-card-line)}
.rows li.total b{font-family:var(--mp-font-display);font-weight:400;font-size:1.25rem;color:var(--mp-card-gold)}
.stars{display:flex;justify-content:center;gap:.25em;min-height:0;color:var(--mp-card-gold)}
.stars:empty{display:none}
.stars-big{gap:12px}
.stars-big .star{display:block;line-height:0}
.stars-big .star:not([data-lit]){filter:grayscale(1) brightness(.45)}
.stars-big svg{width:44px;height:44px}
.section-title{margin:0;font-family:var(--mp-font-ui);font-weight:700;text-align:center;color:var(--mp-text-2)}
.big{font-family:var(--mp-font-display);font-weight:800;font-size:1.5rem;text-align:center;
 font-variant-numeric:tabular-nums}
.accent{margin:0;text-align:center;font-family:var(--mp-font-ui);font-weight:700;color:var(--mp-text)}
.gold{color:var(--mp-card-gold)}
.hint{margin:0;font-size:.9rem;text-align:center;color:var(--mp-text-2)}
.offer{display:grid;gap:.5em;justify-items:center;padding:.6em}
.offer-art{width:96px;height:96px;object-fit:contain}
.card-art{width:128px;height:128px;margin:0 auto;object-fit:contain}
.continue-hint{display:block;font-size:.85rem;font-weight:500}
.mp-button span{display:grid}
.rewards{gap:8px 12px}
.reward-name{max-width:100%;overflow-wrap:normal;word-break:normal;line-height:1.2}
@media (max-height: 480px){.win{gap:8px}.offer-art{width:64px;height:64px}.card-art{width:88px;height:88px}
 .rewards{--reward-size:64px}.reward{width:auto;min-width:var(--reward-size);max-width:104px}
 .stars-big svg{width:32px;height:32px}}
`;

/** The earned stars as skin star icons (`data-stars`); empty (and hidden) at 0. */
export function starsRow(stars: number, testid?: string): ViewNode {
  const icons: ViewChild[] = [];
  for (let i = 0; i < stars; i += 1) icons.push(icon('star', 28));
  return view('div', { class: 'stars', 'data-testid': testid, 'data-stars': stars, 'data-dynamic': '' }, ...icons);
}

/** A row of `.rows`: label on the left, number on the right. */
export function numberRow(label: string, value: string, attrs: Readonly<Record<string, string>> = {}): ViewNode {
  return view('li', attrs, view('span', {}, label), view('b', { 'data-dynamic': '' }, value));
}

/** The stage's three stars as one row (S07): the earned ones lit, the rest unlit steel. */
export function bigStars(stars: number, testid: string): ViewNode {
  const icons: ViewChild[] = [];
  for (let i = 0; i < 3; i += 1) {
    icons.push(view('span', { class: 'star', 'data-lit': i < stars ? '' : undefined }, icon('star', 44)));
  }
  return view('div', { class: 'stars stars-big', role: 'img', 'aria-label': String(stars), 'data-testid': testid,
    'data-stars': stars, 'data-dynamic': '' }, ...icons);
}

/** A block title over a list (rewards, offers). */
export function sectionTitle(text: string): ViewNode {
  return view('p', { class: 'section-title' }, text);
}

/**
 * The Spare Hull id without naming it: the inventory booster that is not on the field HUD of the
 * match (the HUD has the three field boosters); null when it cannot be told.
 */
export function hullOf(game: IronBurrow, match: Match): BoosterId | null {
  try {
    const field = new Set<string>(match.view().hud.boosters.map((booster) => booster.id));
    const ids = Object.keys(game.balances()) as BoosterId[];
    return ids.find((id) => !field.has(id)) ?? null;
  } catch { return null; }
}

/** `fn()` or `fallback` when it throws or rejects (the game API may still be a stub). */
export async function attempt<T>(fn: () => T | Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

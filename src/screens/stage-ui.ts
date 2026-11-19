// Shared parts of the stage windows (S04, S06–S09, S16, save-retry): the body styles (theme
// tokens only, no frame or dim — those are the kit's), a row of earned stars, a label/number row
// and the Spare Hull id. A body is laid out by the width of its own window (container query):
// one column in a narrow window, two columns when the window is wide enough.
import type { BoosterId, IronBurrow, Match } from '../modules/game/index.js';
import { icon, view, type ViewChild, type ViewNode } from './ui.js';

export const WINDOW_CSS = `
:host{height:auto}
.win{display:grid;gap:var(--mp-gap);container-type:inline-size;min-width:0}
.cols{display:grid;gap:var(--mp-gap);grid-template-columns:minmax(0,1fr);align-items:start}
.col{display:grid;gap:var(--mp-gap);min-width:0}
@container (min-width: 520px){.cols{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}
.stars{display:flex;justify-content:center;gap:.25em;min-height:0;color:var(--mp-card-gold)}
.stars:empty{display:none}
.section-title{margin:0;font-family:var(--mp-font-ui);font-weight:700;text-align:center;color:var(--mp-text-2)}
.big{font-family:var(--mp-font-display);font-weight:800;font-size:1.5rem;text-align:center;
 font-variant-numeric:tabular-nums}
.accent{text-align:center;font-family:var(--mp-font-ui);font-weight:700;color:var(--mp-text)}
.hint{margin:0;font-size:.9rem;text-align:center;color:var(--mp-text-2)}
.offer{display:grid;gap:.5em;justify-items:center;padding:.5em;border:1px solid var(--mp-line);
 border-radius:var(--mp-radius-card);background:var(--mp-night)}
.offer-art{width:96px;height:96px;object-fit:contain}
.card-art{width:128px;height:128px;margin:0 auto;object-fit:contain}
.continue-hint{display:block;font-size:.85rem;font-weight:500}
.mp-button span{display:grid}
@media (max-height: 480px){.win{gap:.4em}.offer-art{width:64px;height:64px}.card-art{width:88px;height:88px}
 .rewards{--reward-size:64px}}
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

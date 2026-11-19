// Shared parts of the Canvas field: the grid rules of the contract, the colors of the shape
// fallbacks (read from the theme's `--mp-*` variables — no colors of our own) and sprite helpers
// (frame of a sheet in a row, rotation by direction: the art looks up, CONTRACT §7.1).
import type { Dir, EnemyKind } from '../modules/game/index.js';
import type { ImageBank } from './media.js';

/** The field is 13 × 13 cells (CONTRACT §1, `data-grid=13x13`). */
export const GRID = 13;
/** Position units of the match view: 1 cell = 600 u (CONTRACT §1, MatchView). */
export const UNITS_PER_CELL = 600;
/** Cell size limit of the layout rules (CONTRACT §4: `cell = floor(fieldPx / 13)`, at most 72 px). */
export const MAX_CELL = 72;

export interface Paint {
  readonly floor: string; readonly line: string; readonly brick: string; readonly steel: string;
  readonly lava: string; readonly roots: string; readonly oil: string; readonly core: string;
  readonly player: string; readonly shield: string; readonly bulletPlayer: string; readonly bulletEnemy: string;
  readonly power: string; readonly frost: string; readonly dark: string; readonly text: string;
  readonly blast: string; readonly enemy: Readonly<Record<EnemyKind, string>>;
}

/** Fallback colors from the theme variables visible at `host` (the screen's shadow host). */
export function readPaint(host: Element): Paint {
  let style: CSSStyleDeclaration | null = null;
  try { style = getComputedStyle(host); } catch { style = null; }
  const text = style?.color ?? '';
  const read = (name: string): string => style?.getPropertyValue(name).trim() || text;
  return {
    floor: read('--mp-card-background'), line: read('--mp-card-line'), brick: read('--mp-chest-bronze'),
    steel: read('--mp-card-line-strong'), lava: read('--mp-game-4'), roots: read('--mp-chest-green-deep'),
    oil: read('--mp-window-background'), core: read('--mp-card-gold'), player: read('--mp-card-success'),
    shield: read('--mp-card-info'), bulletPlayer: read('--mp-card-fg'), bulletEnemy: read('--mp-card-error'),
    power: read('--mp-card-gold'), frost: read('--mp-card-info'), dark: read('--mp-window-background'),
    text: read('--mp-card-fg'), blast: read('--mp-card-accent'),
    enemy: { scout: read('--mp-game-2'), grunt: read('--mp-game-5'), gunner: read('--mp-game-1'), brute: read('--mp-game-4') },
  };
}

const TURN: Readonly<Record<Dir, number>> = { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 };

/** Draws frame `frame` of `frames` (a row sheet) into the box, rotated by `dir` around its centre. */
export function sprite(g: CanvasRenderingContext2D, image: HTMLImageElement, frame: number, frames: number,
  box: { x: number; y: number; size: number }, dir: Dir = 'up', alpha = 1): void {
  const w = image.naturalWidth / frames;
  const h = image.naturalHeight;
  g.save();
  g.globalAlpha *= alpha;
  g.translate(box.x + box.size / 2, box.y + box.size / 2);
  g.rotate(TURN[dir]);
  const dh = box.size * Math.min(1, h / w);
  const dw = box.size * Math.min(1, w / h);
  g.drawImage(image, (frame % frames) * w, 0, w, h, -dw / 2, -dh / 2, dw, dh);
  g.restore();
}

/** An image of the bank or null — a short alias for the draw code. */
export function art(bank: ImageBank, id: string): HTMLImageElement | null {
  return bank.get(id);
}

/** Rounded box filled with `color` (the shape fallback of a missing picture). */
export function block(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, round = 0): void {
  g.fillStyle = color;
  g.beginPath();
  if (round > 0 && typeof g.roundRect === 'function') g.roundRect(x, y, w, h, round);
  else g.rect(x, y, w, h);
  g.fill();
}

/** Units → CSS px of the field. */
export const px = (units: number, cell: number): number => (units / UNITS_PER_CELL) * cell;

/** Interpolated position between the previous tick and this one. */
export const lerp = (from: number, to: number, alpha: number): number => from + (to - from) * alpha;

/** Unit vector of a direction (screen axes, y down). */
export function dirVector(dir: Dir): readonly [number, number] {
  return dir === 'up' ? [0, -1] : dir === 'down' ? [0, 1] : dir === 'left' ? [-1, 0] : [1, 0];
}

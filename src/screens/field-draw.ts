// The Canvas field of S05 (`game-field`): floor and tiles of the theme (`tile_<theme>_<kind>`,
// brick and steel by quarters), the Burrow Core and its wall (brick / steel with the fortify
// timer), spawn points with the next Rustbug's silhouette, the power-up (blinks in its last
// seconds), tanks, bullets, roots over the tanks, the freeze tint, effects and the tutorial focus.
// The field itself is transparent around its cells: the shell scene `scene-game` shows around it.
import type { MatchView, TileCode } from '../modules/game/index.js';
import { FieldFx } from './field-fx.js';
import { block, dirVector, GRID, readPaint, sprite, UNITS_PER_CELL, type Paint } from './field-paint.js';
import { drawBullet, drawEnemy, drawPlayer, drawSpawn, type UnitScene } from './field-units.js';
import type { ImageBank } from './media.js';

/** The power-up blinks in its last 3 s (CONTRACT §4 «TTL power-up мигает последние 3 s»). */
const POWERUP_BLINK_MS = 3000;
/** Blink and lava pace, ms per frame (animation). */
const BLINK_MS = 200;
const LAVA_FRAME_MS = 220;
/** Alpha of the next Rustbug's silhouette at its spawn point and of the held-spawn shade. */
const SILHOUETTE_ALPHA = 0.4;
const SHADE_ALPHA = 0.55;

const ART_KIND: Partial<Record<TileCode, string>> = { B: 'brick', S: 'steel', R: 'roots', O: 'oil' };
const QUARTERS = [[1, 0, 0], [2, 1, 0], [4, 0, 1], [8, 1, 1]] as const;

export type FocusTarget = 'brick' | 'core' | 'enemy' | 'powerup' | null;

export class FieldRenderer {
  readonly fx = new FieldFx();
  private cell = 0;
  private paint: Paint;
  private coreDown = false;
  private readonly g: CanvasRenderingContext2D | null;

  constructor(readonly canvas: HTMLCanvasElement, private readonly bank: ImageBank, host: Element) {
    this.g = canvas.getContext('2d');
    this.paint = readPaint(host);
  }

  /** Theme colors again (after a skin change or a new layout). */
  repaint(host: Element): void { this.paint = readPaint(host); }

  /** Size of a cell in CSS px and the device pixel ratio of the backing store. */
  resize(cell: number, dpr: number): void {
    this.cell = cell;
    const side = cell * GRID;
    const backing = Math.round(side * dpr);
    if (this.canvas.width !== backing) this.canvas.width = backing;
    if (this.canvas.height !== backing) this.canvas.height = backing;
    this.canvas.style.width = `${side}px`;
    this.canvas.style.height = `${side}px`;
    this.g?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /** A new match: the core stands again, old effects go. */
  reset(): void { this.coreDown = false; this.fx.clear(); }
  coreDestroyed(): void { this.coreDown = true; }
  /** After a continue the core is restored (CONTRACT §1). */
  coreRestored(): void { this.coreDown = false; }

  draw(view: MatchView, now: number, focus: FocusTarget): void {
    const g = this.g;
    if (!g || this.cell <= 0) return;
    const scene: UnitScene = { g, bank: this.bank, paint: this.paint, cell: this.cell, now };
    g.clearRect(0, 0, this.cell * GRID, this.cell * GRID);
    this.ground(g, view, now);
    this.walls(g, view);
    this.core(g, view);
    this.spawns(scene, view);
    this.powerup(g, view, now);
    for (const enemy of view.enemies) drawEnemy(scene, enemy, view);
    if (view.player) drawPlayer(scene, view.player, view);
    for (const bullet of view.bullets) drawBullet(scene, bullet, view);
    this.roots(g, view);
    if (view.freezeMs > 0) { g.globalAlpha = 0.12; block(g, 0, 0, this.cell * GRID, this.cell * GRID, this.paint.frost); g.globalAlpha = 1; }
    this.fx.draw(g, this.bank, this.paint, this.cell, now);
    if (focus) this.focus(g, view, focus, now);
  }

  private tileArt(view: MatchView, kind: string): HTMLImageElement | null {
    return this.bank.get(`tile_${view.theme}_${kind}`);
  }

  private ground(g: CanvasRenderingContext2D, view: MatchView, now: number): void {
    const floor = this.tileArt(view, 'floor');
    const lava = this.tileArt(view, 'lava');
    const oil = this.tileArt(view, 'oil');
    const c = this.cell;
    for (let i = 0; i < GRID * GRID; i += 1) {
      const col = i % GRID;
      const row = Math.floor(i / GRID);
      const at = { x: col * c, y: row * c, size: c };
      if (floor) sprite(g, floor, (col + row) % 2, 2, at);
      else { g.globalAlpha = 0.85; block(g, at.x, at.y, c, c, this.paint.floor); g.globalAlpha = 1; }
      const tile = view.tiles[i];
      if (tile === 'L') {
        if (lava) sprite(g, lava, Math.floor(now / LAVA_FRAME_MS + i) % 4, 4, at);
        else block(g, at.x, at.y, c, c, this.paint.lava);
      } else if (tile === 'O') {
        if (oil) sprite(g, oil, 0, 1, at);
        else { g.globalAlpha = 0.8; block(g, at.x + c * 0.1, at.y + c * 0.1, c * 0.8, c * 0.8, this.paint.oil, c * 0.3); g.globalAlpha = 1; }
      }
    }
  }

  /** Cells of the core wall: the 8 around the core. */
  private coreCell(view: MatchView): number { return view.tiles.indexOf('C'); }

  private isWall(view: MatchView, index: number): boolean {
    const core = this.coreCell(view);
    if (core < 0 || index === core) return false;
    const dc = Math.abs((index % GRID) - (core % GRID));
    const dr = Math.abs(Math.floor(index / GRID) - Math.floor(core / GRID));
    return dc <= 1 && dr <= 1;
  }

  private walls(g: CanvasRenderingContext2D, view: MatchView): void {
    const c = this.cell;
    const half = c / 2;
    for (let i = 0; i < GRID * GRID; i += 1) {
      const tile = view.tiles[i];
      if (tile !== 'B' && tile !== 'S') continue;
      const mask = view.quarters[i] ?? 15;
      if (mask === 0) continue;
      const wall = this.isWall(view, i);
      const image = wall ? this.bank.get(tile === 'S' ? 'core_wall_steel' : 'core_wall_brick')
        : this.tileArt(view, ART_KIND[tile] ?? 'brick');
      const x = (i % GRID) * c;
      const y = Math.floor(i / GRID) * c;
      for (const [bit, qx, qy] of QUARTERS) {
        if ((mask & bit) === 0) continue;
        if (image) {
          const sw = image.naturalWidth / 2;
          const sh = image.naturalHeight / 2;
          g.drawImage(image, qx * sw, qy * sh, sw, sh, x + qx * half, y + qy * half, half, half);
        } else {
          block(g, x + qx * half + 1, y + qy * half + 1, half - 2, half - 2, tile === 'S' ? this.paint.steel : this.paint.brick);
        }
      }
    }
    if (view.wall.steel && view.wall.totalMs > 0) this.wallTimer(g, view);
  }

  /** The fortify timer: a bar under the core that empties as the steel wall runs out. */
  private wallTimer(g: CanvasRenderingContext2D, view: MatchView): void {
    const core = this.coreCell(view);
    if (core < 0) return;
    const c = this.cell;
    const x = ((core % GRID) - 1) * c;
    const y = Math.floor(core / GRID) * c - c - c * 0.12;
    const share = Math.max(0, Math.min(1, view.wall.leftMs / view.wall.totalMs));
    block(g, x, y, c * 3, c * 0.08, this.paint.dark);
    block(g, x, y, c * 3 * share, c * 0.08, this.paint.shield);
  }

  private core(g: CanvasRenderingContext2D, view: MatchView): void {
    const index = this.coreCell(view);
    if (index < 0) return;
    const c = this.cell;
    const at = { x: (index % GRID) * c, y: Math.floor(index / GRID) * c, size: c };
    const image = this.bank.get('core');
    if (image) { sprite(g, image, this.coreDown ? 1 : 0, 2, at); return; }
    g.fillStyle = this.coreDown ? this.paint.dark : this.paint.core;
    g.beginPath();
    g.moveTo(at.x + c / 2, at.y + c * 0.1);
    g.lineTo(at.x + c * 0.9, at.y + c / 2);
    g.lineTo(at.x + c / 2, at.y + c * 0.9);
    g.lineTo(at.x + c * 0.1, at.y + c / 2);
    g.closePath();
    g.fill();
  }

  private spawns(scene: UnitScene, view: MatchView): void {
    const { g } = scene;
    const c = this.cell;
    for (const spawn of view.spawns) {
      const at = { x: spawn.col * c, y: spawn.row * c, size: c };
      if (view.spawnHeld) { g.globalAlpha = SHADE_ALPHA; block(g, at.x, at.y, c, c, this.paint.dark); g.globalAlpha = 1; }
      if (!spawn.next) continue;
      const sheet = this.bank.get(`enemy_${spawn.next}`);
      if (sheet) sprite(g, sheet, 0, 4, at, 'down', SILHOUETTE_ALPHA);
      else { g.globalAlpha = SILHOUETTE_ALPHA; block(g, at.x + c * 0.15, at.y + c * 0.15, c * 0.7, c * 0.7, this.paint.enemy[spawn.next], c * 0.1); g.globalAlpha = 1; }
      if (spawn.busy) drawSpawn(scene, at);
    }
  }

  private powerup(g: CanvasRenderingContext2D, view: MatchView, now: number): void {
    const pu = view.powerup;
    if (!pu) return;
    if (pu.leftMs <= POWERUP_BLINK_MS && Math.floor(now / BLINK_MS) % 2 === 1) return;
    const c = this.cell;
    const at = { x: pu.col * c, y: pu.row * c, size: c };
    const image = this.bank.get(`pu_${pu.kind}`);
    if (image) { sprite(g, image, 0, 1, at); return; }
    block(g, at.x + c * 0.15, at.y + c * 0.15, c * 0.7, c * 0.7, this.paint.power, c * 0.2);
    g.fillStyle = this.paint.dark;
    g.font = `${Math.round(c * 0.4)}px ${this.paint.font}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(pu.kind.slice(0, 1).toUpperCase(), at.x + c / 2, at.y + c / 2);
  }

  /** Roots hide the tanks under them: drawn over the units. */
  private roots(g: CanvasRenderingContext2D, view: MatchView): void {
    const image = this.tileArt(view, 'roots');
    const c = this.cell;
    view.tiles.forEach((tile, i) => {
      if (tile !== 'R') return;
      const at = { x: (i % GRID) * c, y: Math.floor(i / GRID) * c, size: c };
      if (image) sprite(g, image, 0, 1, at);
      else { g.globalAlpha = 0.85; block(g, at.x, at.y, c, c, this.paint.roots, c * 0.2); g.globalAlpha = 1; }
    });
  }

  /** Pulsing frame around the tutorial target on the field (CONTRACT §11). */
  private focus(g: CanvasRenderingContext2D, view: MatchView, target: Exclude<FocusTarget, null>, now: number): void {
    const cell = this.focusCell(view, target);
    if (!cell) return;
    const c = this.cell;
    const pulse = 0.5 + 0.5 * Math.sin(now / BLINK_MS);
    g.strokeStyle = this.paint.power;
    g.lineWidth = Math.max(2, c * 0.08);
    g.globalAlpha = 0.5 + pulse * 0.5;
    const grow = target === 'core' ? c : 0;
    g.strokeRect(cell[0] * c - grow, cell[1] * c - grow, c + grow * 2, c + grow * 2);
    g.globalAlpha = 1;
  }

  private focusCell(view: MatchView, target: Exclude<FocusTarget, null>): readonly [number, number] | null {
    if (target === 'core') { const i = this.coreCell(view); return i < 0 ? null : [i % GRID, Math.floor(i / GRID)]; }
    if (target === 'powerup') return view.powerup ? [view.powerup.col, view.powerup.row] : null;
    const unit = (x: number, y: number): readonly [number, number] => [Math.round(x / UNITS_PER_CELL), Math.round(y / UNITS_PER_CELL)];
    if (target === 'enemy') { const e = view.enemies[0]; return e ? unit(e.x, e.y) : null; }
    const p = view.player;
    if (!p) return null;
    const [col, row] = unit(p.x, p.y);
    const [dx, dy] = dirVector(p.dir);
    for (let k = 1; k < GRID; k += 1) {
      const x = col + dx * k;
      const y = row + dy * k;
      if (x < 0 || y < 0 || x >= GRID || y >= GRID) return null;
      if (view.tiles[y * GRID + x] === 'B') return [x, y];
    }
    return null;
  }
}

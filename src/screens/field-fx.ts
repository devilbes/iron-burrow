// Short effects of the Canvas field: explosions, hit sparks, the shockwave and the core blast.
// Sheets of CONTRACT §7.2 play once (frames in a row); without the picture a ring grows and fades.
// With Reduce Motion (`settings().motion`) the effects are shorter and the shockwave does not sweep.
import { block, GRID, sprite, type Paint } from './field-paint.js';
import type { ImageBank } from './media.js';

interface FxKind {
  readonly sheet: string;
  readonly frames: number;
  /** Size in cells around the centre. */
  readonly cells: number;
  /** Play time, ms (animation pace of the art). */
  readonly ms: number;
}

export const FX = {
  spark: { sheet: 'fx_hit_spark', frames: 3, cells: 0.6, ms: 180 },
  small: { sheet: 'fx_explosion_small', frames: 4, cells: 1, ms: 300 },
  big: { sheet: 'fx_explosion_big', frames: 6, cells: 2, ms: 600 },
  core: { sheet: 'fx_explosion_core', frames: 8, cells: 3, ms: 1100 },
  shockwave: { sheet: 'fx_shockwave', frames: 1, cells: GRID, ms: 700 },
} as const satisfies Record<string, FxKind>;

export type FxName = keyof typeof FX;

interface Running { readonly kind: FxKind; readonly col: number; readonly row: number; readonly start: number }

/** Effects in play; `add` by cell (fractional cells allowed), `draw` each frame. */
export class FieldFx {
  private list: Running[] = [];
  reduced = false;

  add(name: FxName, col: number, row: number, now: number): void {
    this.list.push({ kind: FX[name], col, row, start: now });
  }

  clear(): void { this.list = []; }

  draw(g: CanvasRenderingContext2D, bank: ImageBank, paint: Paint, cell: number, now: number): void {
    const speed = this.reduced ? 2 : 1;
    this.list = this.list.filter((fx) => now - fx.start < fx.kind.ms / speed);
    for (const fx of this.list) {
      const t = Math.min(1, ((now - fx.start) * speed) / fx.kind.ms);
      const size = fx.kind.cells * cell;
      const cx = (fx.col + 0.5) * cell;
      const cy = (fx.row + 0.5) * cell;
      const image = bank.get(fx.kind.sheet);
      if (fx.kind === FX.shockwave) { this.wave(g, image, paint, cell, t); continue; }
      if (image) {
        const frame = Math.min(fx.kind.frames - 1, Math.floor(t * fx.kind.frames));
        sprite(g, image, frame, fx.kind.frames, { x: cx - size / 2, y: cy - size / 2, size });
        continue;
      }
      g.globalAlpha = 1 - t;
      g.fillStyle = paint.blast;
      g.beginPath();
      g.arc(cx, cy, (size / 2) * (0.4 + t * 0.6), 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;
    }
  }

  /** The shockwave over the whole field: the picture scaled up and fading, else a flash. */
  private wave(g: CanvasRenderingContext2D, image: HTMLImageElement | null, paint: Paint, cell: number, t: number): void {
    const field = cell * GRID;
    g.globalAlpha = 1 - t;
    if (image && !this.reduced) {
      const size = field * (0.3 + t * 0.9);
      g.drawImage(image, (field - size) / 2, (field - size) / 2, size, size);
    } else {
      g.globalAlpha = (1 - t) * 0.4;
      block(g, 0, 0, field, field, paint.text);
    }
    g.globalAlpha = 1;
  }
}

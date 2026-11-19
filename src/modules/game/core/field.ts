// The field (GDD 10 §3–4): cells with their type and 2×2 quarters with their material, in
// integer units (1 cell = `unit`, 1 quarter = unit/2). Tile collision of tanks and bullets.
import type { Tunables } from './config.js';
import { CELL, MAT, type StageDef } from './stage.js';

export interface Field {
  readonly cells: number;
  readonly unit: number;
  readonly q: number;
  /** Quarters per side (2 × cells). */
  readonly qs: number;
  /** Cell types, row-major, CELL.*. */
  readonly cell: Uint8Array;
  /** Quarter materials, row-major over qs × qs, MAT.*. */
  readonly mat: Uint8Array;
  readonly core: readonly [number, number];
  /** The cells of the Core wall (GDD 10 D-10-09). */
  readonly wall: readonly (readonly [number, number])[];
}

const CODE: Record<string, number> = { '.': CELL.empty, B: CELL.empty, S: CELL.empty, L: CELL.lava, R: CELL.roots, O: CELL.oil, C: CELL.core };

/** Core wall: the 3×3 block around the Core cell, rows up to it, inside the field, minus the Core. */
export function coreWall(core: readonly [number, number], cells: number): [number, number][] {
  const [cx, cy] = core;
  const out: [number, number][] = [];
  for (let row = cy - 2; row <= cy; row++) {
    for (let col = cx - 1; col <= cx + 1; col++) {
      if (col === cx && row === cy) continue;
      if (col >= 0 && row >= 0 && col < cells && row < cells) out.push([col, row]);
    }
  }
  return out;
}

export function createField(stage: StageDef, tun: Tunables): Field {
  const cells = tun.cells;
  const qs = cells * 2;
  const cell = new Uint8Array(cells * cells);
  const mat = new Uint8Array(qs * qs);
  for (let row = 0; row < cells; row++) {
    const line = stage.grid[row] as string;
    for (let col = 0; col < cells; col++) {
      const code = line[col] as string;
      cell[row * cells + col] = CODE[code] ?? CELL.empty;
      const material = code === 'B' ? MAT.brick : code === 'S' ? MAT.steel : MAT.none;
      if (material === MAT.none) continue;
      const mask = stage.quarters.get(`${col},${row}`) ?? 15;
      for (let bit = 0; bit < 4; bit++) {
        if (!(mask & (1 << bit))) continue;
        mat[(row * 2 + (bit >> 1)) * qs + col * 2 + (bit & 1)] = material;
      }
    }
  }
  return { cells, unit: tun.unit, q: tun.unit / 2, qs, cell, mat, core: tun.core, wall: coreWall(tun.core, cells) };
}

export const cellAt = (f: Field, col: number, row: number): number =>
  col < 0 || row < 0 || col >= f.cells || row >= f.cells ? -1 : (f.cell[row * f.cells + col] as number);

export const matAt = (f: Field, qx: number, qy: number): number =>
  qx < 0 || qy < 0 || qx >= f.qs || qy >= f.qs ? -1 : (f.mat[qy * f.qs + qx] as number);

/** A quarter a tank cannot enter: edge, brick/steel, lava or Core cell. */
export function tankBlocked(f: Field, qx: number, qy: number): boolean {
  const m = matAt(f, qx, qy);
  if (m !== MAT.none) return true;
  const c = f.cell[(qy >> 1) * f.cells + (qx >> 1)];
  return c === CELL.lava || c === CELL.core;
}

/** A tank AABB at (x, y) of `size` overlaps something solid. */
export function rectBlocked(f: Field, x: number, y: number, size: number): boolean {
  if (x < 0 || y < 0 || x + size > f.cells * f.unit || y + size > f.cells * f.unit) return true;
  const q = f.q;
  for (let qy = Math.floor(y / q); qy <= Math.floor((y + size - 1) / q); qy++) {
    for (let qx = Math.floor(x / q); qx <= Math.floor((x + size - 1) / q); qx++) if (tankBlocked(f, qx, qy)) return true;
  }
  return false;
}

export const DX = [0, 1, 0, -1] as const;
export const DY = [-1, 0, 1, 0] as const;
export type Dir = 0 | 1 | 2 | 3;

/**
 * How far (0…dist) a tank at (x, y) can move in `dir` before touching something solid (tiles
 * and the field edge only). The swept quarters are scanned row by row from the front edge.
 */
export function sweep(f: Field, x: number, y: number, size: number, dir: Dir, dist: number): number {
  const q = f.q;
  const max = f.cells * f.unit;
  if (dir === 1 || dir === 3) {
    const lead = dir === 1 ? x + size : x;
    const qy0 = Math.floor(y / q);
    const qy1 = Math.floor((y + size - 1) / q);
    const blockedCol = (qx: number): boolean => { for (let qy = qy0; qy <= qy1; qy++) if (tankBlocked(f, qx, qy)) return true; return false; };
    if (dir === 1) {
      const end = Math.min(lead + dist, max);
      for (let qx = Math.floor(lead / q); qx * q < end; qx++) if (qx * q >= lead && blockedCol(qx)) return qx * q - lead;
      return end - lead;
    }
    const end = Math.max(lead - dist, 0);
    for (let qx = Math.ceil(lead / q) - 1; (qx + 1) * q > end; qx--) if ((qx + 1) * q <= lead && blockedCol(qx)) return lead - (qx + 1) * q;
    return lead - end;
  }
  const lead = dir === 2 ? y + size : y;
  const qx0 = Math.floor(x / q);
  const qx1 = Math.floor((x + size - 1) / q);
  const blockedRow = (qy: number): boolean => { for (let qx = qx0; qx <= qx1; qx++) if (tankBlocked(f, qx, qy)) return true; return false; };
  if (dir === 2) {
    const end = Math.min(lead + dist, max);
    for (let qy = Math.floor(lead / q); qy * q < end; qy++) if (qy * q >= lead && blockedRow(qy)) return qy * q - lead;
    return end - lead;
  }
  const end = Math.max(lead - dist, 0);
  for (let qy = Math.ceil(lead / q) - 1; (qy + 1) * q > end; qy--) if ((qy + 1) * q <= lead && blockedRow(qy)) return lead - (qy + 1) * q;
  return lead - end;
}

/** The solid quarters a bullet box (x, y, size) overlaps, nearest row (along `dir`) first. */
export function bulletTileHit(f: Field, x: number, y: number, size: number, dir: Dir): { qx0: number; qy0: number; row: number } | null {
  const q = f.q;
  const qx0 = Math.floor(x / q);
  const qx1 = Math.floor((x + size - 1) / q);
  const qy0 = Math.floor(y / q);
  const qy1 = Math.floor((y + size - 1) / q);
  const vertical = dir === 0 || dir === 2;
  // Rows across the flight, from the one met first.
  const lines: number[] = [];
  if (vertical) for (let qy = qy0; qy <= qy1; qy++) lines.push(qy);
  else for (let qx = qx0; qx <= qx1; qx++) lines.push(qx);
  if (dir === 0 || dir === 3) lines.reverse();
  for (const line of lines) {
    if (vertical) { for (let qx = qx0; qx <= qx1; qx++) if (matAt(f, qx, line) > 0) return { qx0: qx, qy0: line, row: line }; }
    else for (let qy = qy0; qy <= qy1; qy++) if (matAt(f, line, qy) > 0) return { qx0: line, qy0: qy, row: line };
  }
  return null;
}

/**
 * Damage of a bullet hit in quarter row/column `line` (GDD 10 §4): a strip 1 cell wide across
 * the flight centred on the bullet axis; quarters covered by at least half break if the bullet
 * can break their material. Returns the broken quarters.
 */
export function damageStrip(f: Field, axis: number, line: number, vertical: boolean, breaksSteel: boolean): [number, number][] {
  const q = f.q;
  const from = axis - q;
  const to = axis + q;
  const broken: [number, number][] = [];
  for (let k = Math.floor(from / q); k * q < to; k++) {
    const covered = Math.min(to, (k + 1) * q) - Math.max(from, k * q);
    if (covered * 2 < q) continue;
    const qx = vertical ? k : line;
    const qy = vertical ? line : k;
    const m = matAt(f, qx, qy);
    if (m === MAT.brick || (m === MAT.steel && breaksSteel)) {
      f.mat[qy * f.qs + qx] = MAT.none;
      broken.push([qx, qy]);
    }
  }
  return broken;
}

/** The cell (col, row) of a point. */
export const cellOf = (f: Field, x: number, y: number): [number, number] => [Math.floor(x / f.unit), Math.floor(y / f.unit)];

// Tanks and bullets of the Canvas field: the player (hull frames + turret L0–L3, shield bubble),
// Rustbugs (move / flash frames of a carrier, brute damage overlay, frost while frozen) and the
// bullets; every picture falls back to a theme-colored shape. Positions interpolate between ticks.
import type { BulletView, EnemyView, MatchView, PlayerView } from '../modules/game/index.js';
import type { ImageBank } from './media.js';
import { block, dirVector, lerp, px, sprite, type Paint } from './field-paint.js';

/** Ticks per tread / flash frame of a tank sheet (animation pace of the art, not a game number). */
const TREAD_TICKS = 6;
/** Bullet box as a part of a cell (the bullet is a small square, its x/y the top-left corner). */
const BULLET_CELLS = 0.25;
/** Shield bubble flicker while it is about to drop, ms per frame (animation pace). */
const BUBBLE_FRAME_MS = 120;

export interface UnitScene {
  readonly g: CanvasRenderingContext2D;
  readonly bank: ImageBank;
  readonly paint: Paint;
  readonly cell: number;
  readonly now: number;
}

function box(scene: UnitScene, tank: { x: number; y: number; px: number; py: number }, alpha: number) {
  return { x: px(lerp(tank.px, tank.x, alpha), scene.cell), y: px(lerp(tank.py, tank.y, alpha), scene.cell), size: scene.cell };
}

/** A tank shape: body and a barrel towards `dir` (fallback of the art). */
function tankShape(scene: UnitScene, at: { x: number; y: number; size: number }, color: string, dir: PlayerView['dir']): void {
  const { g, paint } = scene;
  const inset = at.size * 0.1;
  block(g, at.x + inset, at.y + inset, at.size - inset * 2, at.size - inset * 2, color, at.size * 0.15);
  const [dx, dy] = dirVector(dir);
  const cx = at.x + at.size / 2;
  const cy = at.y + at.size / 2;
  g.strokeStyle = paint.dark;
  g.lineWidth = Math.max(2, at.size * 0.16);
  g.beginPath();
  g.moveTo(cx, cy);
  g.lineTo(cx + dx * at.size * 0.5, cy + dy * at.size * 0.5);
  g.stroke();
}

/** A soft dark ellipse under a tank: units stand off the floor and the walls. */
function groundShadow(scene: UnitScene, at: { x: number; y: number; size: number }): void {
  const { g } = scene;
  g.save();
  g.globalAlpha = 0.45;
  g.fillStyle = scene.paint.dark;
  g.beginPath();
  g.ellipse(at.x + at.size / 2, at.y + at.size * 0.56, at.size * 0.46, at.size * 0.42, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

export function drawPlayer(scene: UnitScene, player: PlayerView, view: MatchView): void {
  const at = box(scene, player, view.alpha);
  const { g, bank } = scene;
  if (player.spawning) { drawSpawn(scene, at); return; }
  const hull = bank.get('player_hull');
  const frame = player.moving ? Math.floor(view.tick / TREAD_TICKS) % 2 : 0;
  // The friendly teal ring under the player: the one tank on the field that is yours.
  g.save();
  g.strokeStyle = scene.paint.shield;
  g.globalAlpha = 0.55;
  g.lineWidth = Math.max(1.5, at.size * 0.05);
  g.beginPath();
  g.ellipse(at.x + at.size / 2, at.y + at.size / 2, at.size * 0.52, at.size * 0.52, 0, 0, Math.PI * 2);
  g.stroke();
  g.restore();
  groundShadow(scene, at);
  // The hull art is the whole tank (drill turret included); the gun level is the stars of the HUD.
  if (hull) sprite(g, hull, frame, 2, at, player.dir);
  else tankShape(scene, at, scene.paint.player, player.dir);
  if (player.gun > 0) gunMarks(scene, at, player.gun);
  if (player.shieldMs > 0) drawShield(scene, at);
}

/** Gun level on the tank: one small gold star mark per level along its lower edge. */
function gunMarks(scene: UnitScene, at: { x: number; y: number; size: number }, gun: number): void {
  const r = Math.max(1.5, at.size * 0.06);
  const { g } = scene;
  for (let i = 0; i < gun; i += 1) {
    const cx = at.x + at.size * (0.5 + (i - (gun - 1) / 2) * 0.18);
    const cy = at.y + at.size * 0.97;
    g.fillStyle = scene.paint.dark;
    g.beginPath();
    g.arc(cx, cy, r + 1, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = scene.paint.power;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
  }
}

function drawShield(scene: UnitScene, at: { x: number; y: number; size: number }): void {
  const bubble = scene.bank.get('fx_bubble');
  const frame = Math.floor(scene.now / BUBBLE_FRAME_MS) % 2;
  const grow = at.size * 0.15;
  const outer = { x: at.x - grow, y: at.y - grow, size: at.size + grow * 2 };
  if (bubble) { sprite(scene.g, bubble, frame, 2, outer); return; }
  scene.g.strokeStyle = scene.paint.shield;
  scene.g.lineWidth = Math.max(2, at.size * 0.06);
  scene.g.globalAlpha = frame === 0 ? 0.9 : 0.6;
  scene.g.beginPath();
  scene.g.arc(at.x + at.size / 2, at.y + at.size / 2, outer.size / 2, 0, Math.PI * 2);
  scene.g.stroke();
  scene.g.globalAlpha = 1;
}

/** The spawn star of a tank appearing (`fx_spawn` sheet, else a pulsing ring). */
export function drawSpawn(scene: UnitScene, at: { x: number; y: number; size: number }, alpha = 1): void {
  const fx = scene.bank.get('fx_spawn');
  const frame = Math.floor(scene.now / (BUBBLE_FRAME_MS / 2)) % 6;
  if (fx) { sprite(scene.g, fx, frame, 6, at, 'up', alpha); return; }
  const g = scene.g;
  g.globalAlpha = alpha;
  g.strokeStyle = scene.paint.text;
  g.lineWidth = Math.max(1, at.size * 0.05);
  g.beginPath();
  g.arc(at.x + at.size / 2, at.y + at.size / 2, (at.size / 2) * ((frame + 1) / 6), 0, Math.PI * 2);
  g.stroke();
  g.globalAlpha = 1;
}

export function drawEnemy(scene: UnitScene, enemy: EnemyView, view: MatchView): void {
  const at = box(scene, enemy, view.alpha);
  if (enemy.spawning) { drawSpawn(scene, at); return; }
  const { g, bank, paint } = scene;
  groundShadow(scene, at);
  const sheet = bank.get(`enemy_${enemy.kind}`);
  const step = Math.floor(view.tick / TREAD_TICKS) % 2;
  const flash = enemy.carrier && Math.floor(view.tick / (TREAD_TICKS * 2)) % 2 === 1;
  const frame = (flash ? 2 : 0) + (enemy.moving && !enemy.frozen ? step : 0);
  if (sheet) sprite(g, sheet, frame, 4, at, enemy.dir);
  else tankShape(scene, at, flash ? paint.text : paint.enemy[enemy.kind], enemy.dir);
  if (enemy.kind === 'brute') bruteDamage(scene, at, enemy);
  if (enemy.frozen) frost(scene, at);
}

/** Cracks of a brute by its HP: hp3, hp2, hp1 frames; none at full HP. */
function bruteDamage(scene: UnitScene, at: { x: number; y: number; size: number }, enemy: EnemyView): void {
  const damage = scene.bank.get('enemy_brute_damage');
  if (!damage || enemy.hp > 3 || enemy.hp < 1) return;
  sprite(scene.g, damage, 3 - enemy.hp, 3, at, enemy.dir);
}

function frost(scene: UnitScene, at: { x: number; y: number; size: number }): void {
  const image = scene.bank.get('fx_frost');
  if (image) { sprite(scene.g, image, 0, 1, at); return; }
  scene.g.globalAlpha = 0.35;
  block(scene.g, at.x, at.y, at.size, at.size, scene.paint.frost, at.size * 0.15);
  scene.g.globalAlpha = 1;
}

export function drawBullet(scene: UnitScene, bullet: BulletView, view: MatchView): void {
  const size = scene.cell * BULLET_CELLS;
  const x = px(lerp(bullet.px, bullet.x, view.alpha), scene.cell);
  const y = px(lerp(bullet.py, bullet.y, view.alpha), scene.cell);
  const image = scene.bank.get(bullet.owner === 'player' ? 'bullet_player' : 'bullet_enemy');
  const frame = Math.floor(view.tick / 2) % 2;
  if (image) { sprite(scene.g, image, frame, 2, { x: x - size / 2, y: y - size / 2, size: size * 2 }, bullet.dir); return; }
  const color = bullet.owner === 'player' ? scene.paint.bulletPlayer : scene.paint.bulletEnemy;
  const r = bullet.heavy ? size * 0.6 : size * 0.45;
  scene.g.fillStyle = color;
  scene.g.beginPath();
  scene.g.arc(x + size / 2, y + size / 2, r, 0, Math.PI * 2);
  scene.g.fill();
}

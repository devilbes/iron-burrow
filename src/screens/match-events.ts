// What the screen does on the events of a frame (CONTRACT §7.4): sound, haptics, field effects
// with their `data-fx-ack`, and toasts. Texts are whole keys of `screen.toast.*` / `screen.hud.*`.
import type { FieldBooster, IronBurrow, MatchEvent, MatchView, PowerUpKind } from '../modules/game/index.js';
import type { Sound } from './audio.js';
import type { FieldRenderer } from './field-draw.js';
import { GRID, UNITS_PER_CELL } from './field-paint.js';
import type { ScreenContext } from './index.js';
import type { HudLive } from './match-live.js';

export interface EventScene {
  readonly ctx: ScreenContext;
  readonly game: IronBurrow;
  readonly sound: Sound;
  readonly field: FieldRenderer;
  readonly live: HudLive;
  readonly now: number;
  /** The view before this frame's ticks (where the player was when it blew up). */
  readonly before: MatchView | null;
  /** The booster hint plate (S15). */
  hint(): void;
  /** The tutorial step changed: render the plate again. */
  tutorial(): void;
}

function pickupToast(ctx: ScreenContext, kind: PowerUpKind, gunUp: boolean): string | null {
  switch (kind) {
    case 'star': return gunUp ? null : ctx.t('screen.toast.star_max');
    case 'bubble': return ctx.t('screen.toast.bubble');
    case 'rebar': return ctx.t('screen.toast.rebar');
    case 'quake': return ctx.t('screen.toast.quake');
    case 'freeze': return ctx.t('screen.toast.freeze');
    default: return ctx.t('screen.toast.hull');
  }
}

function boosterToast(ctx: ScreenContext, id: string): string | null {
  if (id === 'bst_bubble') return ctx.t('screen.toast.bubble');
  if (id === 'bst_shockwave') return ctx.t('screen.toast.shockwave');
  if (id === 'bst_fortify') return ctx.t('screen.toast.fortify');
  return id === 'bst_hull' ? ctx.t('screen.toast.hull') : null;
}

/** Top gun level: the turret goes L0–L3 (CONTRACT §1). */
const MAX_GUN = 3;

const short = (id: FieldBooster | string): string => id.replace(/^bst_/, '');

/** Cell of the player before the frame (fx of its death), centre of the field when unknown. */
function playerCell(scene: EventScene): [number, number] {
  const p = scene.before?.player;
  if (!p) return [(GRID - 1) / 2, GRID - 1];
  return [p.x / UNITS_PER_CELL, p.y / UNITS_PER_CELL];
}

function coreCell(scene: EventScene): [number, number] {
  const index = scene.before?.tiles.indexOf('C') ?? -1;
  return index < 0 ? [(GRID - 1) / 2, GRID - 1] : [index % GRID, Math.floor(index / GRID)];
}

function combat(scene: EventScene, e: MatchEvent): boolean {
  const { sound, field, live, now } = scene;
  switch (e.type) {
    case 'shot':
      sound.sfx(e.owner === 'enemy' ? 'sfx_shot_enemy' : e.heavy ? 'sfx_shot_player_heavy' : 'sfx_shot_player');
      live.ack(e.owner === 'enemy' ? 'fx.shot_enemy' : 'fx.shot');
      return true;
    case 'hit': hit(scene, e); return true;
    case 'steel-broken':
      sound.sfx('sfx_break_steel'); live.ack('fx.break_steel'); field.fx.add('small', e.col, e.row, now);
      return true;
    case 'kill':
      sound.sfx(e.kind === 'brute' ? 'sfx_brute_explode' : 'sfx_enemy_explode');
      live.ack(`fx.kill_${e.kind}`);
      field.fx.add(e.kind === 'brute' ? 'big' : 'small', e.col, e.row, now);
      return true;
    case 'enemy-spawn': sound.sfx('sfx_enemy_spawn'); live.ack('fx.enemy_spawn'); return true;
    case 'player-spawn': sound.sfx('sfx_player_spawn'); live.ack('fx.player_spawn'); return true;
    case 'player-death': {
      const [col, row] = playerCell(scene);
      sound.sfx('sfx_player_explode'); live.ack('fx.player_death'); scene.game.haptic('player-death');
      field.fx.add('big', col, row, now);
      return true;
    }
    case 'core-alarm': sound.sfx('sfx_core_alarm'); scene.game.haptic('core-alarm'); return true;
    case 'core-destroyed': {
      const [col, row] = coreCell(scene);
      sound.sfx('sfx_core_destroyed'); live.ack('fx.core_destroyed'); scene.game.haptic('core-destroyed');
      field.coreDestroyed(); field.fx.add('core', col, row, now);
      return true;
    }
    case 'oil-slide': sound.sfx('sfx_oil_slide'); return true;
    default: return false;
  }
}

function hit(scene: EventScene, e: Extract<MatchEvent, { type: 'hit' }>): void {
  const { sound, live, field, now } = scene;
  const at = (fx: string): void => { live.ack(fx); field.fx.add('spark', e.col, e.row, now); };
  switch (e.target) {
    case 'brick': case 'core-wall': sound.sfx('sfx_hit_brick'); at('fx.hit_brick'); break;
    case 'steel': sound.sfx('sfx_hit_steel'); at('fx.hit_steel'); break;
    case 'edge': sound.sfx('sfx_hit_steel'); break;
    case 'shield': sound.sfx('sfx_shield_block'); break;
    case 'bullet': sound.sfx('sfx_bullet_clash'); at('fx.bullet_clash'); break;
    default: sound.sfx('sfx_brute_hit'); at('fx.hit_brute'); break;
  }
}

function items(scene: EventScene, e: MatchEvent, gunUp: boolean): boolean {
  const { ctx, sound, live, game, field, now } = scene;
  switch (e.type) {
    case 'powerup-spawn': sound.sfx('sfx_powerup_drop'); live.ack('fx.powerup_spawn'); return true;
    case 'powerup-expired': sound.sfx('sfx_powerup_vanish'); return true;
    case 'pickup': {
      sound.sfx(`sfx_pu_${e.kind}`);
      live.ack(`fx.pickup_${e.kind}`);
      game.haptic(e.kind === 'quake' ? 'blast' : 'pickup');
      const text = pickupToast(ctx, e.kind, gunUp);
      if (text) live.toast(text);
      return true;
    }
    case 'gun-up': live.toast(e.level >= MAX_GUN ? ctx.t('screen.toast.star_max') : ctx.t('screen.toast.star')); return true;
    case 'effect-end':
      sound.sfx(e.effect === 'freeze' ? 'sfx_freeze_end' : e.effect === 'shield' || e.effect === 'bubble' ? 'sfx_shield_down' : 'sfx_wall_revert');
      return true;
    case 'booster': {
      sound.sfx(`sfx_bst_${short(e.id)}`);
      live.ack(`fx.booster_${short(e.id)}`);
      if (e.id === 'bst_shockwave') { game.haptic('blast'); field.fx.add('shockwave', (GRID - 1) / 2, (GRID - 1) / 2, now); }
      if (e.id === 'bst_hull') field.coreRestored();
      const text = boosterToast(ctx, e.id);
      if (text) live.toast(text);
      return true;
    }
    case 'booster-denied':
      sound.sfx('sfx_bst_denied');
      live.ack('fx.booster_denied');
      if (e.reason === 'limit') live.toast(ctx.t('screen.hud.limit'));
      return true;
    default: return false;
  }
}

function flow(scene: EventScene, e: MatchEvent): void {
  const { ctx, sound, live } = scene;
  switch (e.type) {
    case 'intro':
      live.toast(e.stage !== null ? ctx.t('screen.toast.go', { n: e.stage }) : ctx.t('screen.toast.wave', { n: e.wave ?? '' }));
      break;
    case 'wave-start': sound.sfx('sfx_wave_start'); live.toast(ctx.t('screen.toast.wave', { n: e.wave })); break;
    case 'wave-clear':
      sound.sfx('sfx_wave_clear'); live.ack('fx.wave_clear');
      live.toast(ctx.t('screen.toast.wave_clear', { n: e.wave, bonus: e.bonus }));
      break;
    case 'last-enemy': sound.sfx('sfx_last_enemy'); break;
    case 'tutorial': sound.sfx('sfx_tut_step'); scene.tutorial(); break;
    case 'booster-hint': scene.hint(); break;
    case 'cleared': sound.music(null); sound.sfx('jgl_stage_clear'); live.ack('fx.stage_clear'); break;
    case 'defeated': sound.music(null); sound.sfx('jgl_defeat'); break;
    default: break;
  }
}

/** Plays the events of one frame; true when a `cleared` or `defeated` event was among them. */
export function react(scene: EventScene, events: readonly MatchEvent[]): { cleared: boolean; defeated: boolean } {
  const gunUp = events.some((e) => e.type === 'gun-up');
  let cleared = false;
  let defeated = false;
  for (const e of events) {
    try {
      if (combat(scene, e) || items(scene, e, gunUp)) continue;
      if (e.type === 'cleared') cleared = true;
      if (e.type === 'defeated') defeated = true;
      flow(scene, e);
    } catch { /* an effect never stops the frame */ }
  }
  return { cleared, defeated };
}

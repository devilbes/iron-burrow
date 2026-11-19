// Analytics of the game (CONTRACT §10, docs/analytics/EVENTS.json): flat snake_case events through
// GamePorts.track. The level controller reports its own `an.*` names; they are translated here to
// the catalog (level_start, level_complete / level_fail, stage_end, item_spent, continue_used).
import type { GamePorts } from '../index.js';

type Params = Readonly<Record<string, string | number | boolean>>;
type Flat = Record<string, string | number>;

/** Booleans as 1/0, other non-scalars dropped. */
export function flat(params: Params = {}): Flat {
  const out: Flat = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'boolean') out[key] = value ? 1 : 0;
    else if (typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))) out[key] = value;
  }
  return out;
}

const setOf = (mode: unknown): string => (mode === 'siege' ? 'siege' : 'campaign');
const num = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

/** The catalog events of one controller event. */
export function translate(event: string, p: Readonly<Record<string, string | number>>): [string, Flat][] {
  const set = setOf(p.mode);
  const n = set === 'siege' ? 1 : num(p.stage);
  switch (event) {
    case 'an.stage_start': return [['level_start', { level_set: set, level_n: n, attempt: num(p.attempt) }]];
    case 'an.stage_end': {
      const result = String(p.result ?? '');
      const base = { level_set: set, level_n: n, score: num(p.score), duration_s: num(p.duration_s) };
      const out: [string, Flat][] = [['stage_end', { ...base, result, stars: num(p.stars), lives_lost: num(p.lives_lost),
        boosters_used: num(p.boosters_used), waves: 0, continues: 0 }]];
      if (result === 'clear') out.push(['level_complete', { ...base, stars: num(p.stars) }]);
      else out.push(['level_fail', { level_set: set, level_n: n, reason: result === 'quit' ? 'quit' : String(p.defeat_cause || 'lives'),
        duration_s: num(p.duration_s) }]);
      return out;
    }
    case 'an.siege_end': return [
      ['stage_end', { level_set: 'siege', level_n: 1, result: 'defeat', stars: 0, score: num(p.score), duration_s: num(p.duration_s),
        lives_lost: 0, boosters_used: num(p.boosters_used), waves: num(p.waves), continues: 0 }],
      ['level_fail', { level_set: 'siege', level_n: 1, reason: 'lives', duration_s: num(p.duration_s) }]];
    case 'an.booster_use': return [['item_spent', { item: `bst_${String(p.item)}`, amount: 1, sink_id: 'stage_booster', level_set: set }]];
    case 'an.continue_used': return [['continue_used', { level_set: set, level_n: n, wave: num(p.wave) }]];
    default: return event.startsWith('an.') ? [] : [[event, { ...p }]];
  }
}

/** Ports for the level controller: its `an.*` events go out as catalog events. */
export function trackingPorts(ports: GamePorts): GamePorts {
  return {
    currentLevel: () => ports.currentLevel(), level: (n) => ports.level(n), beginAttempt: (n) => ports.beginAttempt(n),
    endLevel: (n, won, stats) => ports.endLevel(n, won, stats), loadSave: () => ports.loadSave(), save: (s) => ports.save(s),
    track(event, params) {
      for (const [name, values] of translate(event, params ?? {})) {
        try { ports.track(name, values); } catch { /* analytics never blocks */ }
      }
    },
  };
}

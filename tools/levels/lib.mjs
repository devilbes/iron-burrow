// Iron Burrow — level rules library (Node, no deps). Rules: docs/gdd/12_content_generation.md §1–§6, 13 §1, 11 §1.
// Independent from game code. Used by validate.mjs and export.mjs.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const ROOT = new URL('../../', import.meta.url).pathname;
export const SIZE = 13;
export const ALPHABET = new Set(['.', 'B', 'S', 'L', 'R', 'O', 'C']);
export const CORE = [6, 12]; // [col,row]
export const SPAWNS = [[0, 0], [6, 0], [12, 0]];
export const PLAYER = [4, 12];

// game.balance / game.enemies tunables (GDD 12, 13, 11)
export const CHAPTERS = {
  1: { theme: 'clay', maxAlive: 4, spawnInterval: 3.0, fireMult: 1.0, first: 1, last: 10, steelMax: 0.06 },
  2: { theme: 'iron', maxAlive: 5, spawnInterval: 2.5, fireMult: 1.15, first: 11, last: 20, steelMax: 0.12 },
  3: { theme: 'magma', maxAlive: 6, spawnInterval: 2.0, fireMult: 1.3, first: 21, last: 30, steelMax: 0.12 },
};
export const TI_W = { grunt: 1.0, scout: 1.3, gunner: 1.6, brute: 2.5 };
export const KILL = { scout: 200, grunt: 100, gunner: 300, brute: 400 };
export const SCORE = { pickup: 500, clear: 1000, life: 500, maxLivesCheck: 7, maxPickups: 3, siegeWaveBonus: 300 };
export const CORE_TIMING = { firstSpawnS: 1.0, spawnAnimS: 1.0 };
export const FINALS = [10, 20, 30];

export const chapterOf = (n) => (n <= 10 ? 1 : n <= 20 ? 2 : 3);
export const pad2 = (n) => String(n).padStart(2, '0');

export function composition(n) {
  let brute = Math.floor((n - 1) / 5) + (FINALS.includes(n) ? 1 : 0);
  const gunner = Math.min(Math.floor((n + 1) / 3), 6);
  const scout = Math.min(2 + Math.floor(n / 4), 7);
  const grunt = 20 - brute - gunner - scout;
  return { brute, gunner, scout, grunt };
}

// GDD 12 §2 order (D-12-01), deterministic, slots 1..20
export function enemyOrder(n) {
  const c = composition(n);
  const slots = new Array(21).fill(null);
  for (let i = 0; i < c.brute; i++) slots[4 + Math.floor(((i + 0.5) * 17) / c.brute)] = 'brute';
  const place = (type, count, from) => {
    if (!count) return;
    const F = [];
    for (let s = from; s <= 20; s++) if (!slots[s]) F.push(s);
    for (let i = 0; i < count; i++) slots[F[Math.floor(((i + 0.5) * F.length) / count)]] = type;
  };
  place('gunner', c.gunner, 2);
  place('scout', c.scout, 1);
  for (let s = 1; s <= 20; s++) if (!slots[s]) slots[s] = 'grunt';
  return slots.slice(1);
}

export function threatIndex(n) {
  const c = composition(n);
  const ch = CHAPTERS[chapterOf(n)];
  const base = Object.entries(c).reduce((a, [t, k]) => a + k * TI_W[t], 0);
  return Math.round(base * (ch.maxAlive / 4) * (3.0 / ch.spawnInterval) * ch.fireMult * 10) / 10;
}

// Siege wave TI (GDD 12 §5, 13 §2) — reference metric for the arena
export function siegeWaveTI(w) {
  const maxAlive = Math.min(4 + Math.floor(w / 3), 8);
  const brute = Math.min(w, 5), gunner = Math.min(Math.floor(w / 2), 3), scout = Math.min(1 + Math.floor(w / 3), 2);
  const grunt = Math.max(0, 10 - brute - gunner - scout);
  const spawn = Math.max(1.5, 3.0 - 0.1 * (w - 1));
  const fire = Math.min(1 + 0.02 * (w - 1), 1.5);
  const base = brute * TI_W.brute + gunner * TI_W.gunner + scout * TI_W.scout + grunt * TI_W.grunt;
  return Math.round(base * (maxAlive / 4) * (3.0 / spawn) * fire * 10) / 10;
}

export function scoreMaxStage(n) {
  const kills = enemyOrder(n).reduce((a, t) => a + KILL[t], 0);
  return kills + SCORE.maxPickups * SCORE.pickup + SCORE.clear + SCORE.life * SCORE.maxLivesCheck;
}

// Physical minimum: 20th enemy spawns no earlier than first_spawn + 19*interval, then spawn animation (invulnerable).
export function durationMinMs(chapter) {
  const ch = CHAPTERS[chapter];
  return Math.round((CORE_TIMING.firstSpawnS + 19 * ch.spawnInterval + CORE_TIMING.spawnAnimS) * 1000) - 1000; // −1 s tick tolerance
}

// Siege score ceiling for bounds/1 (sim cap is 40 waves; ceiling uses 100 waves, all brutes, 2 carriers/wave)
export function siegeScoreMax(waves = 100) {
  let s = 0;
  for (let w = 1; w <= waves; w++) s += 10 * Math.floor((KILL.brute * (9 + w)) / 10) + SCORE.siegeWaveBonus * w + 2 * SCORE.pickup;
  return s;
}

const at = (g, c, r) => (r >= 0 && r < SIZE && c >= 0 && c < SIZE ? g[r][c] : null);
const wallCells = () => {
  const out = [];
  for (let c = 5; c <= 7; c++) for (let r = 10; r <= 12; r++) if (!(c === 6 && r === 12)) out.push([c, r]);
  return out;
};
const isWall = (c, r) => c >= 5 && c <= 7 && r >= 10 && r <= 12 && !(c === 6 && r === 12);

function bfs(g, start, pass) {
  const seen = new Set([start.join(',')]);
  const q = [start];
  while (q.length) {
    const [c, r] = q.shift();
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nr = r + dr, t = at(g, nc, nr);
      if (t === null || seen.has(nc + ',' + nr) || !pass(t, nc, nr)) continue;
      seen.add(nc + ',' + nr);
      q.push([nc, nr]);
    }
  }
  return seen;
}

export function mapStats(g) {
  const cnt = { '.': 0, B: 0, S: 0, L: 0, R: 0, O: 0, C: 0 };
  let sym = 0;
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    cnt[g[r][c]] = (cnt[g[r][c]] || 0) + 1;
    if (g[r][c] === g[r][SIZE - 1 - c]) sym++;
  }
  const N = SIZE * SIZE;
  const share = Object.fromEntries(Object.entries(cnt).map(([k, v]) => [k, Math.round((v / N) * 1000) / 1000]));
  // openness: cells passable for tanks without shooting ({., R, O}) reachable from spawns
  const open = new Set();
  for (const s of SPAWNS) for (const k of bfs(g, s, (t) => t === '.' || t === 'R' || t === 'O')) open.add(k);
  let centreSteel = 0;
  for (let r = 0; r < SIZE; r++) for (let c = 4; c <= 8; c++) if (g[r][c] === 'S') centreSteel++;
  return { counts: cnt, share, symmetry: Math.round((sym / N) * 1000) / 1000, openness: Math.round((open.size / N) * 1000) / 1000, centreSteel };
}

// Validates a stage / siege source object against GDD 12 §6 V1–V10 (+V11 finals). Returns array of error strings.
export function validateMap(lvl) {
  const e = [];
  const siege = lvl.id === 'siege_pit';
  const g = lvl.grid;
  if (!Array.isArray(g) || g.length !== SIZE || g.some((row) => typeof row !== 'string' || row.length !== SIZE)) {
    return ['V1: grid must be 13 strings of 13 chars'];
  }
  // V1
  let cores = 0;
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const t = g[r][c];
    if (!ALPHABET.has(t)) e.push(`V1: bad tile '${t}' at (${c},${r})`);
    if (t === 'C') { cores++; if (c !== 6 || r !== 12) e.push(`V1: Core at (${c},${r}) must be (6,12)`); }
  }
  if (cores !== 1) e.push(`V1: exactly one C required, got ${cores}`);
  // V2
  for (const [c, r] of wallCells()) if (g[r][c] !== 'B') e.push(`V2: Core wall cell (${c},${r}) must be B`);
  const quarters = lvl.quarters || {};
  for (const [k, v] of Object.entries(quarters)) {
    const [c, r] = k.split(',').map(Number);
    if (!Number.isInteger(c) || !Number.isInteger(r) || at(g, c, r) === null) { e.push(`quarters: bad key ${k}`); continue; }
    if (isWall(c, r)) e.push(`V2: Core wall cell (${c},${r}) must not have a quarters mask`);
    if (!['B', 'S'].includes(g[r][c])) e.push(`quarters: (${c},${r}) is '${g[r][c]}', only B/S may have masks`);
    if (!/^[1-9A-E]$/.test(String(v))) e.push(`quarters: (${c},${r}) mask '${v}' must be hex 1..E`);
  }
  // V3
  for (const [c, r] of [[0, 0], [6, 0], [12, 0], [0, 1], [6, 1], [12, 1], [4, 12], [4, 11], [8, 12], [8, 11]]) {
    if (g[r][c] !== '.') e.push(`V3: (${c},${r}) must be '.'`);
  }
  const notHard = (t) => t !== 'S' && t !== 'L' && t !== 'C';
  // V4
  for (const s of SPAWNS) {
    const reach = bfs(g, s, notHard);
    let ok = false;
    for (const k of reach) {
      const [c, r] = k.split(',').map(Number);
      if (isWall(c, r)) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, dr]) => isWall(c + dc, r + dr))) { ok = true; break; }
    }
    if (!ok) e.push(`V4: spawn (${s}) cannot reach the Core wall`);
  }
  // V5
  for (const s of SPAWNS) {
    const reach = bfs(g, s, (t) => t === '.' || t === 'R' || t === 'O');
    if (![...reach].some((k) => Number(k.split(',')[1]) >= 6)) e.push(`V5: spawn (${s}) is walled in (open path to row ≥ 6 missing)`);
  }
  // V6
  const fromPlayer = bfs(g, PLAYER, notHard);
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    if (notHard(g[r][c]) && !fromPlayer.has(c + ',' + r)) e.push(`V6: pocket at (${c},${r}) unreachable from player spawn`);
  }
  // V7 / V8
  const st = mapStats(g);
  const n = lvl.index;
  const sh = st.share;
  if (siege) {
    if (sh.B < 0.15 || sh.B > 0.35) e.push(`V7: siege brick share ${sh.B} not in 15–35 %`);
    if (sh.S > 0.12) e.push(`V7: siege steel ${sh.S} > 12 %`);
    if (sh.L > 0.08) e.push(`V7: lava ${sh.L} > 8 %`);
    if (sh.O > 0.08) e.push(`V7: oil ${sh.O} > 8 %`);
    if (sh.R > 0.10) e.push(`V7: roots ${sh.R} > 10 %`);
  } else {
    const ch = CHAPTERS[chapterOf(n)];
    if (sh.B < 0.25 || sh.B > 0.45) e.push(`V7: brick share ${sh.B} not in 25–45 %`);
    if (sh.S > ch.steelMax) e.push(`V7: steel ${sh.S} > ${ch.steelMax}`);
    if (sh.L > 0.08) e.push(`V7: lava ${sh.L} > 8 %`);
    if (sh.R > 0.10) e.push(`V7: roots ${sh.R} > 10 %`);
    if (sh.O > 0.08) e.push(`V7: oil ${sh.O} > 8 %`);
    if (n < 3 && st.counts.S) e.push('V8: steel allowed from stage 3');
    if (n < 5 && st.counts.R) e.push('V8: roots allowed from stage 5');
    if (n < 13 && st.counts.O) e.push('V8: oil allowed from stage 13');
    if (n < 21 && st.counts.L) e.push('V8: lava allowed from stage 21');
    if (FINALS.includes(n) && st.centreSteel < 4) e.push(`V11: chapter final needs a closed centre (≥ 4 steel in cols 4–8), got ${st.centreSteel}`);
  }
  // V9
  if (st.symmetry < 0.8) e.push(`V9: mirror symmetry ${st.symmetry} < 0.80`);
  // V10
  if (!siege) {
    const ch = CHAPTERS[chapterOf(n)];
    if (lvl.id !== `stage_${pad2(n)}`) e.push(`V10: id ${lvl.id} ≠ stage_${pad2(n)}`);
    if (lvl.chapter !== chapterOf(n)) e.push(`V10: chapter ${lvl.chapter} ≠ ${chapterOf(n)}`);
    if (lvl.theme !== ch.theme) e.push(`V10: theme ${lvl.theme} ≠ ${ch.theme}`);
    if (lvl.maxAlive !== ch.maxAlive) e.push(`V10: maxAlive ${lvl.maxAlive} ≠ ${ch.maxAlive}`);
    if (lvl.spawnInterval !== ch.spawnInterval) e.push(`V10: spawnInterval ${lvl.spawnInterval} ≠ ${ch.spawnInterval}`);
    const exp = enemyOrder(n);
    if (JSON.stringify(lvl.enemies) !== JSON.stringify(exp)) e.push(`V10: enemies must be exactly ${JSON.stringify(exp)}`);
  } else if (lvl.theme !== 'pit') e.push('V10: siege theme must be pit');
  return e;
}

// --- Minimal JSON Schema (draft 2020-12 subset) validator for our own schemas ---
export function validateSchema(schema, value, path = '$', root = schema, errs = []) {
  if (schema.$ref) return validateSchema(root.$defs[schema.$ref.replace('#/$defs/', '')], value, path, root, errs);
  const t = schema.type;
  const typeOk = {
    object: (v) => v && typeof v === 'object' && !Array.isArray(v),
    array: Array.isArray,
    string: (v) => typeof v === 'string',
    integer: Number.isInteger,
    number: (v) => typeof v === 'number' && Number.isFinite(v),
    boolean: (v) => typeof v === 'boolean',
    null: (v) => v === null,
  };
  const types = Array.isArray(t) ? t : t ? [t] : [];
  if (types.length && !types.some((x) => typeOk[x](value))) { errs.push(`${path}: expected ${types.join('|')}`); return errs; }
  if (schema.enum && !schema.enum.includes(value)) errs.push(`${path}: ${JSON.stringify(value)} not in enum`);
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) errs.push(`${path}: < minimum ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) errs.push(`${path}: > maximum ${schema.maximum}`);
  }
  if (typeof value === 'string') {
    if (schema.maxLength !== undefined && value.length > schema.maxLength) errs.push(`${path}: longer than ${schema.maxLength}`);
    if (schema.minLength !== undefined && value.length < schema.minLength) errs.push(`${path}: shorter than ${schema.minLength}`);
  }
  if (Array.isArray(value)) {
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errs.push(`${path}: more than ${schema.maxItems} items`);
    if (schema.minItems !== undefined && value.length < schema.minItems) errs.push(`${path}: fewer than ${schema.minItems} items`);
    if (schema.items) value.forEach((v, i) => validateSchema(schema.items, v, `${path}[${i}]`, root, errs));
  }
  if (typeOk.object(value) && types.includes('object')) {
    const props = schema.properties || {};
    for (const r of schema.required || []) if (!(r in value)) errs.push(`${path}: missing ${r}`);
    for (const [k, v] of Object.entries(value)) {
      if (props[k]) validateSchema(props[k], v, `${path}.${k}`, root, errs);
      else if (schema.additionalProperties === false) errs.push(`${path}: unknown property ${k}`);
      else if (typeof schema.additionalProperties === 'object') {
        if (schema.propertyNames?.maxLength && k.length > schema.propertyNames.maxLength) errs.push(`${path}: key ${k} too long`);
        validateSchema(schema.additionalProperties, v, `${path}.${k}`, root, errs);
      }
    }
  }
  return errs;
}

// Lints schema to the configs rules: every node typed, ru title/description, closed objects, bounds.
export function lintSchema(schema, path = '$', errs = [], root = schema) {
  if (schema.$ref) return errs;
  if (!schema.type) errs.push(`${path}: no type`);
  if (!schema.title || !schema.description) errs.push(`${path}: title/description required`);
  else if (!/[А-Яа-яЁё]/.test(schema.title + schema.description)) errs.push(`${path}: title/description must be Russian`);
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  if (types.includes('object')) {
    if (!schema.properties && typeof schema.additionalProperties !== 'object') errs.push(`${path}: free object`);
    if (schema.properties && schema.additionalProperties !== false) errs.push(`${path}: additionalProperties must be false`);
    for (const [k, v] of Object.entries(schema.properties || {})) lintSchema(v, `${path}.${k}`, errs, root);
    if (typeof schema.additionalProperties === 'object') {
      if (!schema.propertyNames) errs.push(`${path}: dictionary needs propertyNames`);
      lintSchema(schema.additionalProperties, `${path}.*`, errs, root);
    }
  }
  if (types.includes('array')) {
    if (!schema.items || schema.maxItems === undefined) errs.push(`${path}: array needs items and maxItems`);
    else lintSchema(schema.items, `${path}[]`, errs, root);
  }
  if ((types.includes('number') || types.includes('integer')) && (schema.minimum === undefined || schema.maximum === undefined)) errs.push(`${path}: number needs minimum/maximum`);
  if (types.includes('string') && schema.maxLength === undefined && !schema.enum) errs.push(`${path}: string needs maxLength or enum`);
  if (schema.pattern || schema.patternProperties) errs.push(`${path}: custom regex forbidden`);
  for (const [k, v] of Object.entries(schema.$defs || {})) lintSchema(v, `${path}.$defs.${k}`, errs, root);
  return errs;
}

export const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

export function loadSources() {
  const dir = join(ROOT, 'configs/levels/campaign');
  const stages = existsSync(dir)
    ? readdirSync(dir).filter((f) => /^stage_\d\d\.json$/.test(f)).sort().map((f) => ({ file: `configs/levels/campaign/${f}`, data: readJson(join(dir, f)) }))
    : [];
  const siegeFile = join(ROOT, 'configs/levels/siege/siege_pit.json');
  const siege = existsSync(siegeFile) ? { file: 'configs/levels/siege/siege_pit.json', data: readJson(siegeFile) } : null;
  return { stages, siege };
}

// RFC 8785 (JCS) canonical JSON for plain JSON data (strings, finite numbers, bool, null, arrays, objects)
export function jcs(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(jcs).join(',') + ']';
  const keys = Object.keys(v).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + jcs(v[k])).join(',') + '}';
}

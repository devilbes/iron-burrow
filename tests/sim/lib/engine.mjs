// Headless runs of the shipped rules (src/modules/game/core) by the bots, per GDD 13 §3: no
// tutorial, no boosters, no Spare Hull, no continue, every stage from gun L0. One batch per seed
// (all stages × policies × runs, Siege runs) is computed once and cached in .cache/sim/.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { load, ROOT, stageFile } from '../../game/helpers/load.mjs';
import { createBot, POLICIES } from './bots.mjs';

export const PARAMS = JSON.parse(readFileSync(new URL('./params.json', import.meta.url), 'utf8'));
export const core = await load('core/index');

/** game.* records published in configs/remote/game/ (if any) over the built-in copy. */
function records() {
  const dir = join(ROOT, 'configs/remote/game');
  const out = {};
  if (process.env.SIM_RECORDS) Object.assign(out, JSON.parse(readFileSync(process.env.SIM_RECORDS, 'utf8')));
  if (!existsSync(dir)) return out;
  for (const file of readdirSync(dir).filter((name) => name.endsWith('.json'))) {
    const record = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    const key = record.key ? `game.${record.key}` : `game.${file.replace(/\.json$/, '')}`;
    out[key] ??= record.data ?? record;
  }
  return out;
}

export const tun = core.createTunables(records());
export const STAGES = Array.from({ length: 30 }, (_, i) => core.parseStage(stageFile(i + 1), tun));
export const SIEGE = core.parseStage(stageFile('siege'), tun);

const runSeed = (seed, n, k, policyIdx) => (seed * 1000003 + n * 101 + k * 7 + policyIdx) >>> 0;

/** One run to its end; times in seconds of play (from `playing`). */
export function playRun(stage, seed, policy) {
  const state = core.createRun({ stage, tun, seed });
  const bot = createBot(policy, seed, PARAMS);
  const tps = tun.tps;
  const timeout = PARAMS.timeout_s * tps;
  const idleLimit = PARAMS.softlock_idle_s * tps;
  const siegeCap = PARAMS.siege_max_waves;
  let start = -1;
  let lastActivity = 0;
  const out = { won: false, cause: null, time: 0, firstKill: null, firstThreat: null, firstSpawn: null, softlock: false,
    waves: 0, waveTimes: [], score: 0 };
  let waveStart = 0;
  for (;;) {
    const cmd = state.phase === 'playing' ? bot(state) : undefined;
    core.step(state, cmd);
    if (state.phase === 'intro') continue;
    if (start < 0) { start = state.tick; lastActivity = state.tick; waveStart = state.tick; }
    const t = (state.tick - start) / tps;
    for (const e of state.events) {
      if (e.t === 'kill' || e.t === 'spawn' || e.t === 'player_death' || e.t === 'wave_start') lastActivity = state.tick;
      if (e.t === 'kill' && out.firstKill === null) out.firstKill = t;
      if (e.t === 'threat' && out.firstThreat === null) out.firstThreat = t;
      if (e.t === 'spawn' && out.firstSpawn === null) out.firstSpawn = t;
      if (e.t === 'wave_clear') { out.waveTimes.push((state.tick - waveStart) / tps); }
      if (e.t === 'wave_start') waveStart = state.tick;
    }
    if (state.phase === 'cleared') { out.won = true; out.time = t; break; }
    if (state.phase === 'defeated') { out.cause = state.cause; out.time = t; break; }
    if (state.siege && state.wave > siegeCap) { out.time = t; break; }
    if ((!state.siege && state.tick - start >= timeout) || state.tick - lastActivity >= idleLimit) {
      out.softlock = true; out.time = t; break;
    }
  }
  out.waves = state.siege ? state.wave : 0;
  out.score = state.score;
  return out;
}

function sourceHash() {
  const hash = createHash('sha256');
  const add = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) add(path);
      else hash.update(name).update(readFileSync(path));
    }
  };
  for (const dir of ['src/modules/game/core', 'tests/sim/lib', 'configs/levels']) add(join(ROOT, dir));
  if (existsSync(join(ROOT, 'configs/remote/game'))) add(join(ROOT, 'configs/remote/game'));
  return hash.digest('hex').slice(0, 16);
}

function compute(seed) {
  const stages = [];
  POLICIES.forEach((policy, pi) => {
    STAGES.forEach((stage, i) => {
      for (let k = 0; k < PARAMS.runs_per_stage; k++) stages.push({ policy, n: i + 1, ...playRun(stage, runSeed(seed, i + 1, k, pi), policy) });
    });
  });
  const siege = [];
  POLICIES.forEach((policy, pi) => {
    for (let k = 0; k < PARAMS.siege_runs; k++) siege.push({ policy, ...playRun(SIEGE, runSeed(seed, 0, k, pi), policy) });
  });
  return { seed, stages, siege };
}

/** All runs of one seed (cached by the hash of rules, bots, levels and records). */
export function batch(seed) {
  const dir = join(ROOT, '.cache/sim');
  const file = join(dir, `${seed}-${sourceHash()}.json`);
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  const data = compute(seed);
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, JSON.stringify(data));
  return data;
}

export const median = (values) => {
  const list = values.filter((v) => v !== null && Number.isFinite(v)).sort((a, b) => a - b);
  if (!list.length) return NaN;
  const mid = list.length >> 1;
  return list.length % 2 ? list[mid] : (list[mid - 1] + list[mid]) / 2;
};
const pct = (part, total) => (total ? (100 * part) / total : 0);

export function winRate(runs, policy, from, to) {
  const list = runs.filter((r) => r.policy === policy && r.n >= from && r.n <= to);
  return pct(list.filter((r) => r.won).length, list.length);
}

/** Threat index of stage N (GDD 13 §1). */
export function threatIndex(stage) {
  const w = PARAMS.ti_weights;
  const sum = stage.enemies.reduce((s, type) => s + w[type], 0);
  const mult = tun.fireMultByChapter[stage.chapter - 1] ?? 1;
  return sum * (stage.maxAlive / 4) * (3.0 / stage.spawnInterval) * mult;
}

/** The value of every bal.sim.* metric for one seed. */
export function balanceMetrics(data) {
  const { stages, siege } = data;
  const nov = stages.filter((r) => r.policy === 'novice');
  const defeats = nov.filter((r) => !r.won && !r.softlock);
  const blocks = [];
  for (let b = 0; b < 6; b++) blocks.push(winRate(stages, 'novice', b * 5 + 1, b * 5 + 5));
  let mono = 0;
  for (let b = 1; b < blocks.length; b++) if (blocks[b] > blocks[b - 1] + 5) mono++;
  let ti = 0;
  for (let n = 1; n < STAGES.length; n++) if (threatIndex(STAGES[n]) < threatIndex(STAGES[n - 1]) - 1e-9) ti++;
  const siegeOf = (policy) => siege.filter((r) => r.policy === policy);
  return {
    'bal.sim.novice.win_rate_s01_03': winRate(stages, 'novice', 1, 3),
    'bal.sim.novice.win_rate_s04_10': winRate(stages, 'novice', 4, 10),
    'bal.sim.novice.win_rate_s11_15': winRate(stages, 'novice', 11, 15),
    'bal.sim.novice.win_rate_s16_25': winRate(stages, 'novice', 16, 25),
    'bal.sim.novice.win_rate_s26_30': winRate(stages, 'novice', 26, 30),
    'bal.sim.novice.stage_duration_median': median(nov.filter((r) => r.won).map((r) => r.time)),
    'bal.sim.novice.defeat_core_share': pct(defeats.filter((r) => r.cause === 'core').length, defeats.length),
    'bal.sim.novice.defeat_lives_share': pct(defeats.filter((r) => r.cause === 'lives').length, defeats.length),
    'bal.sim.novice.monotonic_violations': mono,
    'bal.sim.expert.win_rate_s01_15': winRate(stages, 'expert', 1, 15),
    'bal.sim.expert.win_rate_s16_30': winRate(stages, 'expert', 16, 30),
    'bal.sim.expert.stage_duration_median': median(stages.filter((r) => r.policy === 'expert' && r.won).map((r) => r.time)),
    'bal.sim.random.win_rate_s01_30': winRate(stages, 'random', 1, 30),
    'bal.sim.all.ti_monotonic_violations': ti,
    'bal.sim.all.softlocks': stages.filter((r) => r.softlock).length + siege.filter((r) => r.softlock).length,
    'bal.sim.novice.siege_median_wave': median(siegeOf('novice').map((r) => r.waves)),
    'bal.sim.expert.siege_median_wave': median(siegeOf('expert').map((r) => r.waves)),
    'bal.sim.random.siege_median_wave': median(siegeOf('random').map((r) => r.waves)),
    'bal.sim.novice.siege_wave_duration_median': median(siegeOf('novice').flatMap((r) => r.waveTimes)),
  };
}

export const inRange = (value, target) => Number.isFinite(value)
  && (target.min === undefined || value >= target.min) && (target.max === undefined || value <= target.max);

/** Prints one JSON line per metric and returns how many are off target. */
export function report(rows) {
  let violated = 0;
  for (const { key, value, target } of rows) {
    const ok = inRange(value, target);
    if (!ok) violated++;
    console.log(JSON.stringify({ key, value: Number.isFinite(value) ? Math.round(value * 100) / 100 : value, target, ok }));
  }
  return violated;
}

const QT = JSON.parse(readFileSync(join(ROOT, 'docs/plan/QUALITY_TARGETS.json'), 'utf8')).bot;

/** Target of a bot.* metric of QUALITY_TARGETS.json as {min,max}. */
export function botTarget(id) {
  const { value, dir } = QT[id];
  if (typeof value === 'object') return value;
  return dir === 'max' ? { max: value } : { min: value };
}

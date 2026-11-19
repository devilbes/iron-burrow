// The metric simulations of GDD 13 §3: each tests/sim/<id>.mjs exports run(seed) → number of
// violated targets for that seed (0 = pass) and prints one JSON line per metric.
import { balanceMetrics, batch, botTarget, median, PARAMS, report, winRate } from './engine.mjs';

const novice = (data, from, to) => data.stages.filter((r) => r.policy === 'novice' && r.n >= from && r.n <= to);
const clearMedian = (data) => median(novice(data, 1, 30).filter((r) => r.won).map((r) => r.time));

/** Value of a bot.* metric (QUALITY_TARGETS.json) for one seed's batch. */
const METRICS = {
  first_kill_s: (d) => median(novice(d, 1, 3).map((r) => r.firstKill ?? r.time)),
  first_threat_s: (d) => median(novice(d, 1, 3).map((r) => r.firstThreat ?? r.time)),
  stage_length_s: clearMedian,
  first_spawn_s: (d) => median(d.stages.map((r) => r.firstSpawn)),
  win_rate_early: (d) => winRate(d.stages, 'novice', 1, 3),
  win_rate_late: (d) => winRate(d.stages, 'novice', 26, 30),
  win_rate_stage1: (d) => winRate(d.stages, 'novice', 1, 1),
  session_stages: (d) => Math.floor(PARAMS.session_s / (clearMedian(d) + PARAMS.screens_s)),
  siege_run_min: (d) => median(d.siege.filter((r) => r.policy === 'novice').map((r) => r.time)) / 60,
};

const SIEGE_KEYS = (key) => key.includes('.siege_');

/** Rows of bal.sim.* targets: stage ones (`siege` false) or the Siege ones. */
function balanceRows(data, siege) {
  const values = balanceMetrics(data);
  return Object.entries(PARAMS.targets)
    .filter(([key]) => (siege ? SIEGE_KEYS(key) || key === 'bal.sim.all.softlocks' : !SIEGE_KEYS(key)))
    .map(([key, target]) => ({ key, value: key === 'bal.sim.all.softlocks' && siege
      ? data.siege.filter((r) => r.softlock).length : values[key], target }));
}

/** run(seed) of sim `id`: prints the metric lines, returns the number of misses. */
export function simulate(id, seed) {
  const data = batch(seed);
  if (id === 'stage_balance') return report(balanceRows(data, false));
  if (id === 'siege_waves') return report(balanceRows(data, true));
  return report([{ key: `bot.${id}`, value: METRICS[id](data), target: botTarget(id) }]);
}

/** CLI of a sim file: `node tests/sim/<id>.mjs [seed…]` (default: the seeds of GDD 13 §3). */
export function cli(id, url) {
  if (process.argv[1] && url !== new URL(`file://${process.argv[1]}`).href) return;
  const seeds = process.argv.slice(2).map(Number);
  let missed = 0;
  for (const seed of seeds.length ? seeds : PARAMS.seeds) {
    const value = simulate(id, seed);
    console.log(JSON.stringify({ sim: id, seed, violated: value }));
    missed += value;
  }
  process.exitCode = missed ? 1 : 0;
}

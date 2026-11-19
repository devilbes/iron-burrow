// sim:siege_run_min — GDD 13 §3, target bot.siege_run_min of docs/plan/QUALITY_TARGETS.json. run(seed) → number of
// violated targets for the seed (0 = pass). CLI: node tests/sim/siege_run_min.mjs [seed…].
import { cli, simulate } from './lib/metrics.mjs';

export function run(seed) { return simulate('siege_run_min', seed); }

cli('siege_run_min', import.meta.url);

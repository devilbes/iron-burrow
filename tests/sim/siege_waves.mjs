// sim:siege_waves — GDD 13 §3, target bot.siege_waves of docs/plan/QUALITY_TARGETS.json. run(seed) → number of
// violated targets for the seed (0 = pass). CLI: node tests/sim/siege_waves.mjs [seed…].
import { cli, simulate } from './lib/metrics.mjs';

export function run(seed) { return simulate('siege_waves', seed); }

cli('siege_waves', import.meta.url);

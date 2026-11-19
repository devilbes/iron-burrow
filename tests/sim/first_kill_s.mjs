// sim:first_kill_s — GDD 13 §3, target bot.first_kill_s of docs/plan/QUALITY_TARGETS.json. run(seed) → number of
// violated targets for the seed (0 = pass). CLI: node tests/sim/first_kill_s.mjs [seed…].
import { cli, simulate } from './lib/metrics.mjs';

export function run(seed) { return simulate('first_kill_s', seed); }

cli('first_kill_s', import.meta.url);

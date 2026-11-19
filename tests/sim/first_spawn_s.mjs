// sim:first_spawn_s — GDD 13 §3, target bot.first_spawn_s of docs/plan/QUALITY_TARGETS.json. run(seed) → number of
// violated targets for the seed (0 = pass). CLI: node tests/sim/first_spawn_s.mjs [seed…].
import { cli, simulate } from './lib/metrics.mjs';

export function run(seed) { return simulate('first_spawn_s', seed); }

cli('first_spawn_s', import.meta.url);

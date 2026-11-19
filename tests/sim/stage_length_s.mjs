// sim:stage_length_s — GDD 13 §3, target bot.stage_length_s of docs/plan/QUALITY_TARGETS.json. run(seed) → number of
// violated targets for the seed (0 = pass). CLI: node tests/sim/stage_length_s.mjs [seed…].
import { cli, simulate } from './lib/metrics.mjs';

export function run(seed) { return simulate('stage_length_s', seed); }

cli('stage_length_s', import.meta.url);

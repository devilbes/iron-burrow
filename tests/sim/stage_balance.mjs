// sim:stage_balance — GDD 13 §3, target bot.stage_balance of docs/plan/QUALITY_TARGETS.json. run(seed) → number of
// violated targets for the seed (0 = pass). CLI: node tests/sim/stage_balance.mjs [seed…].
import { cli, simulate } from './lib/metrics.mjs';

export function run(seed) { return simulate('stage_balance', seed); }

cli('stage_balance', import.meta.url);

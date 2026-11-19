// sim:win_rate_early — GDD 13 §3, target bot.win_rate_early of docs/plan/QUALITY_TARGETS.json. run(seed) → number of
// violated targets for the seed (0 = pass). CLI: node tests/sim/win_rate_early.mjs [seed…].
import { cli, simulate } from './lib/metrics.mjs';

export function run(seed) { return simulate('win_rate_early', seed); }

cli('win_rate_early', import.meta.url);

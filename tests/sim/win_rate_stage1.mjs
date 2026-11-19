// sim:win_rate_stage1 — GDD 13 §3, target bot.win_rate_stage1 of docs/plan/QUALITY_TARGETS.json. run(seed) → number of
// violated targets for the seed (0 = pass). CLI: node tests/sim/win_rate_stage1.mjs [seed…].
import { cli, simulate } from './lib/metrics.mjs';

export function run(seed) { return simulate('win_rate_stage1', seed); }

cli('win_rate_stage1', import.meta.url);

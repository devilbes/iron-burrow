// sim:session_stages — GDD 13 §3, target bot.session_stages of docs/plan/QUALITY_TARGETS.json. run(seed) → number of
// violated targets for the seed (0 = pass). CLI: node tests/sim/session_stages.mjs [seed…].
import { cli, simulate } from './lib/metrics.mjs';

export function run(seed) { return simulate('session_stages', seed); }

cli('session_stages', import.meta.url);

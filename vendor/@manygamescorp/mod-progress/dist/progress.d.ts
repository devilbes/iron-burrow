import { type ModuleDefinition } from '@manygamescorp/core/module';
import type { Progress } from './progress-types.js';
export { createProgress } from './client.js';
export type * from './progress-types.js';
export declare const PROGRESS_HUD_TYPES: readonly ["progress.daily_reward.ready", "progress.reward.claimable", "progress.task.completed"];
export declare function progressModule(): ModuleDefinition<Progress>;
//# sourceMappingURL=progress.d.ts.map
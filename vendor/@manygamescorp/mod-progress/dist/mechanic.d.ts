export { isMechanicOutcome, outcomeFromAttempt, attemptKey } from './mechanic-outcome.js';
export type { MechanicOutcome } from './mechanic-outcome.js';
import type { ModuleContext } from '@manygamescorp/core/module';
import type { MechanicHandle, MechanicOptions } from './mechanic-types.js';
export { MECHANIC_SETTINGS_FIELDS, parseMechanicSettings, checkMechanicSettingsFields } from './mechanic-settings.js';
export { createCurve } from './mechanic-curve.js';
export type { MechanicSettings, MechanicMode } from './mechanic-settings.js';
export type { Curve, CurveParam, CurveSpec, CurvePoint, MechanicSettingsRecord, LoadedCurve } from './mechanic-curve.js';
export type { MechanicHandle, MechanicOptions, MechanicCallOptions, CoreAdapter, CoreAttempt, LevelResult, SecondaryAttempts, Attempt, AttemptResult, FinishedAttempt, AttemptState, MechanicReady, MechanicAttemptStarted, MechanicAttemptFinished } from './mechanic-types.js';
export declare function createMechanic(ctx: ModuleContext, options: MechanicOptions): MechanicHandle;
//# sourceMappingURL=mechanic.d.ts.map
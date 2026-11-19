import { SDKError } from '@manygamescorp/core/error';
import { isMechanicOutcome, type MechanicOutcome } from '@manygamescorp/contracts-client/actions';
import type { AttemptResult, FinishedAttempt, MechanicAttemptFinished } from './mechanic-types.js';
export { isMechanicOutcome };
export type { MechanicOutcome };
export declare function outcomeFromAttempt(value: FinishedAttempt<AttemptResult> | MechanicAttemptFinished | SDKError): MechanicOutcome;
export declare function attemptKey(attemptId: string, sub?: string): Promise<string>;
//# sourceMappingURL=mechanic-outcome.d.ts.map
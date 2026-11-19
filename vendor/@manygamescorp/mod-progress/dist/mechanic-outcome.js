import { SDKError } from '@manygamescorp/core/error';
import { isMechanicOutcome } from '@manygamescorp/contracts-client/actions';
export { isMechanicOutcome };
export function outcomeFromAttempt(value) {
    let outcome;
    if (value instanceof SDKError) {
        if (value.code !== 'MECHANIC_ATTEMPT_COOLDOWN')
            throw value;
        outcome = { status: 'cooldown', attemptId: null,
            availableAt: value.safeParams?.['availableAt'] };
    }
    else if ('attempt' in value) {
        outcome = { status: value.result.won ? 'won' : 'lost', attemptId: value.attempt.id,
            reward: value.result.reward };
    }
    else
        outcome = { status: value.won ? 'won' : 'lost', attemptId: value.attemptId,
            ...(value.reward === null ? {} : { reward: value.reward }) };
    if (!isMechanicOutcome(outcome))
        throw new SDKError('VALIDATION_FAILED', { details: { path: 'result' } });
    return outcome;
}
export async function attemptKey(attemptId, sub) {
    if (sub === undefined)
        return attemptId;
    if (typeof crypto === 'undefined' || !crypto.subtle) {
        throw new SDKError('SDK_PLATFORM_UNSUPPORTED');
    }
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${attemptId}:${sub}`))).slice(0, 16);
    const view = new DataView(digest.buffer);
    view.setUint8(6, (view.getUint8(6) & 15) | 64);
    view.setUint8(8, (view.getUint8(8) & 63) | 128);
    const hex = [...digest].map(b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

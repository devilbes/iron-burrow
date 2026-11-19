import { recordValue } from './levels-validation.js';
import { SDKError } from '@manygamescorp/core/error';
function object(v) {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
}
const date = (v) => v === null
    || (typeof v === 'string' && Number.isFinite(Date.parse(v)));
const nullableText = (v) => v === null || typeof v === 'string';
export function states(value) {
    const bad = () => {
        throw new SDKError('INTERNAL', { module: 'progress',
            message: 'Invalid progress state response' });
    };
    if (!object(value) || !Array.isArray(value.states))
        return bad();
    const keys = new Set();
    for (const s of value.states) {
        if (!object(s) || typeof s.key !== 'string' || keys.has(s.key)
            || !['active', 'completed', 'unavailable'].includes(s.status)
            || !nullableText(s.periodKey) || !nullableText(s.attemptId) || !date(s.endsAt)
            || !Array.isArray(s.selectedStepKeys) || !s.selectedStepKeys.every(k => typeof k === 'string')
            || !object(s.steps) || !object(s.groups) || !Array.isArray(s.rewards))
            return bad();
        keys.add(s.key);
        for (const step of Object.values(s.steps)) {
            if (!object(step) || !['locked', 'available', 'completed'].includes(step.status)
                || !date(step.availableAt) || !object(step.conditions))
                return bad();
            for (const c of Object.values(step.conditions)) {
                if (!object(c) || !Number.isFinite(c.value)
                    || typeof c.completed !== 'boolean')
                    return bad();
            }
        }
        for (const g of Object.values(s.groups))
            if (!object(g)
                || typeof g.completed !== 'boolean')
                return bad();
        for (const r of s.rewards) {
            if (!object(r) || !['operationId', 'attemptId',
                'targetKey'].every(k => typeof recordValue(r, k) === 'string')
                || !['auto', 'manual'].includes(r.claimMode)
                || !['available', 'issued', 'failed'].includes(r.status)
                || !Array.isArray(r.reward)
                || !r.reward.every(i => object(i) && typeof i.id === 'string'
                    && Number.isSafeInteger(i.amount) && i.amount > 0))
                return bad();
        }
    }
    return JSON.parse(JSON.stringify(value.states));
}

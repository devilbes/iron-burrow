import { CORE_EVENT_DOMAINS } from '@manygamescorp/contracts-client/events';
import { realtimeType } from '@manygamescorp/contracts-client/realtime';
export const EVENT_SEGMENT = '[a-z][a-z0-9]*(?:-[a-z0-9]+)*';
const EVENT_NAME = new RegExp(`^${EVENT_SEGMENT}:${EVENT_SEGMENT}:${EVENT_SEGMENT}$`);
export function isEventName(value) {
    return typeof value === 'string' && (value === 'auth:playerChanged'
        || value === 'time:offsetChanged' || EVENT_NAME.test(value) || /^sdk:realtime:(?:status|transport):changed$/.test(value) || (value.startsWith('realtime:') && realtimeType(value.slice(9))));
}
const CORE_EVENT = new RegExp(`^(?:${CORE_EVENT_DOMAINS.join('|')}):`);
export function isCoreEvent(name) {
    return CORE_EVENT.test(name);
}

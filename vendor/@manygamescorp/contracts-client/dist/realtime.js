import { isValidFilter } from './filters.js';
export const REALTIME_TYPE = /^[a-z][a-z0-9_]*(?:\.[a-z0-9_:-]+)+$/;
export const HEX24 = /^[0-9a-f]{24}$/;
export function realtimeType(value) {
    return typeof value === 'string' && value.length <= 128 && REALTIME_TYPE.test(value);
}
export function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        && Object.getPrototypeOf(value) === Object.prototype;
}
function safe(value, depth = 0) {
    if (depth > 32)
        return false;
    if (value === null || typeof value === 'string' || typeof value === 'boolean')
        return true;
    if (typeof value === 'number')
        return Number.isFinite(value);
    if (!record(value) && !Array.isArray(value))
        return false;
    return Object.entries(value).every(([key, item]) => !/[\0$.]/.test(key)
        && !['__proto__', 'constructor', 'prototype', '_bsontype'].includes(key)
        && !/(?:email|phone|password|token|idfa|gaid|deviceid)/i.test(key)
        && !key.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase().split(/[^a-z0-9]+/).includes('ip')
        && safe(item, depth + 1));
}
const FIELDS = ['v', 'id', 'type', 'schemaVersion', 'sender', 'sentAt', 'expiresAt', 'delivery',
    'priority', 'to', 'seq', 'epoch', 'collapseKey', 'filter', 'ref', 'payload', 'rid', 'causationId'];
const date = (v) => typeof v === 'string'
    && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(v) && Number.isFinite(Date.parse(v));
/** Strict client projection: no appId/gid/session, credentials or server-only metadata. */
export function isRealtimeEnvelope(v) {
    if (!record(v) || Object.keys(v).some((k) => !FIELDS.includes(k)) || v.v !== 1
        || typeof v.id !== 'string' || !HEX24.test(v.id) || !realtimeType(v.type)
        || !Number.isSafeInteger(v.schemaVersion) || Number(v.schemaVersion) < 1
        || typeof v.sender !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(v.sender)
        || !v.type.startsWith(v.sender.replaceAll('-', '_') + '.')
        || !date(v.sentAt) || !date(v.expiresAt) || Date.parse(v.expiresAt) <= Date.parse(v.sentAt)
        || !['guaranteed', 'fire_and_forget', 'broadcast'].includes(String(v.delivery))
        || !['low', 'normal', 'high', 'critical'].includes(String(v.priority))
        || !record(v.to) || Object.keys(v.to).some((k) => !['kind', 'topic'].includes(k))
        || !['player', 'session', 'app', 'topic'].includes(String(v.to.kind))
        || (v.to.kind === 'topic' ? !realtimeType(v.to.topic) : v.to.topic !== undefined)
        || ((v.delivery === 'broadcast') !== ['app', 'topic'].includes(String(v.to.kind)))
        || !record(v.payload) || !safe(v.payload))
        return false;
    if (v.delivery === 'guaranteed' ? !Number.isSafeInteger(v.seq) || Number(v.seq) < 1
        || typeof v.epoch !== 'string' || !HEX24.test(v.epoch)
        : v.seq !== undefined || v.epoch !== undefined)
        return false;
    if (v.collapseKey !== undefined && (typeof v.collapseKey !== 'string'
        || !/^[a-z0-9_.:-]{1,64}$/.test(v.collapseKey)))
        return false;
    if (v.rid !== undefined && (typeof v.rid !== 'string'
        || !/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|[0-9A-HJKMNP-TV-Z]{26})$/i.test(v.rid)))
        return false;
    if (v.causationId !== undefined && (typeof v.causationId !== 'string'
        || v.causationId.length < 1 || v.causationId.length > 128
        || !/^[A-Za-z0-9_.:-]+$/.test(v.causationId)))
        return false;
    if (v.filter !== undefined && (v.delivery !== 'broadcast' || !isValidFilter(v.filter)))
        return false;
    if (v.ref !== undefined && (!record(v.ref) || !realtimeType(v.ref.resource)
        || Object.keys(v.ref).some((k) => !['resource', 'version'].includes(k))
        || (v.ref.version !== undefined && (typeof v.ref.version !== 'string'
            || v.ref.version.length > 128))))
        return false;
    try {
        return new TextEncoder().encode(JSON.stringify(v.payload)).length <= 16384
            && new TextEncoder().encode(JSON.stringify(v)).length <= 20480;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=realtime.js.map
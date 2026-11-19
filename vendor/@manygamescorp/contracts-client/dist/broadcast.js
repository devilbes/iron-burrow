/** Standard realtime command payloads, corresponding to contracts-server/events/broadcast v1. */
export const BROADCAST_TYPES = [
    'configs.reload',
    'app.reload',
    'panel.announcement',
    'app.maintenance',
    'app.update.required',
];
const VERSION = /^(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})$/;
const object = (v) => !!v &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    Object.getPrototypeOf(v) === Object.prototype;
const str = (v, max) => typeof v === 'string' && v.length > 0 && v.length <= max;
const integer = (v, min, max) => Number.isSafeInteger(v) && v >= min && v <= max;
export function broadcastHttps(value) {
    if (!str(value, 2048))
        return false;
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && !url.username && !url.password;
    }
    catch {
        return false;
    }
}
const keys = (v, allowed) => Object.keys(v).every((k) => allowed.includes(k));
const timestamp = (v) => typeof v === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(v) &&
    Number.isFinite(Date.parse(v));
export function isBroadcastCommand(value) {
    if (!object(value) ||
        value.delivery !== 'broadcast' ||
        value.sender !== 'panel' ||
        value.schemaVersion !== 1 ||
        !object(value.payload))
        return false;
    const p = value.payload;
    switch (value.type) {
        case 'configs.reload':
            return keys(p, []);
        case 'app.reload':
            return (keys(p, ['delayMs', 'jitterMs']) &&
                integer(p['delayMs'], 1000, 300000) &&
                integer(p['jitterMs'], 1000, 300000));
        case 'panel.announcement': {
            if (!keys(p, [
                'title',
                'text',
                'imageUrl',
                'linkUrl',
                'displaySeconds',
                'translations',
            ]) ||
                !str(p['title'], 200) ||
                !str(p['text'], 4000) ||
                !integer(p['displaySeconds'], 1, 86400) ||
                (p['imageUrl'] !== undefined && !broadcastHttps(p['imageUrl'])) ||
                (p['linkUrl'] !== undefined && !broadcastHttps(p['linkUrl'])))
                return false;
            const translations = p['translations'];
            return (translations === undefined ||
                (Array.isArray(translations) &&
                    translations.length <= 20 &&
                    translations.every((t) => object(t) &&
                        keys(t, ['locale', 'title', 'text']) &&
                        str(t['locale'], 35) &&
                        /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(t['locale']) &&
                        str(t['title'], 200) &&
                        str(t['text'], 4000)) &&
                    new Set(translations.map((t) => t.locale)).size === translations.length));
        }
        case 'app.maintenance':
            return (keys(p, ['startsAt', 'endsAt', 'message']) &&
                timestamp(p['startsAt']) &&
                timestamp(p['endsAt']) &&
                Date.parse(p['endsAt']) > Date.parse(p['startsAt']) &&
                str(p['message'], 4000));
        case 'app.update.required':
            return (keys(p, ['minVersion', 'message', 'linkUrl']) &&
                typeof p['minVersion'] === 'string' &&
                VERSION.test(p['minVersion']) &&
                str(p['message'], 4000) &&
                (p['linkUrl'] === undefined || broadcastHttps(p['linkUrl'])));
        default:
            return false;
    }
}
export function needsBroadcastUpdate(current, minimum) {
    if (!current || !VERSION.test(current))
        return true;
    const a = current.split('.').map(Number);
    const b = minimum.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        if (a[i] < b[i])
            return true;
        if (a[i] > b[i])
            return false;
    }
    return false;
}
//# sourceMappingURL=broadcast.js.map
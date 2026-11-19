import { SDKError } from './error.js';
export const validNickname = (v) => typeof v === 'string'
    && /^[A-Za-z][A-Za-z0-9_]{2,23}$/.test(v);
const invalid = () => { throw new SDKError('SDK_AUTH_RESPONSE_INVALID', { module: 'auth' }); };
const object = (v) => v && typeof v === 'object' && !Array.isArray(v) ? v : invalid();
const remaining = (v) => Number.isSafeInteger(v) && v >= 0
    ? v : invalid();
const id = (v) => Number.isSafeInteger(v) && v > 0
    ? v : invalid();
const url = (v) => {
    if (v === null)
        return null;
    if (typeof v !== 'string' || v.length > 2048)
        return invalid();
    try {
        const parsed = new URL(v);
        if ((parsed.protocol === 'https:' || parsed.protocol === 'http:')
            && !parsed.username && !parsed.password)
            return v;
    }
    catch { }
    return invalid();
};
const date = (v) => v === null ? null
    : typeof v === 'string' && Number.isFinite(Date.parse(v)) ? v : invalid();
const crossFeatures = (v) => v === undefined ? false
    : typeof v === 'boolean' ? v : invalid();
const nickname = (v) => validNickname(v) ? v : invalid();
const isCursor = (v) => typeof v === 'string'
    && v.length <= 4096 && /^[A-Za-z0-9_-]+$/.test(v);
const cursor = (v) => v === null ? null : isCursor(v) ? v : invalid();
export function createAccountApi(request) {
    const call = (path, method, signal, body) => request({ module: 'auth', path, method, auth: 'required',
        ...(signal ? { signal } : {}), ...(body === undefined ? {} : { body }),
        maxResponseBytes: 65_536 });
    return {
        async checkMyNicknameAvailability(value, signal) {
            if (!validNickname(value))
                throw new SDKError('SDK_AUTH_INPUT_INVALID', { module: 'auth' });
            const v = object(await request({ module: 'auth', method: 'GET',
                path: '/v1/me/account/nickname/availability', auth: 'required', query: { nickname: value },
                ...(signal ? { signal } : {}), maxResponseBytes: 65_536 }));
            if (v.nickname !== value || typeof v.available !== 'boolean' || !Array.isArray(v.suggestions)
                || v.suggestions.length > 3 || !v.suggestions.every(validNickname))
                invalid();
            return Object.freeze({ nickname: value, available: v.available,
                suggestions: Object.freeze([...v.suggestions]) });
        },
        async getAccount(signal) {
            const v = object(await call('/v1/me/account', 'GET', signal));
            if (v.email !== null && (typeof v.email !== 'string' || v.email.length > 320))
                invalid();
            if (!Array.isArray(v.signInMethods) || !v.signInMethods.every((m) => ['email', 'phone', 'google', 'apple', 'facebook'].includes(String(m))))
                invalid();
            return Object.freeze({ nickname: nickname(v.nickname),
                nicknameChangesRemaining: remaining(v.nicknameChangesRemaining),
                email: v.email, signInMethods: Object.freeze([...v.signInMethods]),
                crossFeatures: crossFeatures(v.crossFeatures) });
        },
        async changeNickname(value, signal) {
            if (!validNickname(value))
                throw new SDKError('SDK_AUTH_INPUT_INVALID', { module: 'auth' });
            const v = object(await call('/v1/me/account/nickname', 'POST', signal, { nickname: value }));
            return Object.freeze({ nickname: nickname(v.nickname),
                nicknameChangesRemaining: remaining(v.nicknameChangesRemaining) });
        },
        async suggestNickname(signal) {
            const v = object(await call('/v1/me/account/nickname/suggestion', 'POST', signal));
            return Object.freeze({ nickname: nickname(v.nickname) });
        },
        async getGames(options = {}) {
            const limit = options.limit;
            if ((limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 10))
                || (options.cursor !== undefined && !isCursor(options.cursor))) {
                throw new SDKError('SDK_AUTH_INPUT_INVALID', { module: 'auth' });
            }
            const v = object(await request({ module: 'auth', method: 'GET', path: '/v1/me/games',
                auth: 'required', query: { ...(limit === undefined ? {} : { limit }),
                    ...(options.cursor ? { cursor: options.cursor } : {}) },
                ...(options.signal ? { signal: options.signal } : {}), maxResponseBytes: 65_536 }));
            if (!Array.isArray(v.items) || v.items.length > 10
                || (limit !== undefined && v.items.length > limit))
                invalid();
            const items = v.items.map((item) => {
                const g = object(item);
                const links = object(g.links);
                if (g.status !== 'active' || typeof g.playing !== 'boolean' || typeof g.name !== 'string'
                    || !g.name.length || g.name.length > 200)
                    invalid();
                const gid = g.gid === null ? null : id(g.gid);
                if (g.playing !== (gid !== null))
                    invalid();
                return Object.freeze({ appId: id(g.appId), name: g.name,
                    iconUrl: url(g.iconUrl), status: 'active', playing: g.playing, gid,
                    firstLoginAt: date(g.firstLoginAt), lastLoginAt: date(g.lastLoginAt),
                    links: Object.freeze({ web: url(links.web), googlePlay: url(links.googlePlay),
                        appStore: url(links.appStore) }) });
            });
            if (new Set(items.map((g) => g.appId)).size !== items.length)
                invalid();
            const nextCursor = cursor(v.nextCursor);
            if (nextCursor !== null && (!items.length
                || nextCursor === options.cursor))
                invalid();
            return Object.freeze({ items: Object.freeze(items), nextCursor });
        },
    };
}

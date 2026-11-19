import { SDKError } from '@manygamescorp/core/error';
export class LeaderboardsError extends SDKError {
    constructor(code, error) {
        super(code, { module: 'leaderboards', retryable: false,
            ...(error.httpStatus === undefined ? {} : { httpStatus: error.httpStatus }),
            ...(error.rid === undefined ? {} : { rid: error.rid }),
            ...(error.details === undefined ? {} : { details: error.details }), cause: error });
    }
}
const LEADERBOARD_KEY = /^[a-z0-9_-]{1,64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[47][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const RESERVED = new Set(['boards', 'definitions', 'presets', 'source-catalog', 'scores', 'init', 'me']);
function invalid(message) {
    throw new SDKError('VALIDATION_FAILED', { module: 'leaderboards', message });
}
function leaderboardKey(value) {
    if (typeof value !== 'string' || !LEADERBOARD_KEY.test(value) || RESERVED.has(value))
        invalid('Invalid leaderboardKey');
    return value;
}
function gid(value) {
    if (!Number.isSafeInteger(value) || value < 1)
        invalid('Invalid gid');
    return value;
}
function bounded(value, min, max, name) {
    if (!Number.isSafeInteger(value) || value < min || value > max) {
        invalid(`Invalid ${name}`);
    }
    return value;
}
function pageQuery(options = {}) {
    const { limit, cursor, order } = options;
    if (limit !== undefined)
        bounded(limit, 1, 100, 'limit');
    if (cursor !== undefined && (typeof cursor !== 'string' || cursor.length < 1
        || cursor.length > 256))
        invalid('Invalid cursor');
    if (order !== undefined && order !== 'asc' && order !== 'desc')
        invalid('Invalid order');
    return { limit, cursor, order };
}
function aroundQuery(options = {}) {
    if (options.radius !== undefined
        && (options.above !== undefined || options.below !== undefined)) {
        invalid('Use radius or above/below');
    }
    const above = options.above ?? options.radius;
    const below = options.below ?? options.radius;
    if (above !== undefined)
        bounded(above, 0, 50, 'above');
    if (below !== undefined)
        bounded(below, 0, 50, 'below');
    return { above, below };
}
function object(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function badResponse() {
    throw new SDKError('INTERNAL', { module: 'leaderboards', message: 'Invalid leaderboards response' });
}
function entry(value) {
    return object(value) && Number.isSafeInteger(value.gid) && value.gid > 0
        && Number.isSafeInteger(value.rank) && value.rank > 0
        && Number.isSafeInteger(value.score);
}
function rankValue(value) {
    return value === null || (Number.isSafeInteger(value) && value > 0);
}
function scoreValue(value) {
    return value === null || Number.isSafeInteger(value);
}
function asPage(value) {
    if (!object(value) || typeof value.boardId !== 'string' || typeof value.leaderboardKey !== 'string'
        || !['regional', 'clan'].includes(String(value.scope))
        || typeof value.value !== 'string' || !Number.isSafeInteger(value.total)
        || value.total < 0 || !['asc', 'desc'].includes(String(value.order))
        || !Array.isArray(value.items) || !value.items.every(entry)
        || (value.nextCursor !== null && typeof value.nextCursor !== 'string')
        || !object(value.me) || !rankValue(value.me.rank) || !scoreValue(value.me.score)
        || typeof value.serverTime !== 'string'
        || (value.expiresAt !== null && typeof value.expiresAt !== 'string'))
        badResponse();
    return value;
}
function asRank(value) {
    if (!object(value) || typeof value.boardId !== 'string' || !Number.isSafeInteger(value.gid)
        || !rankValue(value.rank) || !scoreValue(value.score))
        badResponse();
    return value;
}
function asAround(value) {
    const rank = asRank(value);
    if (!object(value) || !Array.isArray(value.entries) || !value.entries.every(entry))
        badResponse();
    return rank;
}
function asSubmission(value) {
    if (!object(value) || typeof value.leaderboardKey !== 'string' || !Number.isSafeInteger(value.gid)
        || !Array.isArray(value.boards) || !value.boards.every((board) => object(board) && typeof board.boardId === 'string'
        && ['regional', 'clan'].includes(String(board.scope))
        && typeof board.value === 'string'))
        badResponse();
    return value;
}
export function createLeaderboards(deps) {
    const controller = new AbortController();
    const lifetime = deps.signal
        ? AbortSignal.any([controller.signal, deps.signal]) : controller.signal;
    const ranks = new Map();
    const ensureActive = () => {
        if (lifetime.aborted)
            throw new SDKError('MODULE_NOT_ACTIVE', { module: 'leaderboards' });
    };
    const request = (spec) => {
        if (lifetime.aborted)
            return Promise.reject(new SDKError('MODULE_NOT_ACTIVE', {
                module: 'leaderboards'
            }));
        return deps.http.request({ ...spec, signal: lifetime }).then((result) => {
            ensureActive();
            return result;
        }).catch((error) => {
            ensureActive();
            if (error instanceof SDKError) {
                if (error.httpStatus === 410)
                    throw new LeaderboardsError('LEADERBOARDS_BOARD_EXPIRED', error);
                if (error.code === 'LEADERBOARD_NOT_STARTED' || error.code === 'LEADERBOARDS_BOARD_EXPIRED'
                    || error.code === 'INVALID_LEADERBOARD_KEY') {
                    throw new LeaderboardsError(error.code, error);
                }
            }
            throw error;
        });
    };
    const publish = (event) => {
        if (lifetime.aborted)
            return;
        try {
            deps.publish?.(event);
        }
        catch { }
    };
    const enrich = async (result) => {
        const profile = deps.profile;
        ensureActive();
        if (!profile)
            return result;
        const entries = 'items' in result ? result.items : result.entries;
        if (entries.length === 0)
            return result;
        try {
            const byGid = new Map();
            const gids = [...new Set(entries.map(({ gid: id }) => id))];
            for (let start = 0; start < gids.length; start += 100) {
                const found = await profile.query({ gids: gids.slice(start, start + 100) }, { signal: lifetime });
                ensureActive();
                for (const item of found.items)
                    byGid.set(item.gid, item);
            }
            const decorated = entries.map((item) => {
                const projected = byGid.get(item.gid);
                return projected ? { ...item, profile: projected } : item;
            });
            return ('items' in result ? { ...result, items: decorated }
                : { ...result, entries: decorated });
        }
        catch {
            ensureActive();
            return result;
        }
    };
    const changed = (id, rank) => {
        if (lifetime.aborted)
            return;
        const previous = ranks.get(id);
        ranks.delete(id);
        ranks.set(id, rank);
        if (ranks.size > 128)
            ranks.delete(ranks.keys().next().value);
        if (previous !== undefined && previous !== rank)
            publish({ name: 'leaderboards:rank:changed',
                payload: { boardId: id, rank, previousRank: previous } });
    };
    const fetchPage = async (id, options) => {
        const path = `/${id}`;
        const result = await enrich(asPage(await request({ method: 'GET', path,
            query: pageQuery(options) })));
        if (!lifetime.aborted) {
            publish({ name: 'leaderboards:board:fetched',
                payload: { boardId: result.boardId, leaderboardKey: result.leaderboardKey } });
            changed(result.boardId, result.me.rank);
        }
        return result;
    };
    const fetchAround = async (path, options, ownId) => {
        const result = await enrich(asAround(await request({ method: 'GET', path,
            query: aroundQuery(options) })));
        if (ownId)
            changed(result.boardId, result.rank);
        return result;
    };
    const fetchRank = async (path, mine) => {
        const result = asRank(await request({ method: 'GET', path }));
        if (mine)
            changed(result.boardId, result.rank);
        return result;
    };
    const clientAuthoritative = () => typeof deps.clientAuthoritative === 'function'
        ? deps.clientAuthoritative() === true : deps.clientAuthoritative === true;
    const submit = async (key, input) => {
        ensureActive();
        if (!clientAuthoritative()) {
            throw new SDKError('SDK_LEADERBOARD_CLIENT_SUBMIT_DISABLED', {
                module: 'leaderboards',
                message: 'Client score submission is disabled; scores arrive from server levels and progress.',
            });
        }
        const checked = leaderboardKey(key);
        if (!object(input) || !UUID.test(input.idempotencyKey)
            || typeof input.eventId !== 'string' || !/^[\x21-\x7e]{1,128}$/.test(input.eventId)
            || typeof input.occurredAt !== 'string'
            || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(input.occurredAt)
            || !Number.isFinite(Date.parse(input.occurredAt))
            || new Date(input.occurredAt).toISOString().slice(0, 19)
                !== input.occurredAt.slice(0, 19)
            || (input.scoreDelta === undefined) === (input.scoreValue === undefined)) {
            invalid('Invalid score submission');
        }
        const score = input.scoreDelta ?? input.scoreValue;
        if (!Number.isSafeInteger(score))
            invalid('Invalid score');
        const body = { ...(input.scoreDelta === undefined ? {} : { scoreDelta: input.scoreDelta }),
            ...(input.scoreValue === undefined ? {} : { scoreValue: input.scoreValue }),
            eventId: input.eventId, occurredAt: input.occurredAt };
        return request({ method: 'POST', path: `/${checked}/scores/me`, body,
            idempotencyKey: input.idempotencyKey }).then(asSubmission);
    };
    return {
        get canSubmit() { return !lifetime.aborted && clientAuthoritative(); },
        async get(id, options = {}) {
            return fetchPage(leaderboardKey(id), options);
        },
        async around(id, options = {}) {
            const checked = leaderboardKey(id);
            return fetchAround(`/${checked}/around/me`, options, checked);
        },
        async aroundOf(id, target, options = {}) {
            return fetchAround(`/${leaderboardKey(id)}/around/${gid(target)}`, options);
        },
        async rank(id) {
            const checked = leaderboardKey(id);
            return fetchRank(`/${checked}/ranks/me`, true);
        },
        async rankOf(id, target) {
            const checked = leaderboardKey(id);
            return fetchRank(`/${checked}/ranks/${gid(target)}`, false);
        },
        submit,
        submitScore: submit,
        dispose() { controller.abort(); ranks.clear(); },
    };
}

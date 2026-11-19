import { SDKError } from './error.js';
import { dataClient } from './data-client.js';
import { gidValue, invalidData, jsonCopy, onlyKeys, record, safeName, versionHeader } from './data-validation.js';
export const PUBLIC_PROFILE_TTL_MS = 300_000;
const BATCH = 100;
const MAX_QUERY_GIDS = 1_000;
const MAX_CACHED = 2_000;
const serverFields = new Set(['gid', 'uid', 'appId', 'version', 'createdAt', 'updatedAt',
    'lastSeenAt', 'uidUpdatedAt', 'projectionRevisions', 'nameModeration', 'level', 'score', 'xp',
    'coins', 'friendsCount', 'referralCode', 'gamesPlayed', 'gamesWon', 'totalScore', 'highestScore', 'winRate']);
const removedFields = new Set(['base', 'scopes', 'custom', 'paymentsData']);
function validatedPatch(patch) {
    if (!record(patch))
        invalidData();
    for (const key of Object.keys(patch)) {
        segment(key);
        if (serverFields.has(key) || removedFields.has(key))
            invalidData();
    }
    if ((patch.name !== undefined && typeof patch.name !== 'string')
        || (patch.locale !== undefined && typeof patch.locale !== 'string')
        || (patch.avatar !== undefined && patch.avatar !== null && typeof patch.avatar !== 'string')
        || (patch.country !== undefined && patch.country !== null && !/^[A-Z]{2}$/.test(patch.country)))
        invalidData();
    if (typeof patch.avatar === 'string') {
        let url;
        try {
            url = new URL(patch.avatar);
        }
        catch {
            invalidData();
        }
        if (url.protocol !== 'https:' || url.username || url.password)
            invalidData();
    }
    return jsonCopy(patch, 131_072);
}
function segment(name) {
    if (typeof name !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(name) || !safeName(name)) {
        invalidData();
    }
    return name;
}
function fieldPath(path) {
    if (typeof path !== 'string')
        invalidData();
    const parts = path.split(/[./]/);
    const [root] = parts;
    if (parts.length > 8 || removedFields.has(root ?? ''))
        invalidData();
    return parts.map(segment).join('.');
}
function ifMatch(version) {
    const header = versionHeader(version);
    return header === undefined ? {} : { ifMatch: header };
}
export function createProfile(http, now, signal, onOwn) {
    const lifetime = new AbortController();
    const sessionSignal = AbortSignal.any([lifetime.signal, ...(signal ? [signal] : [])]);
    const client = dataClient('profile', http, sessionSignal);
    const active = (caller) => {
        if (sessionSignal.aborted)
            throw new SDKError('MODULE_NOT_ACTIVE', { module: 'profile' });
        caller?.throwIfAborted();
    };
    const cache = new Map();
    let own;
    let ownRevision = 0;
    const rememberOwn = (value, etag) => {
        if (own && value.version < own.value.version)
            return;
        own = { value: structuredClone(value), etag };
        try {
            onOwn?.(own.value);
        }
        catch { }
    };
    const writeOwn = async (spec, caller) => {
        let etag = null;
        const value = await client.request({ ...spec,
            onResponse(meta) { etag = meta.etag; } }, caller);
        active(caller);
        ++ownRevision;
        rememberOwn(value, etag);
        return structuredClone(value);
    };
    let revision = 0;
    const fresh = (gid) => {
        const hit = cache.get(gid);
        return hit && now() - hit.at < PUBLIC_PROFILE_TTL_MS ? hit : undefined;
    };
    const remember = (gid, value, read) => {
        if ((cache.get(gid)?.revision ?? 0) > read)
            return;
        cache.delete(gid);
        cache.set(gid, { value, at: now(), revision: read });
        for (const oldest of cache.keys()) {
            if (cache.size <= MAX_CACHED)
                break;
            cache.delete(oldest);
        }
    };
    const notFound = () => new SDKError('NOT_FOUND', { httpStatus: 404, retryable: false });
    const lookup = async (gid, options) => {
        active(options.signal);
        const hit = options.force ? undefined : fresh(gid);
        if (hit) {
            if (hit.value === null)
                throw notFound();
            return structuredClone(hit.value);
        }
        const read = ++revision;
        try {
            const value = await client.request({ method: 'GET', path: `/${gid}` }, options.signal);
            active(options.signal);
            remember(gid, value, read);
            return structuredClone(value);
        }
        catch (error) {
            active(options.signal);
            if (error instanceof SDKError && error.code === 'NOT_FOUND')
                remember(gid, null, read);
            throw error;
        }
    };
    const batch = async (gids, options) => {
        active(options.signal);
        const values = new Map();
        const missing = gids.filter((gid) => {
            const hit = options.force ? undefined : fresh(gid);
            if (!hit)
                return true;
            values.set(gid, hit.value);
            return false;
        });
        for (let start = 0; start < missing.length; start += BATCH) {
            const chunk = missing.slice(start, start + BATCH);
            const read = ++revision;
            const { items } = await client.request({
                method: 'POST', path: '/query', body: { gids: chunk }
            }, options.signal);
            active(options.signal);
            const asked = new Set(chunk);
            const found = new Set();
            for (const item of Array.isArray(items) ? items : []) {
                if (typeof item !== 'object' || item === null || !asked.has(item.gid))
                    continue;
                found.add(item.gid);
                values.set(item.gid, item);
                remember(item.gid, item, read);
            }
            for (const gid of chunk)
                if (!found.has(gid)) {
                    values.set(gid, null);
                    remember(gid, null, read);
                }
        }
        return { items: gids.flatMap((gid) => {
                const value = values.get(gid);
                return value ? [structuredClone(value)] : [];
            }) };
    };
    return {
        async get(options = {}) {
            active(options.signal);
            const previous = own;
            const read = ownRevision;
            let status = 200;
            let etag = null;
            const value = await client.request({ method: 'GET', path: '/me',
                ...(previous?.etag ? { ifNoneMatch: previous.etag, acceptNotModified: true } : {}),
                onResponse(meta) { status = meta.status; etag = meta.etag; } }, options.signal);
            active(options.signal);
            if (status === 304) {
                if (!previous?.etag)
                    invalidData();
                return structuredClone(own?.value ?? previous.value);
            }
            if (read === ownRevision)
                rememberOwn(value, etag);
            return structuredClone(own?.value ?? value);
        },
        update(patch, options = {}) {
            return writeOwn({ method: 'PATCH', path: '/me', body: validatedPatch(patch),
                ...ifMatch(options.version) }, options.signal);
        },
        field(path, options = {}) {
            return client.request({ method: 'GET', path: `/me/fields/${fieldPath(path)}` }, options.signal);
        },
        setField(path, value, options = {}) {
            const canonical = fieldPath(path);
            const [root] = canonical.split('.');
            if (serverFields.has(root))
                invalidData();
            return client.request({ method: 'PUT',
                path: `/me/fields/${canonical}`,
                body: { value: jsonCopy(value, 131_072) }, ...ifMatch(options.version) }, options.signal)
                .then((result) => {
                active(options.signal);
                ++ownRevision;
                own = undefined;
                return result;
            });
        },
        replace(value, options) {
            if (options?.version === undefined)
                invalidData();
            return writeOwn({ method: 'PUT', path: '/me', body: validatedPatch(value),
                ...ifMatch(options.version) }, options.signal);
        },
        summary(gid, options = {}) {
            return client.request({ method: 'GET',
                path: gid === undefined ? '/me/summary' : `/${gidValue(gid)}/summary` }, options.signal);
        },
        byGid(gid, options = {}) {
            return lookup(gidValue(gid), options);
        },
        query(request, options = {}) {
            const { gids } = onlyKeys(request, ['gids']);
            if (!Array.isArray(gids) || gids.length < 1 || gids.length > MAX_QUERY_GIDS)
                invalidData();
            return batch([...new Set(gids.map(gidValue))], options);
        },
        dispose() { lifetime.abort(); client.dispose(); cache.clear(); own = undefined; },
    };
}

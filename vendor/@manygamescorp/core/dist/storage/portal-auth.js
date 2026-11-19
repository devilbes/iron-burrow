import { SDKError } from '../error.js';
import { localBackend, lockStorage, originTag } from './scoped.js';
const cancelled = () => new DOMException('Auth operation cancelled', 'AbortError');
export function createPortalAuth(options) {
    const { now, store, cookie } = options;
    if (options.refreshBeforeMs !== undefined && (!Number.isFinite(options.refreshBeforeMs)
        || options.refreshBeforeMs < 0))
        throw new TypeError('Invalid portal refresh settings');
    const ns = `mpg:portal:${originTag(options.api)}:auth:`;
    const key = `${ns}session`;
    const mark = `${ns}revoked`;
    const local = options.local ?? localBackend(`${ns}probe`);
    const durable = store.kind === 'insecure-web' || store.isAvailable();
    let value;
    let active = false;
    let disposed = false;
    let revision = 0;
    let timer;
    let request;
    let pending;
    let io = Promise.resolve();
    const queue = (run) => {
        const next = io.then(() => lockStorage(local, ns, run));
        io = next.catch(() => undefined);
        return next;
    };
    const getLocal = (name) => { try {
        return local.getItem(name);
    }
    catch {
        return null;
    } };
    const getCookie = (name) => {
        try {
            return cookie?.get(name);
        }
        catch {
            return undefined;
        }
    };
    const stopped = () => getLocal(mark) !== null || getCookie(mark) !== undefined;
    const current = (version) => !disposed && revision === version;
    const check = (version) => { if (!current(version))
        throw cancelled(); };
    const valid = (raw) => {
        try {
            return options.parse(JSON.parse(raw ?? ''), 0);
        }
        catch {
            return undefined;
        }
    };
    const encode = (next) => JSON.stringify({ jwt: next.jwt, ...next.session });
    const write = async (next) => {
        const raw = encode(next);
        try {
            local.setItem(key, raw);
        }
        catch { }
        try {
            cookie?.set(key, raw, Date.parse(next.session.expiresAt));
        }
        catch { }
        if (durable)
            await store.set(key, raw).catch(() => undefined);
    };
    const schedule = () => {
        clearTimeout(timer);
        if (!value || disposed)
            return;
        const remaining = Date.parse(value.session.expiresAt) - now();
        const lead = Math.min(options.refreshBeforeMs ?? remaining / 10, remaining / 2);
        if (remaining <= 0)
            return;
        timer = setTimeout(() => { void refresh().catch(() => undefined); }, Math.min(remaining - lead, 2_147_483_647));
    };
    const read = async (version) => {
        if (stopped() || (durable && await store.get(mark) !== undefined))
            return undefined;
        check(version);
        const candidates = [valid(getLocal(key)), valid(getCookie(key))];
        if (durable)
            candidates.push(valid(await store.get(key)));
        const found = candidates.find(candidate => candidate
            && Date.parse(candidate.session.expiresAt) > now())
            ?? candidates.find(candidate => candidate);
        check(version);
        if (stopped())
            return undefined;
        if (found)
            await write(found);
        check(version);
        return found;
    };
    async function load(force) {
        if (disposed)
            throw cancelled();
        active = true;
        if (pending)
            return pending;
        const version = revision;
        const operation = queue(async () => {
            check(version);
            const restored = await read(version);
            value = restored;
            if (!restored) {
                clearTimeout(timer);
                return undefined;
            }
            const remaining = Date.parse(restored.session.expiresAt) - now();
            const lead = options.refreshBeforeMs ?? Math.max(0, remaining / 10);
            if (!force && remaining > lead) {
                schedule();
                return restored.session;
            }
            request = new AbortController();
            try {
                const response = await options.transport.request({ module: 'auth', method: 'POST',
                    path: '/v1/auth/portal/refresh', auth: 'none', body: { idToken: restored.jwt },
                    signal: request.signal });
                check(version);
                if (stopped())
                    throw cancelled();
                const next = options.parse(response, now());
                if (next.session.uid !== restored.session.uid) {
                    throw new SDKError('SDK_AUTH_RESPONSE_INVALID', { module: 'auth', retryable: false });
                }
                await write(next);
                check(version);
                value = next;
                schedule();
                return next.session;
            }
            finally {
                request = undefined;
            }
        });
        pending = operation;
        try {
            return await operation;
        }
        finally {
            if (pending === operation)
                pending = undefined;
        }
    }
    const refresh = () => load(true);
    return {
        begin() { active = true; clearTimeout(timer); request?.abort(); return ++revision; },
        current,
        async save(next, version) {
            await queue(async () => {
                check(version);
                await write(next);
                check(version);
                local.removeItem(mark);
                cookie?.delete(mark);
                if (durable)
                    await store.delete(mark);
                check(version);
                value = next;
                schedule();
            });
        },
        restore: () => load(false),
        refresh,
        session() {
            return value && !stopped() && Date.parse(value.session.expiresAt) > now()
                ? value.session : undefined;
        },
        token() {
            return value && !stopped() && Date.parse(value.session.expiresAt) > now()
                ? { idToken: value.jwt } : undefined;
        },
        logout() {
            if (!active)
                return Promise.resolve();
            revision++;
            request?.abort();
            clearTimeout(timer);
            const until = value ? Date.parse(value.session.expiresAt) : now();
            value = undefined;
            return queue(async () => {
                const errors = [];
                const attempt = async (run) => {
                    try {
                        await run();
                    }
                    catch (error) {
                        errors.push(error);
                    }
                };
                await attempt(() => local.setItem(mark, '1'));
                await attempt(() => cookie?.set(mark, '1', until));
                if (durable)
                    await attempt(() => store.set(mark, '1'));
                await attempt(() => local.removeItem(key));
                await attempt(() => cookie?.delete(key));
                if (durable)
                    await attempt(() => store.delete(key));
                if (errors.length)
                    throw new SDKError('SDK_SECURE_STORE_FAILED', { module: 'auth' });
                await attempt(() => local.removeItem(mark));
                await attempt(() => cookie?.delete(mark));
                if (durable)
                    await attempt(() => store.delete(mark));
                if (errors.length)
                    throw new SDKError('SDK_SECURE_STORE_FAILED', { module: 'auth' });
            });
        },
        idle: () => io.then(() => undefined),
        dispose() {
            disposed = true;
            revision++;
            request?.abort();
            clearTimeout(timer);
            value = undefined;
        },
    };
}

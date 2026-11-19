import { bindPortalSession } from './portal-session.js';
import { createPortalAuth } from './storage/portal-auth.js';
import { createAccountApi } from './account-api.js';
import { randomUuid } from './context.js';
import { availableProviders, completeProvider, parseOAuthConfigResponse, reserveFacebookPopup } from './provider-auth.js';
import { normalizeDeviceId } from './device.js';
import { SDKError } from './error.js';
import { authCookie } from './storage/auth-cookie.js';
import { DEVICE, localBackend, lockStorage, watchStorage, storagePrefix } from './storage/scoped.js';
export const AUTH_IDENTITY_CHANGED = 'auth:identity:changed';
export const AUTH_PLAYER_CHANGED = 'auth:playerChanged';
export const AUTH_ACCOUNT_CHANGING = 'auth:account:changing';
export const AUTH_ACCOUNT_CHANGED = 'auth:account:changed';
export const AUTH_SWITCH_SAVE_MS = 5_000;
export const AUTH_SIGNIN_STARTED = 'auth:signin:started';
export const AUTH_CODE_SENT = 'auth:code:sent';
export const AUTH_SIGNIN_SUCCEEDED = 'auth:signin:succeeded';
export const AUTH_SIGNIN_FAILED = 'auth:signin:failed';
export const AUTH_LINKS_CHANGED = 'auth:links:changed';
export const AUTH_RESEND_MS = 60_000;
export const AUTH_PROVIDERS = Object.freeze(['google', 'apple', 'facebook']);
export function refusedById(error) {
    return error instanceof SDKError && error.httpStatus === 401 && error.code === 'UNAUTHORIZED';
}
const RESTORED = ['token', 'grace', 'device_key', 'device_id', 'legacy_did',
    'new_guest', 'social', 'portal'];
const MARK = 'revoked';
const tainted = new Set();
export function createAuth(options) {
    if (options.appId === undefined) {
        throw new SDKError('SDK_PLATFORM_APP_ID_REQUIRED', {
            message: 'Add the numeric application appId to platform.json', retryable: false,
        });
    }
    const { appId, transport, platform } = options;
    if (options.clientAuthoritative !== undefined && typeof options.clientAuthoritative !== 'boolean') {
        throw new SDKError('SDK_PLATFORM_CONFIG_INVALID', { retryable: false });
    }
    const clientAuthoritative = options.clientAuthoritative === true;
    const store = platform.secureStore;
    const now = options.now ?? Date.now;
    const before = options.refreshBeforeMs ?? 259_200_000;
    const cookie = platform.id !== 'cordova' ? authCookie(now) : undefined;
    const prefix = storagePrefix(options.appId, options.api);
    const ns = `${prefix}${DEVICE}:auth:`;
    const key = (name) => ns + name;
    const cookieRead = (name) => {
        try {
            return cookie?.get(key(name));
        }
        catch {
            return undefined;
        }
    };
    const cookieSession = (raw) => {
        cookie?.set(key('session'), raw, Date.parse(JSON.parse(raw).expiresAt));
    };
    const local = options.local ?? localBackend(`${ns}probe`);
    const hasStore = () => store.kind === 'insecure-web' || store.isAvailable();
    let current;
    let session;
    let pending;
    let controller;
    let epoch = 0;
    let disposed = false;
    let external = false;
    let providerController;
    let handoffController;
    let retryAt = 0;
    let revision = null;
    const readRevision = () => {
        try {
            return local.getItem(key('revision'));
        }
        catch {
            return revision;
        }
    };
    revision = readRevision();
    const advance = () => {
        const next = randomUuid();
        local.setItem(key('revision'), next);
        revision = next;
    };
    let io = Promise.resolve();
    const queue = (run) => {
        const next = io.then(() => lockStorage(local, ns, run));
        io = next.catch(() => undefined);
        return next;
    };
    const stale = (value) => Date.parse(value.expiresAt) - now() <= before;
    const checks = {
        session: (raw) => {
            try {
                return parse(JSON.parse(raw), appId);
            }
            catch {
                return undefined;
            }
        },
        'device-key': (raw) => (/^[\w-]{43}$/.test(raw) ? raw : undefined),
        did: (raw) => (/^[\w-]{1,64}$/.test(raw) ? raw : undefined),
    };
    const apply = (next, reason, force = false) => {
        const previousGid = current?.gid ?? null;
        current = next;
        session = next && Object.freeze({ clientAuthoritative, uid: next.uid, gid: next.gid,
            anonymous: next.an,
            geo: next.geo, expiresAt: next.expiresAt, restoredBy: next.restoredBy,
            ...(next.account ? { account: Object.freeze({ ...next.account }) } : {}) });
        options.onSession?.(session);
        const gid = next?.gid ?? null;
        if (force || gid !== previousGid) {
            options.emit?.(AUTH_IDENTITY_CHANGED, { previousGid, gid, reason });
        }
    };
    const read = (name, valid) => queue(async () => {
        const found = valid(local.getItem(key(name)) ?? '');
        if (found !== undefined) {
            if (hasStore() && await store.get(key(name)) !== local.getItem(key(name))) {
                await store.set(key(name), local.getItem(key(name))).catch(() => undefined);
            }
            return [found, false];
        }
        const raw = hasStore() ? await store.get(key(name)) : undefined;
        const restored = raw === undefined ? undefined : valid(raw);
        if (restored === undefined)
            return undefined;
        try {
            local.setItem(key(name), raw);
        }
        catch { }
        return [restored, true];
    });
    const settle = async (ops) => {
        const failed = (await Promise.allSettled(ops.map(async (op) => op())))
            .find((r) => r.status === 'rejected');
        if (failed)
            throw failed.reason;
    };
    const write = async (entries) => {
        let error;
        for (const [name, value] of entries) {
            try {
                local.setItem(key(name), value);
            }
            catch (cause) {
                error ??= cause;
            }
            if (name === 'session') {
                try {
                    cookieSession(value);
                }
                catch (cause) {
                    error ??= cause;
                }
            }
        }
        if (hasStore()) {
            await settle(entries.map(([name, value]) => () => store.set(key(name), value)));
        }
        if (error !== undefined)
            throw error;
    };
    const erase = async (keys) => {
        let error;
        for (const full of keys) {
            try {
                local.removeItem(full);
            }
            catch (cause) {
                error ??= cause;
            }
            if (full === key('session') || full === key(MARK)) {
                try {
                    cookie?.delete(full);
                }
                catch (cause) {
                    error ??= cause;
                }
            }
        }
        if (hasStore())
            await settle(keys.map((full) => () => store.delete(full)));
        if (error !== undefined)
            throw error;
    };
    const drop = (...names) => erase(names.map(key));
    let did;
    const deviceId = () => (did ??= (async () => {
        const vendor = normalizeDeviceId(await platform.device.vendorId().catch(() => undefined));
        if (vendor && /^[\w:-]{1,64}$/.test(vendor) && /[1-9a-z]/i.test(vendor))
            return vendor;
        const saved = await read('did', checks.did);
        if (saved)
            return saved[0];
        const next = randomUuid();
        await queue(() => write([['did', next]])).catch(() => undefined);
        return next;
    })().catch((error) => {
        did = undefined;
        throw error;
    }));
    const revoke = (...names) => {
        const expiresAt = current?.expiresAt;
        return queue(async () => {
            if (sync())
                return;
            tainted.add(ns);
            try {
                const saved = checks.session(cookieRead('session') ?? local.getItem(key('session')) ?? '');
                const until = Date.parse(expiresAt ?? saved?.expiresAt ?? '') || now() + 30 * 86_400_000;
                cookie?.set(key(MARK), '1', until);
            }
            catch { }
            try {
                local.setItem(key(MARK), '1');
                advance();
            }
            catch { }
            if (hasStore()) {
                await Promise.resolve().then(() => store.set(key(MARK), '1')).catch(() => undefined);
            }
            try {
                await drop(...names);
            }
            catch (error) {
                tainted.add(ns);
                throw error;
            }
            tainted.delete(ns);
            await drop(MARK).catch(() => undefined);
        });
    };
    const restore = () => queue(async () => {
        let marked = tainted.has(ns) || local.getItem(key(MARK)) !== null
            || cookieRead(MARK) !== undefined;
        if (!marked && hasStore())
            marked = await store.get(key(MARK)) !== undefined;
        if (marked)
            return [undefined, false, true];
        const valid = checks.session;
        const localRaw = local.getItem(key('session'));
        const cookieRaw = cookieRead('session');
        const found = valid(localRaw ?? '') ?? valid(cookieRaw ?? '');
        if (found) {
            const raw = valid(localRaw ?? '') ? localRaw : cookieRaw;
            try {
                local.setItem(key('session'), raw);
            }
            catch { }
            if (cookieRaw !== raw) {
                try {
                    cookieSession(raw);
                }
                catch { }
            }
            if (hasStore() && await store.get(key('session')) !== raw) {
                await store.set(key('session'), raw).catch(() => undefined);
            }
            return [found, false, false];
        }
        const raw = hasStore() ? await store.get(key('session')) : undefined;
        const restored = raw === undefined ? undefined : valid(raw);
        if (restored) {
            try {
                local.setItem(key('session'), raw);
            }
            catch { }
            try {
                cookieSession(raw);
            }
            catch { }
        }
        return [restored, true, false];
    });
    const client = () => {
        const device = platform.device.info();
        const ua = device.userAgent ?? '';
        const tag = device.language ?? '';
        const nativeOs = device.os?.toLowerCase();
        return {
            os: platform.id !== 'cordova' ? 3 : nativeOs === 'android' ? 2
                : nativeOs === 'ios' ? 1 : /Android/.test(ua) ? 2 : 1,
            ln: /^[a-z]{2,3}(-[A-Z]{2})?$/.test(tag) ? tag
                : /^[a-z]{2,3}(?![a-z])/i.exec(tag)?.[0].toLowerCase() ?? 'en',
        };
    };
    const run = (exchange) => {
        sync();
        if (exchange && external && !current) {
            return Promise.reject(new DOMException('Auth operation cancelled', 'AbortError'));
        }
        external = false;
        if (disposed)
            return Promise.reject(new SDKError('MODULE_NOT_ACTIVE', { module: 'auth' }));
        if (pending)
            return pending;
        const started = epoch;
        const abort = new AbortController();
        controller = abort;
        const live = () => {
            sync();
            if (started !== epoch)
                throw new DOMException('Auth operation cancelled', 'AbortError');
        };
        const result = (async () => {
            const portal = options.portal;
            const portalToken = await portal?.token(exchange ? 'refresh' : 'start');
            live();
            let stored = current;
            let keystore = false;
            let marked = false;
            if (!stored) {
                [stored, keystore, marked] = await restore();
                live();
            }
            if (portal?.ui.active() && !portalToken && stored && !stored.an)
                stored = undefined;
            const offline = !exchange;
            const from = keystore ? 'keystore' : 'storage';
            if (!portalToken && stored && offline && !stale(stored)) {
                apply({ ...stored, restoredBy: from }, 'init');
                live();
                return session;
            }
            const deviceKey = (await read('device-key', checks['device-key']))?.[0];
            const did = await deviceId();
            live();
            let response;
            try {
                response = parse(await transport.request({
                    module: 'auth', method: 'POST', path: portalToken ? '/v1/auth/portal/exchange' : '/v1/auth/init',
                    auth: 'none', signal: abort.signal,
                    body: portalToken ? { appId, idToken: portalToken.idToken, did,
                        ln: portal?.locale()?.locale ?? client().ln } : {
                        appId,
                        ...client(),
                        did,
                        ...(stored ? { tk: stored.jwt } : {}),
                        ...(deviceKey ? { deviceKey } : {}),
                    },
                }), appId);
            }
            catch (error) {
                live();
                if (refusedById(error)) {
                    const dropped = revoke('session', 'device-key').catch(() => undefined);
                    apply(undefined, exchange ? 'refresh' : 'init');
                    await dropped;
                }
                else if (!portalToken && stored && offline && error instanceof SDKError
                    && (error.retryable
                        || error.code === 'OFFLINE' || (error.httpStatus ?? 0) >= 500
                        || error.code === 'SDK_AUTH_RESPONSE_INVALID'
                        || error.code === 'TRANSPORT_RESPONSE_TOO_LARGE' || error.code.startsWith('HTTP_'))) {
                    apply({ ...stored, restoredBy: from }, 'init');
                    live();
                    return session;
                }
                throw error;
            }
            live();
            const { deviceKey: issued, restoredBy, ...next } = response;
            const written = queue(async () => {
                sync();
                if (started !== epoch)
                    return;
                await write([...(issued ? [['device-key', issued]] : []),
                    ['session', JSON.stringify(next)]]);
                if (marked || tainted.has(ns)) {
                    tainted.delete(ns);
                    await drop(MARK);
                }
                if (stored?.gid !== next.gid)
                    advance();
            }).catch(() => undefined);
            apply({ ...next, restoredBy }, exchange ? 'refresh' : 'init');
            if (!next.an)
                void save(next);
            live();
            await written;
            live();
            return session;
        })().finally(() => {
            if (pending === result)
                pending = undefined;
            if (controller === abort)
                controller = undefined;
        });
        pending = result;
        return result;
    };
    const cancel = () => {
        epoch += 1;
        handoffController?.abort();
        providerController?.abort();
        controller?.abort();
        pending = undefined;
    };
    const sync = () => {
        if (disposed)
            return false;
        const nextRevision = readRevision();
        if (nextRevision === revision)
            return false;
        revision = nextRevision;
        external = true;
        cancel();
        held = undefined;
        known = undefined;
        const next = local.getItem(key(MARK)) === null
            ? checks.session(local.getItem(key('session')) ?? '') : undefined;
        apply(next ? { ...next, restoredBy: 'storage' } : undefined, 'refresh', true);
        return true;
    };
    const unwatch = watchStorage(local, [key('revision'), key('session'), key(MARK)], () => { sync(); });
    let switching = 0;
    const renew = () => {
        if (!current || pending || disposed || external || switching || now() < retryAt)
            return;
        retryAt = now() + 60_000;
        run(true).catch(() => undefined);
    };
    const emit = (event, payload) => options.emit?.(event, payload);
    const alive = () => {
        if (disposed)
            throw new SDKError('MODULE_NOT_ACTIVE', { module: 'auth' });
    };
    let held;
    const savedList = async () => (await read('saved', (raw) => {
        try {
            const value = JSON.parse(raw);
            if (!Array.isArray(value))
                return undefined;
            return value.slice(0, 8).flatMap((item) => {
                const v = (item ?? {});
                if (!Number.isSafeInteger(v.uid) || v.uid < 1)
                    return [];
                let s;
                try {
                    s = v.s === undefined ? undefined : parse(v.s, appId);
                }
                catch {
                    s = undefined;
                }
                if (s && (s.uid !== v.uid || s.an))
                    s = undefined;
                const e = normalizeEmail(v.e);
                return [{ uid: v.uid, ...(s ? { s } : {}), ...(e ? { e } : {}) }];
            });
        }
        catch {
            return undefined;
        }
    }))?.[0] ?? [];
    const storeSaved = async (list) => {
        if (!list.length) {
            await erase([key('saved')]);
            return;
        }
        await write([['saved', JSON.stringify(list.slice(0, 8).map((item) => ({ uid: item.uid,
                    ...(item.s ? { s: { jwt: item.s.jwt, uid: item.s.uid, gid: item.s.gid, an: item.s.an,
                            geo: item.s.geo, expiresAt: item.s.expiresAt,
                            ...(item.s.account ? { account: item.s.account } : {}) } } : {}),
                    ...(item.e ? { e: item.e } : {}) })))]]);
    };
    const save = (next, email) => {
        if (!next || next.an)
            return Promise.resolve();
        return savedList().then(async (list) => {
            const old = list.find((item) => item.uid === next.uid);
            const e = email ?? old?.e;
            await storeSaved([{ uid: next.uid, s: next, ...(e ? { e } : {}) },
                ...list.filter((item) => item.uid !== next.uid)]);
        }).catch(() => undefined);
    };
    const unsave = (uid) => savedList().then((list) => storeSaved(list.map((item) => (item.uid === uid ? { uid, ...(item.e ? { e: item.e } : {}) } : item))))
        .catch(() => undefined);
    const rids = new Map();
    let known;
    const sent = new Map();
    const failed = (method, error) => emit(AUTH_SIGNIN_FAILED, { method, code: error instanceof SDKError ? error.code : 'SDK_AUTH_RESPONSE_INVALID' });
    const adopt = async (next, change) => {
        sync();
        cancel();
        const started = epoch;
        if (known && known.uid !== next.uid)
            known = undefined;
        if (current && current.uid !== next.uid)
            void save(current);
        const written = queue(async () => {
            sync();
            if (started !== epoch)
                return;
            await write([['session', JSON.stringify(next)]]);
            tainted.delete(ns);
            await drop(MARK);
            advance();
        }).catch(() => undefined);
        apply({ ...next, restoredBy: 'code' }, 'signin');
        if (change && session?.gid === change.gid)
            emit(AUTH_ACCOUNT_CHANGED, change);
        await written;
        if (started !== epoch || !session) {
            throw new DOMException('Auth operation cancelled', 'AbortError');
        }
        return session;
    };
    const remember = (owner, value) => {
        const links = parseLinks(value);
        if (owner && current?.uid === owner.uid) {
            known = { uid: owner.uid, links };
            emit(AUTH_LINKS_CHANGED, links);
        }
        return links;
    };
    const changing = new Set();
    const saveMs = options.switchSaveMs ?? AUTH_SWITCH_SAVE_MS;
    const bounded = async (run, stop) => {
        const abort = new AbortController();
        let timer;
        const end = () => { abort.abort(); };
        stop.addEventListener('abort', end, { once: true });
        const expired = new Promise((resolve) => {
            timer = setTimeout(() => { end(); resolve(); }, saveMs);
            abort.signal.addEventListener('abort', () => { resolve(); }, { once: true });
        });
        const work = Promise.resolve().then(() => run(abort.signal))
            .then(() => undefined, () => undefined);
        await Promise.race([work, expired]);
        clearTimeout(timer);
        stop.removeEventListener('abort', end);
        if (abort.signal.aborted) {
            await Promise.race([work, new Promise((resolve) => setTimeout(resolve, 0))]);
        }
    };
    const handoff = async (change, started) => {
        const stop = new AbortController();
        handoffController = stop;
        const valid = () => {
            sync();
            return !stop.signal.aborted && started === epoch && current?.gid === change.previousGid;
        };
        switching += 1;
        try {
            await bounded((signal) => options.beforeSwitch?.(signal), stop.signal);
            if (!valid())
                return;
            emit(AUTH_ACCOUNT_CHANGING, change);
            await bounded(() => Promise.all([...changing].map(async (listener) => {
                try {
                    await listener(change);
                }
                catch { }
            })), stop.signal);
        }
        finally {
            switching -= 1;
            if (handoffController === stop)
                handoffController = undefined;
        }
    };
    const registered = () => {
        alive();
        if (!current || current.an) {
            throw new SDKError('SDK_AUTH_EMAIL_REQUIRED', { module: 'auth', retryable: false });
        }
        return current;
    };
    const providerPlatform = async () => {
        if (platform.id !== 'cordova')
            return 'web';
        return client().os === 2 ? 'android' : 'ios';
    };
    const getProviderConfig = async (signal) => {
        alive();
        signal?.throwIfAborted();
        if (!current)
            await run(false);
        signal?.throwIfAborted();
        if (current && Date.parse(current.expiresAt) <= now())
            await run(true);
        alive();
        return parseOAuthConfigResponse(await transport.request({ module: 'auth', method: 'GET',
            path: '/v1/auth/oauth/config', auth: 'required',
            ...(signal === undefined ? {} : { signal }) }));
    };
    const providerResult = async (value) => {
        const parsed = parse(value, appId);
        if (parsed.an)
            throw new SDKError('SDK_AUTH_RESPONSE_INVALID', { module: 'auth', retryable: false });
        const v = value;
        if (v.conflict !== undefined && typeof v.conflict !== 'boolean')
            throw input();
        const conflict = v.conflict === true;
        const same = !conflict && current?.uid === parsed.uid && current.gid === parsed.gid;
        const upgradeType = same ? 'upgrade'
            : conflict ? 'switch' : current?.an ? 'migrate' : 'login';
        const { deviceKey: _deviceKey, restoredBy: _restoredBy, ...next } = parsed;
        const result = Object.freeze({ upgradeType, conflict, pending: !same,
            uid: next.uid, gid: next.gid });
        held = undefined;
        if (same)
            await adopt(next);
        else
            held = { next, result };
        emit(AUTH_SIGNIN_SUCCEEDED, { upgradeType, pending: !same, conflict });
        return result;
    };
    const providerFlow = async (provider, mode, flow = {}) => {
        alive();
        if (provider !== 'google' && provider !== 'facebook')
            throw input();
        if (providerController)
            throw new SDKError('SDK_AUTH_BUSY', { module: 'auth', retryable: false });
        const abort = new AbortController();
        providerController = abort;
        const forward = () => { abort.abort(); };
        flow.signal?.addEventListener('abort', forward, { once: true });
        if (flow.signal?.aborted)
            abort.abort();
        const timer = setTimeout(forward, 300_000);
        let popup;
        try {
            if (provider === 'facebook' && platform.id !== 'cordova'
                && !options.providerAdapters?.facebook)
                popup = reserveFacebookPopup();
            abort.signal.throwIfAborted();
            const config = await getProviderConfig(abort.signal);
            abort.signal.throwIfAborted();
            const providerTarget = await providerPlatform();
            const adapters = options.providerAdapters ?? {};
            if (!availableProviders(config, providerTarget, adapters).includes(provider)) {
                throw new SDKError('AUTH_PROVIDER_UNAVAILABLE', { module: 'auth' });
            }
            const owner = mode === 'link' ? registered() : current;
            const started = epoch;
            const live = () => {
                alive();
                abort.signal.throwIfAborted();
                if (started !== epoch || current?.uid !== owner.uid || current.gid !== owner.gid) {
                    throw new DOMException('Auth operation cancelled', 'AbortError');
                }
            };
            const value = await completeProvider({ transport, config, provider, mode, api: options.api,
                platform: providerTarget, adapters,
                signal: abort.signal,
                ...(flow.redirectUri === undefined ? {} : { redirectUri: flow.redirectUri }),
                now, live, ...(popup ? { popup } : {}) });
            live();
            if (mode === 'link')
                return remember(owner, value);
            const v = (typeof value === 'object' && value !== null ? value : {});
            if (v.emailRequired === true) {
                if (v.provider !== provider || typeof v.linkTicket !== 'string' || !v.linkTicket.length
                    || v.linkTicket.length > 8192)
                    throw input();
                return Object.freeze({ emailRequired: true, linkTicket: v.linkTicket, provider });
            }
            return await providerResult(value);
        }
        finally {
            popup?.close();
            clearTimeout(timer);
            flow.signal?.removeEventListener('abort', forward);
            if (providerController === abort)
                providerController = undefined;
        }
    };
    const accountApi = createAccountApi(async (spec) => {
        const owner = registered();
        const started = epoch;
        spec.signal?.throwIfAborted();
        const value = await transport.request(spec);
        alive();
        spec.signal?.throwIfAborted();
        if (started !== epoch || current?.uid !== owner.uid || current.gid !== owner.gid) {
            throw new DOMException('Auth operation cancelled', 'AbortError');
        }
        return value;
    });
    const portalAuth = createPortalAuth({ api: options.api, local: options.local,
        store, cookie: platform.id === 'cordova' ? undefined : authCookie(now, 'origin'), now, transport,
        parse: parsePortalSession, refreshBeforeMs: options.refreshBeforeMs });
    async function code(request) {
        const audience = request?.audience;
        if (audience !== undefined && audience !== 'portal')
            throw input();
        if (audience === 'portal') {
            alive();
            const { rid, code: otp } = request;
            if (!uuid(rid) || typeof otp !== 'string' || !/^\d{6}$/.test(otp))
                throw input();
            const revision = portalAuth.begin();
            const started = epoch;
            try {
                const value = await transport.request({ module: 'auth', method: 'POST',
                    path: '/v1/auth/code', auth: 'none', body: { appId, os: client().os,
                        rid, code: otp, audience: 'portal' } });
                alive();
                sync();
                if (!portalAuth.current(revision) || started !== epoch) {
                    throw new DOMException('Auth operation cancelled', 'AbortError');
                }
                const parsed = parsePortalSession(value, now());
                await portalAuth.save(parsed, revision);
                rids.delete(rid);
                return parsed.session;
            }
            catch (error) {
                failed('email', error);
                throw error;
            }
        }
        alive();
        const { rid, code } = (request ?? {});
        if (!uuid(rid) || typeof code !== 'string' || !/^\d{6}$/.test(code))
            throw input();
        held = undefined;
        let parsed;
        try {
            parsed = parseCode(await transport.request({ module: 'auth', method: 'POST',
                path: '/v1/auth/code', auth: 'none', body: { appId, os: client().os, rid, code,
                    ...(current ? { tk: current.jwt } : {}) } }), appId);
        }
        catch (error) {
            failed('email', error);
            throw error;
        }
        alive();
        const { next, upgradeType, conflict, linked } = parsed;
        const same = !conflict && current?.uid === next.uid && current.gid === next.gid;
        const result = Object.freeze({ upgradeType, conflict, pending: !same,
            uid: next.uid, gid: next.gid, ...(linked ? { linked } : {}) });
        const email = rids.get(rid);
        rids.delete(rid);
        if (same) {
            await adopt(next);
            await save(next, email);
            if (linked && upgradeType === 'upgrade')
                remember(next, { providers: linked, an: false });
        }
        else
            held = { next, result, ...(email ? { email } : {}) };
        emit(AUTH_SIGNIN_SUCCEEDED, { upgradeType, pending: !same, conflict });
        return result;
    }
    const api = Object.freeze({
        ...accountApi,
        get session() { sync(); return session; },
        get portalSession() { return portalAuth.session(); },
        restorePortal: () => portalAuth.restore(),
        refreshPortal: () => portalAuth.refresh(),
        get pending() { return held?.result; },
        init: () => run(false),
        refresh: () => run(true),
        logout: async () => {
            const portalCleared = portalAuth.logout();
            if (sync() || external) {
                await portalCleared;
                return;
            }
            cancel();
            held = undefined;
            known = undefined;
            const kept = save(current);
            const forgotten = revoke('session');
            apply(undefined, 'logout');
            await Promise.all([forgotten, kept, portalCleared]);
        },
        signin: async (request) => {
            alive();
            const email = normalizeEmail(request?.email);
            const child = request?.child;
            const linkTicket = request?.linkTicket;
            if (linkTicket !== undefined && (typeof linkTicket !== 'string' || !linkTicket.length
                || linkTicket.length > 8192))
                throw input();
            if (email === undefined || (child !== undefined && typeof child !== 'boolean'))
                throw input();
            const wait = (sent.get(email) ?? 0) - now();
            if (wait > 0) {
                throw new SDKError('SDK_AUTH_RESEND_TOO_EARLY', { module: 'auth', retryable: false,
                    retryAfterMs: wait, safeParams: { seconds: Math.ceil(wait / 1000) } });
            }
            emit(AUTH_SIGNIN_STARTED, { method: 'email' });
            let value;
            try {
                const did = linkTicket === undefined ? undefined : await deviceId();
                value = await transport.request({ module: 'auth', method: 'POST', path: '/v1/auth/signin',
                    auth: 'none', idempotent: true, body: { appId, ...client(), email, ...(child ? { child } : {}),
                        ...(linkTicket === undefined ? {} : { linkTicket, did }),
                        ...(current ? { tk: current.jwt } : {}) } });
            }
            catch (error) {
                failed('email', error);
                throw error;
            }
            const v = (typeof value === 'object' && value !== null ? value : {});
            if (!uuid(v.rid) || typeof v.expiresAt !== 'string' || v.expiresAt.length > 64
                || !Number.isFinite(Date.parse(v.expiresAt))) {
                const error = new SDKError('SDK_AUTH_RESPONSE_INVALID', { module: 'auth', retryable: false });
                failed('email', error);
                throw error;
            }
            const resendAt = now() + AUTH_RESEND_MS;
            sent.delete(email);
            sent.set(email, resendAt);
            rids.set(v.rid, email);
            for (const old of rids.keys()) {
                if (rids.size <= 8)
                    break;
                rids.delete(old);
            }
            for (const old of sent.keys()) {
                if (sent.size <= 8)
                    break;
                sent.delete(old);
            }
            emit(AUTH_CODE_SENT, { method: 'email', resendAt });
            return Object.freeze({ rid: v.rid, expiresAt: v.expiresAt, resendAt });
        },
        code,
        confirm: async () => {
            alive();
            const target = held;
            if (!target)
                throw new SDKError('SDK_AUTH_NO_PENDING', { module: 'auth', retryable: false });
            held = undefined;
            const previousGid = current?.gid;
            if (previousGid === undefined || previousGid === target.next.gid) {
                const adopted = await adopt(target.next);
                await save(target.next, target.email);
                return adopted;
            }
            const change = Object.freeze({ previousGid, gid: target.next.gid });
            const started = epoch;
            await handoff(change, started);
            alive();
            sync();
            if (started !== epoch || current?.gid !== previousGid) {
                throw new DOMException('Auth operation cancelled', 'AbortError');
            }
            const adopted = await adopt(target.next, change);
            await save(target.next, target.email);
            return adopted;
        },
        onAccountChanging: (listener) => {
            if (typeof listener !== 'function')
                throw input();
            changing.add(listener);
            return () => { changing.delete(listener); };
        },
        discard: () => { held = undefined; },
        resume: async (uid) => {
            alive();
            if (!Number.isSafeInteger(uid) || uid < 1)
                throw input();
            sync();
            if (current?.uid === uid && session)
                return session;
            const saved = (await savedList()).find((item) => item.uid === uid)?.s;
            alive();
            const none = () => new SDKError('SDK_AUTH_NO_SAVED_SESSION', { module: 'auth', retryable: false });
            if (!saved)
                throw none();
            const deviceKey = (await read('device-key', checks['device-key']))?.[0];
            const did = await deviceId();
            let next;
            try {
                const { deviceKey: _issued, restoredBy: _by, ...renewed } = parse(await transport.request({
                    module: 'auth', method: 'POST', path: '/v1/auth/init', auth: 'none',
                    body: { appId, ...client(), did, tk: saved.jwt, ...(deviceKey ? { deviceKey } : {}) },
                }), appId);
                next = renewed;
            }
            catch (error) {
                if (refusedById(error)) {
                    await unsave(uid);
                    throw none();
                }
                throw error;
            }
            alive();
            if (next.uid !== uid || next.an) {
                await unsave(uid);
                throw none();
            }
            held = { next, result: Object.freeze({ upgradeType: 'login', conflict: false,
                    pending: true, uid: next.uid, gid: next.gid }) };
            return api.confirm();
        },
        savedEmail: async (uid) => (await savedList().catch(() => [])).find((item) => item.uid === uid)?.e,
        forgetSaved: () => storeSaved([]),
        links: () => (known && current?.uid === known.uid ? known.links : undefined),
        getProviderConfig,
        availableProviders: async () => availableProviders(await getProviderConfig(), await providerPlatform(), options.providerAdapters ?? {}),
        signinWithProvider: (provider, flow) => providerFlow(provider, 'signin', flow),
        linkProvider: (provider, flow) => providerFlow(provider, 'link', flow),
        cancelProvider: () => { providerController?.abort(); },
        link: async (request) => {
            const { pr, et, nonce } = (request ?? {});
            if (pr !== 'apple' || typeof et !== 'string' || !et.length || et.length > 4096
                || (nonce !== undefined && (typeof nonce !== 'string' || !nonce.length
                    || nonce.length > 256)))
                throw input();
            const owner = registered();
            return remember(owner, await transport.request({ module: 'auth', method: 'POST',
                path: '/v1/auth/me/links', idempotent: true,
                body: { pr, et, ...(nonce === undefined ? {} : { nonce }) } }));
        },
        unlink: async (pr) => {
            if (!provider(pr))
                throw input();
            const owner = registered();
            return remember(owner, await transport.request({ module: 'auth', method: 'DELETE',
                path: `/v1/auth/me/links/${pr}` }));
        },
    });
    bindPortalSession(api, async () => {
        await portalAuth.restore();
        return portalAuth.token();
    });
    return Object.freeze({
        api,
        storageCurrent() { sync(); return !external; },
        token() {
            sync();
            if (current && stale(current))
                renew();
            return current?.jwt;
        },
        unauthorized(token) {
            sync();
            if (current?.jwt === token)
                renew();
        },
        deviceId,
        idle: async () => { await io; await portalAuth.idle(); },
        dispose() {
            portalAuth.dispose();
            unwatch();
            disposed = true;
            held = undefined;
            cancel();
        },
    });
}
const input = () => new SDKError('SDK_AUTH_INPUT_INVALID', { module: 'auth',
    retryable: false });
const uuid = (value) => typeof value === 'string'
    && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value);
const provider = (value) => AUTH_PROVIDERS.includes(value);
export function normalizeEmail(value) {
    if (typeof value !== 'string')
        return undefined;
    const email = value.trim().toLowerCase();
    return email.length <= 128 && /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email) ? email : undefined;
}
function parseCode(value, appId) {
    const v = (typeof value === 'object' && value !== null ? value : {});
    const { upgradeType, conflict } = v;
    const linked = v.linked === undefined || v.linked === null ? undefined
        : parseLinks({ providers: v.linked }).providers;
    const { jwt, uid, gid, an, geo, expiresAt, account } = parse({ ...v,
        restoredBy: undefined, deviceKey: undefined }, appId);
    const next = { jwt, uid, gid, an, geo, expiresAt,
        ...(account ? { account } : {}) };
    if (next.an || typeof conflict !== 'boolean' || !['upgrade', 'migrate', 'switch', 'login']
        .includes(upgradeType)) {
        throw new SDKError('SDK_AUTH_RESPONSE_INVALID', { module: 'auth', retryable: false });
    }
    return { next, upgradeType: upgradeType, conflict,
        ...(linked ? { linked } : {}) };
}
function parseLinks(value) {
    const v = (typeof value === 'object' && value !== null ? value : {});
    const { providers, an } = v;
    if (!Array.isArray(providers) || providers.length > AUTH_PROVIDERS.length
        || !providers.every(provider) || new Set(providers).size !== providers.length
        || (an !== undefined && typeof an !== 'boolean')) {
        throw new SDKError('SDK_AUTH_RESPONSE_INVALID', { module: 'auth', retryable: false });
    }
    return Object.freeze({ providers: Object.freeze([...providers]), anonymous: an === true });
}
function parse(value, appId) {
    const v = (typeof value === 'object' && value !== null ? value : {});
    const id = (n) => Number.isSafeInteger(n) && n > 0;
    const { jwt, uid, gid, an, geo, expiresAt, restoredBy, deviceKey } = v;
    const account = parseAccount(v.account);
    if (account !== null
        && typeof jwt === 'string' && jwt.length <= 4096 && /^[\w-]+\.([\w-]+)\.[\w-]+$/.test(jwt)
        && id(uid) && id(gid) && typeof an === 'boolean'
        && typeof geo === 'string' && /^[A-Za-z]{0,8}$/.test(geo)
        && typeof expiresAt === 'string' && expiresAt.length <= 64 && Number.isFinite(Date.parse(expiresAt))
        && (restoredBy === undefined || RESTORED.includes(restoredBy))
        && (deviceKey === undefined || (typeof deviceKey === 'string' && /^[\w-]{43}$/.test(deviceKey)))) {
        let claims;
        try {
            const bytes = Uint8Array.from(atob(jwt.split('.')[1].replace(/-/g, '+')
                .replace(/_/g, '/')), (c) => c.charCodeAt(0));
            claims = JSON.parse(new TextDecoder().decode(bytes));
        }
        catch { }
        if (id(appId) && claims?.appId === appId && claims.gid === gid) {
            return { jwt, uid, gid, an, geo, expiresAt,
                restoredBy: (restoredBy ?? 'token'),
                ...(account ? { account } : {}),
                ...(deviceKey === undefined ? {} : { deviceKey: deviceKey }) };
        }
    }
    throw new SDKError('SDK_AUTH_RESPONSE_INVALID', { module: 'auth', retryable: false });
}
function parseAccount(value) {
    if (value === undefined)
        return undefined;
    const v = (typeof value === 'object' && value !== null ? value : {});
    const time = (n) => Number.isSafeInteger(n) && n >= 0;
    return time(v.registeredAt) && time(v.lastLoginAt)
        ? { registeredAt: v.registeredAt, lastLoginAt: v.lastLoginAt } : null;
}
function parsePortalSession(value, now) {
    const invalid = () => {
        throw new SDKError('SDK_AUTH_RESPONSE_INVALID', { module: 'auth', retryable: false });
    };
    if (!value || typeof value !== 'object')
        return invalid();
    const { jwt, uid, expiresAt } = value;
    if (typeof jwt !== 'string' || jwt.length > 4096
        || !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(jwt)
        || !Number.isSafeInteger(uid) || uid <= 0
        || typeof expiresAt !== 'string' || expiresAt.length > 64
        || !Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= now)
        return invalid();
    try {
        const payload = jwt.split('.')[1];
        const bytes = Uint8Array.from(atob(payload.replace(/-/g, '+').replace(/_/g, '/')), (character) => character.charCodeAt(0));
        const claims = JSON.parse(new TextDecoder().decode(bytes));
        if (!claims || typeof claims !== 'object' || Array.isArray(claims))
            return invalid();
        const c = claims;
        if (c.aud !== 'portal' || c.uid !== uid || Object.hasOwn(c, 'gid')
            || Object.hasOwn(c, 'appId')
            || typeof c.exp !== 'number' || !Number.isSafeInteger(c.exp)
            || c.exp * 1000 !== Date.parse(expiresAt))
            return invalid();
        return { jwt, session: Object.freeze({ uid: uid, audience: 'portal', expiresAt }) };
    }
    catch {
        return invalid();
    }
}

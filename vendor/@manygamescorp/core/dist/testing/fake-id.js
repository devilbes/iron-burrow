import { validNickname } from '../account-api.js';
import { randomUuid } from '../context.js';
const DAY = 86_400_000;
const PROVIDERS = ['google', 'apple', 'facebook'];
function b64url(value) {
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_')
        .replace(/=+$/, '');
}
export class FakeId {
    mails = [];
    calls = [];
    appId;
    now;
    ttl;
    users = new Map();
    profiles = new Map();
    tokens = new Map();
    otps = new Map();
    cooldown = new Map();
    signins = new Map();
    failures = new Map();
    webLink;
    games;
    crossFeatures;
    nextUid = 1000;
    nextGid = 500;
    serial = 0;
    constructor(options) {
        this.appId = options.appId;
        this.webLink = options.webLink ?? null;
        this.games = options.games ?? [];
        this.crossFeatures = options.crossFeatures ?? false;
        this.now = options.now ?? Date.now;
        this.ttl = options.codeTtlMs ?? 600_000;
    }
    account(email, options = {}) {
        const user = { uid: ++this.nextUid, email: email.trim().toLowerCase(),
            providers: new Set(options.providers ?? []) };
        this.users.set(user.uid, user);
        if (options.profile !== false)
            this.profiles.set(user.uid, ++this.nextGid);
        return { uid: user.uid, gid: this.profiles.get(user.uid) };
    }
    fail(path, code, status, retryAfterSec) {
        this.failures.set(path, { code, status,
            ...(retryAfterSec === undefined ? {} : { retryAfter: retryAfterSec }) });
    }
    lastMail(email) {
        return [...this.mails].reverse().find((mail) => email === undefined
            || mail.email === email.trim().toLowerCase());
    }
    fetch = async (input, init = {}) => {
        const url = new URL(input instanceof Request ? input.url : String(input));
        const method = (init.method ?? 'GET').toUpperCase();
        this.calls.push({ method, path: url.pathname });
        const failure = this.failures.get(url.pathname);
        if (failure) {
            this.failures.delete(url.pathname);
            return this.error(failure.code, failure.status, {}, failure.retryAfter);
        }
        const body = typeof init.body === 'string' ? JSON.parse(init.body) : {};
        const bearer = new Headers(init.headers).get('Authorization')?.replace(/^Bearer /, '');
        if (method === 'POST' && url.pathname === '/v1/auth/init')
            return this.init(body);
        if (method === 'POST' && url.pathname === '/v1/auth/signin') {
            return this.signin(body, new Headers(init.headers).get('Idempotency-Key'));
        }
        if (method === 'POST' && url.pathname === '/v1/auth/code')
            return this.code(body);
        const caller = bearer === undefined ? undefined : this.tokens.get(bearer);
        if (url.pathname.startsWith('/v1/me/')) {
            if (!caller)
                return this.error('UNAUTHORIZED', 401);
            const user = this.users.get(caller.uid);
            user.nickname ??= `Explorer_${randomUuid().slice(0, 8)}`;
            if (method === 'GET' && url.pathname === '/v1/me/account')
                return this.json({
                    nickname: user.nickname, nicknameChangesRemaining: user.changed ? 0 : 1,
                    email: user.email ?? null, signInMethods: [...(user.email ? ['email'] : []), ...user.providers],
                    crossFeatures: this.crossFeatures
                });
            if (method === 'GET' && url.pathname === '/v1/me/account/nickname/availability') {
                const nickname = url.searchParams.get('nickname');
                if (!validNickname(nickname))
                    return this.error('VALIDATION_FAILED', 400);
                const available = ![...this.users.values()].some((other) => other.uid !== user.uid
                    && other.nickname?.toLowerCase() === nickname.toLowerCase());
                return this.json({ nickname, available,
                    suggestions: available ? [] : [`StarFox_${++this.serial}`] });
            }
            if (method === 'POST' && url.pathname === '/v1/me/account/nickname/suggestion') {
                return this.json({ nickname: `StarFox_${++this.serial}` });
            }
            if (method === 'POST' && url.pathname === '/v1/me/account/nickname') {
                if (!validNickname(body.nickname))
                    return this.error('VALIDATION_FAILED', 400);
                if (body.nickname !== user.nickname) {
                    if (user.changed)
                        return this.error('ACCOUNT_NICKNAME_LIMIT', 409);
                    if ([...this.users.values()].some((other) => other.uid !== user.uid
                        && other.nickname?.toLowerCase() === body.nickname.toLowerCase())) {
                        return this.error('ACCOUNT_NICKNAME_TAKEN', 409);
                    }
                    user.nickname = body.nickname;
                    user.changed = true;
                }
                return this.json({ nickname: user.nickname, nicknameChangesRemaining: user.changed ? 0 : 1 });
            }
            if (method === 'GET' && url.pathname === '/v1/me/games') {
                const cursor = url.searchParams.get('cursor');
                if (url.searchParams.has('after') || (cursor !== null && !/^page_[0-9]+$/.test(cursor))) {
                    return this.error('VALIDATION_FAILED', 400);
                }
                const offset = cursor === null ? 0 : Number(cursor.slice(5));
                const limit = Number(url.searchParams.get('limit') ?? 10);
                const games = this.games.length ? this.games : [{
                        appId: this.appId, name: String(this.appId), iconUrl: null, status: 'active',
                        links: { web: this.webLink, googlePlay: null, appStore: null },
                        playing: true, gid: caller.gid, firstLoginAt: new Date(this.now()).toISOString(),
                        lastLoginAt: new Date(this.now()).toISOString()
                    }];
                const rest = games.slice(offset);
                const items = rest.slice(0, limit);
                return this.json({ items, nextCursor: rest.length > limit ? `page_${offset + items.length}` : null });
            }
        }
        if (url.pathname.startsWith('/v1/auth/me') || url.pathname === '/v1/auth/logout') {
            if (!caller)
                return this.error('UNAUTHORIZED', 401);
            if (method === 'POST' && url.pathname === '/v1/auth/logout')
                return this.json({});
            const user = this.users.get(caller.uid);
            if (method === 'POST' && url.pathname === '/v1/auth/me/links') {
                const pr = body.pr;
                if (!PROVIDERS.includes(pr) || typeof body.et !== 'string') {
                    return this.error('VALIDATION_FAILED', 400);
                }
                if (body.et === 'taken')
                    return this.error('AUTH_LINK_CONFLICT', 409);
                user.providers.add(pr);
                return this.json(this.links(user));
            }
            const unlink = /^\/v1\/auth\/me\/links\/([a-z]+)$/.exec(url.pathname);
            if (method === 'DELETE' && unlink && PROVIDERS.includes(unlink[1])) {
                const pr = unlink[1];
                if (!user.providers.has(pr))
                    return this.error('NOT_FOUND', 404);
                if (!user.email && user.providers.size === 1)
                    return this.error('AUTH_LAST_SIGNIN_METHOD', 409);
                user.providers.delete(pr);
                return this.json({ providers: [...user.providers] });
            }
        }
        return this.error('NOT_FOUND', 404);
    };
    init(body) {
        if (Object.hasOwn(body, 'app') || !Number.isSafeInteger(body.appId)
            || body.appId < 1)
            return this.error('VALIDATION_FAILED', 400);
        if (body.appId !== this.appId)
            return this.error('AUTH_APP_UNAVAILABLE', 403);
        const known = typeof body.tk === 'string' ? this.tokens.get(body.tk) : undefined;
        if (typeof body.tk === 'string' && !known)
            return this.error('UNAUTHORIZED', 401);
        if (known)
            return this.json(this.session(known.uid, known.gid, { restoredBy: 'token' }));
        const user = { uid: ++this.nextUid, email: undefined, providers: new Set() };
        this.users.set(user.uid, user);
        this.profiles.set(user.uid, ++this.nextGid);
        return this.json(this.session(user.uid, this.profiles.get(user.uid), { restoredBy: 'new_guest', deviceKey: 'd'.repeat(39) + String(this.nextGid).padStart(4, '0') }));
    }
    signin(body, idempotencyKey) {
        if (Object.hasOwn(body, 'app') || !Number.isSafeInteger(body.appId)
            || body.appId < 1)
            return this.error('VALIDATION_FAILED', 400);
        if (body.appId !== this.appId)
            return this.error('AUTH_APP_UNAVAILABLE', 403);
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            return this.error('VALIDATION_FAILED', 400);
        const guest = typeof body.tk === 'string' ? this.tokens.get(body.tk) : undefined;
        const key = guest && idempotencyKey ? `${guest.gid}:${idempotencyKey}` : undefined;
        for (const [old, snapshot] of this.signins) {
            if (snapshot.until <= this.now())
                this.signins.delete(old);
        }
        const canonical = { ...body, email };
        const fingerprint = JSON.stringify(canonical, Object.keys(canonical).sort());
        const previous = key === undefined ? undefined : this.signins.get(key);
        if (previous) {
            return previous.body === fingerprint ? this.json(previous.result)
                : this.error('IDEMPOTENCY_KEY_CONFLICT', 409);
        }
        const wait = (this.cooldown.get(email) ?? 0) - this.now();
        if (wait > 0)
            return this.error('RATE_LIMITED', 429, {}, Math.ceil(wait / 1000));
        this.cooldown.set(email, this.now() + 60_000);
        const rid = randomUuid();
        const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000)
            .padStart(6, '0');
        const expiresAt = this.now() + this.ttl;
        this.otps.set(rid, { email, uid: guest?.uid, code, expiresAt, attempts: 0 });
        this.mails.push(Object.freeze({ rid, email, code, child: body.child === true }));
        const result = { rid, expiresAt: new Date(expiresAt).toISOString() };
        if (key !== undefined) {
            this.signins.set(key, { body: fingerprint, until: this.now() + DAY, result });
        }
        return this.json(result);
    }
    code(body) {
        if (Object.hasOwn(body, 'app') || !Number.isSafeInteger(body.appId)
            || body.appId < 1)
            return this.error('VALIDATION_FAILED', 400);
        if (body.appId !== this.appId)
            return this.error('AUTH_APP_UNAVAILABLE', 403);
        const otp = typeof body.rid === 'string' ? this.otps.get(body.rid) : undefined;
        if (!otp)
            return this.error('AUTH_CODE_INVALID', 400);
        if (this.now() > otp.expiresAt)
            return this.error('AUTH_CODE_EXPIRED', 400);
        if (otp.attempts >= 5)
            return this.error('AUTH_CODE_ATTEMPTS_EXCEEDED', 400);
        if (body.code !== otp.code) {
            otp.attempts += 1;
            return otp.attempts >= 5 ? this.error('AUTH_CODE_ATTEMPTS_EXCEEDED', 400)
                : this.error('AUTH_CODE_INVALID', 400, { attemptsLeft: 5 - otp.attempts });
        }
        this.otps.delete(body.rid);
        const caller = typeof body.tk === 'string' ? this.tokens.get(body.tk) : undefined;
        const guest = caller && caller.uid === otp.uid ? this.users.get(caller.uid) : undefined;
        const isGuest = guest !== undefined && !guest.email && guest.providers.size === 0;
        const found = [...this.users.values()].find((user) => user.email === otp.email);
        let user;
        let upgradeType;
        let conflict = false;
        if (found) {
            user = found;
            conflict = isGuest && this.profiles.has(found.uid);
            upgradeType = guest ? 'switch' : 'login';
        }
        else if (isGuest && guest) {
            guest.email = otp.email;
            user = guest;
            upgradeType = 'upgrade';
        }
        else {
            user = { uid: ++this.nextUid, email: otp.email, providers: new Set() };
            this.users.set(user.uid, user);
            upgradeType = guest ? 'switch' : 'login';
        }
        if (!this.profiles.has(user.uid))
            this.profiles.set(user.uid, ++this.nextGid);
        const gid = this.profiles.get(user.uid);
        return this.json({ ...this.session(user.uid, gid, {}), upgradeType, migrated: false, conflict,
            guestGid: upgradeType === 'switch' && caller ? caller.gid : null,
            targetGid: upgradeType === 'switch' && caller ? gid : null });
    }
    session(uid, gid, extra) {
        const now = this.now();
        const jwt = `${b64url({ alg: 'EdDSA', kid: 'fake' })}.${b64url({ appId: this.appId, uid, gid,
            os: 'web', n: ++this.serial })}.ZmFrZQ`;
        this.tokens.set(jwt, { uid, gid });
        const user = this.users.get(uid);
        return { uid, gid, jwt, at: Math.floor(now / 1000) + 30 * 86_400,
            expiresAt: new Date(now + 30 * DAY).toISOString(),
            an: !user?.email && !user?.providers.size, geo: '', geoReg: '',
            reg: new Date(now).toISOString(), ms: null, mc: null, ...extra };
    }
    links(user) {
        return { providers: [...user.providers], an: !user.email && user.providers.size === 0 };
    }
    json(value, status = 200, headers = {}) {
        return new Response(JSON.stringify(value), { status,
            headers: { 'Content-Type': 'application/json', ...headers } });
    }
    error(code, status, details = {}, retryAfter) {
        return this.json({ code, msg: code, rid: randomUuid().replace(/-/g, ''), details }, status, retryAfter === undefined ? {} : { 'Retry-After': String(retryAfter) });
    }
}

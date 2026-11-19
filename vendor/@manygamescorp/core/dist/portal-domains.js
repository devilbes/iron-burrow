import { setPortalCore } from './portal-core.js';
import { PortalBusError } from './portal-bus.js';
import { portalRecord } from './portal-protocol.js';
import { canonicalLocale } from './l10n/locale.js';
import { readPortalSession } from './portal-session.js';
const schema = (valid) => ({
    safeParse(value) {
        return portalRecord(value) && valid(value)
            ? { success: true, data: value } : { success: false };
    },
});
const empty = schema((v) => Object.keys(v).length === 0);
const oneOf = (value, choices) => typeof value === 'string' && choices.includes(value);
const localeSchema = schema((v) => typeof v.locale === 'string' && v.locale.length <= 64
    && canonicalLocale(v.locale) !== undefined && Array.isArray(v.fallback) && v.fallback.length <= 16
    && v.fallback.every((tag) => typeof tag === 'string' && tag.length <= 64
        && canonicalLocale(tag) !== undefined));
const tokenSchema = schema((v) => {
    if (Object.keys(v).length !== 1 || typeof v.idToken !== 'string' || v.idToken.length > 4096
        || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(v.idToken))
        return false;
    try {
        const payload = v.idToken.split('.')[1];
        const bytes = Uint8Array.from(atob(payload.replace(/-/g, '+').replace(/_/g, '/')), (character) => character.charCodeAt(0));
        const claims = JSON.parse(new TextDecoder().decode(bytes));
        return portalRecord(claims) && claims.aud === 'portal' && !Object.hasOwn(claims, 'gid');
    }
    catch {
        return false;
    }
});
const auth = { ns: 'auth', versions: [1], schemas: {
        'token.get': schema((v) => oneOf(v.reason, ['start', 'refresh'])),
        'state.changed': schema((v) => oneOf(v.state, ['signedIn', 'signedOut', 'switched'])),
    }, responseSchemas: { 'token.get': tokenSchema }, topics: ['state.changed'] };
const locale = { ns: 'locale', versions: [1], schemas: {
        get: empty, changed: localeSchema,
    }, responseSchemas: { get: localeSchema }, topics: ['changed'] };
const ui = { ns: 'ui', versions: [1], schemas: {
        'game.ready': empty,
        'game.error': schema((v) => typeof v.code === 'string' && /^[A-Z][A-Z0-9_]{0,99}$/.test(v.code)
            && v.message === 'Game unavailable'),
        'id.open': schema((v) => oneOf(v.screen, ['account', 'signin', 'links'])),
        'fullscreen.request': empty, exit: empty, visibility: schema((v) => typeof v.hidden === 'boolean'),
    }, responseSchemas: {
        'id.open': schema((v) => oneOf(v.result, ['closed', 'signedIn', 'signedOut'])),
        'fullscreen.request': schema((v) => typeof v.active === 'boolean'),
    }, topics: ['visibility'], timeouts: { 'id.open': 0 } };
export function registerPortalHostDomains(bus, host) {
    if (!!host.auth === !!host.token)
        throw new PortalBusError('PAYLOAD_INVALID');
    bus.register({ ...auth, handlers: {
            'token.get': async (payload, ctx) => {
                if (host.auth) {
                    const token = await readPortalSession(host.auth);
                    if (!token)
                        throw new PortalBusError('auth.NOT_SIGNED_IN');
                    return token;
                }
                return host.token(payload.reason, ctx.signal);
            },
        } });
    bus.register({ ...locale, handlers: { get: () => host.locale() } });
    bus.register({ ...ui, handlers: {
            'id.open': (payload, ctx) => host.openId(payload.screen, ctx.signal),
            'fullscreen.request': (_payload, ctx) => host.fullscreen(ctx.signal),
        } });
    const off = [bus.on('ui', 'game.ready', () => host.gameReady?.()),
        bus.on('ui', 'game.error', (payload) => host.gameError?.(payload)),
        bus.on('ui', 'exit', () => host.exit?.())];
    return () => { for (const stop of off)
        stop(); };
}
export function registerPortalGameDomains(endpoint, bus, start, dispose) {
    bus.register(auth);
    bus.register(locale);
    bus.register(ui);
    let currentLocale;
    let closed = false;
    let callbacks;
    let starting;
    const active = () => !closed && bus.status === 'ready';
    const core = {
        ui: Object.freeze({ active,
            openId: (screen) => bus.request('ui', 'id.open', { screen }),
            fullscreen: () => bus.request('ui', 'fullscreen.request'),
            exit: () => bus.emit('ui', 'exit'), }),
        start() {
            return starting ??= (async () => {
                const capabilities = await start();
                if (!capabilities || closed)
                    return;
                if (capabilities.locale) {
                    let revision = 0;
                    await bus.subscribe('locale', 'changed', (payload) => {
                        revision++;
                        currentLocale = payload;
                        callbacks?.locale();
                    });
                    const seen = revision;
                    const initial = await bus.request('locale', 'get');
                    if (!closed && seen === revision)
                        currentLocale = initial;
                }
                if (capabilities.auth)
                    await bus.subscribe('auth', 'state.changed', (payload) => callbacks?.auth(payload.state));
                if (capabilities.ui)
                    await bus.subscribe('ui', 'visibility', (payload) => callbacks?.visibility(payload.hidden));
            })();
        },
        locale: () => currentLocale,
        async token(reason) {
            if (!active() || !bus.capabilities.auth)
                return;
            try {
                return await bus.request('auth', 'token.get', { reason });
            }
            catch (error) {
                if (error instanceof PortalBusError && error.code === 'auth.NOT_SIGNED_IN')
                    return;
                throw error;
            }
        },
        listen(value) { callbacks = value; },
        ready() { if (active() && bus.capabilities.ui)
            bus.emit('ui', 'game.ready'); },
        error() {
            if (active() && bus.capabilities.ui) {
                try {
                    bus.emit('ui', 'game.error', { code: 'GAME_ERROR', message: 'Game unavailable' });
                }
                catch { }
            }
        },
        dispose() { closed = true; callbacks = undefined; currentLocale = undefined; dispose(); },
    };
    setPortalCore(endpoint, core);
}

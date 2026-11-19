import { validNickname } from './account-api.js';
import { normalizeEmail } from './auth.js';
import { SDKError } from './error.js';
export const AUTH_EMAIL_REQUIRED = 'auth:email:required';
export const AUTH_FLOW_INTENTS = Object.freeze(['provider', 'submit-email',
    'submit-code', 'resend-code', 'change-email', 'paste-code', 'confirm-switch', 'cancel', 'link',
    'unlink', 'logout', 'logout-all', 'delete-account', 'back', 'retry-player', 'restart-game',
    'signin-again', 'continue-guest', 'account-screen', 'account-more',
    'account-retry', 'account-switch', 'account-logout', 'copy-gid', 'nickname-save', 'nickname-suggest', 'nickname-check']);
export function maskEmail(email) {
    const at = email.lastIndexOf('@');
    return `${email.slice(0, Math.min(1, at))}***${email.slice(at)}`;
}
export function createAuthFlow(options) {
    const { auth } = options;
    const now = options.now ?? Date.now;
    const listeners = new Set();
    let state = Object.freeze({ step: 'closed', providers: Object.freeze([]),
        busy: false, conflict: false, created: false, linked: Object.freeze([]),
        linkable: Object.freeze([]), child: options.child === true });
    let email;
    let rid;
    let linkTicket;
    let disposed = false;
    let gen = 0;
    let accountRequest;
    let nicknameTimer;
    let nicknameRequest;
    let nicknameGen = 0;
    let nextNicknameCheck = 0;
    let gamesCursorCreatedAt = 0;
    let gamesCursorTimer;
    const clearAccount = () => {
        accountRequest?.abort();
        accountRequest = undefined;
        clearTimeout(nicknameTimer);
        nicknameTimer = undefined;
        nicknameRequest?.abort();
        nicknameRequest = undefined;
        nicknameGen++;
    };
    const emptyAccount = { accountDetails: undefined, games: undefined, gamesCursor: undefined,
        nicknameDraft: undefined, nicknameAvailability: undefined, nicknameChecking: false,
        accountCopied: false, accountScreen: 'home' };
    const live = (g) => !disposed && g === gen;
    let openingGid = auth.session?.gid;
    let available = [];
    let runtimeProviders = [];
    const providerAdapters = new Map();
    for (const adapter of options.providers?.adapters ?? []) {
        if (!/^[a-z][a-z0-9-]{0,63}$/.test(adapter.id) || adapter.id === 'email'
            || adapter.id === 'google' || adapter.id === 'facebook' || providerAdapters.has(adapter.id))
            throw new Error('Invalid or duplicate auth provider adapter');
        providerAdapters.set(adapter.id, adapter);
    }
    let known;
    const set = (patch) => {
        if (disposed)
            return;
        state = Object.freeze({ ...state, ...patch });
        for (const listener of [...listeners]) {
            try {
                listener(state);
            }
            catch { }
        }
    };
    const fail = (error, patch = {}) => {
        const code = error instanceof SDKError ? error.code : 'SDK_AUTH_RESPONSE_INVALID';
        const left = error instanceof SDKError ? error.details?.attemptsLeft : undefined;
        set({ ...patch, busy: false, error: Object.freeze({ code,
                ...(error instanceof SDKError && error.retryAfterMs !== undefined
                    ? { retryAfterMs: error.retryAfterMs } : {}),
                ...(Number.isInteger(left) ? { attemptsLeft: left } : {}) }) });
    };
    const account = () => {
        const session = auth.session;
        return session && Object.freeze({ uid: session.uid, gid: session.gid,
            anonymous: session.anonymous });
    };
    const profile = () => {
        const linked = auth.links()?.providers ?? [];
        const uid = auth.session?.uid;
        return { step: 'profile', account: account(), linked: Object.freeze([...linked]),
            maskedEmail: known && known.uid === uid ? known.masked : undefined,
            linkable: Object.freeze(available.filter((pr) => !linked.includes(pr)
                && (runtimeProviders.includes(pr) || providerAdapters.get(pr)?.link))) };
    };
    const drop = (result) => {
        if (result.pending && auth.pending === result)
            auth.discard();
    };
    const finish = async (g, found, created = false) => {
        if (!live(g))
            return;
        if (found.gid !== openingGid && options.waitForPlayerReady) {
            set({ step: 'loading-player', busy: true, account: found, error: undefined });
            const wait = options.waitForPlayerReady;
            let timer;
            try {
                await Promise.race([wait(found.gid), new Promise((_, reject) => {
                        timer = setTimeout(() => reject(new SDKError('TIMEOUT', { module: 'auth' })), options.playerReadyTimeoutMs ?? 12_000);
                    })]);
            }
            catch (error) {
                if (live(g))
                    fail(error);
                return;
            }
            finally {
                clearTimeout(timer);
            }
            if (!live(g))
                return;
        }
        set({ ...emptyAccount, step: 'done', busy: false, account: found, created, conflict: false, error: undefined });
    };
    const signedIn = async (g, result) => {
        if (!live(g)) {
            drop(result);
            return;
        }
        rid = undefined;
        linkTicket = undefined;
        if (state.maskedEmail)
            known = { uid: result.uid, masked: state.maskedEmail };
        const found = Object.freeze({ uid: result.uid, gid: result.gid, anonymous: false,
            upgradeType: result.upgradeType });
        if (result.pending)
            set({ step: 'confirm', busy: false, account: found, conflict: result.conflict, error: undefined });
        else
            await finish(g, found, result.upgradeType === 'upgrade');
    };
    const send = async (target) => {
        const g = ++gen;
        set({ busy: true, error: undefined });
        try {
            const sent = await auth.signin({ email: target, ...(state.child ? { child: true } : {}),
                ...(linkTicket === undefined ? {} : { linkTicket }) });
            if (!live(g))
                return;
            email = target;
            rid = sent.rid;
            set({ step: 'code', busy: false, maskedEmail: maskEmail(target), resendAt: sent.resendAt,
                code: undefined, codeSource: undefined });
        }
        catch (error) {
            if (!live(g))
                return;
            fail(error, error instanceof SDKError && error.code === 'SDK_AUTH_RESEND_TOO_EARLY'
                && error.retryAfterMs !== undefined ? { resendAt: now() + error.retryAfterMs } : {});
        }
    };
    const submit = async (code, source) => {
        if (rid === undefined)
            return;
        const g = ++gen;
        set({ busy: true, error: undefined, ...(source ? { code, codeSource: source } : {}) });
        try {
            await signedIn(g, await auth.code({ rid, code }));
        }
        catch (error) {
            if (live(g))
                fail(error);
        }
    };
    const string = (payload, key) => (typeof payload?.[key] === 'string' ? payload[key] : undefined);
    const loadAccount = async () => {
        clearAccount();
        clearTimeout(gamesCursorTimer);
        const g = ++gen;
        const abort = new AbortController();
        accountRequest = abort;
        set({ ...emptyAccount, ...profile(), busy: !auth.session?.anonymous, error: undefined });
        if (!auth.session || auth.session.anonymous)
            return;
        try {
            const details = await auth.getAccount(abort.signal);
            if (live(g))
                set({ accountDetails: details, busy: false });
        }
        catch (error) {
            if (live(g))
                fail(error);
        }
    };
    const accountAction = async (run) => {
        if (state.step !== 'profile')
            return;
        clearAccount();
        const g = ++gen;
        const abort = new AbortController();
        accountRequest = abort;
        set({ busy: true, error: undefined, nicknameChecking: false, nicknameAvailability: undefined });
        try {
            const patch = await run(abort.signal);
            if (live(g))
                set({ ...patch, busy: false });
        }
        catch (error) {
            if (live(g))
                fail(error);
        }
    };
    let switching = false;
    const own = async (run) => {
        switching = true;
        try {
            await run();
        }
        finally {
            switching = false;
        }
    };
    const unsubscribePlayer = options.subscribePlayerChanged?.(() => {
        clearAccount();
        if (switching)
            return;
        gen++;
        set({ ...emptyAccount, account: account(), busy: false, error: undefined });
        if (state.step === 'profile')
            void loadAccount();
    });
    const unsubscribeEnded = options.subscribeSessionEnded?.(() => {
        if (disposed)
            return;
        close();
        set({ step: 'signed-out', account: undefined, linked: [], linkable: [] });
    });
    const guest = async (g) => {
        set({ step: 'loading-player', busy: true, error: undefined });
        if (!auth.session)
            await auth.init();
        const current = account();
        if (current)
            await finish(g, current);
    };
    const handlers = {
        'copy-gid': async () => {
            if (state.step !== 'profile' || !auth.session)
                return;
            const g = gen;
            const gid = auth.session.gid;
            try {
                if (!options.writeClipboard)
                    throw new SDKError('SDK_NOT_IMPLEMENTED', { module: 'auth' });
                await options.writeClipboard(String(gid));
                if (live(g) && auth.session?.gid === gid)
                    set({ accountCopied: true, error: undefined });
            }
            catch (error) {
                if (live(g))
                    fail(error);
            }
        },
        'account-retry': () => loadAccount(),
        'account-screen': async (payload) => {
            if (state.step !== 'profile')
                return;
            const screen = string(payload, 'screen');
            if (!['home', 'games', 'catalog', 'currency', 'friends', 'settings', 'nickname', 'logout']
                .includes(screen))
                return;
            if (['games', 'catalog', 'currency'].includes(screen)
                && state.accountDetails?.crossFeatures !== true)
                return;
            clearAccount();
            gen++;
            set({ nicknameAvailability: undefined, nicknameChecking: false, accountScreen: screen,
                accountCopied: false, error: undefined,
                nicknameDraft: undefined });
            if ((screen === 'games' || screen === 'catalog') && state.games === undefined)
                await handlers['account-more']();
        },
        'account-more': () => accountAction(async (signal) => {
            if (state.gamesCursor === null)
                return {};
            let current = state.gamesCursor;
            let restart = state.games !== undefined && (current === undefined
                || (current !== null && now() - gamesCursorCreatedAt >= 86_400_000));
            if (restart)
                current = undefined;
            let page;
            try {
                page = await auth.getGames({
                    ...(current ? { cursor: current } : {}), signal
                });
            }
            catch (error) {
                if (!current || !(error instanceof SDKError) || error.code !== 'VALIDATION_FAILED')
                    throw error;
                restart = true;
                page = await auth.getGames({ signal });
            }
            if (!current || restart) {
                gamesCursorCreatedAt = now();
                clearTimeout(gamesCursorTimer);
                gamesCursorTimer = setTimeout(() => { set({ gamesCursor: undefined }); }, 86_400_000);
            }
            if (page.nextCursor === null)
                clearTimeout(gamesCursorTimer);
            const previous = restart ? [] : (state.games ?? []);
            const seen = new Set(previous.map((g) => g.appId));
            if (page.nextCursor !== null && !restart && page.nextCursor === current) {
                throw new SDKError('SDK_AUTH_RESPONSE_INVALID', { module: 'auth' });
            }
            return { games: Object.freeze([...previous,
                    ...page.items.filter((g) => !seen.has(g.appId))]),
                gamesCursor: page.nextCursor !== null && now() - gamesCursorCreatedAt >= 86_400_000
                    ? undefined : page.nextCursor };
        }),
        'nickname-check': (payload) => {
            if (state.step !== 'profile' || state.accountScreen !== 'nickname')
                return;
            clearAccount();
            const value = string(payload, 'nickname');
            set({ nicknameAvailability: undefined, nicknameChecking: validNickname(value),
                error: undefined });
            if (!validNickname(value))
                return;
            const checkGen = nicknameGen;
            const g = gen;
            nicknameTimer = setTimeout(() => {
                const abort = new AbortController();
                nicknameRequest = abort;
                nextNicknameCheck = now() + 2000;
                void auth.checkMyNicknameAvailability(value, abort.signal).then((result) => {
                    if (live(g) && checkGen === nicknameGen) {
                        set({ nicknameAvailability: result, nicknameChecking: false });
                    }
                }).catch((error) => {
                    if (live(g) && checkGen === nicknameGen) {
                        if (error instanceof SDKError && error.retryAfterMs !== undefined) {
                            nextNicknameCheck = now() + error.retryAfterMs;
                        }
                        fail(error, { nicknameChecking: false });
                    }
                });
            }, Math.max(350, nextNicknameCheck - now()));
        },
        'nickname-suggest': async () => {
            await accountAction(async (signal) => ({
                nicknameDraft: (await auth.suggestNickname(signal)).nickname
            }));
            handlers['nickname-check']({ nickname: state.nicknameDraft });
        },
        'nickname-save': (payload) => accountAction(async (signal) => {
            const nick = string(payload, 'nickname');
            if (!nick || !state.accountDetails)
                return {};
            const result = await auth.changeNickname(nick, signal);
            return { accountDetails: Object.freeze({ ...state.accountDetails, ...result }),
                accountScreen: 'nickname-success', nicknameDraft: undefined };
        }),
        'account-switch': () => {
            if (state.step !== 'profile')
                return;
            close();
            set({ step: 'start', account: account() });
        },
        'account-logout': async () => {
            if (state.step !== 'profile' || state.accountScreen !== 'logout')
                return;
            await accountAction(async () => {
                await auth.logout();
                await auth.init();
                if (options.waitForPlayerReady && auth.session) {
                    await options.waitForPlayerReady(auth.session.gid);
                }
                return { ...emptyAccount, ...profile() };
            });
        },
        provider: async (payload) => {
            const pr = string(payload, 'pr');
            if (pr === 'email') {
                gen++;
                linkTicket = undefined;
                const hint = normalizeEmail(payload?.['email']);
                set({ step: 'email', emailRequired: undefined, error: undefined, emailHint: hint });
                return;
            }
            if (!pr || !state.providers.includes(pr))
                return;
            const g = ++gen;
            linkTicket = undefined;
            set({ busy: true, emailRequired: undefined, error: undefined });
            try {
                const adapter = providerAdapters.get(pr);
                const result = adapter ? await adapter.signin()
                    : await auth.signinWithProvider(pr);
                if (!('emailRequired' in result))
                    await signedIn(g, result);
                else if (live(g)) {
                    linkTicket = 'linkTicket' in result && typeof result.linkTicket === 'string'
                        ? result.linkTicket : undefined;
                    set({ step: 'email-required', busy: false, emailRequired: pr });
                    options.emit?.(AUTH_EMAIL_REQUIRED, { provider: pr });
                }
            }
            catch (error) {
                if (live(g))
                    fail(error, { step: 'start' });
            }
        },
        'submit-email': async (payload) => {
            if (state.step === 'email-required' && linkTicket === undefined) {
                fail(new SDKError('SDK_NOT_IMPLEMENTED', { module: 'auth', retryable: false }));
                return;
            }
            if (state.step !== 'email' && state.step !== 'email-required')
                return;
            const target = normalizeEmail(string(payload, 'email'));
            if (target === undefined) {
                fail(new SDKError('SDK_AUTH_INPUT_INVALID', { module: 'auth', retryable: false }));
                return;
            }
            await send(target);
        },
        'submit-code': async (payload) => {
            const code = string(payload, 'code');
            if (state.step !== 'code' || code === undefined || !/^\d{6}$/.test(code))
                return;
            await submit(code);
        },
        'resend-code': async () => {
            if (state.step !== 'code' || email === undefined)
                return;
            if (state.resendAt !== undefined && now() < state.resendAt)
                return;
            await send(email);
        },
        'retry-player': async () => {
            if (state.step !== 'loading-player')
                return;
            const g = ++gen;
            try {
                if (!auth.session)
                    await auth.init();
                const current = account() ?? state.account;
                if (current)
                    await finish(g, current);
            }
            catch (error) {
                if (live(g))
                    fail(error);
            }
        },
        back: () => {
            if (state.step !== 'email' && state.step !== 'email-required')
                return;
            gen++;
            linkTicket = undefined;
            set({ step: 'start', emailRequired: undefined, error: undefined });
        },
        'change-email': () => {
            if (state.step !== 'code')
                return;
            gen++;
            rid = undefined;
            set({ step: 'email', error: undefined, code: undefined, codeSource: undefined });
        },
        'paste-code': async () => {
            if (state.step !== 'code' || !options.readClipboard)
                return;
            const g = gen;
            let text;
            try {
                text = await options.readClipboard();
            }
            catch {
                text = undefined;
            }
            if (!live(g))
                return;
            const code = typeof text === 'string' ? /(?<!\d)\d{6}(?!\d)/.exec(text.slice(0, 4096))?.[0]
                : undefined;
            if (code === undefined) {
                fail(new SDKError('SDK_AUTH_INPUT_INVALID', { module: 'auth', retryable: false }));
                return;
            }
            await submit(code, 'paste');
        },
        'confirm-switch': async () => {
            if (state.step !== 'confirm')
                return;
            const g = ++gen;
            const found = state.account;
            set({ step: 'loading-player', busy: true, error: undefined });
            await own(async () => {
                try {
                    await auth.confirm();
                    if (live(g) && found) {
                        set({ ...emptyAccount, step: 'switch-account', busy: false, account: found,
                            conflict: false });
                    }
                }
                catch (error) {
                    if (live(g)) {
                        fail(error, auth.session?.gid === found?.gid ? {}
                            : { step: auth.pending ? 'confirm' : 'start' });
                    }
                }
            });
        },
        'restart-game': async () => {
            if (state.step !== 'switch-account' || !state.account)
                return;
            const g = ++gen;
            try {
                await finish(g, state.account);
            }
            catch (error) {
                if (live(g))
                    fail(error);
            }
            finally {
                if (live(g) && state.busy)
                    set({ busy: false });
            }
        },
        'continue-guest': async () => {
            if (state.step !== 'signed-out')
                return;
            const g = ++gen;
            await own(async () => {
                try {
                    await guest(g);
                    if (live(g) && !state.error)
                        close();
                }
                catch (error) {
                    if (live(g))
                        fail(error);
                }
            });
        },
        'signin-again': async () => {
            if (state.step !== 'signed-out')
                return;
            const g = ++gen;
            set({ busy: true, error: undefined });
            await own(async () => {
                try {
                    if (!auth.session)
                        await auth.init();
                    if (live(g))
                        await controller.open('start');
                }
                catch (error) {
                    if (live(g))
                        fail(error);
                }
            });
        },
        link: async (payload) => {
            const pr = string(payload, 'pr');
            if (state.step !== 'profile' || !state.linkable.includes(pr))
                return;
            const g = ++gen;
            set({ busy: true, error: undefined });
            try {
                const adapter = providerAdapters.get(pr);
                if (adapter?.link)
                    await adapter.link(auth);
                else
                    await auth.linkProvider(pr);
                if (live(g))
                    set({ ...profile(), busy: false });
            }
            catch (error) {
                if (live(g))
                    fail(error);
            }
        },
        unlink: async (payload) => {
            const pr = string(payload, 'pr');
            if (state.step !== 'profile' || !state.linked.includes(pr))
                return;
            const g = ++gen;
            set({ busy: true, error: undefined });
            try {
                await auth.unlink(pr);
                if (live(g))
                    set({ ...profile(), busy: false });
            }
            catch (error) {
                if (live(g))
                    fail(error);
            }
        },
        logout: () => out(),
        'logout-all': () => out(),
        'delete-account': () => {
            if (state.step === 'profile') {
                fail(new SDKError('SDK_NOT_IMPLEMENTED', { module: 'auth', retryable: false }));
            }
        },
    };
    const out = () => {
        if (!['profile', 'start', 'switch-account', 'loading-player'].includes(state.step)) {
            return Promise.resolve();
        }
        const g = ++gen;
        set({ busy: true, error: undefined,
            ...(options.waitForPlayerReady ? { step: 'loading-player' } : {}) });
        return own(async () => {
            try {
                await auth.logout();
                if (live(g) && options.waitForPlayerReady) {
                    set({ step: 'loading-player', busy: true });
                    await auth.init();
                    const current = account();
                    if (current)
                        await finish(g, current);
                    if (state.error)
                        return;
                }
                if (live(g))
                    set({ ...emptyAccount, step: 'closed', busy: false, account: undefined, linked: [], linkable: [] });
            }
            catch (error) {
                if (live(g))
                    fail(error);
            }
        });
    };
    const close = () => {
        gen++;
        clearAccount();
        clearTimeout(gamesCursorTimer);
        auth.cancelProvider();
        if (auth.pending)
            auth.discard();
        linkTicket = undefined;
        email = undefined;
        rid = undefined;
        set({ ...emptyAccount, step: 'closed', busy: false, error: undefined, code: undefined, codeSource: undefined,
            maskedEmail: undefined, emailHint: undefined, resendAt: undefined, emailRequired: undefined,
            conflict: false, created: false });
    };
    const controller = Object.freeze({
        get state() { return state; },
        subscribe(listener) {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
        async open(step = 'start') {
            if (disposed)
                return;
            close();
            openingGid = auth.session?.gid;
            const g = gen;
            if (step === 'profile')
                set({ ...profile(), busy: !auth.session?.anonymous });
            let enabled = [];
            let configured = [];
            try {
                configured = await auth.availableProviders();
            }
            catch { }
            try {
                enabled = (await options.providers?.enabled()) ?? [];
            }
            catch { }
            if (!live(g))
                return;
            runtimeProviders = configured.filter(pr => pr === 'google' || pr === 'facebook');
            available = [...providerAdapters.values()].filter(adapter => enabled.includes(adapter.id)
                && adapter.platforms.includes(options.platform)).map(adapter => adapter.id);
            available = [...new Set([...available, ...runtimeProviders])];
            if (step === 'profile') {
                set({ providers: Object.freeze([...available]) });
                await loadAccount();
                return;
            }
            set({ step: 'start', providers: Object.freeze([...available]), account: account() });
        },
        async intent(name, payload) {
            if (disposed || state.step === 'closed')
                return;
            if (name === 'cancel') {
                if (state.step === 'switch-account') {
                    if (!state.busy)
                        await handlers['restart-game']();
                    return;
                }
                if (!['loading-player', 'signed-out'].includes(state.step) && !(state.busy
                    && ['nickname', 'logout'].includes(state.accountScreen ?? '')))
                    close();
                return;
            }
            const handler = Object.hasOwn(handlers, name) ? handlers[name] : undefined;
            const exit = name === 'logout' && ['switch-account', 'loading-player'].includes(state.step);
            if (!handler || (state.busy && !exit))
                return;
            await handler(payload);
        },
        openUrl(url) {
            if (disposed || state.step !== 'code' || state.busy || rid === undefined)
                return false;
            let parsed;
            try {
                parsed = new URL(url);
            }
            catch {
                return false;
            }
            const match = /^\/l\/([\da-f-]{36})$/i.exec(parsed.pathname);
            const code = /^#c=(\d{6})$/.exec(parsed.hash)?.[1];
            if (parsed.protocol !== 'https:' || !parsed.hostname.startsWith('id.') || !match
                || match[1]?.toLowerCase() !== rid.toLowerCase() || code === undefined)
                return false;
            void submit(code, 'link');
            return true;
        },
        dispose() {
            gen++;
            auth.cancelProvider();
            linkTicket = undefined;
            if (auth.pending)
                auth.discard();
            clearAccount();
            clearTimeout(gamesCursorTimer);
            unsubscribePlayer?.();
            unsubscribeEnded?.();
            state = Object.freeze({ ...state, ...emptyAccount });
            disposed = true;
            listeners.clear();
        },
    });
    return controller;
}

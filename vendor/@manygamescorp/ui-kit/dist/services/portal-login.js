export function createPortalLogin(options) {
    if (options.audience !== 'portal' || !Number.isFinite(options.resendDelayMs)
        || options.resendDelayMs < 0)
        throw new TypeError('Invalid portal login settings');
    const initial = { step: 'closed', providers: [], busy: false, conflict: false,
        created: false, linked: [], linkable: [], child: false };
    let state = Object.freeze(initial);
    let generation = 0;
    let disposed = false;
    let rid;
    let email;
    const listeners = new Set();
    const set = (patch) => {
        if (disposed)
            return;
        state = Object.freeze({ ...state, ...patch });
        for (const listener of listeners)
            listener(state);
    };
    const live = (version) => !disposed && generation === version;
    const close = () => {
        generation++;
        rid = undefined;
        email = undefined;
        set({ ...initial, step: 'closed', error: undefined, maskedEmail: undefined });
    };
    const run = async (operation) => {
        if (disposed || state.busy)
            return;
        const version = ++generation;
        set({ busy: true, error: undefined });
        try {
            await operation();
        }
        catch (error) {
            if (live(version)) {
                const record = error;
                const code = typeof record?.code === 'string' && /^[A-Z][A-Z0-9_]{0,99}$/.test(record.code)
                    ? record.code : 'SDK_AUTH_RESPONSE_INVALID';
                set({ error: { code, ...(typeof record?.retryAfterMs === 'number'
                            ? { retryAfterMs: record.retryAfterMs } : {}) } });
            }
        }
        finally {
            if (live(version))
                set({ busy: false });
        }
    };
    const send = () => run(async () => {
        const version = generation;
        const result = await options.auth.signin({ email: email });
        if (!live(version))
            return;
        rid = result.rid;
        const [name = '', domain = ''] = email.split('@');
        set({ step: 'code', maskedEmail: `${name.slice(0, 1)}***@${domain}`,
            resendAt: options.now() + options.resendDelayMs, code: undefined });
    });
    const submit = (code) => run(async () => {
        const version = generation;
        await options.auth.code({ rid: rid, code, audience: options.audience });
        if (live(version)) {
            rid = undefined;
            set({ step: 'done', code: undefined });
        }
    });
    return Object.freeze({
        get state() { return state; },
        subscribe(listener) {
            listeners.add(listener);
            listener(state);
            return () => { listeners.delete(listener); };
        },
        open() {
            if (disposed)
                return Promise.resolve();
            close();
            set({ step: 'start' });
            return run(async () => {
                const version = generation;
                const session = await options.auth.restorePortal();
                if (live(version) && session)
                    set({ step: 'done' });
            });
        },
        close,
        async dispatch(intent, payload) {
            if (disposed)
                return;
            if (intent === 'cancel') {
                close();
                return;
            }
            if (state.busy)
                return;
            if (intent === 'email' && state.step === 'start') {
                set({ step: 'email' });
                return;
            }
            if (intent === 'back' && state.step === 'email') {
                set({ step: 'start' });
                return;
            }
            if (intent === 'change-email' && state.step === 'code') {
                generation++;
                rid = undefined;
                set({ step: 'email', error: undefined });
                return;
            }
            if (intent === 'submit-email' && state.step === 'email' && typeof payload?.email === 'string') {
                email = payload.email;
                await send();
                return;
            }
            if (intent === 'resend-code' && state.step === 'code' && email
                && options.now() >= (state.resendAt ?? 0)) {
                await send();
                return;
            }
            if (intent === 'submit-code' && state.step === 'code' && rid
                && typeof payload?.code === 'string' && /^\d{6}$/.test(payload.code)) {
                await submit(payload.code);
                return;
            }
            if (intent === 'paste-code' && state.step === 'code' && rid && options.readClipboard) {
                const version = generation;
                const text = await options.readClipboard().catch(() => undefined);
                const code = typeof text === 'string' ? /(?<!\d)\d{6}(?!\d)/.exec(text.slice(0, 4096))?.[0] : undefined;
                if (live(version) && !state.busy && code)
                    await submit(code);
            }
            if (intent === 'logout')
                await run(async () => {
                    const version = generation;
                    await options.auth.logout();
                    if (live(version))
                        set({ step: 'start' });
                });
        },
        dispose() { close(); disposed = true; listeners.clear(); },
    });
}

const CLOSE_FALLBACK_TIMEOUT_MS = 1500;
export function registerModuleWindow(host, names, scopes = {}) {
    const entries = names.map((name) => [name, {
            ...(scopes[name] ? { skinScope: scopes[name] } : {}),
            ...(host.source ? { source: host.source } : {}),
            canShow: () => true,
            open(params = {}) {
                let settle = () => { };
                const closed = new Promise((resolve) => { settle = resolve; });
                let off;
                let closeTimer;
                const done = () => {
                    clearTimeout(closeTimer);
                    closeTimer = undefined;
                    off?.();
                    off = undefined;
                    host.signal?.removeEventListener('abort', done);
                    settle();
                };
                off = host.onClosed((ref) => { if (ref.name === name)
                    done(); });
                const scoped = scopes[name] ? { ...params, skinScope: scopes[name] } : params;
                host.signal?.addEventListener('abort', done, { once: true });
                if (host.signal?.aborted)
                    done();
                else
                    host.open({ name, params: scoped });
                let closing = false;
                return { closed, close() {
                        if (off && !closing) {
                            closing = true;
                            closeTimer = setTimeout(() => {
                                done();
                                console.warn(`[SDK] ${host.module ?? name}: window ${name} close confirmation timed out after ${CLOSE_FALLBACK_TIMEOUT_MS} ms`);
                            }, CLOSE_FALLBACK_TIMEOUT_MS);
                            host.close({ name });
                        }
                    } };
            },
        }]);
    return Object.fromEntries(entries);
}
const namePart = /^[a-z][a-z0-9-]{0,63}$/;
const moduleName = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)*$/;
async function preloadScope(port, scope) {
    let timer;
    try {
        await Promise.race([port.preload(scope), new Promise((_resolve, reject) => {
                timer = setTimeout(() => reject(new Error('UI_SKIN_PRELOAD_TIMEOUT')), 30000);
            })]);
    }
    finally {
        clearTimeout(timer);
    }
}
export function createUiWindows(lifecycle) {
    const modules = new Map();
    let placements;
    let skins;
    const pending = [];
    let draining = false;
    let drainId = 0;
    let session = 0;
    let cancellation = new AbortController();
    const running = new Set();
    const wake = new Set();
    const notify = () => { for (const resume of [...wake])
        resume(); };
    const automatic = (entry) => entry.request.source === 'trigger'
        && entry.request.module !== 'ui.reward';
    const blocked = () => [...running].some((entry) => !automatic(entry));
    const waitForPlayers = async (entry, current) => {
        while (automatic(entry) && blocked() && current === session && !entry.cancelled) {
            await new Promise((resume) => {
                const done = () => { wake.delete(done); resume(); };
                wake.add(done);
            });
        }
    };
    const resolve = (name) => {
        const [module, window = 'main', extra] = name.split(':');
        if (extra !== undefined || !module || !moduleName.test(module)
            || !namePart.test(window))
            return undefined;
        const registrations = modules.get(module);
        for (let i = (registrations?.length ?? 0) - 1; i >= 0; i -= 1) {
            const found = registrations?.[i]?.[window];
            if (found)
                return found;
        }
        return undefined;
    };
    const present = async (entry) => {
        const { request } = entry;
        if (request.placement !== undefined) {
            const current = session;
            while (automatic(entry) && blocked() && current === session && !entry.cancelled) {
                await waitForPlayers(entry, current);
            }
            if (current !== session || entry.cancelled)
                return undefined;
            return placements?.showPlacement(request.placement, cancellation.signal);
        }
        const window = resolve(`${request.module}:${request.window}`);
        const current = session;
        const context = request.context ?? {};
        if (!window)
            return undefined;
        const allowed = await window.canShow(context);
        if (allowed !== true || current !== session || entry.cancelled || entry.signal?.aborted) {
            return undefined;
        }
        for (;;) {
            while (automatic(entry) && blocked() && current === session && !entry.cancelled) {
                await waitForPlayers(entry, current);
            }
            if (current !== session || entry.cancelled || entry.signal?.aborted)
                return undefined;
            const port = skins;
            const generation = port?.generation?.();
            if (window.skinScope && port)
                await preloadScope(port, window.skinScope);
            if (current !== session || entry.cancelled || entry.signal?.aborted)
                return undefined;
            if (automatic(entry) && blocked())
                continue;
            if (port !== skins || generation !== port?.generation?.())
                continue;
            break;
        }
        return window.open(request.params, context);
    };
    const skip = (entry) => {
        entry.signal?.removeEventListener('abort', entry.cancel);
        entry.shown(undefined);
        entry.closed();
    };
    const run = async (entry) => {
        const current = session;
        running.add(entry);
        let release;
        try {
            if (lifecycle && entry.request.placement === undefined) {
                release = await lifecycle.acquire(entry.request.module);
            }
            if (current !== session || entry.cancelled || entry.signal?.aborted) {
                entry.shown(undefined);
                return;
            }
            const ticket = await present(entry);
            entry.ticket = ticket;
            if (current !== session || entry.cancelled || entry.signal?.aborted) {
                try {
                    ticket?.close();
                }
                catch { }
                try {
                    await ticket?.closed;
                }
                catch { }
                entry.shown(undefined);
                return;
            }
            if (!ticket) {
                entry.shown(undefined);
                return;
            }
            entry.shown(ticket);
            try {
                await ticket.closed;
            }
            catch { }
        }
        catch (error) {
            entry.fail(error);
        }
        finally {
            try {
                await release?.();
            }
            catch { }
            running.delete(entry);
            entry.signal?.removeEventListener('abort', entry.cancel);
            entry.closed();
            notify();
            void drain();
        }
    };
    const drain = async () => {
        if (draining || blocked())
            return;
        draining = true;
        const mine = drainId;
        try {
            while (mine === drainId && pending.length > 0 && !blocked()) {
                let best = 0;
                for (let i = 1; i < pending.length; i += 1) {
                    if ((pending[i].request.priority ?? 0) > (pending[best].request.priority ?? 0)) {
                        best = i;
                    }
                }
                const entry = pending.splice(best, 1)[0];
                if (entry.cancelled || entry.signal?.aborted) {
                    skip(entry);
                    continue;
                }
                await run(entry);
            }
        }
        finally {
            if (mine === drainId)
                draining = false;
        }
    };
    const submit = (request, signal) => {
        let onShown;
        let onFail;
        let onClosed;
        const shown = new Promise((res, rej) => {
            onShown = res;
            onFail = rej;
        });
        const closed = new Promise((res) => { onClosed = res; });
        const entry = { request, signal, cancelled: false, fail: onFail, closed: onClosed,
            shown: onShown };
        const window = resolve(`${request.module}:${request.window}`);
        if (window?.skinScope && skins) {
            void preloadScope(skins, window.skinScope).catch(() => undefined);
        }
        const cancel = () => {
            entry.cancelled = true;
            notify();
            if (entry.ticket) {
                entry.ticket.close();
                return;
            }
            const index = pending.indexOf(entry);
            if (index >= 0) {
                pending.splice(index, 1);
                skip(entry);
            }
        };
        entry.cancel = cancel;
        signal?.addEventListener('abort', cancel, { once: true });
        if (request.parent)
            void request.parent.closed.then(cancel, cancel);
        if (signal?.aborted) {
            cancel();
            skip(entry);
        }
        else if (automatic(entry)) {
            pending.push(entry);
            void drain();
        }
        else
            void run(entry);
        return Object.freeze({ shown, closed, close: cancel });
    };
    const api = {
        register(module, windows) {
            if (!module || !moduleName.test(module)
                || !Object.keys(windows).length || Object.entries(windows).some(([id, value]) => !namePart.test(id) || typeof value?.canShow !== 'function'
                || typeof value.open !== 'function'
                || (value.source !== undefined && !['user', 'child', 'trigger'].includes(value.source))
                || (value.skinScope !== undefined && (typeof value.skinScope !== 'string'
                    || value.skinScope.length > 128
                    || /^[a-z][a-z0-9-]*(:[a-z0-9-]+)?$/.exec(value.skinScope)?.[0] !== value.skinScope))))
                throw new Error('UI_WINDOW_REGISTRATION_INVALID');
            const copy = Object.freeze({ ...windows });
            const stack = modules.get(module) ?? [];
            stack.push(copy);
            modules.set(module, stack);
            return () => {
                const index = stack.indexOf(copy);
                if (index < 0)
                    return;
                stack.splice(index, 1);
                if (stack.length === 0)
                    modules.delete(module);
            };
        },
        useSkinScopes(port) {
            skins = port;
            return () => { if (skins === port)
                skins = undefined; };
        },
        usePlacements(port) {
            if (typeof port?.showPlacement !== 'function')
                throw new Error('UI_PLACEMENT_PORT_INVALID');
            placements = port;
            return () => { if (placements === port)
                placements = undefined; };
        },
        async canShow(name, context = {}) {
            const window = resolve(name);
            return window ? await window.canShow(context) === true : false;
        },
        has: (module, window) => resolve(`${module}:${window}`) !== undefined,
        show(name, params, options = {}) {
            const [module = '', window = 'main'] = name.split(':');
            const source = options.source ?? (options.parent ? 'child'
                : resolve(`${module}:${window}`)?.source ?? 'user');
            return submit({ module, window, source,
                ...(options.parent ? { parent: options.parent } : {}), ...(params ? { params } : {}),
                ...(options.context ? { context: options.context } : {}),
                ...(options.priority !== undefined ? { priority: options.priority } : {}) }, options.signal);
        },
        enqueue: (request, signal) => submit(request, signal).shown,
        resetSession() {
            session += 1;
            cancellation.abort();
            cancellation = new AbortController();
            for (const entry of running) {
                try {
                    entry.cancel?.();
                }
                catch { }
            }
            running.clear();
            notify();
            modules.clear();
            drainId += 1;
            draining = false;
            for (const entry of pending.splice(0))
                skip(entry);
        },
    };
    return Object.freeze(api);
}

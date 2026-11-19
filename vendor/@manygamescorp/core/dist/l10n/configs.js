import { createL10n } from '../l10n.js';
import { CachedL10nSource, ConfigsL10nSource } from '../l10n-sources.js';
import { createMemoryBlobStore } from '../storage/blob-store.js';
export function createL10nRuntime(options, deps) {
    const replacement = deps.services?.get('l10n.source@1');
    const facts = deps.context ? { facts: deps.context } : {};
    const upstream = replacement ?? deps.source ?? new ConfigsL10nSource({
        transport: deps.transport,
        ...facts,
        onIntegrityFailure: (locale) => deps.track?.('l10n_integrity_failure', { locale }, { type: 'telemetry' }),
    });
    const source = new CachedL10nSource({
        appCode: deps.appCode, gid: deps.gid, storage: deps.profileStorage,
        ...facts,
        blobs: deps.platform.blobStore ?? createMemoryBlobStore(),
        source: {
            ...(upstream.origin ? { origin: upstream.origin } : {}),
            async load(request) {
                try {
                    const result = await upstream.load(request);
                    failures = 0;
                    return result;
                }
                catch (error) {
                    if (!request.signal.aborted) {
                        failures++;
                        schedule();
                    }
                    throw error;
                }
            },
        },
    });
    let startup = true;
    let coldStartup = false;
    let fromCache = false;
    let hydrateIdentity = false;
    let identityOnline = false;
    let identity;
    let localeChange;
    let contextChange;
    let revalidation;
    let loadedChain = '';
    const readySource = {
        get origin() { return fromCache ? 'cache' : source.origin; },
        async readCache(request) {
            return await source.readCache(request) ?? upstream.readCache?.(request);
        },
        async load(request) {
            const chain = JSON.stringify(request.chain);
            if ((startup && !coldStartup) || hydrateIdentity || (!startup && loadedChain !== chain)) {
                const switching = !startup && !hydrateIdentity;
                const cached = await source.readCache(request, switching);
                request.signal.throwIfAborted();
                loadedChain = chain;
                if (cached) {
                    fromCache = true;
                    if (!startup && !hydrateIdentity)
                        revalidate();
                    return cached;
                }
                if (startup)
                    coldStartup = true;
                if (hydrateIdentity)
                    identityOnline = true;
                if (switching) {
                    try {
                        return await source.load(request);
                    }
                    catch (error) {
                        request.signal.throwIfAborted();
                        const partial = await source.readCache(request).catch(() => undefined);
                        request.signal.throwIfAborted();
                        if (!partial)
                            throw error;
                        fromCache = true;
                        return partial;
                    }
                }
            }
            return source.load(request);
        },
    };
    const engine = createL10n(options, { storage: deps.profileStorage.device(), ...deps,
        source: readySource });
    const unsubscribes = [];
    let timer;
    let hidden = false;
    let disposed = false;
    let started;
    let running;
    let failures = 0;
    let gid = deps.gid();
    const interval = 30 * 60_000;
    async function refresh(force = false) {
        if (identity)
            await identity.catch(() => { });
        if (localeChange)
            await localeChange.catch(() => { });
        if (contextChange)
            await contextChange;
        if (disposed || hidden)
            return;
        if (running)
            return running;
        const before = failures;
        running = engine.refresh(force).catch((error) => {
            if (failures === before && error?.name !== 'AbortError')
                failures++;
            throw error;
        });
        try {
            await running;
        }
        finally {
            running = undefined;
        }
    }
    function namespace(api) {
        return {
            ...api,
            setLocale(tag) {
                const job = api.setLocale(tag).finally(() => {
                    if (localeChange === job)
                        localeChange = undefined;
                });
                localeChange = job;
                return job;
            },
        };
    }
    function revalidate() {
        clearTimeout(revalidation);
        revalidation = setTimeout(() => {
            void refresh().catch(() => { }).finally(schedule);
        }, 0);
    }
    function schedule() {
        clearTimeout(timer);
        if (disposed || hidden || options.refresh === 'start-only' || deps.poller)
            return;
        const delay = failures ? Math.min(5 * 60_000, 60_000 * 2 ** Math.min(failures, 5)) : interval;
        timer = setTimeout(() => {
            void refresh().catch(() => { }).finally(schedule);
        }, delay);
    }
    function start() {
        return started ??= (async () => {
            if (disposed)
                return;
            gid = deps.gid();
            unsubscribes.push(deps.bus.on('auth:identity:changed', () => {
                const next = deps.gid();
                if (next === gid || disposed)
                    return;
                gid = next;
                engine.resetIdentity();
                loadedChain = '';
                hydrateIdentity = true;
                identityOnline = false;
                const job = engine.refresh(true).catch(() => { }).then(async () => {
                    if (disposed || identity !== job)
                        return;
                    hydrateIdentity = false;
                    if (!identityOnline)
                        await engine.refresh(true).catch(() => { });
                });
                identity = job;
                void job.finally(() => { if (identity === job)
                    identity = undefined; });
                return job;
            }));
            unsubscribes.push(deps.bus.on('sdk:context:changed', () => {
                if (disposed)
                    return;
                const owner = gid;
                const job = (async () => {
                    if (startup)
                        await started;
                    await identity;
                    await localeChange;
                    await running?.catch(() => { });
                    if (!disposed && owner === gid)
                        await engine.recompute();
                })().catch(() => { }).finally(() => {
                    if (contextChange === job)
                        contextChange = undefined;
                });
                contextChange = job;
                return job;
            }));
            unsubscribes.push(deps.bus.on('app:lifecycle:changed', ({ hidden: next }) => {
                if (next === hidden)
                    return;
                if ((hidden = next))
                    engine.flush();
                schedule();
            }));
            await engine.start();
            startup = false;
            if (fromCache && !disposed && !deps.poller)
                revalidate();
            void source.clean().catch(() => { });
            if (disposed)
                return;
            if (deps.poller && options.refresh !== 'start-only') {
                unsubscribes.push(deps.poller.register({
                    id: 'l10n:refresh', intervalMs: interval, visibleAfterMs: false,
                    pauseWhenHidden: true, runOnRegister: fromCache, run: refresh,
                }));
            }
            schedule();
        })();
    }
    return {
        ...engine, ...namespace(engine), start, refresh,
        view: (caller) => namespace(engine.view(caller)),
        async idle() {
            const job = identity ?? localeChange ?? contextChange;
            if (!job)
                return;
            let deadline;
            await Promise.race([job.catch(() => { }), new Promise((resolve) => {
                    deadline = setTimeout(resolve, options.readyTimeoutMs ?? 1500);
                })]);
            clearTimeout(deadline);
        },
        dispose() {
            disposed = true;
            clearTimeout(timer);
            clearTimeout(revalidation);
            for (const unsubscribe of unsubscribes)
                unsubscribe();
            engine.dispose();
        },
    };
}
export { ConfigsL10nSource } from '../l10n-sources.js';

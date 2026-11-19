import { SDKError } from './error.js';
export const L10N_READY_EVENT = 'l10n:core:ready', L10N_LOCALE_CHANGED_EVENT = 'l10n:locale:changed', L10N_STRINGS_UPDATED_EVENT = 'l10n:strings:updated', L10N_LOCALE_FACT = 'l10n.locale', L10N_INVALID = 'SDK_L10N_INVALID';
const equal = (a, b) => a === b || (typeof a == 'object' && typeof b == 'object'
    && Object.keys(a).length == Object.keys(b).length
    && Object.entries(a).every(([key, value]) => b[key] === value)), SEGMENT = /^[\w-]{1,64}$/, FORM = /^@(zero|one|two|few|many|other|=-?\d+(\.\d+)?)$/, PARAM = /\{\{|\}\}|\{(\w+)\}/g, isObject = (v) => typeof v == 'object' && !!v && !Array.isArray(v), safe = (fn) => {
    try {
        return fn();
    }
    catch {
        return;
    }
};
export const canonicalLocale = (tag) => safe(() => Intl.getCanonicalLocales(tag)[0]);
const fail = (permission = false) => {
    throw new SDKError(permission ? 'SDK_PERMISSION_DENIED' : L10N_INVALID, { module: 'l10n' });
}, truncations = (tag) => {
    const chain = [];
    for (; tag; tag = tag.replace(/(-\w)?-\w+$|^\w+$/, ''))
        chain.push(tag);
    return chain;
}, language = (tag) => /^[^-]+(?:-[A-Z][a-z]{3}(?=-|$))?/.exec(tag)?.[0];
export const matchLocale = (candidate, available) => truncations(candidate).find((t) => available.includes(t)) ??
    available.find((tag) => language(tag) == language(candidate));
function flatten(tree, prefix, bad = () => { }, out = new Map()) {
    if (!isObject(tree) || !Object.entries(tree).length) {
        bad();
        return out;
    }
    for (const [name, v] of Object.entries(tree)) {
        const key = prefix ? `${prefix}.${name}` : name;
        if (!SEGMENT.test(name) || key.split('.').length > 8)
            bad();
        else if (typeof v == 'string')
            out.set(key, v);
        else if (isObject(v) && typeof v['@other'] == 'string' &&
            Object.entries(v).every(([f, s]) => FORM.test(f) && typeof s == 'string'))
            out.set(key, v);
        else
            flatten(v, key, bad, out);
    }
    return out;
}
export function createL10n(options, deps) {
    const { bus, source, storage } = deps, key = 'l10n:locale', supported = options.supported?.map(canonicalLocale), local = new Map(), remote = new Map(), memo = Object.create(null), seen = new Set(), missingKeys = [];
    let index, meta, abort, timer, started, chosen = safe(() => storage?.getItem(key)) ?? null, active = '', chain = [], own = 0, missing = 0, fallbackHits = 0, epoch = 0, readyDone = false, disposed = false, resolve;
    const waiters = new Set(), ready = new Promise((r) => (resolve = r)), warn = (message) => {
        if (deps.debug)
            safe(() => (deps.warn ?? console.warn)(message));
    }, emit = (event, payload) => safe(() => bus.emit(event, payload)), track = (event, props) => {
        if (!seen.has(event))
            safe(() => deps.track?.(event, props, { type: 'telemetry' }));
        seen.add(event);
    }, changed = (from, reason) => {
        if (active != from)
            emit(L10N_LOCALE_CHANGED_EVENT, { from, to: active, reason });
    }, cached = (kind, tag, ctor) => (memo[kind + tag] ??= new ctor(tag));
    function plural(locale, n) {
        const tag = canonicalLocale(locale);
        if (!tag || typeof n != 'number')
            return 'other';
        if (typeof Intl.PluralRules == 'function')
            return cached('p', tag, Intl.PluralRules).select(n);
        track('l10n_no_plural_rules', {});
        return 'other';
    }
    function find(key) {
        for (const [i, loc] of chain.entries()) {
            const v = remote.get(loc)?.get(key) ?? local.get(loc)?.get(key);
            if (v !== undefined)
                return [v, loc, i];
        }
        if (/^sdk\.error\.(SDK_OFFLINE|OFFLINE|NETWORK_ERROR)$/.test(key)) {
            return ['No connection', 'en', 0];
        }
    }
    function t(key, params = {}) {
        return safe(() => {
            const hit = find(key);
            if (!hit) {
                missing++;
                if (missingKeys.length < 50 && !missingKeys.includes(key))
                    missingKeys.push(key);
                const pair = `${active} ${key}`;
                if (!seen.has(pair))
                    warn(`missing ${pair}`);
                seen.add(pair);
                return String(key);
            }
            const [value, locale, i] = hit;
            if (i >= own)
                fallbackHits++;
            const count = params.count, text = typeof value == 'string'
                ? value
                : (typeof count == 'number'
                    ? value[`@=${count}`] ?? value[`@${plural(locale, count)}`]
                    : undefined) ?? value['@other'];
            return text.replace(PARAM, (m, name) => {
                if (!name)
                    return m[0];
                const p = Object.hasOwn(params, name) ? params[name] : undefined;
                if (p === undefined) {
                    warn(`missing {${name}} in ${key}`);
                    return m;
                }
                return typeof p == 'number' ? cached('n', locale, Intl.NumberFormat).format(p) : String(p);
            });
        }) ?? String(key);
    }
    function available() {
        const found = new Map();
        for (const info of [
            ...(index?.locales ?? []),
            ...[...local.keys()].map((tag) => ({ tag, name: tag, status: 'published' })),
        ]) {
            const tag = isObject(info) ? canonicalLocale(info.tag) : undefined;
            if (tag && info.status == 'published' && !found.has(tag) && supported?.includes(tag) != false) {
                found.set(tag, { ...info, tag });
            }
        }
        return [...found.values()];
    }
    function pick() {
        const def = canonicalLocale(index?.defaultLocale) ?? canonicalLocale(options.defaultLocale) ?? 'en', tags = available().map((l) => l.tag), info = safe(() => deps.device?.info()), portal = deps.portalLocale?.(), matches = (portal ? [portal.locale, ...portal.fallback, def]
            : [chosen, ...(info?.languages ?? []), info?.locale, def])
            .map((tag) => matchLocale(canonicalLocale(tag) ?? '', tags)), i = matches.findIndex(Boolean), found = matches[i] ?? def;
        chain = truncations(found);
        own = chain.length;
        chain = [...new Set([...chain, ...truncations(def)])];
        if (found != active) {
            active = found;
            safe(() => deps.facts?.set(L10N_LOCALE_FACT, found));
        }
        return i == 0 ? 'explicit' : i < 0 || i == matches.length - 1 ? 'default' : 'system';
    }
    function register(caller, ns, bundles) {
        if (typeof ns != 'string' || !/^[\w-]{1,64}(?:\.[\w-]{1,64}){0,6}$/.test(ns))
            fail();
        const under = (id) => `${ns}.`.startsWith(`${id}.`);
        if (caller.kind == 'game' ?
            ['sdk', 'ui', 'kit', ...(deps.moduleIds?.() ?? [])]
                .some((id) => under(id) || id.startsWith(`${ns}.`)) :
            !under(caller.kind == 'core' ? 'sdk' : caller.id))
            fail(true);
        if (!isObject(bundles))
            fail();
        const parsed = Object.entries(bundles).map(([tag, tree]) => [canonicalLocale(tag) ?? fail(), flatten(tree, ns, fail)]);
        for (const [tag, bundle] of parsed) {
            local.set(tag, new Map([...(local.get(tag) ?? []), ...bundle]));
        }
        const from = active, reason = pick();
        if (readyDone)
            changed(from, reason);
    }
    async function choose(caller, tag) {
        if (deps.portalLocale?.() || caller.kind == 'module' && !/^ui(?:\.|$)/.test(caller.id)) {
            fail(true);
        }
        chosen = tag === null ? null : canonicalLocale(tag) ?? fail();
        safe(() => (chosen ? storage?.setItem(key, chosen) : storage?.removeItem(key)));
        const gen = ++epoch, from = active, reason = pick();
        if (active == from || !readyDone)
            return;
        if (source)
            await request(true, true);
        if (gen == epoch && !disposed)
            changed(from, reason);
    }
    async function request(force = false, wait = false, cacheOnly = false) {
        const from = active;
        if (!wait && !cacheOnly && deps.portalLocale?.())
            pick();
        const switched = active != from, gen = switched ? ++epoch : epoch;
        force ||= switched;
        let aborted = false;
        const job = (async () => {
            const locales = new Set();
            let loaded = false;
            for (let i = 0; i < 2 && source; i++) {
                abort?.abort();
                const ac = (abort = new AbortController()), want = chain, req = { chain: [...want], signal: ac.signal, ...(meta ? { prev: meta } : {}) }, result = await safe(() => cacheOnly ? source.readCache?.(req) : source.load(req))
                    ?.catch(() => undefined);
                if (!result || ac.signal.aborted || disposed || gen != epoch) {
                    aborted = ac.signal.aborted || disposed;
                    break;
                }
                if (!force && readyDone && options.applyUpdates == 'next-start')
                    return true;
                meta = result.meta;
                loaded = true;
                if (result.status == 'updated') {
                    if (isObject(result.index) && Array.isArray(result.index.locales))
                        index = result.index;
                    const got = new Map(Object.entries(result.bundles ?? {})
                        .map(([tag, tree]) => [canonicalLocale(tag), tree]));
                    for (const tag of want) {
                        const sha = meta.sha256[tag];
                        if (got.has(tag)) {
                            const next = flatten(got.get(tag), ''), old = remote.get(tag);
                            if (!old || next.size != old.size || [...next].some(([key, value]) => !equal(value, old.get(key)))) {
                                remote.set(tag, next);
                                locales.add(tag);
                            }
                        }
                        else if (!sha && remote.delete(tag))
                            locales.add(tag);
                    }
                    pick();
                }
                if (chain.every((t) => want.includes(t)))
                    break;
            }
            if (!wait && !disposed && gen == epoch) {
                if (active != from)
                    changed(from, switched ? 'system' : 'index');
                else if (locales.size)
                    emit(L10N_STRINGS_UPDATED_EVENT, {
                        locales: [...locales].filter((tag) => chain.includes(tag)),
                    });
            }
            return loaded;
        })();
        if (wait)
            return new Promise((resolve) => {
                const done = (result = false) => {
                    clearTimeout(id);
                    waiters.delete(done);
                    wait = result;
                    resolve(result);
                }, id = setTimeout(done, options.readyTimeoutMs ?? 1500);
                waiters.add(done);
                void job.then(done);
            });
        if (!await job && !cacheOnly && source)
            throw aborted ? new DOMException('Aborted', 'AbortError') : Error();
        return true;
    }
    function start() {
        return (started ??= (async () => {
            pick();
            const loaded = source && await request(true, true);
            if (disposed)
                return;
            readyDone = true;
            emit(L10N_READY_EVENT, {
                locale: active, source: loaded ? source.origin ?? 'network' : 'builtin',
            });
            resolve();
            timer = setTimeout(flush, 60_000);
        })());
    }
    function flush() {
        if (!missing)
            return;
        track('l10n_missing', { locale: active, count: missing, keys: missingKeys.slice(0, 20) });
    }
    const view = (caller) => ({
        t,
        errorText: ({ code, safeParams }) => t(`sdk.error.${find(`sdk.error.${code}`) ? code : 'default'}`, safeParams),
        has: (key) => !!find(key),
        locale: () => active,
        chain: () => [...chain],
        available,
        setLocale: (tag) => choose(caller, tag),
        registerDefaults: (ns, bundles) => register(caller, ns, bundles),
        ready: () => ready,
        stats: () => ({ missing, missingKeys: [...missingKeys], fallbackHits }),
        plural,
    });
    pick();
    return {
        ...view({ kind: 'core' }),
        start,
        async refresh(force) { if (!disposed)
            await request(force); },
        async recompute() { if (!disposed)
            await request(false, false, true); },
        resetIdentity() {
            abort?.abort();
            epoch++;
            remote.clear();
            meta = index = undefined;
            emit(L10N_STRINGS_UPDATED_EVENT, { locales: [...chain] });
        },
        view,
        flush,
        dispose() {
            disposed = true;
            abort?.abort();
            clearTimeout(timer);
            for (const done of waiters)
                done();
        },
    };
}

import ui from './ui.json' with { type: 'json' };
import { VERSION } from './version.js';
import { IAP_STORE_SERVICE } from './store-registration.js';
import { redirectStore } from './redirect-store.js';
import { loadStoreAdapter } from './store-loader.js';
import { registerModuleWindow } from '@manygamescorp/core/window-triggers';
import { publicIap, iapError, iapErrorCode } from './public-iap.js';
import { randomUuidV7 } from '@manygamescorp/core/context';
import { isIdempotencyKey } from '@manygamescorp/core/transport';
import { SDKError } from '@manygamescorp/core/error';
import { hudItems } from '@manygamescorp/core/hud';
import { defineModule } from '@manygamescorp/core/module';
import { addUsage, NO_USAGE, OFFERS_SCOPE, offerOf, offerWithVariant, PLACEMENTS_SCOPE, PRODUCTS_SCOPE, parseProduct, showcase, } from './catalog.js';
import { fakeAllowed, isStoreAdapter, own } from './store.js';
const KEY = /^[A-Za-z0-9_-]{1,64}$/;
const ORDER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const IN_PROGRESS = ['created', 'pending_store', 'pending_validation',
    'validated'];
const GRANTED = ['granted', 'granted_advance', 'confirmed'];
function outcome(order) {
    if (order.grantStatus === 'rejected')
        return 'failed';
    if (IN_PROGRESS.includes(order.status))
        return 'pending';
    if (GRANTED.includes(order.status) && order.grantStatus === 'granted')
        return 'granted';
    return order.status === 'canceled' ? 'cancelled' : 'failed';
}
const MAX_KEYS = 256;
const MAX_WATCHED = 64;
const MAX_OBSERVED = 32;
const OBSERVE_MS = 600_000;
const USAGE_KEY = 'usage';
const REPORTED_KEY = 'reportedOrders';
const MAX_REPORTED = 256;
const STATUSES = [...IN_PROGRESS, 'granted', 'failed', 'canceled',
    'expired', 'refunded', 'revoked', 'not_rewarded', 'granted_advance', 'advance_unconfirmed',
    'confirmed'];
function invalidData(message = 'Invalid SDK iap request') {
    throw new SDKError('VALIDATION_FAILED', { message, module: 'iap' });
}
function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function key(value) {
    if (typeof value !== 'string' || !KEY.test(value))
        invalidData();
    return value;
}
function orderId(value) {
    if (typeof value !== 'string' || !ORDER_ID.test(value))
        invalidData();
    return value;
}
function payloadCopy(value) {
    const visit = (node, depth) => {
        if (node === null || typeof node === 'string' || typeof node === 'boolean')
            return;
        if (typeof node === 'number' && Number.isFinite(node))
            return;
        if (depth >= 4 || typeof node !== 'object')
            invalidData();
        if (Array.isArray(node)) {
            for (const item of node)
                visit(item, depth + 1);
            return;
        }
        if (Object.getPrototypeOf(node) !== Object.prototype)
            invalidData();
        for (const [name, item] of Object.entries(node)) {
            if (!KEY.test(name) || name === '_bsontype')
                invalidData();
            visit(item, depth + 1);
        }
    };
    if (!record(value))
        invalidData();
    visit(value, 0);
    const text = JSON.stringify(value);
    if (new TextEncoder().encode(text).byteLength > 4096)
        invalidData();
    return JSON.parse(text);
}
function view(value) {
    if (!record(value) || typeof value.orderId !== 'string' || typeof value.status !== 'string') {
        throw new SDKError('INTERNAL', { module: 'iap', message: 'Invalid iap order' });
    }
    return value;
}
function entitlementsOf(value) {
    return Array.isArray(value) ? value.filter((item) => record(item)
        && typeof item.productKey === 'string' && typeof item.state === 'string') : [];
}
function stateOf(value) {
    const body = record(value) ? value : {};
    const ads = record(body.ads) ? body.ads : {};
    const outstanding = typeof ads.advanceOutstanding === 'number' ? ads.advanceOutstanding : 0;
    return {
        pendingOrders: Array.isArray(body.pendingOrders) ? body.pendingOrders.map(view) : [],
        entitlements: entitlementsOf(body.entitlements),
        offerState: record(body.offerState)
            ? body.offerState : {},
        ads: { advanceOutstanding: outstanding,
            advanceMax: typeof ads.advanceMax === 'number' ? ads.advanceMax : null },
    };
}
function changedEntitlements(before, after) {
    const signature = (item) => JSON.stringify([
        item.orderId, item.kind, item.state, item.autoRenew, item.expiresAt,
    ]);
    const previous = new Map(before.map(item => [item.productKey, signature(item)]));
    const current = new Map(after.map(item => [item.productKey, signature(item)]));
    return [...new Set([...previous.keys(), ...current.keys()])]
        .filter(id => previous.get(id) !== current.get(id)).sort();
}
function remember(map, name, now) {
    let value = map.get(name);
    if (value === undefined) {
        value = randomUuidV7(now());
        if (map.size >= MAX_KEYS)
            map.delete(map.keys().next().value);
        map.set(name, value);
    }
    return value;
}
function canonical(value) {
    return JSON.stringify(value, (_name, item) => record(item)
        ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
        : item);
}
function defaultSleep(ms, signal) {
    return new Promise((resolve, reject) => {
        if (signal.aborted) {
            reject(signal.reason);
            return;
        }
        const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
        const abort = () => { clearTimeout(timer); reject(signal.reason); };
        signal.addEventListener('abort', abort, { once: true });
    });
}
export function createIap(deps) {
    return publicIap(iapRuntime(deps).iap);
}
function iapRuntime(deps) {
    const settings = { ...deps.settings };
    for (const value of [settings.confirmTimeoutMs, settings.offlinePollMs]) {
        if (value !== undefined && (!Number.isSafeInteger(value) || value < 0 || value > 600_000)) {
            invalidData('Invalid iap timing settings');
        }
    }
    const controller = new AbortController();
    const offRealtime = [];
    const lifetime = deps.signal ? AbortSignal.any([controller.signal, deps.signal])
        : controller.signal;
    const now = deps.now;
    const sleep = deps.sleep ?? defaultSleep;
    let store = deps.store;
    let storeInit;
    const readyStore = () => {
        if (!store)
            return Promise.resolve();
        storeInit ??= store.init(lifetime, { http: deps.http }).catch((error) => {
            storeInit = undefined;
            throw iapError(error);
        });
        return storeInit;
    };
    const publish = (event) => {
        if (lifetime.aborted)
            return;
        try {
            deps.publish?.(event);
        }
        catch { }
    };
    const active = () => {
        if (lifetime.aborted)
            throw new SDKError('MODULE_NOT_ACTIVE', { module: 'iap' });
    };
    const request = (spec, caller) => {
        if (lifetime.aborted)
            return Promise.reject(new SDKError('MODULE_NOT_ACTIVE', { module: 'iap' }));
        const target = /^\/orders\/([^/]+)/.exec(spec.path)?.at(1);
        return deps.http.request({ ...spec,
            ...(target && orderRids.has(target) ? { rid: orderRids.get(target) } : {}),
            signal: caller ? AbortSignal.any([lifetime, caller]) : lifetime }).catch(error => {
            if (lifetime.aborted || (error instanceof DOMException && error.name === 'AbortError')
                || (error instanceof SDKError && error.code === 'SDK_MODULE_CANCELLED')) {
                throw new SDKError('MODULE_NOT_ACTIVE', { module: 'iap' });
            }
            throw error;
        });
    };
    let state;
    let initFlight;
    let prices = new Map();
    let pricesFlight;
    const cancelKeys = new Map();
    const claimKeys = new Map();
    const validateKeys = new Map();
    const restoreKeys = new Map();
    const watched = new Map();
    const keyMaps = { cancel: cancelKeys, claim: claimKeys,
        validate: validateKeys, restore: restoreKeys };
    let savedKeys;
    try {
        savedKeys = deps.storage?.get('operationKeys');
    }
    catch { }
    if (record(savedKeys)) {
        for (const [name, map] of Object.entries(keyMaps)) {
            const entries = own(savedKeys, name);
            if (!Array.isArray(entries))
                continue;
            for (const entry of entries.slice(-MAX_KEYS)) {
                if (!Array.isArray(entry) || entry.length !== 2)
                    continue;
                const [id, value] = entry;
                if (typeof id === 'string' && id.length <= 1024 && isIdempotencyKey(value))
                    map.set(id, value);
            }
        }
    }
    const rememberKey = (map, name) => {
        const value = remember(map, name, now);
        deps.storage?.set('operationKeys', Object.fromEntries(Object.entries(keyMaps)
            .map(([id, keys]) => [id, [...keys]])));
        return value;
    };
    let savedRids;
    try {
        savedRids = deps.storage?.get('orderRids');
    }
    catch { }
    const orderRids = new Map(Array.isArray(savedRids)
        ? savedRids.filter((entry) => {
            if (!Array.isArray(entry) || entry.length !== 2)
                return false;
            const [id, rid] = entry;
            return typeof id === 'string' && ORDER_ID.test(id) && isIdempotencyKey(rid);
        }).slice(-MAX_OBSERVED) : []);
    const earlyHints = new Map();
    const knownOrders = new Map();
    const rememberOrder = (order) => {
        knownOrders.set(order.orderId, order);
        while (knownOrders.size > MAX_REPORTED)
            knownOrders.delete(knownOrders.keys().next().value);
    };
    const bindOrder = (id, rid) => {
        orderRids.set(orderId(id), rid);
        while (orderRids.size > MAX_OBSERVED)
            orderRids.delete(orderRids.keys().next().value);
        try {
            deps.storage?.set('orderRids', [...orderRids]);
        }
        catch { }
    };
    const actions = new Map();
    const saveActions = () => { deps.storage?.set('pendingActions', [...actions.values()]); };
    let savedActions;
    try {
        savedActions = deps.storage?.get('pendingActions');
    }
    catch { }
    if (Array.isArray(savedActions))
        for (const entry of savedActions.slice(0, MAX_OBSERVED)) {
            if (!record(entry) || !isIdempotencyKey(entry.rid) || typeof entry.intent !== 'string'
                || entry.intent.length > 8192 || !record(entry.body)
                || (entry.orderId !== null && (typeof entry.orderId !== 'string'
                    || !ORDER_ID.test(entry.orderId))))
                continue;
            try {
                const body = entry.body;
                key(body.offerKey);
                key(body.variantKey);
                if (Object.keys(body).some(name => !['offerKey', 'variantKey', 'storeKey', 'storeId', 'productKey', 'placementKey',
                    'applied', 'scopeVersion', 'payload'].includes(name)))
                    continue;
                if (body.payload !== undefined)
                    payloadCopy(body.payload);
                if (body.placementKey !== undefined)
                    key(body.placementKey);
                if (body.storeKey !== undefined && (typeof body.storeKey !== 'string'
                    || !/^[a-z][a-z0-9_]{0,63}$/.test(body.storeKey)))
                    continue;
                if (body.storeId !== undefined && (typeof body.storeId !== 'string'
                    || !/^[a-z][a-z0-9_]{0,63}$/.test(body.storeId)))
                    continue;
                if (body.applied !== null && body.applied !== undefined
                    && (typeof body.applied !== 'string' || body.applied.length > 128))
                    continue;
                if (body.scopeVersion !== undefined && (!Number.isSafeInteger(body.scopeVersion)
                    || Number(body.scopeVersion) < 0))
                    continue;
                actions.set(entry.rid, { rid: entry.rid, intent: entry.intent,
                    body: structuredClone(body), orderId: entry.orderId });
            }
            catch { }
        }
    const createOrder = async (body, intent, txId) => {
        if (txId !== undefined && !isIdempotencyKey(txId))
            invalidData('Invalid action id');
        const existing = txId === undefined
            ? [...actions.values()].find(action => action.intent === intent) : actions.get(txId);
        if (existing && existing.intent !== intent)
            invalidData('Action id belongs to another purchase');
        const action = existing ?? { rid: txId ?? randomUuidV7(now()), intent,
            body: structuredClone(body), orderId: null };
        if (!existing) {
            if (actions.size >= MAX_OBSERVED)
                invalidData('Too many pending purchases');
            actions.set(action.rid, action);
        }
        if (action.orderId)
            return getOrder(action.orderId);
        saveActions();
        let order;
        try {
            order = view(await request({ method: 'POST', path: '/orders', body: action.body,
                idempotencyKey: action.rid, rid: action.rid }));
        }
        catch (error) {
            if (error instanceof SDKError && !error.retryable && error.httpStatus !== undefined
                && error.httpStatus >= 400 && error.httpStatus < 500) {
                actions.delete(action.rid);
                saveActions();
            }
            throw error;
        }
        action.orderId = orderId(order.orderId);
        rememberOrder(order);
        bindOrder(action.orderId, action.rid);
        saveActions();
        const early = earlyHints.get(action.orderId);
        if (early?.rid === action.rid) {
            earlyHints.delete(action.orderId);
            await receive(early);
        }
        return order;
    };
    const forgetAction = (id) => {
        for (const [rid, action] of actions)
            if (action.orderId === id)
                actions.delete(rid);
        orderRids.delete(id);
        try {
            deps.storage?.set('orderRids', [...orderRids]);
        }
        catch { }
        try {
            saveActions();
        }
        catch { }
    };
    const sessionOffers = new Map();
    const sessionPlacements = new Map();
    let savedReports;
    try {
        savedReports = deps.storage?.get(REPORTED_KEY);
    }
    catch { }
    const reported = new Set(Array.isArray(savedReports)
        ? savedReports.filter((id) => typeof id === 'string' && ORDER_ID.test(id))
            .slice(-MAX_REPORTED) : []);
    const rememberGrant = (id) => {
        const first = !reported.has(id);
        reported.delete(id);
        reported.add(id);
        while (reported.size > MAX_REPORTED)
            reported.delete(reported.values().next().value);
        try {
            deps.storage?.set(REPORTED_KEY, [...reported]);
        }
        catch {
        }
        return first;
    };
    const stored = () => {
        let value;
        try {
            value = deps.storage?.get(USAGE_KEY);
        }
        catch { }
        const entries = (list) => new Map(Array.isArray(list)
            ? list.flatMap((entry) => {
                if (!Array.isArray(entry))
                    return [];
                const [name, item] = entry;
                return typeof name === 'string' && record(item) && Array.isArray(item.recent)
                    && item.recent.every((at) => typeof at === 'number') && typeof item.total === 'number'
                    && (item.lastAt === null || typeof item.lastAt === 'number')
                    ? [[name, item]] : [];
            }) : []);
        return { offers: entries(own(value, 'offers')), placements: entries(own(value, 'placements')) };
    };
    const usageOf = (saved, inSession, name) => {
        const base = saved.get(name) ?? NO_USAGE;
        return { recent: base.recent, total: base.total, lastAt: base.lastAt,
            session: inSession.get(name) ?? 0 };
    };
    const count = (offerKey, placement) => {
        const at = now();
        const saved = stored();
        const bump = (map, inSession, name) => {
            const { session, ...rest } = addUsage(usageOf(map, inSession, name), at);
            inSession.set(name, session);
            map.delete(name);
            map.set(name, rest);
            while (map.size > 256)
                map.delete(map.keys().next().value);
        };
        bump(saved.offers, sessionOffers, offerKey);
        if (placement !== null)
            bump(saved.placements, sessionPlacements, placement);
        try {
            deps.storage?.set(USAGE_KEY, { offers: [...saved.offers],
                placements: [...saved.placements] });
        }
        catch { }
    };
    const input = (placement) => {
        const configs = deps.configs;
        const snapshot = configs?.snapshot();
        const version = own(snapshot?.version, 'iap.offers');
        const applied = own(snapshot?.applied, 'iap.offers');
        const saved = stored();
        return {
            placement,
            offers: configs?.getScope(OFFERS_SCOPE) ?? {},
            placements: configs?.getScope(PLACEMENTS_SCOPE) ?? {},
            products: configs?.getScope(PRODUCTS_SCOPE) ?? {},
            ...(record(applied) ? { applied: applied } : {}),
            ...(typeof version === 'number' ? { scopeVersion: version } : {}),
            ...(state ? { offerState: state.offerState } : {}),
            usage: (offerKey) => usageOf(saved.offers, sessionOffers, offerKey),
            placementUsage: (name) => usageOf(saved.placements, sessionPlacements, name),
            storeKey: store?.storeKey ?? null,
            prices,
            now: now(),
        };
    };
    const signature = (offers) => canonical(offers);
    const offers = (placement) => {
        const list = showcase(input(placement));
        if (!watched.has(placement) && watched.size >= MAX_WATCHED) {
            watched.delete(watched.keys().next().value);
        }
        watched.set(placement, signature(list));
        return list;
    };
    const recompute = () => {
        if (lifetime.aborted)
            return;
        for (const [placement, previous] of [...watched]) {
            let next;
            try {
                next = signature(showcase(input(placement)));
            }
            catch {
                continue;
            }
            if (next === previous)
                continue;
            watched.set(placement, next);
            publish({ name: 'iap:offers:updated', payload: { placement } });
        }
    };
    const applyState = (next) => {
        const ids = changedEntitlements(state?.entitlements ?? [], next.entitlements);
        state = next;
        try {
            deps.facts?.set({ 'ads.advanceOutstanding': next.ads.advanceOutstanding });
        }
        catch {
        }
        if (ids.length > 0) {
            publish({ name: 'iap:entitlement:changed', payload: { ids } });
        }
        recompute();
        return next;
    };
    let adsEpoch = 0;
    let entitlementsEpoch = 0;
    let latestAds;
    let initSeq = 0;
    let appliedSeq = 0;
    let flightEpochs = '';
    const epochs = () => `${adsEpoch}:${entitlementsEpoch}`;
    const advance = (outstanding, max) => {
        if (typeof outstanding !== 'number')
            return;
        adsEpoch++;
        latestAds = { outstanding, max: typeof max === 'number' ? max : latestAds?.max ?? null };
        if (state)
            state = { ...state, ads: { advanceOutstanding: outstanding,
                    advanceMax: latestAds.max ?? state.ads.advanceMax } };
        try {
            deps.facts?.set({ 'ads.advanceOutstanding': outstanding });
        }
        catch { }
    };
    const init = (force = false) => {
        try {
            active();
        }
        catch (error) {
            return Promise.reject(error);
        }
        if (state && !force && !initFlight)
            return Promise.resolve(state);
        if (initFlight && (!force || flightEpochs === epochs()))
            return initFlight;
        const seq = ++initSeq;
        const ads = adsEpoch;
        const entitlements = entitlementsEpoch;
        const flight = request({ method: 'POST', path: '/init', body: {} })
            .then((body) => {
            if (seq < appliedSeq && state)
                return state;
            appliedSeq = seq;
            const fresh = stateOf(body);
            return applyState({ ...fresh,
                ...(ads !== adsEpoch && latestAds ? { ads: { advanceOutstanding: latestAds.outstanding,
                        advanceMax: latestAds.max ?? fresh.ads.advanceMax } } : {}),
                ...(entitlements !== entitlementsEpoch && state
                    ? { entitlements: state.entitlements } : {}) });
        })
            .finally(() => { if (initFlight === flight)
            initFlight = undefined; });
        initFlight = flight;
        flightEpochs = epochs();
        return flight;
    };
    const terminalOrders = new Map();
    const orderReads = new Map();
    const getOrder = async (id, signal) => {
        const target = orderId(id);
        const existing = orderReads.get(target);
        if (existing)
            return existing;
        const terminalBeforeRead = terminalOrders.get(target);
        const flight = (async () => {
            const order = view(await request({ method: 'GET', path: `/orders/${target}`,
                ...(orderRids.has(target) ? { rid: orderRids.get(target) } : {}) }, signal));
            active();
            const settled = terminalOrders.get(target);
            if (settled && settled !== terminalBeforeRead)
                return settled;
            if (order.orderId !== target || !STATUSES.includes(order.status)
                || (GRANTED.includes(order.status) && order.grantStatus !== 'granted')) {
                throw new SDKError('INTERNAL', { module: 'iap', message: 'Invalid authoritative order' });
            }
            rememberOrder(order);
            if (outcome(order) !== 'pending') {
                terminalOrders.set(target, order);
                if (terminalOrders.size > MAX_REPORTED) {
                    terminalOrders.delete(terminalOrders.keys().next().value);
                }
            }
            return order;
        })().finally(() => { if (orderReads.get(target) === flight)
            orderReads.delete(target); });
        orderReads.set(target, flight);
        return flight;
    };
    const readAction = async (action) => {
        if (!action.orderId)
            return createOrder(action.body, action.intent, action.rid);
        try {
            return await getOrder(action.orderId);
        }
        catch (error) {
            if (!(error instanceof SDKError) || error.httpStatus !== 404)
                throw error;
            active();
            unobserve(action.orderId);
            forgetAction(action.orderId);
            return undefined;
        }
    };
    const wakes = new Map();
    const wake = (id) => { for (const notify of wakes.get(id) ?? [])
        notify(); };
    const waitOrder = async (id, options = {}, deferFirstRead = false, singleRead = false, redirect = false) => {
        const timeout = options.timeoutMs ?? 30_000;
        if (!Number.isSafeInteger(timeout) || timeout < 0 || timeout > 600_000)
            invalidData();
        const signal = options.signal ? AbortSignal.any([lifetime, options.signal]) : lifetime;
        signal.throwIfAborted();
        const terminal = terminalOrders.get(id);
        if (terminal)
            return terminal;
        const deadline = now() + timeout;
        let revision = 0;
        let backoff = 5_000;
        const offlineDeadline = settings.offlinePollMs === undefined ? undefined
            : now() + settings.offlinePollMs;
        const disconnected = () => offlineDeadline !== undefined && now() < offlineDeadline
            && (!deps.realtime || deps.realtime.connected?.() === false);
        let timedOut = false;
        let latest;
        let notify;
        const listeners = wakes.get(id) ?? new Set();
        if (!wakes.has(id) && wakes.size >= MAX_OBSERVED)
            invalidData('Too many pending orders');
        const changed = () => { revision++; notify?.(); };
        listeners.add(changed);
        wakes.set(id, listeners);
        const waitForChange = async (left) => {
            signal.throwIfAborted();
            const revisionBeforeWait = revision;
            const timer = new AbortController();
            const waitSignal = AbortSignal.any([signal, timer.signal]);
            let abort = () => { };
            try {
                await Promise.race([
                    new Promise((resolve, reject) => {
                        notify = resolve;
                        abort = () => reject(new SDKError('MODULE_NOT_ACTIVE', { module: 'iap' }));
                        signal.addEventListener('abort', abort, { once: true });
                    }),
                    sleep(left, waitSignal).then(() => {
                        if (!waitSignal.aborted && revision === revisionBeforeWait)
                            timedOut = true;
                    }),
                ]);
            }
            finally {
                notify = undefined;
                signal.removeEventListener('abort', abort);
                timer.abort();
            }
            signal.throwIfAborted();
        };
        try {
            if (deferFirstRead && timeout > 0) {
                await waitForChange(!singleRead && disconnected() ? Math.min(timeout, backoff) : timeout);
            }
            for (;;) {
                const settled = terminalOrders.get(id);
                if (settled)
                    return settled;
                const before = revision;
                if (timedOut && latest)
                    return latest;
                if (timedOut && deferFirstRead && !singleRead) {
                    if (!disconnected()) {
                        throw new SDKError('SDK_IAP_PENDING', { module: 'iap' });
                    }
                    timedOut = false;
                    backoff = Math.min(40_000, backoff * 2);
                }
                const order = await getOrder(id, signal);
                latest = order;
                if (outcome(order) !== 'pending' || singleRead)
                    return order;
                const left = deadline - now();
                if (left <= 0 || timedOut)
                    return order;
                if (revision !== before)
                    continue;
                const poll = redirect || deferFirstRead && disconnected();
                await waitForChange(redirect ? Math.min(left, 5_000)
                    : poll ? Math.min(left, backoff, offlineDeadline - now()) : left);
                if (poll && timedOut && (redirect || disconnected())) {
                    timedOut = false;
                    if (!redirect)
                        backoff = Math.min(40_000, backoff * 2);
                }
            }
        }
        finally {
            listeners.delete(changed);
            if (!listeners.size)
                wakes.delete(id);
        }
    };
    const confirmOrder = (id) => {
        const terminal = terminalOrders.get(id);
        if (terminal)
            return Promise.resolve(terminal);
        return settings.confirmTimeoutMs === undefined ? getOrder(id)
            : waitOrder(id, { timeoutMs: settings.confirmTimeoutMs }, true, true);
    };
    const cancelOrder = async (id, reason) => {
        if (!['user_cancelled', 'store_error', 'not_shown', 'not_rewarded'].includes(reason)) {
            invalidData();
        }
        const target = orderId(id);
        const order = view(await request({ method: 'POST', path: `/orders/${target}/cancel`,
            body: { reason }, idempotencyKey: rememberKey(cancelKeys, `${target}:${reason}`) }));
        if (outcome(order) !== 'pending')
            forgetAction(target);
        return order;
    };
    const granted = (order) => {
        active();
        unobserve(order.orderId);
        forgetAction(order.orderId);
        if (!rememberGrant(order.orderId))
            return;
        count(order.offerKey, order.placementKey);
        try {
            deps.facts?.purchase();
        }
        catch { }
        publish({ name: 'iap:order:granted', payload: { orderId: order.orderId,
                offerKey: order.offerKey } });
        if (state)
            applyState({ ...state, pendingOrders: state.pendingOrders.filter(item => item.orderId !== order.orderId) });
        recompute();
    };
    const observing = new Map();
    const unobserve = (id) => {
        const entry = observing.get(id);
        observing.delete(id);
        entry?.stop.abort();
    };
    const observe = (id, transaction) => {
        if (observing.has(id) || observing.size >= MAX_OBSERVED || lifetime.aborted)
            return;
        const entry = { stop: new AbortController() };
        observing.set(id, entry);
        void waitOrder(id, { timeoutMs: OBSERVE_MS, signal: entry.stop.signal }, true)
            .then(async (order) => {
            if (observing.get(id) !== entry || outcome(order) === 'pending')
                return;
            unobserve(id);
            await settle(order, transaction);
        }).catch(() => undefined).finally(() => {
            if (observing.get(id) === entry)
                unobserve(id);
        });
    };
    const settle = async (order, transaction) => {
        const { orderId: id } = order;
        if (outcome(order) !== 'pending')
            forgetAction(id);
        if (outcome(order) === 'granted') {
            unobserve(id);
            if (transaction && store)
                await store.finish(transaction, lifetime).catch(() => undefined);
            granted(order);
            return { orderId: id, status: 'granted', order };
        }
        if (outcome(order) === 'pending') {
            publish({ name: 'iap:order:pending', payload: { orderId: id } });
            observe(id, transaction);
            return { orderId: id, status: 'pending', order };
        }
        unobserve(id);
        publish({ name: 'iap:order:failed', payload: { orderId: id, code: outcome(order) === 'cancelled' ? 'SDK_IAP_CANCELED' : 'SDK_IAP_FAILED' } });
        return { orderId: id, status: outcome(order) === 'cancelled' ? 'cancelled' : 'failed', order,
            code: outcome(order) === 'cancelled' ? 'SDK_IAP_CANCELED' : 'SDK_IAP_FAILED' };
    };
    const restorePurchases = async (owned, idempotencyKey) => {
        const body = await request({ method: 'POST', path: '/restore',
            body: { storeKey: store.storeKey, purchases: owned.map((item) => ({
                    orderId: item.orderId, proof: item.proof, productRef: item.productRef
                })) },
            idempotencyKey });
        active();
        const orders = Array.isArray(body?.orders) ? body.orders.filter((item) => record(item)
            && typeof item.orderId === 'string' && typeof item.status === 'string') : [];
        const entitlements = entitlementsOf(body?.entitlements);
        const conflicts = Array.isArray(body?.conflicts) ? body.conflicts.filter((item) => record(item) && typeof item.sku === 'string'
            && typeof item.reason === 'string') : [];
        entitlementsEpoch++;
        if (state)
            applyState({ ...state, entitlements });
        else
            applyState({ pendingOrders: [], entitlements, offerState: {},
                ads: { advanceOutstanding: latestAds?.outstanding ?? 0,
                    advanceMax: latestAds?.max ?? null } });
        const restored = orders.filter((item) => GRANTED.includes(item.status)).length;
        publish({ name: 'iap:restore:completed', payload: { restored } });
        return { restored, orders, entitlements, conflicts };
    };
    const confirmOnce = async (transaction) => {
        let id = transaction.orderId === null ? null : orderId(transaction.orderId);
        if (id !== null && reported.has(id)) {
            forgetAction(id);
            rememberGrant(id);
            await store.finish(transaction, lifetime).catch(() => undefined);
            active();
            return { orderId: id, status: 'granted' };
        }
        let validationComplete = false;
        let order;
        try {
            let status;
            if (id === null) {
                const restored = await restorePurchases([transaction], rememberKey(restoreKeys, transaction.transactionId));
                const [restoredOrder] = restored.orders;
                if (restored.orders.length !== 1 || !restoredOrder) {
                    return { orderId: null, status: 'failed', code: 'SDK_IAP_VALIDATION_FAILED' };
                }
                id = orderId(restoredOrder.orderId);
                status = restoredOrder.status;
            }
            else {
                const validationRef = transaction.transactionId;
                const body = await request({ method: 'POST',
                    path: `/orders/${id}/validate`, body: { provider: store.provider, productRef: transaction.productRef,
                        proof: transaction.proof },
                    idempotencyKey: rememberKey(validateKeys, validationRef) });
                status = body?.status;
            }
            validationComplete = true;
            if (status === 'validated' || status === 'granted') {
                publish({ name: 'iap:order:validated', payload: { orderId: id } });
            }
            order = transaction.orderId === null ? await waitOrder(id)
                : await confirmOrder(id);
        }
        catch (error) {
            if (error instanceof SDKError && !error.retryable) {
                if (id !== null)
                    publish({ name: 'iap:order:failed', payload: { orderId: id, code: iapErrorCode(error) } });
                return { orderId: id, status: 'failed', code: iapErrorCode(error) };
            }
            if (id !== null) {
                publish({ name: 'iap:order:pending', payload: { orderId: id } });
                if (validationComplete)
                    observe(id, transaction);
            }
            return { orderId: id, status: 'pending' };
        }
        return settle(order, transaction);
    };
    const confirming = new Map();
    const confirm = (transaction) => {
        active();
        const id = transaction.orderId === null ? null : orderId(transaction.orderId);
        if (!transaction.proof || !['receipt', 'token'].includes(transaction.proof.type)
            || typeof transaction.proof.value !== 'string' || transaction.proof.value.length === 0
            || transaction.proof.value.length > 65536 || typeof transaction.transactionId !== 'string'
            || transaction.transactionId.length === 0 || transaction.transactionId.length > 512) {
            return Promise.resolve({ orderId: id, status: 'failed', code: 'SDK_IAP_VALIDATION_FAILED' });
        }
        const flightKey = id ?? `restore:${transaction.transactionId}`;
        const running = confirming.get(flightKey);
        if (running)
            return running;
        if (confirming.size >= MAX_OBSERVED)
            return Promise.resolve({ orderId: id, status: 'pending' });
        const flight = confirmOnce(transaction).finally(() => { confirming.delete(flightKey); });
        confirming.set(flightKey, flight);
        return flight;
    };
    const findOffer = (offerKey, placement) => {
        if (placement === undefined)
            return offerOf(offerKey, input(''));
        return offers(placement).find((item) => item.key === offerKey);
    };
    const purchaseFlights = new Map();
    const purchaseOnce = async (purchase) => {
        active();
        if (!record(purchase))
            invalidData();
        let offerKey = purchase.offerKey === undefined ? undefined : key(purchase.offerKey);
        const productKey = purchase.productKey === undefined ? undefined : key(purchase.productKey);
        if ((offerKey === undefined) === (productKey === undefined))
            invalidData();
        const placement = purchase.placement === undefined ? undefined : key(purchase.placement);
        const payload = purchase.payload === undefined ? undefined : payloadCopy(purchase.payload);
        const originalIntent = canonical(purchase);
        const previous = [...actions.values()].find(action => action.intent === originalIntent);
        if (previous) {
            const known = previous.orderId !== null;
            const order = await readAction(previous);
            if (order && outcome(order) === 'pending') {
                return settle(known ? order
                    : await confirmOrder(order.orderId));
            }
            if (order) {
                const result = await settle(order);
                if (purchase.txId !== undefined)
                    return result;
            }
        }
        const hold = deps.facts?.hold();
        try {
            if (productKey !== undefined) {
                const candidates = Object.keys(deps.configs?.getScope(OFFERS_SCOPE) ?? {})
                    .flatMap((candidate) => {
                    const offer = findOffer(candidate, placement);
                    if (offer?.kind !== 'paid')
                        return [];
                    const variants = offer.variants.filter((variant) => variant.productKey === productKey
                        && (purchase.variantKey === undefined || variant.key === purchase.variantKey));
                    const variant = variants.find((item) => item.key === 'default') ?? variants.at(0);
                    return variant ? [{ key: candidate, variant: variant.key }] : [];
                });
                if (candidates.length !== 1)
                    return { orderId: null, status: 'failed',
                        code: 'SDK_IAP_NOT_AVAILABLE' };
                const candidate = candidates.at(0);
                offerKey = candidate.key;
                purchase = { ...purchase, variantKey: candidate.variant };
            }
            const shown = findOffer(offerKey, placement);
            if (!shown)
                throw new SDKError('NOT_FOUND', { module: 'iap', message: 'Offer not found' });
            if (shown.kind === 'ad')
                invalidData('ad offers are ordered by sdk.ads');
            const variantKey = purchase.variantKey === undefined ? shown.variant.key
                : key(purchase.variantKey);
            const offer = variantKey === shown.variant.key ? shown
                : offerWithVariant(offerKey, variantKey, input(placement ?? ''));
            const variant = offer?.variant;
            if (!offer || !variant) {
                throw new SDKError('NOT_FOUND', { module: 'iap', message: 'Variant not found' });
            }
            if (!offer.available) {
                return { orderId: null, status: 'failed', code: offer.reason ?? 'unavailable' };
            }
            const intent = originalIntent;
            const order = await createOrder({
                offerKey, variantKey,
                ...(offer.kind === 'paid' && store ? store.confirmation === 'redirect'
                    ? { storeId: store.storeKey, productKey: variant.productKey }
                    : { storeKey: store.storeKey } : {}),
                ...(placement === undefined ? {} : { placementKey: placement }),
                applied: offer.applied,
                ...(offer.scopeVersion === null ? {} : { scopeVersion: offer.scopeVersion }),
                ...(payload === undefined ? {} : { payload }),
            }, intent, purchase.txId);
            const id = order.orderId;
            publish({ name: 'iap:order:created', payload: { orderId: id, offerKey: offerKey } });
            if (outcome(order) !== 'pending')
                return settle(order);
            if (offer.kind === 'free' || !store) {
                return settle(await confirmOrder(id));
            }
            const product = offer.kind === 'paid' && offer.product?.productKey === variant.productKey
                ? offer.product : undefined;
            const sku = order.sku ?? product?.sku;
            if (!sku || !variant.productKey || !product || (product.sku && sku !== product.sku)) {
                await cancelOrder(id, 'store_error').catch(() => undefined);
                publish({ name: 'iap:order:failed', payload: { orderId: id, code: 'SDK_IAP_NOT_AVAILABLE' } });
                return { orderId: id, status: 'failed', code: 'no_product' };
            }
            const accountToken = store.confirmation === 'redirect' ? order.storeAccountToken ?? ''
                : order.storeAccountToken;
            if (typeof accountToken !== 'string'
                || (store.confirmation !== 'redirect' && !accountToken.trim())) {
                await cancelOrder(id, 'store_error').catch(() => undefined);
                active();
                publish({ name: 'iap:order:failed', payload: { orderId: id, code: 'SDK_IAP_NOT_AVAILABLE' } });
                return { orderId: id, status: 'failed', code: 'SDK_IAP_NOT_AVAILABLE' };
            }
            publish({ name: 'iap:store:purchase-started', payload: { orderId: id } });
            let result;
            try {
                await readyStore();
                active();
                result = await store.purchase({ orderId: id,
                    ...(store.confirmation === 'redirect' ? { confirmation: own(order, 'confirmation') } : {}), productKey: variant.productKey, sku,
                    type: product.type, binding: product.binding,
                    accountToken, offer: { key: offer.key,
                        variant: { key: variant.key, entities: variant.entities },
                        ...(offer.iconUrl ? { iconUrl: offer.iconUrl } : {}) },
                    ...(product.store ? { product: product.store } : {}) }, lifetime);
            }
            catch (error) {
                active();
                if ('fake' in store && error instanceof SDKError
                    && error.code === 'SDK_IAP_NOT_AVAILABLE') {
                    await cancelOrder(id, 'store_error').catch(() => undefined);
                    const failed = { orderId: id, code: error.code };
                    publish({ name: 'iap:store:purchase-failed', payload: failed });
                    publish({ name: 'iap:order:failed', payload: failed });
                    return { orderId: id, status: 'failed', code: error.code };
                }
                publish({ name: 'iap:order:pending', payload: { orderId: id } });
                observe(id);
                return { orderId: id, status: 'pending' };
            }
            active();
            if (result.status === 'canceled') {
                await cancelOrder(id, 'user_cancelled').catch(() => undefined);
                publish({ name: 'iap:store:purchase-cancelled', payload: { orderId: id } });
                return { orderId: id, status: 'cancelled' };
            }
            if (result.status === 'failed') {
                result = { status: 'failed', code: iapErrorCode(result.code) };
                await cancelOrder(id, 'store_error').catch(() => undefined);
                publish({ name: 'iap:store:purchase-failed', payload: { orderId: id, code: result.code } });
                publish({ name: 'iap:order:failed', payload: { orderId: id, code: result.code } });
                return { orderId: id, status: 'failed', code: result.code };
            }
            if (result.status === 'pending') {
                if (store.confirmation === 'redirect') {
                    return settle(await waitOrder(id, { timeoutMs: 30_000 }, false, false, true));
                }
                observe(id);
                publish({ name: 'iap:order:pending', payload: { orderId: id } });
                return { orderId: id, status: 'pending' };
            }
            if (result.status === 'already_owned' || result.status === 'not_available') {
                await cancelOrder(id, 'store_error').catch(() => undefined);
                return { orderId: id, status: 'failed', code: result.status === 'already_owned'
                        ? 'SDK_IAP_ALREADY_OWNED' : 'SDK_IAP_NOT_AVAILABLE' };
            }
            if (result.transaction.orderId !== null && result.transaction.orderId !== id) {
                invalidData('Store transaction of another order');
            }
            return await confirm({ ...result.transaction, orderId: id });
        }
        finally {
            hold?.release();
        }
    };
    const api = {
        load: (options = {}) => init(options.force === true),
        state: () => state,
        offers(selection) {
            active();
            if (!record(selection))
                invalidData();
            return offers(key(selection.placement));
        },
        offer(selection) {
            active();
            if (!record(selection))
                invalidData();
            return findOffer(key(selection.offerKey), selection.placement === undefined ? undefined : key(selection.placement));
        },
        async products(options = {}) {
            active();
            if (!store)
                return [];
            await readyStore();
            active();
            if (!options.force && prices.size > 0 && !pricesFlight)
                return [...prices.values()];
            pricesFlight ??= (async () => {
                const catalog = deps.configs?.getScope(PRODUCTS_SCOPE) ?? {};
                const asked = [];
                for (const [productKey, data] of Object.entries(catalog).slice(0, 200)) {
                    const product = KEY.test(productKey)
                        ? parseProduct(productKey, data, store.storeKey) : undefined;
                    if (product?.sku && product.binding)
                        asked.push({ productKey, sku: product.sku,
                            binding: product.binding, type: product.type,
                            name: product.name });
                }
                const answer = asked.length === 0 ? [] : await store.products(asked, lifetime);
                active();
                const next = new Map();
                for (const item of Array.isArray(answer) ? answer : []) {
                    const wanted = asked.find((one) => one.productKey === item?.productKey);
                    if (wanted && item.sku === wanted.sku)
                        next.set(wanted.productKey, item);
                }
                prices = next;
                recompute();
                return [...next.values()];
            })().finally(() => { pricesFlight = undefined; });
            return pricesFlight;
        },
        purchase(purchase) {
            active();
            if (!record(purchase))
                invalidData();
            if (Object.keys(purchase).some(name => !['offerKey', 'productKey', 'variantKey',
                'placement', 'payload', 'txId'].includes(name)))
                invalidData();
            for (const value of [purchase.offerKey, purchase.productKey,
                purchase.variantKey, purchase.placement]) {
                if (value !== undefined)
                    key(value);
            }
            if (purchase.txId !== undefined && !isIdempotencyKey(purchase.txId))
                invalidData();
            if (purchase.payload !== undefined)
                payloadCopy(purchase.payload);
            const identity = canonical(purchase);
            const existing = purchaseFlights.get(identity);
            if (existing)
                return existing;
            if (purchaseFlights.size >= MAX_OBSERVED)
                invalidData('Too many pending purchases');
            const flight = purchaseOnce(purchase).catch(error => { active(); throw error; })
                .finally(() => {
                if (purchaseFlights.get(identity) === flight)
                    purchaseFlights.delete(identity);
            });
            purchaseFlights.set(identity, flight);
            return flight;
        },
        async createAdOrder(order) {
            active();
            if (!record(order))
                invalidData();
            if (Object.keys(order).some(name => !['offerKey', 'variantKey', 'placement',
                'applied', 'scopeVersion', 'txId'].includes(name)))
                invalidData();
            if (order.txId !== undefined && !isIdempotencyKey(order.txId))
                invalidData();
            const offerKey = key(order.offerKey);
            const placement = key(order.placement);
            const offer = offerOf(offerKey, input(placement));
            if (!offer)
                throw new SDKError('NOT_FOUND', { module: 'iap', message: 'Offer not found' });
            if (offer.kind !== 'ad')
                invalidData('Not an ad offer');
            const variantKey = order.variantKey === undefined ? offer.variant.key : key(order.variantKey);
            const applied = order.applied === undefined ? offer.applied : order.applied;
            if (applied !== null && (typeof applied !== 'string' || applied.length > 128))
                invalidData();
            const scopeVersion = order.scopeVersion ?? offer.scopeVersion;
            if (scopeVersion !== null && (!Number.isSafeInteger(scopeVersion) || scopeVersion < 0)) {
                invalidData();
            }
            const body = await createOrder({
                offerKey, variantKey, placementKey: placement, applied,
                ...(scopeVersion === null ? {} : { scopeVersion }),
            }, `ad:${canonical(order)}`, order.txId);
            const created = view(body);
            advance(created.ads?.advanceOutstanding, created.ads?.advanceMax);
            publish({ name: 'iap:order:created', payload: { orderId: created.orderId, offerKey } });
            return created;
        },
        async claim(id) {
            active();
            const target = orderId(id);
            observe(target);
            const body = await request({ method: 'POST', path: `/orders/${target}/claim`,
                body: {}, idempotencyKey: rememberKey(claimKeys, target) });
            if (!record(body) || (body.reward !== 'granted' && body.reward !== 'pending')) {
                throw new SDKError('INTERNAL', { module: 'iap', message: 'Invalid claim answer' });
            }
            const order = view(body.order);
            advance(body.advanceOutstanding, body.advanceMax);
            if (body.reward === 'granted')
                granted(order);
            else if (!reported.has(order.orderId)) {
                publish({ name: 'iap:order:pending', payload: { orderId: order.orderId } });
            }
            return body;
        },
        async cancelOrder(id, reason) {
            active();
            const order = await cancelOrder(id, reason);
            if (outcome(order) !== 'pending')
                forgetAction(order.orderId);
            recompute();
            return order;
        },
        order(id, options = {}) {
            active();
            return getOrder(id, options.signal);
        },
        async waitOrder(id, options) {
            active();
            const result = await waitOrder(orderId(id), options);
            if (outcome(result) !== 'pending')
                forgetAction(result.orderId);
            if (outcome(result) === 'failed' || outcome(result) === 'cancelled') {
                throw new SDKError(outcome(result) === 'cancelled' ? 'SDK_IAP_CANCELED' : 'SDK_IAP_FAILED', { module: 'iap' });
            }
            return result;
        },
        async orders(query = {}) {
            active();
            if (!record(query))
                invalidData();
            const { status, cursor, limit } = query;
            if (status !== undefined && (!Array.isArray(status) || status.length === 0
                || status.some((item) => !STATUSES.includes(item))))
                invalidData();
            if (cursor !== undefined && !(typeof cursor === 'string' && /^[0-9a-f]{24}$/.test(cursor))) {
                invalidData();
            }
            if (limit !== undefined && !(typeof limit === 'number' && Number.isSafeInteger(limit)
                && limit >= 1 && limit <= 100)) {
                invalidData();
            }
            const body = await request({ method: 'GET',
                path: '/orders', query: { ...(status ? { status: [...new Set(status)].join(',') } : {}),
                    ...(cursor === undefined ? {} : { cursor }),
                    ...(limit === undefined ? {} : { limit }) } });
            return { items: Array.isArray(body?.items) ? body.items.map(view) : [],
                nextCursor: typeof body?.nextCursor === 'string' ? body.nextCursor : null };
        },
        async pendingOrders() {
            return (await api.orders({ status: IN_PROGRESS, limit: 100 })).items
                .filter(order => outcome(order) === 'pending');
        },
        async entitlements(options = {}) {
            return (await init(options.force === true)).entitlements;
        },
        async openSubscriptionManagement() {
            active();
            if (!store?.subscriptionManagementUrl || !deps.platform) {
                throw new SDKError('SDK_IAP_NOT_AVAILABLE', { module: 'iap' });
            }
            let url;
            try {
                url = new URL(store.subscriptionManagementUrl);
            }
            catch {
                invalidData();
            }
            if (url.protocol !== 'https:' || url.username || url.password)
                invalidData();
            await deps.platform.openUrl(url.href, 'system');
            active();
        },
        async restore() {
            active();
            const empty = { restored: 0, orders: [], conflicts: [] };
            if (!store)
                return { ...empty, entitlements: state?.entitlements ?? [] };
            await readyStore();
            active();
            const owned = (await store.restore(lifetime)).slice(0, 100);
            active();
            if (owned.length === 0) {
                publish({ name: 'iap:restore:completed', payload: { restored: 0 } });
                return { ...empty, entitlements: state?.entitlements ?? [] };
            }
            return restorePurchases(owned, randomUuidV7(now()));
        },
        dispose() {
            controller.abort(new SDKError('MODULE_NOT_ACTIVE', { module: 'iap' }));
            for (const off of offRealtime.splice(0))
                off();
            watched.clear();
        },
    };
    const receive = async (message) => {
        if (lifetime.aborted || !IAP_REALTIME_TYPES.includes(message.type)
            || !['player', 'session'].includes(message.to.kind))
            return;
        const id = message.payload.orderId;
        if (typeof id !== 'string' || !ORDER_ID.test(id)
            || message.ref?.resource !== `iap.orders.${id}`)
            return;
        if (message.type === 'iap.order.paid')
            return;
        const expected = orderRids.get(id);
        if (!expected && !wakes.has(id) && !observing.has(id)) {
            if (!message.rid || !actions.has(message.rid))
                return;
            earlyHints.set(id, message);
            while (earlyHints.size > MAX_OBSERVED)
                earlyHints.delete(earlyHints.keys().next().value);
            return;
        }
        if (expected && message.rid !== undefined && message.rid !== expected)
            return;
        const known = knownOrders.get(id);
        if (known && message.delivery === 'guaranteed' && message.sender === 'iap'
            && message.schemaVersion === 1 && message.type === 'iap.order.granted'
            && GRANTED.includes(message.payload.status)
            && message.payload.grantStatus === 'granted') {
            const order = { ...known, status: message.payload.status,
                grantStatus: 'granted' };
            terminalOrders.set(id, order);
            while (terminalOrders.size > MAX_REPORTED) {
                terminalOrders.delete(terminalOrders.keys().next().value);
            }
            rememberOrder(order);
        }
        if (!wakes.has(id)) {
            unobserve(id);
            observe(id);
        }
        wake(id);
    };
    const reconcile = async () => {
        active();
        const journalOrders = new Set([...actions.values()].map(action => action.orderId));
        for (const id of new Set([...wakes.keys(), ...orderRids.keys()])) {
            if (!wakes.has(id) && !journalOrders.has(id))
                observe(id);
            wake(id);
        }
        for (const action of [...actions.values()]) {
            if (action.orderId && wakes.has(action.orderId))
                continue;
            try {
                const known = action.orderId !== null;
                const order = await readAction(action);
                if (order) {
                    await settle(order);
                    if (!known && outcome(order) === 'pending')
                        wake(order.orderId);
                }
            }
            catch { }
        }
        const current = await init(true);
        for (const order of current.pendingOrders.slice(0, MAX_OBSERVED)) {
            if (!wakes.has(order.orderId)) {
                observe(order.orderId);
                wake(order.orderId);
            }
        }
    };
    if (deps.realtime)
        for (const type of IAP_REALTIME_TYPES) {
            offRealtime.push(deps.realtime.on(type, message => {
                void receive(message).catch(() => undefined);
            }), deps.realtime.handle(type, receive));
        }
    return { iap: api, confirm, recompute, receive, reconcile,
        connectStore(adapter) {
            active();
            if (store)
                throw new SDKError('SDK_MODULE_DUPLICATE', { module: 'iap' });
            store = adapter;
            recompute();
        } };
}
const IAP_REALTIME_TYPES = ['iap.order.paid', 'iap.order.granted', 'iap.order.failed',
    'iap.order.refunded', 'iap.order.revoked'];
const EMITS = ['iap:offers:updated', 'iap:order:created', 'iap:store:purchase-started',
    'iap:store:purchase-cancelled', 'iap:store:purchase-failed', 'iap:order:validated',
    'iap:order:granted', 'iap:order:pending', 'iap:order:failed', 'iap:restore:completed',
    'iap:entitlement:changed', 'iap:window:open', 'iap:window:close'];
const word = (value) => typeof value === 'string' ? value : '';
function tilePlacementsOf(main) {
    const triggers = record(main) && Array.isArray(main['triggers']) ? main['triggers'] : [];
    const out = new Set();
    for (const rule of triggers.slice(0, 256)) {
        if (!record(rule) || !record(rule['on']) || rule['on']['event'] !== 'hud:item:opened'
            || !record(rule['payload']) || rule['payload']['id'] !== 'offers'
            || !Array.isArray(rule['do']))
            continue;
        for (const step of rule['do'].slice(0, 16)) {
            const placement = record(step) && step['module'] === 'iap' && step['action'] === 'offer'
                && record(step['params']) ? step['params']['placement'] : undefined;
            if (typeof placement === 'string' && placement !== '')
                out.add(placement);
        }
    }
    return [...out].slice(0, 32);
}
export function iapModule(options = {}) {
    let api;
    let runtime;
    let nativeSelected = () => false;
    let connectedStore = false;
    let detach = [];
    let adapterHandle;
    let hud;
    const offersSeen = new Map();
    let tilePlacements = null;
    const offersBadge = (placement) => {
        if (!hud || !api || (tilePlacements && !tilePlacements.has(placement)))
            return;
        let available;
        try {
            available = api.offers({ placement }).filter((offer) => offer.available);
        }
        catch {
            return;
        }
        const ends = available.flatMap((offer) => {
            const at = offer.endsAt === undefined ? NaN : Date.parse(offer.endsAt);
            return Number.isFinite(at) ? [at] : [];
        });
        offersSeen.set(placement, { count: available.length,
            ...(ends.length > 0 ? { endsAt: Math.min(...ends) } : {}) });
        const all = [...offersSeen.values()];
        const soonest = all.flatMap((seen) => seen.endsAt === undefined ? [] : [seen.endsAt]);
        hud.setBadge('offers', null);
        hud.setTimer('offers', null);
        if (all.every((seen) => seen.count === 0))
            return;
        else if (soonest.length > 0)
            hud.setTimer('offers', Math.min(...soonest));
        else
            hud.setBadge('offers', { kind: 'dot' });
    };
    const offersBadgeAll = (configs) => {
        let keys;
        try {
            const named = tilePlacementsOf(configs?.getScope('ui.windows')['main']);
            tilePlacements = named.length > 0 ? new Set(named) : null;
            keys = named.length > 0 ? named
                : Object.keys(configs?.getScope(PLACEMENTS_SCOPE) ?? {}).slice(0, 32);
        }
        catch {
            return;
        }
        for (const placement of [...offersSeen.keys()]) {
            if (!keys.includes(placement))
                offersSeen.delete(placement);
        }
        for (const placement of keys)
            offersBadge(placement);
    };
    const close = async () => {
        for (const off of detach)
            off();
        detach = [];
        hud?.dispose();
        hud = undefined;
        offersSeen.clear();
        tilePlacements = null;
        api?.dispose();
        api = undefined;
        runtime = undefined;
        nativeSelected = () => false;
        connectedStore = false;
        const handle = adapterHandle;
        adapterHandle = undefined;
        await handle?.dispose();
    };
    return defineModule({
        manifest: {
            settings: { schemaVersion: 1, fields: [{ ref: 'availability' }] },
            ui: ui, id: 'iap', version: VERSION, kind: 'service', engines: { core: '^1.0.0' }, targets: ['web', 'cordova'],
            permissions: ['http:iap', 'storage', 'modules', 'platform', 'windows'],
            provides: [IAP_STORE_SERVICE], load: 'eager', entry: 'iap.js',
            consumes: ['ui.slots@1', 'hud.registry@1'], optional: { 'ui-kit': '^1.0.0', 'hud-ui': '^1.0.0' },
            events: { emits: EMITS, listens: ['iap:window:closed', 'configs:snapshot:updated',
                    'realtime:connection:resync', ...IAP_REALTIME_TYPES.map(type => `realtime:${type}`)] },
            realtime: { handles: IAP_REALTIME_TYPES },
        },
        init(ctx) {
            const selected = (call) => call.from === 'store-google-play' && !connectedStore && runtime !== undefined
                && nativeSelected();
            const registration = {
                selected,
                connect(call, candidate) {
                    if (!selected(call) || !isStoreAdapter(candidate) || candidate.id !== 'google_play'
                        || candidate.provider !== 'google_play' || candidate.storeKey !== 'google_play'
                        || candidate.fake === true)
                        return;
                    const host = runtime;
                    const off = candidate.onTransaction(transaction => {
                        if (transaction?.orderId !== null
                            && (typeof transaction?.orderId !== 'string' || !ORDER_ID.test(transaction.orderId)))
                            return;
                        void host.confirm(transaction).catch(() => undefined);
                    });
                    host.connectStore(candidate);
                    connectedStore = true;
                    detach.push(off);
                    void host.iap.products().catch(() => undefined);
                },
            };
            ctx.services.provide(IAP_STORE_SERVICE, registration);
        },
        async start(ctx) {
            if (!ctx.http)
                throw new SDKError('SDK_PERMISSION_DENIED', { module: 'iap' });
            await close();
            const selectedId = own(ctx.config, 'storeAdapter');
            const webStore = options.storeId !== undefined && options.portal && ctx.platform?.id === 'web'
                ? redirectStore({ storeId: options.storeId, portal: options.portal, http: ctx.http })
                : undefined;
            const selected = webStore ?? (typeof selectedId === 'string'
                ? options.adapters?.find((adapter) => adapter.id === selectedId) : options.store);
            const loaded = selected ? {} : await loadStoreAdapter({
                config: ctx.config, configs: ctx.configs, modules: ctx.modules,
                platform: ctx.platform, environment: ctx.environment, signal: ctx.signal
            });
            adapterHandle = loaded.handle;
            const candidate = selected ?? loaded.store;
            const store = (candidate?.fake || candidate?.provider === 'fake_store')
                && !fakeAllowed(ctx.environment) ? undefined : candidate;
            ctx.signal.throwIfAborted();
            const host = iapRuntime({
                settings: ctx.config,
                http: ctx.http, ...(ctx.platform ? { platform: ctx.platform } : {}),
                realtime: ctx.realtime, configs: ctx.configs, facts: ctx.facts,
                now: ctx.time.now,
                ...(ctx.storage ? { storage: ctx.storage } : {}), signal: ctx.signal,
                ...(store ? { store } : {}),
                publish(event) {
                    switch (event.name) {
                        case 'iap:offers:updated':
                            ctx.bus.emit('iap:offers:updated', event.payload);
                            offersBadge(event.payload.placement);
                            break;
                        case 'iap:order:created':
                            ctx.bus.emit('iap:order:created', event.payload);
                            break;
                        case 'iap:store:purchase-started':
                            ctx.bus.emit('iap:store:purchase-started', event.payload);
                            break;
                        case 'iap:store:purchase-cancelled':
                            ctx.bus.emit('iap:store:purchase-cancelled', event.payload);
                            break;
                        case 'iap:store:purchase-failed':
                            ctx.bus.emit('iap:store:purchase-failed', event.payload);
                            break;
                        case 'iap:order:validated':
                            ctx.bus.emit('iap:order:validated', event.payload);
                            break;
                        case 'iap:order:granted':
                            ctx.bus.emit('iap:order:granted', event.payload);
                            break;
                        case 'iap:order:pending':
                            ctx.bus.emit('iap:order:pending', event.payload);
                            break;
                        case 'iap:order:failed':
                            ctx.bus.emit('iap:order:failed', event.payload);
                            break;
                        case 'iap:restore:completed':
                            ctx.bus.emit('iap:restore:completed', event.payload);
                            break;
                        case 'iap:entitlement:changed':
                            ctx.bus.emit('iap:entitlement:changed', event.payload);
                            break;
                    }
                },
            });
            connectedStore = store !== undefined;
            runtime = host;
            nativeSelected = () => {
                if (own(ctx.config, 'storeAdapter') !== 'google_play' || ctx.platform?.id !== 'cordova')
                    return false;
                const catalog = ctx.configs.getScope(PRODUCTS_SCOPE);
                return Object.entries(catalog).some(([key, value]) => parseProduct(key, value, 'google_play')?.binding !== undefined);
            };
            api = publicIap(host.iap);
            hud = hudItems(ctx.services, [{ id: 'shop', icon: 'shop', label: 'sdk.hud.shop', slot: 'right', order: 20 },
                { id: 'offers', icon: 'gift', label: 'sdk.hud.offers', slot: 'right', order: 25 }]);
            const windows = registerModuleWindow({
                module: 'iap', signal: ctx.signal,
                open: ({ name, params }) => ctx.bus.emit('iap:window:open', {
                    target: name, placement: word(params['placement']), offerKey: word(params['offerKey']),
                }),
                close: ({ name }) => ctx.bus.emit('iap:window:close', { target: name }),
                onClosed: (listener) => ctx.bus.on('iap:window:closed', ({ target }) => listener({ name: target })),
            }, ['main', 'offer', 'chain']);
            const windowOf = (moduleWindow, needsOffer) => ({
                canShow: (moment) => {
                    const placement = word(moment['placement']);
                    if (!needsOffer || placement === '')
                        return true;
                    try {
                        return host.iap.offers({ placement }).some((offer) => offer.available);
                    }
                    catch {
                        return false;
                    }
                },
                open: (params) => moduleWindow.open(params),
            });
            const unregister = ctx.windows?.register({ main: windowOf(windows.main, false),
                offer: windowOf(windows.offer, true), chain: windowOf(windows.chain, true) });
            if (unregister)
                detach.push(unregister);
            detach.push(ctx.bus.on('configs:snapshot:updated', () => {
                host.recompute();
                offersBadgeAll(ctx.configs);
            }), ctx.bus.on('realtime:connection:resync', () => {
                void host.reconcile().catch(() => undefined);
            }));
            if (store) {
                detach.push(store.onTransaction((transaction) => {
                    if (transaction?.orderId !== null
                        && (typeof transaction?.orderId !== 'string' || !ORDER_ID.test(transaction.orderId)))
                        return;
                    void host.confirm(transaction).catch(() => undefined);
                }));
            }
            offersBadgeAll(ctx.configs);
            void host.reconcile().catch(() => undefined);
            if (store)
                void host.iap.products().catch(() => undefined);
        },
        async stop() { await close(); },
        api() {
            if (!api)
                throw new SDKError('MODULE_NOT_ACTIVE', { module: 'iap' });
            return api;
        },
        async dispose() { await close(); },
    });
}

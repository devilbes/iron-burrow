import ui from './ui.json' with { type: 'json' };
import { registerModuleWindow } from '@manygamescorp/core/window-triggers';
import { SDKError } from '@manygamescorp/core/error';
import { hudItems } from '@manygamescorp/core/hud';
import { defineModule } from '@manygamescorp/core/module';
import { topBarItem } from '@manygamescorp/core/topbar';
import { isIdempotencyKey } from '@manygamescorp/core/transport';
const MAX_GRANTED_ITEMS = 50;
function inactive() {
    return new SDKError('MODULE_NOT_ACTIVE', { module: 'inventory' });
}
function invalid() {
    throw new SDKError('INTERNAL', { module: 'inventory', message: 'Invalid inventory response' });
}
function object(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
        invalid();
    return value;
}
function string(value) {
    if (typeof value !== 'string' || !value)
        invalid();
    return value;
}
function date(value) {
    const text = string(value);
    if (!Number.isFinite(Date.parse(text)))
        invalid();
    return text;
}
function number(value) {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
        invalid();
    return value;
}
function nullableDate(value) {
    return value === null ? null : date(value);
}
function array(value, convert) {
    if (!Array.isArray(value))
        invalid();
    return value.map(convert);
}
function defaulted(value, fallback) {
    return value === undefined ? fallback : value;
}
function inventoryState(value) {
    const source = object(value);
    const common = (entry) => ({
        collection: string(entry.collection), itemId: string(entry.itemId),
        stateVersion: number(defaulted(entry.stateVersion, 0)),
        updatedAt: nullableDate(defaulted(entry.updatedAt, null)),
    });
    return {
        inventoryVersion: number(defaulted(source.inventoryVersion, 0)),
        currencies: array(defaulted(source.currencies, []), (value) => {
            const entry = object(value);
            if (entry.itemType !== 'soft_currency' && entry.itemType !== 'hard_currency')
                invalid();
            return { ...common(entry), stackId: string(entry.stackId), itemType: entry.itemType,
                quantity: number(defaulted(entry.quantity, 0)) };
        }),
        items: array(defaulted(source.items, []), (value) => {
            const entry = object(value);
            return { ...common(entry), stackId: string(entry.stackId),
                quantity: number(defaulted(entry.quantity, 0)),
                expiresAt: nullableDate(defaulted(entry.expiresAt, null)) };
        }),
        instances: array(defaulted(source.instances, []), (value) => {
            const entry = object(value);
            const attrs = object(defaulted(entry.attrs, {}));
            if (Object.values(attrs).some((value) => typeof value !== 'string' && typeof value !== 'boolean'
                && (typeof value !== 'number' || !Number.isFinite(value))))
                invalid();
            return { ...common(entry), instanceId: string(entry.instanceId),
                attrs: attrs,
                expiresAt: nullableDate(defaulted(entry.expiresAt, null)) };
        }),
        updatedAt: nullableDate(defaulted(source.updatedAt, null)), serverTime: date(source.serverTime),
    };
}
function mutationResult(value) {
    const source = object(value);
    if (typeof source.replayed !== 'boolean')
        invalid();
    return {
        transactionId: string(source.transactionId),
        inventoryVersion: number(source.inventoryVersion),
        replayed: source.replayed,
        lines: array(source.lines, (value) => {
            const entry = object(value);
            if (typeof entry.delta !== 'number' || !Number.isSafeInteger(entry.delta))
                invalid();
            return { itemId: string(entry.itemId),
                instanceId: entry.instanceId === null ? null : string(entry.instanceId),
                delta: entry.delta, balanceAfter: number(entry.balanceAfter) };
        }),
        state: inventoryState(source.state),
    };
}
const RULE_ID = /^[a-z][a-z0-9_]{0,63}$/;
const ITEM_ID = RULE_ID;
const REASON = /^[A-Za-z0-9._:-]{1,64}$/;
const MAX_CONSUME_QTY = 10_000;
function detached(value) { return structuredClone(value); }
function freeze(value) {
    if (value !== null && typeof value === 'object') {
        for (const child of Object.values(value))
            freeze(child);
        Object.freeze(value);
    }
    return value;
}
function signature(value) {
    if (Array.isArray(value))
        return `[${value.map(signature).join(',')}]`;
    if (value && typeof value === 'object') {
        return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
            .map(([key, entry]) => `${JSON.stringify(key)}:${signature(entry)}`).join(',')}}`;
    }
    return JSON.stringify(value) ?? 'undefined';
}
function changedIds(before, after) {
    const collect = (state) => {
        const map = new Map();
        if (!state)
            return map;
        for (const position of [...state.currencies, ...state.items, ...state.instances]) {
            const entries = map.get(position.itemId) ?? [];
            entries.push(signature(position));
            map.set(position.itemId, entries);
        }
        for (const entries of map.values())
            entries.sort();
        return map;
    };
    const previous = collect(before);
    const next = collect(after);
    return [...new Set([...previous.keys(), ...next.keys()])].sort()
        .filter((id) => signature(previous.get(id) ?? []) !== signature(next.get(id) ?? []));
}
function grantedItems(before, after) {
    if (!before)
        return [];
    const totals = (state) => {
        const map = new Map();
        const add = (id, kind, quantity) => {
            map.set(id, { kind, quantity: (map.get(id)?.quantity ?? 0) + quantity });
        };
        for (const currency of state.currencies) {
            add(currency.itemId, currency.itemType, currency.quantity);
        }
        for (const item of state.items)
            add(item.itemId, 'item', item.quantity);
        for (const instance of state.instances)
            add(instance.itemId, 'instance', 1);
        return map;
    };
    const previous = totals(before);
    return [...totals(after)].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([id, { kind, quantity }]) => ({ id, kind,
        quantity: quantity - (previous.get(id)?.quantity ?? 0) }))
        .filter((item) => item.quantity > 0).slice(0, MAX_GRANTED_ITEMS);
}
export function createInventory(http, emitChanged = () => { }, signal, storage) {
    const controller = new AbortController();
    let snapshot = null;
    let etag = null;
    let active = null;
    let followUp = null;
    let requiredVersion = 0;
    const assertActive = () => {
        if (controller.signal.aborted || signal?.aborted)
            throw inactive();
    };
    const apply = (next, tag) => {
        const changed = changedIds(snapshot, next);
        const granted = grantedItems(snapshot, next);
        snapshot = next;
        etag = tag;
        if (changed.length)
            emitChanged(changed, granted);
    };
    const read = () => {
        try {
            assertActive();
        }
        catch (error) {
            return Promise.reject(error);
        }
        if (active)
            return active;
        const work = (async () => {
            let status = 200;
            let responseTag = null;
            const response = await http.request({ method: 'GET', path: '/me',
                signal: AbortSignal.any([controller.signal, ...(signal ? [signal] : [])]),
                ...(snapshot && etag ? { ifNoneMatch: etag, acceptNotModified: true } : {}),
                onResponse(meta) { status = meta.status; responseTag = meta.etag; },
            });
            assertActive();
            if (status === 304) {
                if (!snapshot || !etag)
                    invalid();
                if (snapshot.inventoryVersion < requiredVersion) {
                    etag = null;
                    invalid();
                }
                return snapshot;
            }
            const next = freeze(inventoryState(response));
            if (next.inventoryVersion < requiredVersion) {
                etag = null;
                invalid();
            }
            if (snapshot && next.inventoryVersion < snapshot.inventoryVersion) {
                return snapshot;
            }
            apply(next, responseTag);
            return next;
        })();
        active = work;
        void work.finally(() => { if (active === work)
            active = null; }).catch(() => undefined);
        return work;
    };
    const refresh = () => {
        try {
            assertActive();
        }
        catch (error) {
            return Promise.reject(error);
        }
        if (!active)
            return read().then(detached);
        if (!followUp) {
            const pending = active.catch(() => undefined).then(() => {
                if (followUp === pending)
                    followUp = null;
                assertActive();
                return read();
            });
            followUp = pending;
        }
        return followUp.then(detached);
    };
    const pending = new Map();
    const flights = new Map();
    let saved;
    try {
        saved = storage?.get('pendingMutations');
    }
    catch { }
    if (Array.isArray(saved))
        for (const raw of saved.slice(0, 32)) {
            if (!raw || typeof raw !== 'object' || !isIdempotencyKey(raw.key))
                continue;
            const body = raw.body;
            if (!body || typeof body !== 'object')
                continue;
            if (raw.path === '/me/exchanges' && typeof body.exchangeRuleId === 'string'
                && RULE_ID.test(body.exchangeRuleId) && Object.keys(body).length === 1) {
                pending.set(raw.key, { path: raw.path, key: raw.key,
                    body: { exchangeRuleId: body.exchangeRuleId } });
            }
            else if (raw.path === '/me/consume' && typeof body.itemId === 'string'
                && ITEM_ID.test(body.itemId) && Number.isSafeInteger(body.qty)
                && body.qty >= 1 && body.qty <= MAX_CONSUME_QTY
                && (body.reason === undefined || (typeof body.reason === 'string' && REASON.test(body.reason)))
                && Object.keys(body).every(name => ['itemId', 'qty', 'reason'].includes(name))) {
                pending.set(raw.key, { path: raw.path, key: raw.key,
                    body: { itemId: body.itemId, qty: body.qty,
                        ...(body.reason === undefined ? {} : { reason: body.reason }) } });
            }
        }
    const persist = () => { storage?.set('pendingMutations', [...pending.values()]); };
    const mutate = (path, body, idempotencyKey) => {
        const previous = pending.get(idempotencyKey);
        if (previous && (previous.path !== path || signature(previous.body) !== signature(body))) {
            return Promise.reject(new SDKError('VALIDATION_FAILED', { module: 'inventory' }));
        }
        const existing = flights.get(idempotencyKey);
        if (existing)
            return existing.then(detached);
        if (!previous && pending.size >= 32)
            return Promise.reject(new SDKError('RATE_LIMITED', { module: 'inventory' }));
        pending.set(idempotencyKey, { path, body: detached(body), key: idempotencyKey });
        persist();
        const work = (async () => {
            try {
                const response = await http.request({ method: 'POST', path, body, idempotent: true,
                    idempotencyKey, rid: idempotencyKey,
                    signal: AbortSignal.any([controller.signal, ...(signal ? [signal] : [])]) });
                assertActive();
                const result = mutationResult(response);
                const state = freeze(detached(result.state));
                if (!snapshot || state.inventoryVersion >= snapshot.inventoryVersion)
                    apply(state, null);
                pending.delete(idempotencyKey);
                persist();
                return detached(result);
            }
            catch (error) {
                if (error instanceof SDKError && !error.retryable
                    && !['INTERNAL', 'MODULE_NOT_ACTIVE', 'SDK_MODULE_CANCELLED', 'SDK_TRANSPORT_CIRCUIT_OPEN',
                        'UNAUTHORIZED'].includes(error.code)) {
                    pending.delete(idempotencyKey);
                    persist();
                }
                throw error;
            }
        })();
        flights.set(idempotencyKey, work);
        void work.finally(() => { flights.delete(idempotencyKey); }).catch(() => undefined);
        return work.then(detached);
    };
    const exchange = async (exchangeRuleId, options) => {
        assertActive();
        if (typeof exchangeRuleId !== 'string' || !RULE_ID.test(exchangeRuleId)
            || !options || !isIdempotencyKey(options.idempotencyKey)) {
            throw new SDKError('VALIDATION_FAILED', { module: 'inventory', message: 'Invalid exchange request' });
        }
        return mutate('/me/exchanges', { exchangeRuleId }, options.idempotencyKey);
    };
    const consume = async (itemId, qty, options) => {
        assertActive();
        if (typeof itemId !== 'string' || !ITEM_ID.test(itemId)
            || !Number.isSafeInteger(qty) || qty < 1 || qty > MAX_CONSUME_QTY
            || !options
            || (options.reason !== undefined
                && (typeof options.reason !== 'string' || !REASON.test(options.reason)))
            || !isIdempotencyKey(options.idempotencyKey)) {
            throw new SDKError('VALIDATION_FAILED', { module: 'inventory', message: 'Invalid consume request' });
        }
        const body = { itemId, qty,
            ...(options.reason === undefined ? {} : { reason: options.reason }) };
        return mutate('/me/consume', body, options.idempotencyKey);
    };
    return {
        async entities() {
            assertActive();
            const raw = object(await http.request({ method: 'GET', path: '/entities',
                query: { limit: 100 },
                signal: AbortSignal.any([controller.signal, ...(signal ? [signal] : [])]) }));
            assertActive();
            if (!Array.isArray(raw['items']) || raw['items'].length > 100)
                invalid();
            return raw['items'].map((value) => {
                const item = object(value);
                const display = item['display'] === null ? {} : object(item['display']);
                const optional = (value, max) => {
                    if (value === null || value === undefined)
                        return null;
                    if (typeof value !== 'string' || value.length > max)
                        invalid();
                    return value;
                };
                const id = string(item['id']);
                if (!ITEM_ID.test(id))
                    invalid();
                return { id, itemType: string(item['itemType']), status: string(item['status']),
                    display: { titleKey: optional(display['titleKey'], 256),
                        descriptionKey: optional(display['descriptionKey'], 256),
                        iconUrl: optional(display['iconUrl'], 2048) } };
            });
        },
        get(options = {}) {
            try {
                assertActive();
            }
            catch (error) {
                return Promise.reject(error);
            }
            if (options.force)
                return refresh();
            return snapshot ? Promise.resolve(detached(snapshot)) : read().then(detached);
        },
        current() { assertActive(); return snapshot ? detached(snapshot) : null; },
        balance(currencyId) {
            assertActive();
            const positions = snapshot?.currencies.filter(({ itemId }) => itemId === currencyId);
            return positions?.length
                ? positions.reduce((sum, item) => sum + item.quantity, 0) : undefined;
        },
        positions(itemId) {
            assertActive();
            if (!snapshot)
                return [];
            return detached([...snapshot.currencies, ...snapshot.items, ...snapshot.instances]
                .filter((position) => position.itemId === itemId));
        },
        quantity(itemId) {
            assertActive();
            if (!snapshot)
                return undefined;
            const serverTime = Date.parse(snapshot.serverTime);
            const live = (expiresAt) => expiresAt === null || Date.parse(expiresAt) > serverTime;
            return snapshot.currencies.filter((item) => item.itemId === itemId)
                .reduce((sum, item) => sum + item.quantity, 0)
                + snapshot.items.filter((item) => item.itemId === itemId && live(item.expiresAt))
                    .reduce((sum, item) => sum + item.quantity, 0)
                + snapshot.instances.filter((item) => item.itemId === itemId && live(item.expiresAt)).length;
        },
        refresh,
        async restorePending() {
            for (const entry of [...pending.values()]) {
                assertActive();
                await mutate(entry.path, entry.body, entry.key).catch(() => undefined);
            }
        },
        unsent: () => pending.size,
        reconcile(version) {
            requiredVersion = Math.max(requiredVersion, version ?? 0);
            if (version !== undefined && snapshot && snapshot.inventoryVersion >= requiredVersion) {
                return Promise.resolve(detached(snapshot));
            }
            if (snapshot && snapshot.inventoryVersion < requiredVersion)
                etag = null;
            return version === undefined ? refresh() : read().then(detached);
        },
        exchange,
        consume,
        dispose() { controller.abort(); snapshot = null; etag = null; },
    };
}
export function currencyTotals(state) {
    const totals = new Map();
    for (const currency of state?.currencies ?? []) {
        const total = totals.get(currency.itemId);
        totals.set(currency.itemId, { hard: currency.itemType === 'hard_currency',
            quantity: (total?.quantity ?? 0) + currency.quantity });
    }
    return totals;
}
const TOPBAR_CURRENCIES = 4;
export function currencyTopBar(services, onTap) {
    const handles = new Map();
    return {
        sync(state, granted = []) {
            if (!state)
                return;
            const totals = currencyTotals(state);
            for (const [itemId, handle] of handles) {
                if (!totals.has(itemId))
                    handle.setValue(0);
            }
            const shown = [...totals].sort(([a, x], [b, y]) => Number(x.hard) - Number(y.hard)
                || (a < b ? -1 : a > b ? 1 : 0)).slice(0, TOPBAR_CURRENCIES);
            shown.forEach(([itemId, { hard, quantity }], index) => {
                const handle = handles.get(itemId);
                if (handle) {
                    handle.setValue(quantity);
                    return;
                }
                const received = granted.some((line) => line.id === itemId);
                handles.set(itemId, topBarItem(services, { id: `currency.${itemId}`,
                    icon: hard ? 'gem' : 'coins', label: hard ? 'sdk.topbar.hard' : 'sdk.topbar.soft',
                    value: received ? 0 : quantity, order: 10 + index, contexts: ['main', 'core'],
                    ...(onTap ? { onClick: () => onTap({ itemId, hard }) } : {}) }));
                if (received)
                    handles.get(itemId).setValue(quantity);
            });
        },
        dispose() {
            for (const handle of handles.values())
                handle.dispose();
            handles.clear();
        },
    };
}
export const INVENTORY_WINDOWS = ['main', 'chests', 'collection', 'card', 'album', 'shelf',
    'easter', 'skin'];
export function inventory() {
    let api;
    let runtime;
    const offs = [];
    let hud;
    let bar;
    let expected;
    const close = () => {
        expected = undefined;
        for (const off of offs.splice(0))
            off();
        hud?.dispose();
        hud = undefined;
        bar?.dispose();
        bar = undefined;
        runtime?.dispose();
        runtime = undefined;
        api = undefined;
    };
    return defineModule({
        manifest: {
            settings: { schemaVersion: 1, fields: [{ ref: 'availability' }] },
            ui: ui, id: 'inventory', version: '1.0.0', kind: 'service', engines: { core: '^1.0.0' }, targets: ['web', 'cordova'],
            permissions: ['http:inventory', 'storage', 'windows'], load: 'eager', entry: 'inventory.js',
            consumes: ['ui.slots@1', 'hud.registry@1', 'topbar.registry@1'], optional: { 'ui-kit': '^1.0.0', 'hud-ui': '^1.0.0', topbar: '^1.0.0' },
            events: { emits: ['inventory:state:changed', 'inventory:items:granted', 'inventory:window:open', 'inventory:window:close',
                    'inventory:currency:tap'], listens: ['inventory:window:closed',
                    'realtime:inventory.balance.changed', 'realtime:connection:resync', 'realtime:connection:connected',
                ] },
            realtime: { handles: ['inventory.balance.changed'] },
        },
        init() { },
        async start(ctx) {
            close();
            if (!ctx.http)
                throw new SDKError('SDK_PERMISSION_DENIED', { module: 'inventory' });
            const currencies = currencyTopBar(ctx.services, (tap) => {
                ctx.bus.emit('inventory:currency:tap', tap);
            });
            bar = currencies;
            const offWindows = ctx.windows?.register(registerModuleWindow({
                module: 'inventory', signal: ctx.signal,
                open: ({ name, params }) => ctx.bus.emit('inventory:window:open', { view: name, id: typeof params['id'] === 'string' ? params['id'] : null }),
                close: ({ name }) => ctx.bus.emit('inventory:window:close', { view: name }),
                onClosed: (listener) => ctx.bus.on('inventory:window:closed', ({ view }) => listener({ name: view })),
            }, INVENTORY_WINDOWS));
            if (offWindows)
                offs.push(offWindows);
            const current = createInventory(ctx.http, (changed, granted) => {
                try {
                    currencies.sync(runtime?.current() ?? null, granted);
                }
                catch {
                }
                const payload = { changed };
                ctx.bus.emit('inventory:state:changed', payload);
                if (granted.length) {
                    const label = expected && ctx.time.now() <= expected.until ? expected.source : undefined;
                    expected = undefined;
                    const grant = label ? { items: granted, source: label }
                        : { items: granted };
                    ctx.bus.emit('inventory:items:granted', grant);
                }
            }, ctx.signal, ctx.storage);
            runtime = current;
            api = Object.freeze({
                expectGrant: (source, grantOptions) => {
                    if (runtime !== current)
                        throw inactive();
                    const ttl = grantOptions?.ttlMs ?? 60_000;
                    if (typeof source !== 'string' || !/^[a-z0-9_-]{1,32}$/.test(source)
                        || !Number.isSafeInteger(ttl) || ttl < 1 || ttl > 600_000) {
                        throw new SDKError('VALIDATION_FAILED', { module: 'inventory', message: 'Invalid grant source' });
                    }
                    expected = { source, until: ctx.time.now() + ttl };
                },
                get: (options) => current.get(options),
                current: () => current.current(),
                balance: (id) => current.balance(id),
                positions: (id) => current.positions(id),
                quantity: (id) => current.quantity(id),
                entities: () => current.entities(),
                refresh: () => current.refresh(),
                exchange: (id, exchangeOptions) => current.exchange(id, exchangeOptions),
                consume: (id, qty, consumeOptions) => current.consume(id, qty, consumeOptions),
            });
            let requestedVersion = 0;
            const reconcile = (message) => {
                if (message.type !== 'inventory.balance.changed' || message.ref?.resource !== 'inventory.me'
                    || !['player', 'session'].includes(message.to.kind))
                    return;
                const raw = message.ref.version;
                if (raw !== undefined && (!/^(0|[1-9][0-9]*)$/.test(raw)
                    || !Number.isSafeInteger(Number(raw))))
                    return;
                requestedVersion = Math.max(requestedVersion, Number(raw) || 0);
                return current.reconcile(raw === undefined ? undefined : Number(raw));
            };
            const items = hudItems(ctx.services, [{ id: 'inventory', icon: 'bag', label: 'sdk.hud.inventory',
                    slot: 'right', order: 30, clearOnOpen: true }]);
            hud = items;
            offs.push(ctx.realtime.on('inventory.balance.changed', message => {
                items.setBadge('inventory', { kind: 'dot' });
                void reconcile(message)?.catch(() => undefined);
            }), ctx.realtime.handle('inventory.balance.changed', reconcile), ctx.bus.on('realtime:connection:connected', () => {
                if ((current.current()?.inventoryVersion ?? 0) < requestedVersion) {
                    void current.reconcile(requestedVersion).catch(() => undefined);
                }
            }), ctx.bus.on('realtime:connection:resync', () => {
                void current.restorePending().then(() => current.reconcile()).catch(() => undefined);
            }));
            await current.restorePending();
            await current.get().catch(() => undefined);
        },
        async stop() { close(); },
        async save(signal) {
            const current = runtime;
            if (!current)
                return [];
            if (!signal.aborted) {
                await Promise.race([current.restorePending().catch(() => undefined),
                    new Promise((resolve) => {
                        signal.addEventListener('abort', () => { resolve(); }, { once: true });
                    })]);
            }
            return current.unsent() > 0 ? ['pendingMutations'] : [];
        },
        api() {
            if (!api)
                throw inactive();
            return api;
        },
        async dispose() { close(); },
    });
}
export const inventoryModule = inventory;

import { hudModuleImage } from './hud-contract.js';
export const TOPBAR_CAPABILITY = 'topbar.registry@1';
const CONTEXT = /^[a-z][a-z0-9_-]{0,31}$/;
const ID = /^[a-z0-9][a-z0-9_.-]{0,63}$/;
const MAX_ITEMS = 32;
const MAX_CONTEXTS = 8;
const MAX_VALUE = 32;
const MAX_COUNT = 999_999;
const DEFAULT_ORDER = 100;
const TICK_MS = 1000;
const SLOTS = ['left', 'center', 'right'];
const GAME = 'game';
function invalid(message) {
    throw new Error(`UI_TOPBAR_INVALID:${message}`);
}
function checkValue(value) {
    if (typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER) {
        return value;
    }
    if (typeof value === 'string' && value.length <= MAX_VALUE)
        return value;
    return invalid('value');
}
function checkTimer(value) {
    if (value !== null && (typeof value !== 'number' || !Number.isFinite(value)))
        invalid('timer');
}
function checkProgress(value) {
    if (value !== null && (typeof value !== 'number' || !(value >= 0 && value <= 1)))
        invalid('progress');
}
function checkState(value) {
    if (value !== 'active' && value !== 'locked')
        invalid('state');
}
function parseBadge(input) {
    if (input === null)
        return undefined;
    if (input?.kind === 'dot')
        return Object.freeze({ kind: 'dot' });
    if (input?.kind !== 'count' || !Number.isInteger(input.value) || input.value < 0
        || input.value > MAX_COUNT)
        invalid('badge');
    return input.value === 0 ? undefined : Object.freeze({ kind: 'count', value: input.value });
}
function checkSpec(spec) {
    if (spec === null || typeof spec !== 'object' || typeof spec.id !== 'string' || !ID.test(spec.id)) {
        invalid('id');
    }
    if (typeof spec.icon !== 'string' || spec.icon.length < 1
        || (spec.icon.length > 32 && !hudModuleImage(spec.icon)))
        invalid('icon');
    if (typeof spec.label !== 'string' || spec.label.length < 1 || spec.label.length > 128)
        invalid('label');
    if (spec.slot !== undefined && !SLOTS.includes(spec.slot))
        invalid('slot');
    if (spec.value !== undefined)
        checkValue(spec.value);
    if (spec.order !== undefined
        && (!Number.isFinite(spec.order) || Math.abs(spec.order) > 1_000_000)) {
        invalid('order');
    }
    if (spec.timer !== undefined)
        checkTimer(spec.timer);
    if (spec.progress !== undefined)
        checkProgress(spec.progress);
    if (spec.state !== undefined)
        checkState(spec.state);
    if (spec.onClick !== undefined && typeof spec.onClick !== 'function')
        invalid('onClick');
    const contexts = spec.contexts ?? ['main'];
    if (!Array.isArray(contexts) || contexts.length < 1 || contexts.length > MAX_CONTEXTS
        || contexts.some((context) => typeof context !== 'string' || !CONTEXT.test(context))) {
        invalid('contexts');
    }
    return Object.freeze([...new Set(contexts)]);
}
export function createTopBarRegistry(options) {
    const switches = new Map(Object.entries(options.contexts ?? { main: true, core: true })
        .filter(([context]) => CONTEXT.test(context)).slice(0, MAX_CONTEXTS));
    const entries = new Map();
    const listeners = new Set();
    const timers = options.timers ?? {
        set: (callback, ms) => setTimeout(callback, ms),
        clear: (handle) => { clearTimeout(handle); },
    };
    let clock;
    let active = options.context !== undefined && CONTEXT.test(options.context) ? options.context : 'main';
    const changed = () => {
        for (const listener of [...listeners]) {
            try {
                listener();
            }
            catch { }
        }
    };
    const timed = () => [...entries.values()].some((entry) => entry.timer !== undefined);
    const stopClock = () => {
        if (clock !== undefined)
            timers.clear(clock);
        clock = undefined;
    };
    const schedule = () => {
        if (clock !== undefined || !timed())
            return;
        clock = timers.set(() => {
            clock = undefined;
            const now = options.now();
            for (const entry of entries.values()) {
                if (entry.timer !== undefined && entry.timer <= now)
                    delete entry.timer;
            }
            schedule();
            changed();
        }, TICK_MS);
    };
    const enabled = (context) => switches.get(context) === true;
    const orderOf = (entry, context) => options.order?.[context]?.[entry.spec.id] ?? entry.spec.order ?? DEFAULT_ORDER;
    const known = (id, owner) => {
        const entry = entries.get(id);
        if (!entry || entry.owner !== owner)
            invalid('unknown item');
        return entry;
    };
    const applyValue = (entry, next) => {
        if (entry.value === next)
            return;
        if (entry.value !== undefined)
            entry.previous = entry.value;
        entry.value = next;
        entry.revision += 1;
        changed();
    };
    const clearPending = (entry) => {
        if (entry.pending)
            timers.clear(entry.pending.timer);
        delete entry.pending;
    };
    const land = (entry) => {
        const pending = entry.pending;
        if (!pending)
            return;
        clearPending(entry);
        applyValue(entry, pending.value);
    };
    const add = (spec, owner = GAME) => {
        const contexts = checkSpec(spec);
        const badge = spec.badge === undefined ? undefined : parseBadge(spec.badge);
        if (!contexts.some(enabled))
            return false;
        if (entries.has(spec.id))
            invalid('id taken');
        if (entries.size >= MAX_ITEMS)
            invalid('too many items');
        const running = spec.timer !== undefined && spec.timer > options.now();
        entries.set(spec.id, { spec: Object.freeze({ ...spec }), owner, contexts, revision: 0,
            state: spec.state ?? 'active',
            ...(spec.value === undefined ? {} : { value: spec.value }),
            ...(badge ? { badge } : {}),
            ...(running ? { timer: spec.timer } : {}),
            ...(spec.progress === undefined ? {} : { progress: spec.progress }) });
        schedule();
        changed();
        return true;
    };
    return {
        add,
        remove(id, owner = GAME) {
            if (entries.get(id)?.owner !== owner)
                return;
            clearPending(entries.get(id));
            entries.delete(id);
            if (!timed())
                stopClock();
            changed();
        },
        setValue(id, value, owner = GAME) {
            const entry = known(id, owner);
            const next = checkValue(value);
            const previous = entry.pending?.value ?? entry.value;
            if (previous === next)
                return;
            if (id.startsWith('currency.') && typeof next === 'number'
                && typeof previous === 'number' && next > previous) {
                if (entry.pending)
                    entry.pending.value = next;
                else
                    entry.pending = { value: next, timer: timers.set(() => land(entry), 2000) };
                return;
            }
            clearPending(entry);
            applyValue(entry, next);
        },
        setBadge(id, input, owner = GAME) {
            const entry = known(id, owner);
            const badge = parseBadge(input);
            if (badge)
                entry.badge = badge;
            else
                delete entry.badge;
            changed();
        },
        setTimer(id, endsAt, owner = GAME) {
            const entry = known(id, owner);
            checkTimer(endsAt);
            if (endsAt === null || endsAt <= options.now())
                delete entry.timer;
            else
                entry.timer = endsAt;
            if (timed())
                schedule();
            else
                stopClock();
            changed();
        },
        setProgress(id, progress, owner = GAME) {
            const entry = known(id, owner);
            checkProgress(progress);
            if (progress === null)
                delete entry.progress;
            else
                entry.progress = progress;
            changed();
        },
        setState(id, state, owner = GAME) {
            const entry = known(id, owner);
            checkState(state);
            entry.state = state;
            changed();
        },
        items(context = active) {
            if (!enabled(context))
                return Object.freeze([]);
            const now = options.now();
            return Object.freeze([...entries.values()]
                .filter((entry) => entry.contexts.includes(context))
                .map((entry) => Object.freeze({ id: entry.spec.id, icon: entry.spec.icon,
                label: entry.spec.label, slot: entry.spec.slot ?? 'right', revision: entry.revision,
                order: orderOf(entry, context), contexts: entry.contexts, owner: entry.owner,
                state: entry.state,
                ...(entry.value === undefined ? {} : { value: entry.value }),
                ...(entry.previous === undefined ? {} : { previous: entry.previous }),
                ...(entry.badge ? { badge: entry.badge } : {}),
                ...(entry.timer === undefined ? {} : { timer: Object.freeze({ endsAt: entry.timer,
                        remainingMs: Math.max(0, entry.timer - now) }) }),
                ...(entry.progress === undefined ? {} : { progress: entry.progress }) }))
                .sort((a, b) => a.order - b.order
                || (a.owner < b.owner ? -1 : a.owner > b.owner ? 1 : 0)
                || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)));
        },
        context: () => active,
        setContext(context) {
            if (!CONTEXT.test(context) || context === active)
                return;
            active = context;
            changed();
        },
        setEnabled(context, on) {
            if (!CONTEXT.test(context) || enabled(context) === on)
                return;
            if (!switches.has(context) && switches.size >= MAX_CONTEXTS)
                return;
            switches.set(context, on);
            changed();
        },
        enabled,
        click(id) {
            if (enabled(active) && entries.get(id)?.contexts.includes(active)) {
                entries.get(id)?.spec.onClick?.();
            }
        },
        onChange(listener) {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
        landReward(id) {
            const entry = entries.get(`currency.${id}`);
            if (entry)
                land(entry);
        },
        reset() {
            stopClock();
            for (const entry of entries.values())
                clearPending(entry);
            if (entries.size === 0)
                return;
            entries.clear();
            changed();
        },
    };
}
export function topBarView(registry, text = (key) => key, context, slot) {
    return registry.items(context).filter((item) => slot === undefined || item.slot === slot)
        .map((item) => {
        const direction = typeof item.value === 'number' && typeof item.previous === 'number'
            && item.value !== item.previous ? (item.value > item.previous ? 'up' : 'down') : undefined;
        return { id: item.id, icon: item.icon, label: text(item.label), state: item.state,
            ...(item.value === undefined ? {} : { value: item.value }),
            ...(item.id.startsWith('currency.') ? { add: { id: item.id,
                    label: `+ ${text(item.label)}` } } : {}),
            ...(direction ? { change: { direction, revision: item.revision,
                    from: item.previous } } : {}),
            ...(item.badge ? { badge: item.badge } : {}),
            ...(item.timer ? { timer: { remainingMs: item.timer.remainingMs } } : {}),
            ...(item.progress === undefined ? {} : { progress: item.progress }) };
    });
}
export function topBarModule(registry) {
    return {
        manifest: {
            id: 'topbar', version: '1.0.0', kind: 'ui', engines: { core: '^1.0.0' },
            targets: ['web', 'cordova'], permissions: [],
            provides: [TOPBAR_CAPABILITY], load: 'eager', entry: 'shell.js',
            events: { emits: [], listens: [] },
        },
        init(ctx) {
            ctx.services.provide(TOPBAR_CAPABILITY, {
                register: (call, spec) => registry.add(spec, call.from),
                setValue: (call, id, value) => {
                    registry.setValue(id, value, call.from);
                },
                setBadge: (call, id, badge) => {
                    registry.setBadge(id, badge, call.from);
                },
                setTimer: (call, id, endsAt) => {
                    registry.setTimer(id, endsAt, call.from);
                },
                setProgress: (call, id, progress) => {
                    registry.setProgress(id, progress, call.from);
                },
                setState: (call, id, state) => {
                    registry.setState(id, state, call.from);
                },
                unregister: (call, id) => { registry.remove(id, call.from); },
            });
        },
        async stop() { registry.reset(); },
        async dispose() { registry.reset(); },
        api() { return Object.freeze({}); },
    };
}

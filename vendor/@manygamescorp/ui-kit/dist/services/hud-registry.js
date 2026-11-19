import { HUD_BADGE_KINDS, HUD_CONFIG_SCOPE, HUD_ID, HUD_ITEM_STATES, HUD_MAX_ITEMS, HUD_SLOTS, parseHudLayout, hudModuleImage } from './hud-contract.js';
const TICK_MS = 1000;
const MAX_COUNT = 999_999;
const DEFAULT_SLOT = 'right';
const DEFAULT_ORDER = 100;
const GAME = 'game';
export function reportMissingWindowRule(key, id, report) {
    console.error(`[ui-kit] no ui.windows rule for route "${key}": the window does not open`);
    report?.({ key, id });
}
function invalid(message) {
    throw new Error(`UI_HUD_INVALID:${message}`);
}
function checkSpec(spec) {
    if (spec === null || typeof spec !== 'object' || typeof spec.id !== 'string' || !HUD_ID.test(spec.id)) {
        invalid('Invalid HUD item id');
    }
    if (typeof spec.icon !== 'string' || spec.icon.length < 1 || (spec.icon.length > 32 && !hudModuleImage(spec.icon))) {
        invalid('Invalid HUD item icon');
    }
    if (typeof spec.label !== 'string' || spec.label.length < 1 || spec.label.length > 128) {
        invalid('Invalid HUD item label');
    }
    if (spec.slot !== undefined && !HUD_SLOTS.includes(spec.slot))
        invalid('Invalid HUD slot');
    if (spec.order !== undefined
        && (!Number.isFinite(spec.order) || Math.abs(spec.order) > 1_000_000)) {
        invalid('Invalid HUD order');
    }
    if (spec.onClick !== undefined && typeof spec.onClick !== 'function')
        invalid('Invalid HUD onClick');
    if (spec.clearOnOpen !== undefined && typeof spec.clearOnOpen !== 'boolean') {
        invalid('Invalid HUD clearOnOpen');
    }
    checkValue(spec.value);
    checkTimer(spec.timer);
    if (spec.contexts !== undefined && (!Array.isArray(spec.contexts) || spec.contexts.length < 1
        || spec.contexts.length > 8 || spec.contexts.some((c) => !/^[a-z][a-z0-9_-]{0,31}$/.test(c))))
        invalid('contexts');
    checkPatch({ ...(spec.progress === undefined ? {} : { progress: spec.progress }),
        ...(spec.state === undefined ? {} : { state: spec.state }) });
}
function checkPatch(patch) {
    if (patch === null || typeof patch !== 'object')
        invalid('Invalid HUD patch');
    const { progress, state } = patch;
    if (progress !== undefined && progress !== null
        && (typeof progress !== 'number' || !(progress >= 0 && progress <= 1))) {
        invalid('Invalid HUD progress');
    }
    if (state !== undefined && !HUD_ITEM_STATES.includes(state))
        invalid('Invalid HUD state');
}
function checkValue(value) {
    if (value === undefined)
        return;
    if (typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER)
        return;
    if (typeof value === 'string' && value.length <= 32)
        return;
    invalid('value');
}
function checkTimer(value) {
    if (value === undefined || value === null || (typeof value === 'number' && Number.isFinite(value)))
        return;
    invalid('timer');
}
function parseBadge(input) {
    if (input === null)
        return undefined;
    if (!input || !HUD_BADGE_KINDS.includes(input.kind))
        invalid('badge');
    if (input.kind === 'dot')
        return Object.freeze({ kind: 'dot' });
    if (!Number.isInteger(input.value) || input.value < 0 || input.value > MAX_COUNT)
        invalid('count');
    return input.value === 0 ? undefined : Object.freeze({ kind: 'count', value: input.value });
}
export function createHudRegistry(deps) {
    const entries = new Map();
    let enabled = deps.enabled !== false;
    let context = 'main';
    const listeners = new Set();
    const timers = deps.timers ?? {
        set: (callback, ms) => setTimeout(callback, ms),
        clear: (handle) => { clearTimeout(handle); },
    };
    const opened = new Set();
    let clock;
    const notify = (ids, reason) => {
        if (ids.length === 0 && reason !== 'layout' && reason !== 'reset')
            return;
        deps.changed?.({ ids: [...ids], reason });
        for (const listener of [...listeners]) {
            try {
                listener({ ids: [...ids], reason });
            }
            catch { }
        }
    };
    const timed = () => [...entries].filter(([, e]) => e.timer !== undefined)
        .map(([id]) => id);
    const stopClock = () => {
        if (clock !== undefined)
            timers.clear(clock);
        clock = undefined;
    };
    const tick = () => {
        clock = undefined;
        const now = deps.now();
        const ids = timed();
        for (const id of ids) {
            const entry = entries.get(id);
            if (entry?.timer !== undefined && entry.timer <= now)
                delete entry.timer;
        }
        schedule();
        notify(ids, 'tick');
    };
    const schedule = () => {
        if (!enabled || clock !== undefined || timed().length === 0)
            return;
        clock = timers.set(tick, TICK_MS);
    };
    const view = (id, entry, layout) => {
        const own = layout.items.get(id);
        let visible = own === undefined ? layout.unlisted === 'show' : own.visible !== false;
        if (visible && own?.filters !== undefined) {
            try {
                visible = deps.match?.(own.filters) === true;
            }
            catch {
                visible = false;
            }
        }
        const now = deps.now();
        const timer = entry.timer === undefined ? undefined
            : { endsAt: entry.timer, remainingMs: Math.max(0, entry.timer - now) };
        const label = own?.label;
        const badge = entry.badge ?? own?.badge;
        return Object.freeze({ id, icon: own?.icon ?? entry.spec.icon,
            label: label !== undefined && 'key' in label ? label.key : entry.spec.label,
            ...(label !== undefined && 'values' in label ? { labels: label.values } : {}),
            slot: own?.slot ?? entry.spec.slot ?? DEFAULT_SLOT,
            order: own?.order ?? entry.spec.order ?? DEFAULT_ORDER, visible, owner: entry.owner,
            state: entry.state, ...(entry.progress === undefined ? {} : { progress: entry.progress }),
            ...(badge ? { badge } : {}),
            ...(entry.value === undefined ? {} : { value: entry.value }),
            ...(timer ? { timer: Object.freeze(timer) } : {}) });
    };
    const ignoredListeners = new Set();
    const ignore = (issue) => {
        try {
            deps.ignored?.(issue);
        }
        catch { }
        for (const listener of [...ignoredListeners]) {
            try {
                listener(issue);
            }
            catch { }
        }
    };
    let parsed;
    const layout = () => {
        let raw;
        try {
            raw = deps.layout?.();
        }
        catch {
            raw = undefined;
        }
        if (parsed && parsed.raw === raw)
            return parsed.layout;
        let json;
        try {
            json = JSON.stringify(raw);
        }
        catch {
            json = undefined;
        }
        if (parsed && json !== undefined && parsed.json === json) {
            parsed = { ...parsed, raw };
            return parsed.layout;
        }
        const next = parseHudLayout(raw, ignore);
        parsed = { raw, json, layout: next };
        return next;
    };
    const order = (a, b) => HUD_SLOTS.indexOf(a.slot) - HUD_SLOTS.indexOf(b.slot)
        || a.order - b.order || (a.owner < b.owner ? -1 : a.owner > b.owner ? 1 : 0)
        || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    const items = () => {
        const current = layout();
        return Object.freeze([...entries].filter(([, e]) => enabled && (e.spec.contexts ?? ['main']).includes(context)).map(([id, entry]) => view(id, entry, current)).sort(order));
    };
    const add = (spec, owner = GAME) => {
        checkSpec(spec);
        if (!enabled)
            return false;
        if (entries.has(spec.id))
            invalid('HUD item id is taken');
        if (entries.size >= HUD_MAX_ITEMS)
            invalid('Too many HUD items');
        const badge = spec.badge === undefined ? undefined : parseBadge(spec.badge);
        const running = spec.timer !== undefined && spec.timer > deps.now();
        entries.set(spec.id, { spec: Object.freeze({ ...spec, contexts: Object.freeze([...(spec.contexts ?? ['main'])]) }), owner, state: spec.state ?? 'active',
            ...(spec.progress === undefined ? {} : { progress: spec.progress }),
            ...(spec.value === undefined ? {} : { value: spec.value }),
            ...(running ? { timer: spec.timer } : {}),
            ...(badge ? { badge } : {}) });
        schedule();
        notify([spec.id], 'register');
        return true;
    };
    const remove = (id, owner = GAME) => {
        const entry = entries.get(id);
        if (!entry || entry.owner !== owner)
            return;
        entries.delete(id);
        if (timed().length === 0)
            stopClock();
        notify([id], 'unregister');
    };
    const known = (id, owner) => {
        const entry = entries.get(id);
        if (!entry || entry.owner !== owner)
            invalid('Unknown HUD item');
        return entry;
    };
    return {
        add, remove,
        setValue(id, value, owner = GAME) {
            const entry = known(id, owner);
            checkValue(value);
            entry.value = value;
            notify([id], 'value');
        },
        setBadge(id, input, owner = GAME) {
            const entry = known(id, owner);
            const badge = parseBadge(input);
            if (badge)
                entry.badge = badge;
            else
                delete entry.badge;
            notify([id], 'badge');
        },
        setTimer(id, endsAt, owner = GAME) {
            const entry = known(id, owner);
            checkTimer(endsAt);
            if (endsAt === null || endsAt <= deps.now())
                delete entry.timer;
            else
                entry.timer = endsAt;
            if (timed().length === 0)
                stopClock();
            else
                schedule();
            notify([id], 'timer');
        },
        setProgress(id, progress, owner = GAME) {
            const entry = known(id, owner);
            checkPatch({ progress });
            if (progress === null)
                delete entry.progress;
            else
                entry.progress = progress;
            notify([id], 'state');
        },
        setState(id, state, owner = GAME) {
            const entry = known(id, owner);
            checkPatch({ state });
            entry.state = state;
            notify([id], 'state');
        },
        open(id) {
            const item = items().find((i) => i.id === id && i.visible);
            if (!item)
                return;
            const entry = entries.get(id);
            entry.spec.onClick?.();
            if (entry.spec.onClick === undefined && deps.hasWindowRule
                && !deps.hasWindowRule(`hud:${id}`))
                reportMissingWindowRule(`hud:${id}`, id, deps.ruleMissing);
            if (entry.spec.clearOnOpen && entry.badge) {
                delete entry.badge;
                notify([id], 'badge');
            }
            deps.opened?.(id);
            for (const listener of [...opened])
                listener(id);
        },
        items,
        context: () => context,
        setContext(next) {
            if (!/^[a-z][a-z0-9_-]{0,31}$/.test(next) || next === context)
                return;
            context = next;
            notify([...entries.keys()], 'layout');
        },
        setEnabled(next) {
            enabled = next;
            if (!enabled)
                stopClock();
            else
                schedule();
            notify([...entries.keys()], 'layout');
        },
        onOpen(listener) { opened.add(listener); return () => { opened.delete(listener); }; },
        onChange(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
        onIgnored(listener) {
            ignoredListeners.add(listener);
            return () => { ignoredListeners.delete(listener); };
        },
        relayout: () => { layout(); notify([...entries.keys()], 'layout'); },
        reset() {
            stopClock();
            const ids = [...entries.keys()];
            entries.clear();
            notify(ids, 'reset');
        },
    };
}
function inlineLabel(labels, lang) {
    return labels[lang] ?? labels['en'] ?? labels['ru'] ?? Object.values(labels)[0];
}
export function hudRegistryView(registry, slot, text = (key) => key, lang = 'en') {
    return registry.items().filter((item) => item.visible && item.slot === slot).map((item) => ({
        id: item.id, icon: item.icon, state: item.state,
        label: (item.labels && inlineLabel(item.labels, lang)) || text(item.label),
        ...(item.value === undefined ? {} : { value: item.value }),
        ...(item.badge ? { badge: item.badge } : {}),
        ...(item.timer ? { timer: item.timer } : {}),
        ...(item.progress === undefined ? {} : { progress: item.progress }),
    }));
}
export function hudRegistryModule(registry) {
    let off;
    let offIgnored;
    const close = () => {
        off?.();
        off = undefined;
        offIgnored?.();
        offIgnored = undefined;
        registry.reset();
    };
    return {
        manifest: { id: 'hud-ui', version: '1.0.0', kind: 'ui', engines: { core: '^1.0.0' },
            targets: ['web', 'cordova'], permissions: [], provides: ['hud.registry@1'],
            entry: 'shell.js', load: 'eager',
            events: { emits: ['hud:layout:ignored'], listens: ['configs:snapshot:updated'] }, },
        async start(ctx) {
            off?.();
            offIgnored?.();
            offIgnored = registry.onIgnored((issue) => { ctx.bus.emit('hud:layout:ignored', issue); });
            off = ctx.bus.on('configs:snapshot:updated', (payload) => {
                const scopes = payload?.scopes;
                if (!Array.isArray(scopes) || scopes.includes(HUD_CONFIG_SCOPE))
                    registry.relayout();
            });
        },
        init(ctx) {
            ctx.services.provide('hud.registry@1', {
                register: (c, spec) => registry.add(spec, c.from),
                unregister: (c, id) => registry.remove(id, c.from),
                setValue: (c, id, v) => registry.setValue(id, v, c.from),
                setBadge: (c, id, b) => {
                    registry.setBadge(id, b, c.from);
                },
                setTimer: (c, id, t) => registry.setTimer(id, t, c.from),
                setProgress: (c, id, p) => {
                    registry.setProgress(id, p, c.from);
                },
                setState: (c, id, s) => registry.setState(id, s, c.from),
                items: () => registry.items(), open: (_c, id) => registry.open(id),
                onChange: (_c, listener) => registry.onChange(listener),
                onOpen: (_c, listener) => registry.onOpen(listener),
                relayout: () => registry.relayout(),
            });
        },
        async stop() { close(); }, async dispose() { close(); },
        api() { return Object.freeze({}); },
    };
}

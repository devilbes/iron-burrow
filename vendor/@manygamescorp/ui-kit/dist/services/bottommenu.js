import { nameComponents } from '../core.js';
import { hudItemView } from './hud.js';
import { reportMissingWindowRule } from './hud-registry.js';
import { component, h, text } from '../features/shared.js';
function invalid(field) { throw new Error(`UI_BOTTOMMENU_INVALID:${field}`); }
export const BOTTOMMENU_SLOT_TAKEN = 'UI_BOTTOMMENU_SLOT_TAKEN';
function value(v) {
    if (typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= Number.MAX_SAFE_INTEGER)
        return;
    if (typeof v === 'string' && v.length <= 32)
        return;
    invalid('value');
}
function badge(b) {
    if (b === null)
        return undefined;
    if (b?.kind === 'dot')
        return Object.freeze({ kind: 'dot' });
    if (b?.kind !== 'count' || !Number.isInteger(b.value) || b.value < 0 || b.value > 999999)
        invalid('badge');
    return b.value === 0 ? undefined : Object.freeze({ kind: 'count', value: b.value });
}
function timer(t) { if (t !== null && (typeof t !== 'number' || !Number.isFinite(t)))
    invalid('timer'); }
function progress(p) { if (p !== null && (typeof p !== 'number' || !(p >= 0 && p <= 1)))
    invalid('progress'); }
function state(s) { if (s !== 'active' && s !== 'locked')
    invalid('state'); }
export function createBottomMenuRegistry(options) {
    const count = options.slots ?? 5;
    if (count !== 3 && count !== 5)
        invalid('slots');
    let enabled = options.enabled !== false;
    let context = 'main';
    const entries = new Map();
    const listeners = new Set();
    const changed = () => {
        for (const fn of [...listeners]) {
            try {
                fn();
            }
            catch { }
        }
    };
    const timers = options.timers ?? { set: (fn, ms) => setTimeout(fn, ms),
        clear: (handle) => clearTimeout(handle) };
    let clock;
    const stop = () => {
        if (clock !== undefined)
            timers.clear(clock);
        clock = undefined;
    };
    const schedule = () => {
        if (!enabled || clock !== undefined
            || ![...entries.values()].some((e) => e.timer !== undefined))
            return;
        clock = timers.set(() => {
            clock = undefined;
            for (const [id, e] of entries)
                if (e.timer !== undefined && e.timer <= options.now()) {
                    const { timer: _timer, ...next } = e;
                    entries.set(id, next);
                }
            schedule();
            changed();
        }, 1000);
    };
    const own = (id, owner) => {
        const e = entries.get(id);
        if (!e || e.owner !== owner)
            invalid('unknown item');
        return e;
    };
    const patch = (id, owner, fields, clear) => {
        const next = { ...own(id, owner), ...fields };
        if (clear)
            delete next[clear];
        entries.set(id, Object.freeze(next));
        stop();
        schedule();
        changed();
    };
    return {
        add(spec, owner = 'game') {
            if (!spec || !/^[a-z0-9][a-z0-9_.-]{0,63}$/.test(spec.id))
                invalid('id');
            if (typeof spec.icon !== 'string' || spec.icon.length < 1 || spec.icon.length > 2048)
                invalid('icon');
            if (typeof spec.label !== 'string' || spec.label.length < 1 || spec.label.length > 128)
                invalid('label');
            const position = spec.slot === 'center' ? (count + 1) / 2 : spec.slot;
            if (!Number.isInteger(position) || position < 1 || position > count)
                invalid('slot');
            if (spec.variant !== undefined && ((spec.variant !== 'inline' && spec.variant !== 'raised')
                || position !== (count + 1) / 2))
                invalid('variant');
            const contexts = spec.contexts ?? ['main'];
            if (!Array.isArray(contexts) || contexts.length < 1 || contexts.length > 8
                || contexts.some((c) => !/^[a-z][a-z0-9_-]{0,31}$/.test(c)))
                invalid('contexts');
            if (spec.onClick !== undefined && typeof spec.onClick !== 'function')
                invalid('onClick');
            if (spec.value !== undefined)
                value(spec.value);
            if (spec.timer !== undefined)
                timer(spec.timer);
            if (spec.progress !== undefined)
                progress(spec.progress);
            if (spec.state !== undefined)
                state(spec.state);
            const notification = spec.badge === undefined ? undefined : badge(spec.badge);
            if (!enabled)
                return false;
            if (entries.has(spec.id))
                invalid('id taken');
            if (entries.size >= 40)
                invalid('too many items');
            if ([...entries.values()].some((e) => e.position === position
                && e.contexts.some((c) => contexts.includes(c)))) {
                throw Object.assign(new Error(`${BOTTOMMENU_SLOT_TAKEN}:${position}`), { code: BOTTOMMENU_SLOT_TAKEN });
            }
            const { badge: _badge, timer: deadline, ...rest } = spec;
            const running = deadline !== undefined && deadline > options.now();
            entries.set(spec.id, Object.freeze({ ...rest, position, owner,
                contexts: Object.freeze([...new Set(contexts)]),
                state: spec.state ?? 'active', ...(notification ? { badge: notification } : {}),
                ...(running ? { timer: deadline } : {}) }));
            schedule();
            changed();
            return true;
        },
        remove(id, owner = 'game') {
            if (entries.get(id)?.owner !== owner)
                return;
            entries.delete(id);
            stop();
            schedule();
            changed();
        },
        setValue(id, v, owner = 'game') { own(id, owner); value(v); patch(id, owner, { value: v }); },
        setBadge(id, b, owner = 'game') {
            own(id, owner);
            const next = badge(b);
            patch(id, owner, next ? { badge: next } : {}, next ? undefined : 'badge');
        },
        setTimer(id, t, owner = 'game') {
            own(id, owner);
            timer(t);
            const active = t !== null && t > options.now();
            patch(id, owner, active ? { timer: t } : {}, active ? undefined : 'timer');
        },
        setProgress(id, p, owner = 'game') {
            own(id, owner);
            progress(p);
            patch(id, owner, p === null ? {} : { progress: p }, p === null ? 'progress' : undefined);
        },
        setState(id, s, owner = 'game') { own(id, owner); state(s); patch(id, owner, { state: s }); },
        slots() {
            const result = Array.from({ length: count }, () => null);
            if (enabled)
                for (const e of entries.values())
                    if (e.contexts.includes(context)) {
                        result[e.position - 1] = Object.freeze({ ...e,
                            ...(e.timer === undefined ? {} : { remainingMs: Math.max(0, e.timer - options.now()) }) });
                    }
            return Object.freeze(result);
        },
        context: () => context,
        setContext(c) { if (!/^[a-z][a-z0-9_-]{0,31}$/.test(c) || c === context)
            return; context = c; changed(); },
        setEnabled(on) { enabled = on; stop(); schedule(); changed(); },
        click(id) {
            const e = entries.get(id);
            if (!enabled || !e?.contexts.includes(context))
                return;
            e.onClick?.();
            if (e.onClick === undefined && options.hasWindowRule
                && !options.hasWindowRule(`bottommenu:${id}`)) {
                reportMissingWindowRule(`bottommenu:${id}`, id, options.ruleMissing);
            }
        },
        onChange(fn) { listeners.add(fn); return () => { listeners.delete(fn); }; },
        reset() { stop(); entries.clear(); changed(); },
    };
}
export function bottomMenuModule(registry) {
    return {
        manifest: { id: 'bottommenu', version: '1.0.0', kind: 'ui', engines: { core: '^1.0.0' },
            targets: ['web', 'cordova'], permissions: [], provides: ['bottommenu.registry@1'],
            entry: 'shell.js', load: 'eager', events: { emits: [], listens: [] },
        },
        init(ctx) {
            ctx.services.provide('bottommenu.registry@1', {
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
                setState: (c, id, s) => {
                    registry.setState(id, s, c.from);
                },
            });
        },
        async stop() { registry.reset(); },
        async dispose() { registry.reset(); },
        api() { return Object.freeze({}); },
    };
}
export const BOTTOMMENU_LABEL_KEY = 'sdk.bottommenu.label';
export function bottomMenuView(p) {
    const label = p.text(BOTTOMMENU_LABEL_KEY);
    const itemProps = { ...p, slot: 'menu', items: [] };
    const orientation = p.orientation ?? 'portrait';
    const center = (p.items.length + 1) / 2;
    const variant = (item) => item?.variant === 'raised' ? 'raised' : 'inline';
    return h('nav', { class: 'bottommenu', 'data-slots': p.items.length, 'data-testid': 'bottommenu',
        'data-orientation': orientation,
        'data-raised': p.items.some((item) => variant(item) === 'raised') ? 'true' : undefined,
        'aria-label': label === BOTTOMMENU_LABEL_KEY ? text(p, 'kit.bottommenu.main-menu') : label }, ...p.items.map((item, index) => h('div', { class: 'bottommenu-slot hud', 'data-slot': 'menu',
        'data-position': index + 1, 'data-variant': variant(item),
        'data-center': index + 1 === center ? 'true' : undefined,
        'data-empty': item ? undefined : 'true',
        'data-testid': `bottommenu.slot.${index + 1}` }, item ? hudItemView(itemProps, { id: item.id, icon: item.icon, label: p.text(item.label),
        state: item.state ?? 'active',
        ...(p.current !== undefined && item.id === p.current ? { current: true } : {}),
        ...(item.value === undefined ? {} : { value: item.value }),
        ...(item.badge ? { badge: item.badge } : {}),
        ...(item.timer === undefined ? {} : { timer: { remainingMs: item.remainingMs ?? 0 } }),
        ...(item.progress === undefined ? {} : { progress: item.progress }) }, 'bottommenu') : null)));
}
export const bottomMenu = component(bottomMenuView, {});
nameComponents({ bottomMenu });

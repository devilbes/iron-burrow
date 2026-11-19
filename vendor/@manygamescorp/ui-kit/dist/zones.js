import { planUiSlots, UI_CONTEXT, uiZoneEnabled } from './preview/vendor/contracts-client/ui-slots.js';
import { createTopBarRegistry } from './services/topbar.js';
import { createHudRegistry } from './services/hud-registry.js';
import { createBottomMenuRegistry } from './services/bottommenu.js';
const noop = () => Object.freeze({ active: false, update() { }, dispose() { } });
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
export function createUiZones(options) {
    let settings = Object.freeze({ ...options.settings });
    let mode = 'main';
    let disposed = false;
    let generation = 0;
    let queuePort;
    const delegated = new Set();
    const automaticDelegated = new Set();
    const listeners = new Set();
    const skipped = new Set();
    const topBar = options.registries?.topBar ?? createTopBarRegistry({ now: options.now });
    const hud = options.registries?.hud ?? createHudRegistry({ now: options.now });
    const bottomMenu = options.registries?.bottomMenu
        ?? createBottomMenuRegistry({ now: options.now });
    const entries = new Set();
    const notify = () => {
        for (const fn of [...listeners]) {
            try {
                fn();
            }
            catch { }
        }
    };
    const skip = (moduleId, slot, zone) => {
        try {
            const event = { moduleId, slot, zone };
            options.skipped?.(event);
            for (const fn of skipped)
                fn(event);
        }
        catch { }
    };
    const reflow = () => {
        for (const e of entries)
            e.unmount();
        for (const e of [...entries].sort((a, b) => a.order - b.order
            || compare(a.spec.moduleId, b.spec.moduleId) || compare(a.spec.id, b.spec.id)))
            e.mount();
    };
    const register = (primary, spec) => {
        if (disposed || entries.size >= 128)
            return noop();
        const module = options.modules?.().find(m => m.id === spec.moduleId);
        const declared = spec.declaration ?? module?.ui?.slots.find(slot => slot.id ===
            (spec.slotId ?? (primary === 'topbar' ? 'counters' : 'entry')));
        const slot = declared ?? { id: spec.slotId ?? spec.id, zone: primary,
            ...(spec.contexts ? { contexts: spec.contexts } : {}),
            ...(spec.order === undefined ? {} : { order: spec.order }), fallback: spec.fallback ?? [],
            does: { ru: spec.label, en: spec.label } };
        const itemId = spec.id;
        const entry = { spec, primary, order: slot.order ?? spec.order ?? 0,
            patch: {}, zone: null,
            unmount: () => { }, mount: () => { } };
        let active = true;
        const epoch = generation;
        let reported = false;
        const update = () => {
            if (!active || epoch !== generation || entry.zone === null || entry.zone === 'window')
                return;
            const registry = entry.zone === 'topbar' ? topBar : entry.zone === 'hud' ? hud : bottomMenu;
            if (entry.patch.value !== undefined)
                registry.setValue(itemId, entry.patch.value, spec.moduleId);
            if (entry.patch.badge !== undefined)
                registry.setBadge(itemId, entry.patch.badge, spec.moduleId);
            if (entry.patch.timer !== undefined)
                registry.setTimer(itemId, entry.patch.timer, spec.moduleId);
            if (entry.patch.progress !== undefined)
                registry.setProgress(itemId, entry.patch.progress, spec.moduleId);
            if (entry.patch.state !== undefined)
                registry.setState(itemId, entry.patch.state, spec.moduleId);
        };
        entry.unmount = () => {
            if (entry.zone === 'topbar')
                topBar.remove(itemId, spec.moduleId);
            if (entry.zone === 'hud')
                hud.remove(itemId, spec.moduleId);
            if (entry.zone === 'bottomMenu')
                bottomMenu.remove(itemId, spec.moduleId);
            entry.zone = null;
        };
        entry.mount = () => {
            entry.unmount();
            const zone = typeof slot.zone === 'string' ? slot.zone
                : module?.settings?.[slot.zone.fromSetting] === undefined ? primary : slot.zone;
            const plan = planUiSlots(settings, [{ id: spec.moduleId, settings: module?.settings ?? {},
                    ui: { slots: [{ ...slot, zone }] } }])[0];
            const { moduleId: _moduleId, slotId: _slotId, fallback: _fallback, slot: _side, declaration: _declaration, ...rest } = spec;
            const contexts = slot.contexts ?? spec.contexts ?? ['main'];
            for (const context of contexts)
                if (context !== 'main' && context !== 'core')
                    topBar.setEnabled(context, true);
            const base = { ...rest, contexts, order: slot.order ?? spec.order ?? 0, onClick: () => {
                    if (spec.clearOnOpen) {
                        entry.patch = { ...entry.patch, badge: null };
                        update();
                    }
                    spec.onClick?.();
                } };
            let accepted = false;
            if (plan.zone === 'topbar')
                accepted = topBar.add({ ...base,
                    slot: spec.slot === 'center' ? 'center' : spec.slot === 'left' ? 'left' : 'right' }, spec.moduleId);
            if (plan.zone === 'hud')
                accepted = hud.add({ ...base,
                    slot: spec.side ?? (spec.slot === 'left' || module?.settings?.['hudSide'] === 'left'
                        ? 'left' : 'right') }, spec.moduleId);
            if (plan.zone === 'bottomMenu') {
                const slots = bottomMenu.slots();
                const position = spec.slot === 'center' ? Math.ceil(slots.length / 2)
                    : typeof spec.slot === 'number' ? spec.slot
                        : slots.findIndex(value => value === null) + 1;
                if (position > 0 && position <= slots.length
                    && !slots[position - 1])
                    accepted = bottomMenu.add({
                        ...base, slot: position
                    }, spec.moduleId);
            }
            entry.zone = accepted ? plan.zone : null;
            if (!accepted && !reported) {
                reported = true;
                skip(spec.moduleId, slot.id, primary);
            }
            update();
        };
        entries.add(entry);
        try {
            reflow();
        }
        catch (error) {
            entry.unmount();
            entries.delete(entry);
            reflow();
            throw error;
        }
        return Object.freeze({ get active() {
                return active && epoch === generation
                    && entry.zone !== null;
            },
            update(patch) {
                if (!active || epoch !== generation)
                    return;
                entry.patch = { ...entry.patch, ...patch };
                update();
            },
            dispose() {
                if (!active || epoch !== generation)
                    return;
                active = false;
                entry.unmount();
                entries.delete(entry);
                reflow();
            } });
    };
    const pending = [];
    const windows = new Set();
    let draining = false;
    const drain = async () => {
        if (draining)
            return;
        draining = true;
        try {
            while (!disposed && pending.length) {
                pending.sort((a, b) => (b.request.priority ?? 0) - (a.request.priority ?? 0)
                    || compare(a.request.moduleId, b.request.moduleId) || compare(a.request.id, b.request.id));
                const next = pending.shift();
                if (next.cancelled)
                    continue;
                try {
                    const opening = Promise.resolve(next.request.open(next.controller.signal))
                        .then(ticket => {
                        if (next.cancelled || disposed)
                            ticket.close();
                        return ticket;
                    });
                    const ticket = await Promise.race([opening, next.cancelledPromise]);
                    if (ticket) {
                        next.ticket = ticket;
                        await Promise.race([ticket.closed, next.cancelledPromise]);
                    }
                }
                catch { }
                finally {
                    next.cancelled = true;
                    windows.delete(next);
                }
            }
        }
        finally {
            draining = false;
        }
    };
    const configure = (next) => {
        if (disposed)
            return;
        settings = Object.freeze({ ...next });
        topBar.setEnabled('main', settings.topbarMain !== false);
        topBar.setEnabled('core', settings.topbarCore !== false);
        hud.setEnabled(settings.hud !== false);
        bottomMenu.setEnabled(settings.bottomMenu !== false);
        for (const entry of entries)
            entry.unmount();
        reflow();
        for (const entry of windows)
            if (settings.windowQueue === false && entry.request.automatic) {
                entry.cancel();
                windows.delete(entry);
            }
        if (settings.windowQueue === false) {
            for (const handle of automaticDelegated) {
                handle.dispose();
                delegated.delete(handle);
            }
            automaticDelegated.clear();
        }
        notify();
    };
    configure(settings);
    return {
        topBarRegistry: topBar, hudRegistry: hud, bottomMenuRegistry: bottomMenu,
        topbar: { register: spec => register('topbar', spec) },
        hud: { register: spec => register('hud', spec) },
        bottomMenu: { register: spec => register('bottomMenu', spec) },
        windows: { enqueue(request) {
                for (const handle of delegated)
                    if (!handle.active) {
                        delegated.delete(handle);
                        automaticDelegated.delete(handle);
                    }
                if (disposed || windows.size + delegated.size >= 64 || (request.automatic
                    && settings.windowQueue === false)) {
                    skip(request.moduleId, request.id, 'window');
                    return noop();
                }
                if (queuePort) {
                    const handle = queuePort.enqueue(request);
                    delegated.add(handle);
                    if (request.automatic)
                        automaticDelegated.add(handle);
                    return handle;
                }
                let settle = () => { };
                const cancelledPromise = new Promise(resolve => { settle = resolve; });
                const entry = { request, cancelled: false, controller: new AbortController(),
                    cancelledPromise, cancel() {
                        if (entry.cancelled)
                            return;
                        entry.cancelled = true;
                        entry.controller.abort();
                        const index = pending.indexOf(entry);
                        if (index >= 0)
                            pending.splice(index, 1);
                        try {
                            entry.ticket?.close();
                        }
                        catch { }
                        settle();
                    } };
                windows.add(entry);
                pending.push(entry);
                void Promise.resolve().then(drain);
                return Object.freeze({ get active() { return !entry.cancelled; }, update() { },
                    dispose() { entry.cancel(); windows.delete(entry); } });
            } },
        screen: { mode: () => mode, setMode(next) {
                if (disposed || !UI_CONTEXT.test(next))
                    return;
                mode = next;
                topBar.setEnabled(next, uiZoneEnabled(settings, 'topbar', [next]));
                topBar.setContext(next);
                hud.setContext(next);
                bottomMenu.setContext(next);
                notify();
            } },
        useWindowQueue(port) {
            queuePort = port;
            return () => {
                if (queuePort !== port)
                    return;
                queuePort = undefined;
                for (const handle of delegated)
                    handle.dispose();
                delegated.clear();
                automaticDelegated.clear();
            };
        },
        settings: () => settings, configure,
        onSkipped(fn) { skipped.add(fn); return () => { skipped.delete(fn); }; },
        onChange(fn) { listeners.add(fn); return () => { listeners.delete(fn); }; },
        reset() {
            generation += 1;
            for (const entry of entries)
                entry.unmount();
            entries.clear();
            for (const entry of windows) {
                entry.cancel();
            }
            windows.clear();
            pending.length = 0;
            for (const handle of delegated)
                handle.dispose();
            delegated.clear();
            automaticDelegated.clear();
            topBar.reset();
            hud.reset();
            bottomMenu.reset();
        },
        dispose() {
            generation += 1;
            disposed = true;
            for (const entry of entries)
                entry.unmount();
            entries.clear();
            for (const entry of windows) {
                entry.cancel();
            }
            windows.clear();
            pending.length = 0;
            for (const handle of delegated)
                handle.dispose();
            delegated.clear();
            automaticDelegated.clear();
            topBar.reset();
            hud.reset();
            bottomMenu.reset();
            listeners.clear();
            skipped.clear();
        },
    };
}

import { SDKError } from './error.js';
const MAX_DELAY = 2_147_483_647;
const invalid = () => {
    throw new SDKError('VALIDATION_FAILED', {
        message: 'invalid polling task', module: 'core',
    });
};
function delay(value) {
    return Number.isInteger(value) && value > 0 && value <= MAX_DELAY;
}
export function createPoller(bus, now) {
    const tasks = new Map();
    const subscriptions = [];
    let started = false;
    let disposed = false;
    let hidden = false;
    let online = true;
    const controller = {
        register(input) {
            if (!input || typeof input.id !== 'string' || !input.id || input.id.length > 1024
                || !delay(input.intervalMs) || typeof input.run !== 'function')
                invalid();
            const task = { ...input };
            const jitter = task.jitter ?? 0.1;
            const base = task.backoffBaseMs ?? 1000;
            const max = task.backoffMaxMs ?? 300_000;
            const visibleAfter = task.visibleAfterMs ?? 0;
            if (!Number.isFinite(jitter) || jitter < 0 || jitter >= 1 || !delay(base)
                || !delay(max) || max < base
                || (visibleAfter !== false && (!Number.isInteger(visibleAfter) || visibleAfter < 0
                    || visibleAfter > MAX_DELAY))
                || (task.pauseWhenHidden !== undefined && typeof task.pauseWhenHidden !== 'boolean')
                || (task.runOnRegister !== undefined && typeof task.runOnRegister !== 'boolean')
                || (task.signal !== undefined && !(task.signal instanceof AbortSignal)))
                invalid();
            if (disposed || task.signal?.aborted)
                return () => { };
            if (tasks.has(task.id))
                invalid();
            const abort = new AbortController();
            let timer;
            let running = false;
            let removed = false;
            let immediate = task.runOnRegister !== false;
            let last = started ? now() : undefined;
            let failures = 0;
            const paused = () => !started || !online
                || (hidden && task.pauseWhenHidden !== false);
            const clear = () => { clearTimeout(timer); timer = undefined; };
            const schedule = () => {
                clear();
                if (removed || paused() || running)
                    return;
                const backoff = Math.min(max, base * 2 ** Math.min(Math.max(0, failures - 1), 31));
                const wait = immediate ? 0 : failures ? backoff : task.intervalMs;
                const cap = failures ? max : MAX_DELAY;
                const ms = wait === 0 ? 0 : Math.max(1, Math.min(cap, Math.round(wait * (1 + jitter * (2 * Math.random() - 1)))));
                timer = setTimeout(() => { void run(); }, ms);
            };
            const run = async () => {
                timer = undefined;
                if (removed || paused())
                    return;
                running = true;
                immediate = false;
                last = now();
                try {
                    await task.run(abort.signal);
                    failures = 0;
                }
                catch {
                    failures = Math.min(failures + 1, 32);
                }
                finally {
                    running = false;
                    schedule();
                }
            };
            const off = () => {
                if (removed)
                    return;
                removed = true;
                clear();
                tasks.delete(task.id);
                task.signal?.removeEventListener('abort', off);
                abort.abort();
            };
            tasks.set(task.id, { off, start() { last ??= now(); schedule(); }, pause: clear,
                shift(delta) { if (last !== undefined)
                    last += delta; },
                hide() { if (task.pauseWhenHidden !== false)
                    clear(); }, wake(visible) {
                    if (visible && task.pauseWhenHidden === false)
                        return;
                    if (!visible || (visibleAfter !== false
                        && (last === undefined || now() - last >= visibleAfter)))
                        immediate = true;
                    schedule();
                } });
            task.signal?.addEventListener('abort', off, { once: true });
            schedule();
            return off;
        },
        start() {
            if (started || disposed)
                return;
            started = true;
            subscriptions.push(bus.on('app:lifecycle:changed', (state) => {
                if (state.hidden !== hidden) {
                    hidden = state.hidden;
                    for (const task of tasks.values()) {
                        if (hidden)
                            task.hide();
                        else
                            task.wake(true);
                    }
                }
                if (state.online !== online) {
                    online = state.online;
                    for (const task of tasks.values()) {
                        if (online)
                            task.wake(false);
                        else
                            task.pause();
                    }
                }
            }), bus.on('time:offsetChanged', ({ offset, previous }) => {
                for (const task of tasks.values())
                    task.shift(offset - previous);
            }));
            for (const task of tasks.values())
                task.start();
        },
        dispose() {
            if (disposed)
                return;
            disposed = true;
            for (const off of subscriptions)
                off();
            for (const task of tasks.values())
                task.off();
        },
    };
    return Object.freeze(controller);
}

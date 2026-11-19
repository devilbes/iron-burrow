import { redact } from './redact.js';
export function createDiagnostics(target = globalThis) {
    const subscriptions = new Set();
    let listening = false;
    let disposed = false;
    const onError = (event) => {
        const source = event;
        publish('errors', { error: source.error ?? source.reason ?? source.message });
    };
    function listeners() {
        const needed = [...subscriptions].some((s) => s.options.errors === true);
        if (needed === listening)
            return;
        listening = needed;
        for (const name of ['error', 'unhandledrejection']) {
            if (needed)
                target.addEventListener?.(name, onError);
            else
                target.removeEventListener?.(name, onError);
        }
    }
    function schedule(s) {
        if (!s.active || s.busy || s.timer !== undefined || s.queue.length === 0)
            return;
        s.timer = setTimeout(() => {
            delete s.timer;
            if (!s.active)
                return;
            const record = s.queue.shift();
            s.busy = true;
            void Promise.resolve().then(() => s.active ? s.handler(record) : undefined)
                .catch(() => undefined).finally(() => { s.busy = false; schedule(s); });
        }, 0);
    }
    function publish(kind, data, payload) {
        for (const s of subscriptions) {
            if (s.options[kind] !== true)
                continue;
            try {
                const safe = { kind, time: Date.now(), data: redact(kind === 'bus'
                        && s.options.busPayload === true ? { ...data, payload } : data) };
                const json = JSON.stringify(safe);
                if (new TextEncoder().encode(json).byteLength > 8192)
                    continue;
                const snapshot = JSON.parse(json);
                if (!s.active)
                    continue;
                if (s.queue.length === 64)
                    s.queue.shift();
                s.queue.push(snapshot);
                schedule(s);
            }
            catch { }
        }
    }
    const api = Object.freeze({ subscribe(options, handler) {
            const capture = { logs: options.logs === true, network: options.network === true,
                errors: options.errors === true, bus: options.bus === true,
                busPayload: options.busPayload === true };
            if (disposed)
                throw new TypeError('Diagnostics disposed');
            if (subscriptions.size >= 4)
                throw new RangeError('At most four diagnostic subscribers');
            if (typeof handler !== 'function')
                throw new TypeError('Invalid diagnostic handler');
            const s = { options: capture, handler, queue: [], busy: false,
                active: true, off: () => {
                    s.active = false;
                    s.handler = () => undefined;
                    if (s.timer !== undefined)
                        clearTimeout(s.timer);
                    s.queue.length = 0;
                    subscriptions.delete(s);
                    listeners();
                } };
            subscriptions.add(s);
            listeners();
            return s.off;
        } });
    return { api, publish, dispose() {
            disposed = true;
            for (const s of subscriptions)
                s.off();
        } };
}
export function scopeDiagnostics(api, signal) {
    return Object.freeze({ subscribe(options, handler) {
            if (signal.aborted)
                return () => { };
            const unsubscribe = api.subscribe(options, handler);
            const off = () => { signal.removeEventListener('abort', off); unsubscribe(); };
            signal.addEventListener('abort', off, { once: true });
            return off;
        } });
}
export function diagnosticLogger(logger, publish) {
    const write = (level, msg, data) => {
        if (logger.isEnabled(level))
            publish({ level, msg, time: Date.now(), data });
        logger[level](msg, data);
    };
    return { level: logger.level, isEnabled: (level) => logger.isEnabled(level),
        debug: (msg, data) => write('debug', msg, data), info: (msg, data) => write('info', msg, data),
        warn: (msg, data) => write('warn', msg, data), error: (msg, data) => write('error', msg, data),
        child: (id) => diagnosticLogger(logger.child(id), (record) => publish({ ...record, moduleId: id })),
        with: (context) => diagnosticLogger(logger.with(context), (record) => publish({ ...record,
            ...context })),
    };
}
export { diagnosticPath } from './diagnostic-path.js';

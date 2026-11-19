import { realtimeType } from '@manygamescorp/contracts-client/realtime';
import { redact } from './redact.js';
import { SDKError } from './error.js';
import { randomUuid } from './context.js';
import { createLogger } from './logger.js';
import { createScopeBudget, checkBusPayload } from './bus-budget.js';
import { cloneBusPayload, requestError } from './bus-payload.js';
import { EVENT_SEGMENT as SEGMENT, isCoreEvent, isEventName } from './event-names.js';
export { isEventName };
const SEGMENT_NAME = new RegExp(`^${SEGMENT}$`);
const WILDCARD = new RegExp(`^${SEGMENT}(?::${SEGMENT})?:\\*$`);
export const EVENT_NAME_INVALID = 'SDK_EVENT_NAME_INVALID';
export const LISTENER_ERROR_EVENT = 'sdk:core:listener-error';
export const DEFAULT_STICKY_EVENTS = [
    'sdk:core:ready',
    'sdk:platform:ready',
    'sdk:ui:fullscreen-changed',
    'app:lifecycle:changed',
    'auth:identity:changed',
    'l10n:core:ready',
    'sdk:realtime:status:changed',
    'sdk:realtime:transport:changed',
];
function newTrace(from = 'core') {
    return Object.freeze({ from, rid: randomUuid() });
}
export class EventNameError extends Error {
    value;
    code = EVENT_NAME_INVALID;
    constructor(value) {
        super(`${EVENT_NAME_INVALID}: invalid event name or pattern`);
        this.value = value;
        this.name = 'EventNameError';
    }
}
export function isEventPattern(value) {
    return isEventName(value) || (typeof value === 'string' && WILDCARD.test(value));
}
export function createBus(options = {}) {
    const stickyNames = new Set(options.sticky ?? DEFAULT_STICKY_EVENTS);
    for (const name of stickyNames) {
        if (!isEventName(name))
            throw new EventNameError(name);
    }
    const onListenerError = options.onListenerError;
    const byPattern = new Map();
    const sticky = new Map();
    const handlers = new Map();
    const logger = options.logger ?? createLogger();
    const clonePayload = options.mode !== 'production';
    const clone = (value) => clonePayload ? cloneBusPayload(value) : value;
    const journal = [];
    let journalGeneration = 0;
    function record(type, name, trace, payload, to, code, generation = journalGeneration) {
        try {
            options.onDiagnostic?.({ type, name, ...trace, timestamp: Date.now(),
                ...(to === undefined ? {} : { to }), ...(code === undefined ? {} : { code }) }, payload);
        }
        catch { }
        if (!clonePayload || options.debug === false || generation !== journalGeneration)
            return;
        let safe;
        try {
            safe = redact(payload);
        }
        catch {
            safe = '[unavailable]';
        }
        if (generation !== journalGeneration)
            return;
        journal.push({ type, name, ...trace, timestamp: Date.now(), payload: safe,
            ...(to === undefined ? {} : { to }), ...(code === undefined ? {} : { code }) });
        if (journal.length > 200)
            journal.shift();
    }
    let seq = 0;
    function remove(entry) {
        if (!entry.active)
            return;
        entry.active = false;
        entry.dispose();
        const list = byPattern.get(entry.pattern);
        if (!list)
            return;
        const i = list.indexOf(entry);
        if (i >= 0)
            list.splice(i, 1);
        if (list.length === 0)
            byPattern.delete(entry.pattern);
    }
    function reportError(error, event, trace, generation) {
        try {
            onListenerError?.(error, event);
        }
        catch (_hookError) {
        }
        if (event !== LISTENER_ERROR_EVENT) {
            const payload = { event };
            dispatch(LISTENER_ERROR_EVENT, payload, Object.freeze({ from: 'core', rid: trace.rid }), generation);
        }
    }
    function invoke(entry, event, payload, trace, generation = journalGeneration) {
        if (!entry.active)
            return;
        if (entry.once)
            remove(entry);
        try {
            const result = entry.listener(clone(payload), event, trace);
            const then = result?.then;
            if (typeof then === 'function') {
                then.call(result, undefined, (error) => reportError(error, event, trace, generation));
            }
        }
        catch (error) {
            reportError(error, event, trace, generation);
        }
    }
    function matching(event) {
        const [domain, entity] = event.split(':');
        const found = [];
        for (const key of new Set([event, `${domain}:${entity}:*`, `${domain}:*`])) {
            const list = byPattern.get(key);
            if (list)
                found.push(...list);
        }
        return found.sort((a, b) => a.seq - b.seq);
    }
    function dispatch(event, payload, trace, generation = journalGeneration) {
        if (event === 'auth:identity:changed') {
            sticky.delete('sdk:realtime:status:changed');
            sticky.delete('sdk:realtime:transport:changed');
            journal.length = 0;
            generation = ++journalGeneration;
        }
        record('event', event, trace, payload, undefined, undefined, generation);
        for (const entry of matching(event))
            invoke(entry, event, payload, trace, generation);
    }
    function matches(pattern, event) {
        return pattern.endsWith(':*') ? event.startsWith(pattern.slice(0, -1)) : pattern === event;
    }
    function on(pattern, listener, opts = {}) {
        if (!isEventPattern(pattern))
            throw new EventNameError(String(pattern));
        if (typeof listener !== 'function')
            throw new SDKError('VALIDATION_FAILED', {
                message: 'Bus listener must be a function', module: 'bus'
            });
        const { signal } = opts;
        if (signal?.aborted)
            return () => { };
        const entry = {
            seq: seq++,
            pattern,
            listener: listener,
            once: opts.once === true,
            active: true,
            dispose: () => { },
        };
        if (signal) {
            const onAbort = () => remove(entry);
            signal.addEventListener('abort', onAbort, { once: true });
            entry.dispose = () => signal.removeEventListener('abort', onAbort);
        }
        const list = byPattern.get(pattern);
        if (list)
            list.push(entry);
        else
            byPattern.set(pattern, [entry]);
        for (const [event, record] of [...sticky]) {
            if (!entry.active)
                break;
            if (sticky.get(event) !== record)
                continue;
            if (matches(pattern, event))
                invoke(entry, event, record.payload, record.trace);
        }
        return () => remove(entry);
    }
    return {
        debug: () => structuredClone(journal),
        forget(event) { sticky.delete(event); },
        on,
        once: (pattern, listener, opts = {}) => on(pattern, listener, { ...opts, once: true }),
        off(pattern, listener) {
            if (typeof listener !== 'function')
                throw new SDKError('VALIDATION_FAILED', {
                    message: 'Bus listener must be a function', module: 'bus'
                });
            if (!isEventPattern(pattern))
                throw new EventNameError(String(pattern));
            const list = byPattern.get(pattern);
            if (!list)
                return;
            for (const entry of [...list]) {
                if (entry.listener === listener)
                    remove(entry);
            }
        },
        emit(event, payload, source = newTrace()) {
            if (!isEventName(event))
                throw new EventNameError(String(event));
            const generation = journalGeneration;
            const value = clone(payload);
            const trace = Object.freeze({ from: source.from, rid: source.rid });
            if (stickyNames.has(event)) {
                sticky.delete(event);
                sticky.set(event, { payload: value, trace });
            }
            dispatch(event, value, trace, generation);
        },
        handle(topic, handler, opts = {}) {
            if (!isEventName(topic))
                throw new EventNameError(String(topic));
            if (typeof handler !== 'function')
                throw new TypeError('handler must be a function');
            if (handlers.has(topic))
                throw new TypeError('topic already has a handler');
            if (opts.signal?.aborted)
                throw new SDKError('SDK_MODULE_CANCELLED', {
                    module: opts.module ?? 'core',
                });
            const entry = {
                handler: handler, module: opts.module ?? 'core',
                ...(opts.signal === undefined ? {} : { signal: opts.signal }),
            };
            handlers.set(topic, entry);
            let active = true;
            const remove = () => {
                if (!active)
                    return;
                active = false;
                entry.signal?.removeEventListener('abort', remove);
                if (handlers.get(topic) === entry)
                    handlers.delete(topic);
            };
            entry.signal?.addEventListener('abort', remove, { once: true });
            return remove;
        },
        request(topic, request, opts, source = newTrace()) {
            return new Promise((resolve, reject) => {
                if (!isEventName(topic))
                    throw new EventNameError(String(topic));
                const timeoutMs = opts.timeoutMs;
                if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2 ** 31 - 1) {
                    throw new TypeError('timeoutMs must be positive and at most 2^31 - 1');
                }
                const trace = Object.freeze({ from: source.from, rid: source.rid });
                const generation = journalGeneration;
                const recordRequest = (type, payload, to, code) => {
                    record(type, topic, trace, payload, to, code, generation);
                };
                const error = (code) => new SDKError(code, { module: trace.from, rid: trace.rid });
                if (opts.signal?.aborted)
                    throw error('SDK_MODULE_CANCELLED');
                const handler = handlers.get(topic);
                if (!handler) {
                    recordRequest('request');
                    recordRequest('error', undefined, undefined, 'SDK_NO_HANDLER');
                    throw error('SDK_NO_HANDLER');
                }
                let value;
                try {
                    value = clone(request);
                }
                catch (cause) {
                    recordRequest('request', undefined, handler.module);
                    recordRequest('error', undefined, handler.module, 'INTERNAL');
                    throw cause;
                }
                recordRequest('request', value, handler.module);
                if (handler.signal?.aborted) {
                    recordRequest('error', undefined, handler.module, 'SDK_MODULE_CANCELLED');
                    throw new SDKError('SDK_MODULE_CANCELLED', {
                        module: handler.module, rid: trace.rid,
                    });
                }
                const controller = new AbortController();
                const context = Object.freeze({ ...trace, signal: controller.signal });
                let settled = false;
                const timer = setTimeout(() => {
                    if (settled)
                        return;
                    settled = true;
                    handler.signal?.removeEventListener('abort', cancel);
                    opts.signal?.removeEventListener('abort', cancel);
                    const reason = error('SDK_REQUEST_TIMEOUT');
                    recordRequest('error', undefined, handler.module, reason.code);
                    controller.abort(reason);
                    reject(reason);
                }, timeoutMs);
                const finish = (ok, result) => {
                    if (settled)
                        return;
                    let value;
                    try {
                        if (ok)
                            value = clone(result);
                    }
                    catch (err) {
                        ok = false;
                        result = err;
                    }
                    if (settled)
                        return;
                    settled = true;
                    clearTimeout(timer);
                    handler.signal?.removeEventListener('abort', cancel);
                    opts.signal?.removeEventListener('abort', cancel);
                    if (ok) {
                        recordRequest('response', value, handler.module);
                        resolve(value);
                        return;
                    }
                    try {
                        logger.with({ moduleId: handler.module, rid: trace.rid, operation: topic })
                            .error('bus request handler failed', result);
                    }
                    catch { }
                    const failure = requestError(result, handler.module, trace.rid);
                    recordRequest('error', undefined, handler.module, failure.code);
                    reject(failure);
                };
                const cancel = () => {
                    if (settled)
                        return;
                    settled = true;
                    clearTimeout(timer);
                    handler.signal?.removeEventListener('abort', cancel);
                    opts.signal?.removeEventListener('abort', cancel);
                    const reason = new SDKError('SDK_MODULE_CANCELLED', {
                        module: handler.module, rid: trace.rid,
                    });
                    recordRequest('error', undefined, handler.module, reason.code);
                    controller.abort(reason);
                    reject(reason);
                };
                handler.signal?.addEventListener('abort', cancel, { once: true });
                opts.signal?.addEventListener('abort', cancel, { once: true });
                if (opts.signal?.aborted || handler.signal?.aborted) {
                    cancel();
                    return;
                }
                try {
                    Promise.resolve(handler.handler(value, context))
                        .then((result) => finish(true, result), (err) => finish(false, err));
                }
                catch (err) {
                    finish(false, err);
                }
            });
        },
        replay(event) {
            if (!isEventName(event))
                throw new EventNameError(String(event));
            const record = sticky.get(event);
            return record === undefined ? undefined : {
                payload: clone(record.payload), trace: record.trace,
            };
        },
    };
}
export function createScopedBus(bus, manifest, options = {}) {
    const { id, events } = structuredClone({ id: manifest.id, events: manifest.events });
    const emits = new Set(events.emits);
    const handles = new Set(events.handles ?? []);
    const listens = (events.listens ?? []).map(declarationSegments);
    for (const event of emits)
        if (!isEventName(event))
            throw new EventNameError(event);
    for (const topic of handles)
        if (!isEventName(topic))
            throw new EventNameError(topic);
    if ([...emits, ...handles].some((name) => isCoreEvent(name) || (name.startsWith('realtime:') && id !== 'realtime'))) {
        throw new SDKError('SDK_PERMISSION_DENIED', { module: id });
    }
    const subscriptions = new Set();
    const removals = new Set();
    const controller = new AbortController();
    const lifetime = options.signal;
    const budget = createScopeBudget(id);
    function dispose() {
        if (controller.signal.aborted)
            return;
        lifetime?.removeEventListener('abort', dispose);
        budget.clear();
        controller.abort();
        for (const entry of subscriptions)
            entry.remove();
        for (const remove of removals)
            remove();
    }
    if (lifetime?.aborted)
        dispose();
    else
        lifetime?.addEventListener('abort', dispose, { once: true });
    function permit(value, operation, emit = false) {
        if (controller.signal.aborted)
            throw new SDKError('SDK_MODULE_CANCELLED', { module: id });
        const allowed = operation === 'handle' ? handles.has(value)
            : emit ? emits.has(value) : isEventPattern(value) && listens.some((grant) => {
                const wanted = declarationSegments(value);
                return grant.every((segment, i) => segment === '*' || segment === wanted[i]);
            });
        if (!allowed || (value.startsWith('realtime:') && !emit
            && !(events.listens ?? []).includes(value))) {
            throw new SDKError('SDK_PERMISSION_DENIED', {
                module: id, details: { operation },
            });
        }
    }
    function on(pattern, listener, opts = {}) {
        permit(pattern, 'on');
        if (typeof listener !== 'function')
            throw new TypeError('listener must be a function');
        const signal = opts.signal;
        const once = opts.once === true;
        if (signal?.aborted)
            return () => { };
        let unsubscribe = () => { };
        let active = true;
        const entry = {
            pattern, listener: listener,
            remove: () => {
                if (!active)
                    return;
                active = false;
                subscriptions.delete(entry);
                signal?.removeEventListener('abort', entry.remove);
                unsubscribe();
            },
        };
        subscriptions.add(entry);
        signal?.addEventListener('abort', entry.remove, { once: true });
        try {
            unsubscribe = bus.on(pattern, (payload, event, trace) => {
                if (!active || controller.signal.aborted)
                    return;
                if (once)
                    entry.remove();
                return listener(payload, event, trace);
            }, opts);
            if (!active)
                unsubscribe();
        }
        catch (err) {
            entry.remove();
            throw err;
        }
        return entry.remove;
    }
    return Object.freeze({
        dispose,
        on,
        once: (pattern, listener, opts = {}) => on(pattern, listener, { ...opts, once: true }),
        off(pattern, listener) {
            permit(pattern, 'off');
            for (const entry of subscriptions) {
                if (entry.pattern === pattern && entry.listener === listener)
                    entry.remove();
            }
        },
        emit(event, payload) {
            permit(event, 'emit', true);
            budget.accept(payload);
            bus.emit(event, payload, newTrace(id));
        },
        request(topic, request, opts) {
            permit(topic, 'request');
            try {
                budget.accept(request);
                const signal = opts.signal
                    ? AbortSignal.any([controller.signal, opts.signal]) : controller.signal;
                return bus.request(topic, request, { ...opts, signal }, newTrace(id));
            }
            catch (error) {
                return Promise.reject(error);
            }
        },
        handle(topic, handler) {
            permit(topic, 'handle');
            if (typeof handler !== 'function')
                throw new TypeError('handler must be a function');
            const unsubscribe = bus.handle(topic, async (request, context) => {
                const result = await handler(request, context);
                if (!context.signal.aborted)
                    checkBusPayload(result, id);
                return result;
            }, { module: id, signal: controller.signal });
            const remove = () => {
                removals.delete(remove);
                unsubscribe();
            };
            removals.add(remove);
            return remove;
        },
        replay(event) {
            permit(event, 'replay');
            return bus.replay(event);
        },
    });
}
function declarationSegments(pattern) {
    if (pattern === 'auth:playerChanged' || pattern === 'time:offsetChanged')
        return [pattern];
    if (/^sdk:realtime:(?:status|transport):changed$/.test(pattern))
        return pattern.split(':');
    if (pattern.startsWith('realtime:') && realtimeType(pattern.slice(9)))
        return [pattern];
    const parts = pattern.split(':');
    if (parts.length === 2 && parts[1] === '*')
        parts.push('*');
    if (parts.length !== 3 || parts.some((part) => part !== '*' && !SEGMENT_NAME.test(part))) {
        throw new EventNameError(pattern);
    }
    return parts;
}

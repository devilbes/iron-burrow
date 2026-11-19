import { realtimeType } from '@manygamescorp/contracts-client/realtime';
import { SDKError } from './error.js';
export function createRealtimeBus(bus, manifest, activate, connected = () => false) {
    const handlers = new Map();
    const register = (module, type, handler, signal) => {
        const declaration = manifest(module);
        if (!realtimeType(type) || !declaration?.realtime?.handles.includes(type)
            || !declaration.events.listens?.includes(`realtime:${type}`)) {
            throw new SDKError('SDK_PERMISSION_DENIED', { module });
        }
        if (handlers.has(type) || typeof handler !== 'function') {
            throw new SDKError('MODULE_DEPENDENCY_FAILED', { module });
        }
        signal.throwIfAborted();
        const entry = { module, handler, signal };
        handlers.set(type, entry);
        const remove = () => {
            if (handlers.get(type) === entry)
                handlers.delete(type);
            signal.removeEventListener('abort', remove);
        };
        signal.addEventListener('abort', remove, { once: true });
        return remove;
    };
    return {
        register,
        view(module, signal) {
            return Object.freeze({
                connected: () => !signal.aborted && connected(),
                on(type, handler) {
                    if (!realtimeType(type) || !manifest(module)?.events.listens?.includes(`realtime:${type}`)) {
                        throw new SDKError('SDK_PERMISSION_DENIED', { module });
                    }
                    return bus.on(`realtime:${type}`, (message) => handler(message), { signal });
                },
                handle: (type, handler) => register(module, type, handler, signal),
            });
        },
        async critical(message, signal, recipients) {
            const timeout = new AbortController();
            const combined = AbortSignal.any([signal, timeout.signal]);
            const timer = setTimeout(() => timeout.abort(), 10_000);
            const task = (async () => {
                for (const id of recipients) {
                    combined.throwIfAborted();
                    await activate(id, combined);
                }
                combined.throwIfAborted();
                const entry = handlers.get(message.type);
                if (entry && !entry.signal.aborted)
                    await entry.handler(message, { signal: AbortSignal.any([combined, entry.signal]) });
            })();
            try {
                await new Promise((resolve, reject) => {
                    const abort = () => reject(new SDKError('SDK_MODULE_CANCELLED'));
                    combined.addEventListener('abort', abort, { once: true });
                    task.then(() => {
                        combined.removeEventListener('abort', abort);
                        resolve();
                    }, (e) => {
                        combined.removeEventListener('abort', abort);
                        reject(e);
                    });
                    if (combined.aborted)
                        abort();
                });
            }
            finally {
                clearTimeout(timer);
            }
        },
    };
}

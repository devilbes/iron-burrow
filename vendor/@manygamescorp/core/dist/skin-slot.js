import { SDKError } from './error.js';
import { parseSdkLock } from './loader.js';
export function createSkinSelection(options) {
    let pending;
    let disposed = false;
    const cancelled = () => new SDKError('SDK_MODULE_CANCELLED', { module: 'skin' });
    return {
        async set(slot, selection) {
            if (disposed || !options.active())
                throw new SDKError('MODULE_NOT_ACTIVE', { module: 'skin' });
            const port = options.port;
            if (slot !== 'skin' || !port) {
                throw new SDKError('SDK_MODULE_NOT_INSTALLED', { module: 'skin' });
            }
            if (selection !== null) {
                const ref = parseSdkLock({ sdk: { modules: [{ ...selection, id: 'skin',
                                source: 'remote', load: 'eager' }] } }).modules[0];
                selection = Object.freeze({ package: ref.package, version: ref.version });
            }
            pending?.abort(cancelled());
            const controller = new AbortController();
            pending = controller;
            const timer = setTimeout(() => controller.abort(new SDKError('SDK_MODULE_TIMEOUT', { module: 'skin' })), 15000);
            let abort = () => undefined;
            try {
                const interrupted = new Promise((_resolve, reject) => {
                    abort = () => reject(controller.signal.reason);
                    controller.signal.addEventListener('abort', abort, { once: true });
                });
                const preparing = new Promise(resolve => {
                    resolve(port.prepare(selection, controller.signal));
                });
                const commit = await Promise.race([preparing, interrupted]);
                controller.signal.throwIfAborted();
                if (!options.active())
                    throw cancelled();
                commit();
            }
            catch (cause) {
                if (pending !== controller || disposed || !options.active()) {
                    controller.abort(cancelled());
                    throw cancelled();
                }
                const code = controller.signal.aborted ? 'TIMEOUT' : 'LOAD_FAILED';
                controller.abort(cause);
                options.bus.emit('sdk:ui:skin-failed', {
                    skin: selection?.package ?? '', version: selection?.version ?? '', code,
                });
                throw new SDKError(code === 'TIMEOUT' ? 'SDK_MODULE_TIMEOUT' : 'SDK_MODULE_LOAD_FAILED', { module: 'skin', cause });
            }
            finally {
                clearTimeout(timer);
                controller.signal.removeEventListener('abort', abort);
                if (pending === controller)
                    pending = undefined;
            }
        },
        dispose() {
            if (disposed)
                return;
            disposed = true;
            pending?.abort(cancelled());
            pending = undefined;
            options.port?.dispose();
        },
    };
}

import { SDKError } from './error.js';
import { listen } from './web-device-events.js';
import { deviceOperation, operationSignal, checkOperation } from './device-operation.js';
const unsupported = async () => { throw new SDKError('SDK_PLATFORM_UNSUPPORTED'); };
async function operation(run) {
    if (!run)
        return unsupported();
    try {
        await run();
    }
    catch {
        throw new SDKError('SDK_PLATFORM_UNSUPPORTED');
    }
}
export function webScreen({ window: win, document: doc, navigator: nav }, lifetime) {
    const orientation = win?.screen?.orientation;
    const read = () => {
        const width = win?.innerWidth ?? doc?.documentElement?.clientWidth;
        const height = win?.innerHeight ?? doc?.documentElement?.clientHeight;
        if (width === undefined || height === undefined)
            return undefined;
        let safeArea;
        if (doc?.createElement && doc.body && win?.getComputedStyle) {
            const probe = doc.createElement('div');
            try {
                Object.assign(probe.style, { position: 'fixed', visibility: 'hidden', pointerEvents: 'none',
                    paddingTop: 'env(safe-area-inset-top, 0px)',
                    paddingRight: 'env(safe-area-inset-right, 0px)',
                    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                    paddingLeft: 'env(safe-area-inset-left, 0px)' });
                doc.body.appendChild(probe);
                const style = win.getComputedStyle(probe);
                const pixels = (value) => Math.max(0, Number.parseFloat(value) || 0);
                safeArea = Object.freeze({ top: pixels(style.paddingTop), right: pixels(style.paddingRight),
                    bottom: pixels(style.paddingBottom), left: pixels(style.paddingLeft) });
            }
            catch { }
            finally {
                probe.remove();
            }
        }
        return Object.freeze({ width, height, dpr: win?.devicePixelRatio ?? 1,
            orientation: orientation?.type.startsWith('portrait') ? 'portrait'
                : orientation?.type.startsWith('landscape') ? 'landscape'
                    : width > height ? 'landscape' : 'portrait', ...(safeArea ? { safeArea } : {}) });
    };
    const hidden = () => doc?.visibilityState === 'hidden';
    let wanted = false;
    let revision = 0;
    let lock;
    let releaseOff = () => { };
    let visibilityOff = () => { };
    let scopeOff = () => { };
    let queue = Promise.resolve();
    const transition = () => {
        const current = ++revision;
        const result = queue.then(async () => {
            if (current !== revision)
                return;
            if (lock && (!wanted || hidden() || lock.released)) {
                const old = lock;
                await operation(() => old.release());
                if (lock === old) {
                    lock = undefined;
                    releaseOff();
                }
            }
            if (!wanted || hidden() || lock)
                return;
            if (!nav?.wakeLock?.request)
                return unsupported();
            let acquired;
            try {
                acquired = await nav.wakeLock.request('screen');
            }
            catch {
                throw new SDKError('SDK_PLATFORM_UNSUPPORTED');
            }
            if (current !== revision || !wanted || hidden()) {
                await operation(() => acquired.release());
                return;
            }
            lock = acquired;
            releaseOff = listen(acquired, ['release'], () => {
                if (lock === acquired) {
                    lock = undefined;
                    releaseOff();
                }
            });
        });
        queue = result.catch(() => { });
        return result;
    };
    const fullscreen = (on) => {
        if (typeof on !== 'boolean')
            return Promise.reject(new SDKError('VALIDATION_FAILED'));
        if (on) {
            if (doc?.fullscreenElement)
                return Promise.resolve();
            if (doc?.fullscreenEnabled === false)
                return unsupported();
            const root = doc?.documentElement;
            return operation(root?.requestFullscreen ? () => root.requestFullscreen() : undefined);
        }
        if (!doc?.exitFullscreen)
            return unsupported();
        return operation(doc.fullscreenElement ? () => doc.exitFullscreen() : () => { });
    };
    return Object.assign(read, {
        isSupported: () => (win?.innerWidth ?? doc?.documentElement?.clientWidth) !== undefined
            && (win?.innerHeight ?? doc?.documentElement?.clientHeight) !== undefined,
        onChange(handler) {
            const emit = () => { const state = read(); if (state)
                handler(state); };
            const offs = [listen(win, ['resize', 'orientationchange'], emit),
                listen(orientation, ['change'], emit), listen(win?.visualViewport, ['resize'], emit),
                listen(doc, ['fullscreenchange'], emit)];
            return () => offs.forEach((off) => off());
        },
        lockOrientation(value) {
            if (value !== 'portrait' && value !== 'landscape') {
                return Promise.reject(new SDKError('VALIDATION_FAILED'));
            }
            return operation(orientation?.lock ? () => orientation.lock(value) : undefined);
        },
        unlock: () => operation(orientation?.unlock ? () => orientation.unlock() : undefined),
        keepAwake: deviceOperation((scopes, on) => {
            const scope = operationSignal(lifetime, scopes);
            checkOperation(scope);
            if (typeof on !== 'boolean')
                return Promise.reject(new SDKError('VALIDATION_FAILED'));
            if (on && !nav?.wakeLock?.request)
                return unsupported();
            wanted = on;
            scopeOff();
            if (on) {
                const cancel = () => {
                    wanted = false;
                    visibilityOff();
                    scopeOff();
                    void transition().catch(() => { });
                };
                scope.addEventListener('abort', cancel, { once: true });
                scopeOff = () => scope.removeEventListener('abort', cancel);
            }
            else
                scopeOff = () => { };
            visibilityOff();
            visibilityOff = on ? listen(doc, ['visibilitychange'], () => {
                void transition().catch(() => { });
            }) : () => { };
            return transition();
        }),
        setFullscreen: fullscreen, immersive: fullscreen,
        statusBar: { show: unsupported, hide: unsupported, style: unsupported },
        brightness: { get: async () => undefined, set: unsupported },
    });
}

import { SDKError } from './error.js';
import { createInsecureWebSecureStore } from './storage/web-secure-store.js';
import { createWebBlobStore } from './storage/web-blob-store.js';
export function webRuntime(options = {}) {
    const document = options.document ?? globalThis.document;
    const window = options.window ?? globalThis.window;
    const navigator = options.navigator ?? globalThis.navigator;
    return {
        id: 'web',
        ready: async () => { },
        secureStore: createInsecureWebSecureStore(),
        blobStore: createWebBlobStore(),
        createStorage: (namespace) => ({
            secureStore: createInsecureWebSecureStore(namespace === undefined ? {}
                : { dbName: `${namespace}secure` }),
            blobStore: createWebBlobStore(namespace === undefined ? {}
                : { dbName: `${namespace}blobs` }),
        }),
        lifecycle: {
            get hidden() { return document?.visibilityState === 'hidden'; },
            on(event, handler) {
                const visibility = event === 'pause' || event === 'resume';
                const target = visibility ? document : window;
                if (typeof target?.addEventListener !== 'function' || event === 'back')
                    return () => { };
                const name = visibility ? 'visibilitychange' : event;
                const listener = () => {
                    if (!visibility || document?.visibilityState === (event === 'pause' ? 'hidden' : 'visible')) {
                        handler();
                    }
                };
                target.addEventListener(name, listener);
                return () => target.removeEventListener(name, listener);
            },
        },
        device: {
            info: () => Object.freeze({ platform: 'web',
                ...(navigator?.userAgent ? { userAgent: navigator.userAgent } : {}),
                ...(navigator?.language ? { language: navigator.language } : {}),
                ...(navigator?.onLine === undefined ? {} : { online: navigator.onLine }),
            }),
            vendorId: async () => undefined,
        },
        plugins: { has: () => false, get: () => undefined },
        openUrl: async (url, mode) => {
            let parsed;
            try {
                parsed = new URL(url);
            }
            catch {
                throw new SDKError('VALIDATION_FAILED');
            }
            if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password
                || !['system', 'inapp'].includes(mode))
                throw new SDKError('VALIDATION_FAILED');
            if (!window)
                throw new SDKError('SDK_PLATFORM_UNSUPPORTED');
            try {
                if (!window.open)
                    throw new SDKError('SDK_PLATFORM_UNSUPPORTED');
                window.open(parsed.href, '_blank', 'noopener,noreferrer');
            }
            catch {
                throw new SDKError('SDK_PLATFORM_UNSUPPORTED');
            }
        },
    };
}

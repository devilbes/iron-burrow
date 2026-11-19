import { listen } from './web-device-events.js';
import { browserError, httpUrl, unsupported } from './web-device-permissions.js';
import { SDKError } from './error.js';
export function webActions({ navigator: nav, window: win, document: doc, storeUrl }, images, signal) {
    const initial = win?.location?.href;
    let referrer;
    let warm = false;
    let watchingPage = false;
    const appState = () => {
        if (!doc)
            return undefined;
        if (!watchingPage && !signal.aborted) {
            watchingPage = true;
            const restored = (event) => {
                if (Reflect.get(event, 'persisted') === true)
                    warm = true;
            };
            win?.addEventListener('pageshow', restored);
            signal.addEventListener('abort', () => win?.removeEventListener('pageshow', restored), { once: true });
        }
        return Object.freeze({ visibility: doc.visibilityState === 'hidden'
                ? 'background' : 'foreground',
            start: warm ? 'warm' : 'cold' });
    };
    try {
        referrer = initial ? new URL(initial).searchParams.get('ref') ?? undefined : undefined;
    }
    catch { }
    const openStore = async () => {
        if (!storeUrl || !win?.open)
            return unsupported();
        const url = httpUrl(storeUrl);
        try {
            win.open(url, '_blank', 'noopener,noreferrer');
        }
        catch {
            return unsupported();
        }
    };
    const share = Object.assign(async (data) => {
        if (data.text !== undefined && (typeof data.text !== 'string' || data.text.length > 100000)) {
            throw new SDKError('VALIDATION_FAILED');
        }
        const payload = {
            ...(data.text === undefined ? {} : { text: data.text }),
            ...(data.url === undefined ? {} : { url: httpUrl(data.url) }),
        };
        if (data.image) {
            const blob = images.get(data.image.uri);
            if (!blob || blob.type !== data.image.mimeType)
                throw new SDKError('VALIDATION_FAILED');
            payload.files = [new File([blob], 'image', { type: blob.type })];
        }
        if (!nav?.share)
            return unsupported();
        try {
            if (nav.canShare && !nav.canShare(payload))
                return unsupported();
            await nav.share(payload);
        }
        catch (error) {
            if (error && typeof error === 'object' && Reflect.get(error, 'name') === 'AbortError')
                return;
            throw browserError(error);
        }
    }, { isSupported: () => typeof nav?.share === 'function' });
    return {
        share,
        clipboard: { isSupported: (operation) => operation === 'read'
                ? typeof nav?.clipboard?.readText === 'function' : operation === 'write'
                ? typeof nav?.clipboard?.writeText === 'function'
                : typeof nav?.clipboard?.readText === 'function'
                    || typeof nav?.clipboard?.writeText === 'function',
            async write(text) {
                if (typeof text !== 'string' || text.length > 100000)
                    throw new SDKError('VALIDATION_FAILED');
                if (!nav?.clipboard?.writeText)
                    return unsupported();
                try {
                    await nav.clipboard.writeText(text);
                }
                catch (error) {
                    throw browserError(error);
                }
            },
            async read() {
                if (!nav?.clipboard?.readText)
                    return undefined;
                try {
                    return await nav.clipboard.readText();
                }
                catch (error) {
                    throw browserError(error);
                }
            },
        },
        tracking: { isSupported: () => false, status: () => 'unavailable',
            request: async () => 'unavailable' }, advertisingId: async () => null,
        store: { isSupported: () => !!storeUrl && typeof win?.open === 'function',
            openPage: openStore, rateApp: openStore, checkUpdate: async () => undefined },
        links: { isSupported: () => !!win?.location,
            initial: () => initial,
            installReferrer: async () => referrer,
            onOpen: (handler) => listen(win, ['popstate', 'hashchange'], () => {
                if (win?.location?.href)
                    handler(win.location.href);
            }),
        },
        app: { isSupported: () => !!doc,
            state: appState,
            onBack: (handler) => listen(win, ['popstate'], handler),
            exit: async () => unsupported(),
            async restart() {
                if (!win?.location?.reload)
                    return unsupported();
                try {
                    win.location.reload();
                }
                catch {
                    return unsupported();
                }
            },
        },
        audio: { isSupported: () => !!nav?.audioSession, state: () => undefined,
            onChange: () => () => { },
            async session(mode) {
                if (mode !== 'ambient' && mode !== 'playback')
                    throw new SDKError('VALIDATION_FAILED');
                if (!nav?.audioSession)
                    return unsupported();
                try {
                    nav.audioSession.type = mode;
                }
                catch (error) {
                    throw browserError(error);
                }
            },
        },
    };
}

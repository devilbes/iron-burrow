export { parseOAuthConfigResponse, parseProviderConfig } from './endpoints.js';
import { randomUuid } from './context.js';
import { SDKError } from './error.js';
export function reserveFacebookPopup() {
    if (typeof window === 'undefined')
        return undefined;
    const popup = window.open('about:blank', '_blank', 'popup,width=600,height=700');
    if (!popup)
        throw unavailable();
    let closed = false;
    return {
        get closed() { return closed || popup.closed; },
        navigate(url) { popup.location.replace(url); },
        close() { if (!closed) {
            closed = true;
            popup.close();
        } },
    };
}
const invalid = () => new SDKError('SDK_AUTH_RESPONSE_INVALID', {
    module: 'auth', retryable: false
});
const unavailable = () => new SDKError('AUTH_PROVIDER_UNAVAILABLE', { module: 'auth' });
const object = (value) => (typeof value === 'object' && value !== null ? value : {});
const text = (value, limit = 1024) => typeof value === 'string' && value.length > 0 && value.length <= limit;
const https = (value) => {
    if (!text(value, 4096))
        return false;
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && !url.username && !url.password;
    }
    catch {
        return false;
    }
};
const opaque = (value) => typeof value === 'string'
    && (/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/.test(value) || /^[a-f0-9]{64}$/.test(value));
export function availableProviders(config, platform, adapters) {
    const result = [];
    if (platform !== 'ios' && config.google?.enabled && config.google?.webClientId
        && (platform !== 'android' || config.google?.androidClientId)
        && config.supportedPlatforms?.google?.includes(platform)
        && adapters.google?.platforms.includes(platform))
        result.push('google');
    if (platform === 'web' && config.facebook?.enabled && config.facebook?.appId
        && config.supportedPlatforms?.facebook?.includes('web')
        && (adapters.facebook || typeof window !== 'undefined'))
        result.push('facebook');
    return Object.freeze(result);
}
export async function completeProvider(options) {
    const { transport, config, provider, mode, platform, adapters, signal, now, live } = options;
    if (!availableProviders(config, platform, adapters).includes(provider))
        throw unavailable();
    const origin = new URL(options.api).origin;
    if (provider === 'google' && options.redirectUri !== undefined) {
        throw new SDKError('SDK_AUTH_INPUT_INVALID', { module: 'auth', retryable: false });
    }
    const callback = `${origin}/v1/auth/oauth/callback/facebook`;
    if (provider === 'facebook' && options.redirectUri !== undefined
        && options.redirectUri !== callback) {
        throw new SDKError('SDK_AUTH_INPUT_INVALID', { module: 'auth', retryable: false });
    }
    signal.throwIfAborted();
    live();
    const body = provider === 'google' ? { provider, mode }
        : { provider, mode,
            ...(options.redirectUri === undefined ? {} : { redirectUri: options.redirectUri }) };
    const cookies = provider === 'facebook' ? { credentials: 'include' } : {};
    const raw = object(await transport.request({ module: 'auth', method: 'POST',
        path: '/v1/auth/oauth/attempts', auth: 'required', body, idempotencyKey: randomUuid(), signal,
        ...cookies }));
    signal.throwIfAborted();
    live();
    const deadline = Math.min(now() + 300_000, Date.parse(String(raw.expiresAt)));
    if (raw.provider !== provider || !opaque(raw.attemptId) || !text(raw.expiresAt, 64)
        || !Number.isFinite(deadline) || deadline <= now())
        throw invalid();
    const completionKey = randomUuid();
    let popup = options.popup;
    let idToken;
    try {
        if (provider === 'google') {
            if (!opaque(raw.nonce) || raw.clientId !== config.google?.webClientId
                || (raw.androidClientId !== undefined
                    && raw.androidClientId !== config.google?.androidClientId)
                || (platform === 'android' && raw.androidClientId !== config.google?.androidClientId)
                || platform === 'ios')
                throw invalid();
            idToken = await abortable(signal, () => adapters.google.requestIdToken({
                nonce: raw.nonce, clientId: raw.clientId, platform,
                ...(raw.androidClientId === undefined ? {}
                    : { androidClientId: raw.androidClientId }),
                signal
            })).catch((error) => {
                if (signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
                    throw new DOMException('Auth operation cancelled', 'AbortError');
                }
                throw unavailable();
            });
            if (!text(idToken, 8192))
                throw invalid();
        }
        else {
            const start = `${origin}/v1/auth/oauth/start/${raw.attemptId}`;
            if (raw.authorizationUrl !== start || !https(raw.redirectUri)
                || raw.redirectUri !== callback)
                throw invalid();
            if (options.popup)
                options.popup.navigate(start);
            else
                popup = adapters.facebook ? adapters.facebook.open(start) : openPopup(start);
        }
        const complete = idToken === undefined
            ? { attemptId: raw.attemptId } : { attemptId: raw.attemptId, idToken };
        while (true) {
            signal.throwIfAborted();
            live();
            const remaining = deadline - now();
            if (remaining <= 0)
                throw new SDKError('AUTH_PROVIDER_TOKEN_INVALID', { module: 'auth', retryable: false });
            const started = now();
            const value = await transport.request({ module: 'auth', method: 'POST',
                path: '/v1/auth/oauth/complete', auth: 'required', body: complete,
                idempotencyKey: completionKey, signal, timeoutMs: Math.min(10_000, remaining),
                ...cookies });
            signal.throwIfAborted();
            live();
            if (object(value).pending !== true)
                return value;
            if (provider !== 'facebook')
                throw invalid();
            if (popup?.closed)
                throw new DOMException('Auth operation cancelled', 'AbortError');
            const delay = Math.max(0, 1000 - (now() - started));
            await abortableDelay(Math.min(delay, Math.max(0, deadline - now())), signal);
        }
    }
    finally {
        popup?.close();
    }
}
function openPopup(url) {
    const popup = window.open(url, '_blank', 'popup,width=600,height=700');
    if (!popup)
        throw unavailable();
    return popup;
}
export function abortable(signal, run) {
    signal.throwIfAborted();
    return new Promise((resolve, reject) => {
        const abort = () => {
            signal.removeEventListener('abort', abort);
            reject(new DOMException('Auth operation cancelled', 'AbortError'));
        };
        signal.addEventListener('abort', abort, { once: true });
        void Promise.resolve().then(() => { signal.throwIfAborted(); return run(); })
            .then(resolve, reject).finally(() => {
            signal.removeEventListener('abort', abort);
        });
    });
}
function abortableDelay(ms, signal) {
    signal.throwIfAborted();
    return new Promise((resolve, reject) => {
        const finish = () => { signal.removeEventListener('abort', abort); resolve(); };
        const timer = setTimeout(finish, ms);
        const abort = () => {
            clearTimeout(timer);
            signal.removeEventListener('abort', abort);
            reject(new DOMException('Auth operation cancelled', 'AbortError'));
        };
        signal.addEventListener('abort', abort, { once: true });
    });
}

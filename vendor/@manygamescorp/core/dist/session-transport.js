import { SDKError } from './error.js';
import { randomUuid } from './context.js';
export const SESSION_TRANSPORT = 'session.transport@1';
export function createSessionChannel(options) {
    const active = (signal = options.signal) => {
        options.signal.throwIfAborted();
        signal.throwIfAborted();
    };
    const url = (path) => {
        if (!/^\/[a-zA-Z0-9_/-]*$/.test(path) || path.includes('//') || path.includes('..')) {
            throw new SDKError('SDK_PERMISSION_DENIED');
        }
        return new URL(options.baseUrl + path);
    };
    const credential = () => {
        active();
        const token = options.token();
        if (!token)
            throw new SDKError('UNAUTHORIZED');
        return token;
    };
    const renew = async () => { active(); await options.renew?.(); active(); };
    const channel = {
        signal: options.signal,
        baseUrl: options.baseUrl,
        supports(feature) {
            active();
            if (feature === 'socket')
                return typeof globalThis.WebSocket === 'function';
            if (typeof globalThis.ReadableStream !== 'function')
                return false;
            const resources = globalThis.performance?.getEntriesByType('resource') ?? [];
            return !resources.some((entry) => {
                const resource = entry;
                try {
                    return new URL(resource.name).origin === new URL(options.baseUrl).origin
                        && ['http/1.0', 'http/1.1'].includes(resource.nextHopProtocol);
                }
                catch {
                    return false;
                }
            });
        },
        async deviceId() { active(); const value = await options.deviceId(); active(); return value; },
        renew,
        async request(path, spec) {
            active(spec.signal);
            const target = url(path);
            const token = credential();
            const headers = new Headers(spec.headers);
            for (const key of ['authorization', 'cookie', 'host', 'connection', 'content-length',
                'forwarded', 'x-forwarded-host', 'x-forwarded-proto', 'x-app-id', 'x-req-id']) {
                if (headers.has(key))
                    throw new SDKError('SDK_PERMISSION_DENIED');
            }
            headers.set('Authorization', `Bearer ${token}`);
            headers.set('X-Req-Id', randomUuid());
            if (options.appId !== undefined)
                headers.set('X-App-Id', String(options.appId));
            if (spec.body !== undefined)
                headers.set('Content-Type', 'application/json');
            const timeout = spec.timeoutMs === null ? undefined : spec.timeoutMs ?? 35_000;
            if (timeout !== undefined && (!Number.isSafeInteger(timeout)
                || timeout < 1 || timeout > 2_147_483_647)) {
                throw new SDKError('VALIDATION_FAILED');
            }
            const signal = AbortSignal.any([options.signal, spec.signal,
                ...(timeout === undefined ? [] : [AbortSignal.timeout(timeout)])]);
            let body = spec.body;
            if (spec.credentialPath) {
                if (!spec.credentialPath.length || spec.credentialPath.length > 16) {
                    throw new SDKError('VALIDATION_FAILED');
                }
                body = structuredClone(body);
                let target = body;
                for (const [index, key] of spec.credentialPath.entries()) {
                    if (['__proto__', 'constructor', 'prototype'].includes(String(key))
                        || typeof target !== 'object' || target === null)
                        throw new SDKError('VALIDATION_FAILED');
                    const record = target;
                    if (index === spec.credentialPath.length - 1)
                        record[key] = token;
                    else if (Object.hasOwn(record, key))
                        target = record[key];
                    else
                        throw new SDKError('VALIDATION_FAILED');
                }
            }
            const response = await (options.fetch ?? globalThis.fetch.bind(globalThis))(target.href, {
                method: spec.body === undefined ? 'GET' : 'POST', headers, credentials: 'omit',
                redirect: 'error', cache: 'no-store', signal,
                ...(spec.body === undefined ? {} : { body: JSON.stringify(body) }),
            });
            try {
                active(signal);
            }
            catch (error) {
                void response.body?.cancel().catch(() => { });
                throw error;
            }
            if (response.status === 401)
                options.unauthorized(token);
            return response;
        },
        socket(path, protocol, hello, caller, handlers) {
            active(caller);
            const target = url(path);
            target.protocol = target.protocol === 'https:' ? 'wss:' : 'ws:';
            const lifetime = new AbortController();
            const signal = AbortSignal.any([options.signal, caller, lifetime.signal]);
            const socket = new WebSocket(target, protocol);
            let ended = false;
            const close = () => {
                if (ended)
                    return;
                ended = true;
                lifetime.abort();
                signal.removeEventListener('abort', close);
                socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null;
                socket.close();
            };
            signal.addEventListener('abort', close, { once: true });
            const owned = () => { active(signal); if (ended)
                throw new SDKError('MODULE_NOT_ACTIVE'); };
            const proxy = {
                send(frame) { owned(); socket.send(JSON.stringify(frame)); },
                async authenticate(frame) {
                    owned();
                    const value = structuredClone(frame);
                    await renew();
                    owned();
                    socket.send(JSON.stringify({ ...value, token: credential() }));
                },
                close,
            };
            socket.onopen = () => {
                try {
                    owned();
                    socket.send(JSON.stringify({ ...structuredClone(hello), token: credential() }));
                    handlers.open(Object.freeze(proxy));
                }
                catch {
                    close();
                    handlers.close();
                }
            };
            socket.onmessage = event => { if (!signal.aborted && !ended)
                handlers.message(event.data); };
            socket.onerror = () => { if (!ended) {
                close();
                handlers.close();
            } };
            socket.onclose = event => { if (!ended) {
                close();
                handlers.close(event.code);
            } };
            if (signal.aborted)
                close();
            return proxy;
        },
    };
    return Object.freeze(channel);
}

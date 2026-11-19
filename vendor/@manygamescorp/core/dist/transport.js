import { diagnosticPath } from './diagnostic-path.js';
import { responseError } from './response-error.js';
import { randomUuid } from './context.js';
import { SDKError } from './error.js';
import { isSecretKey } from './secret-keys.js';
export function isIdempotencyKey(value) {
    return typeof value === 'string'
        && /^[\da-f]{8}-[\da-f]{4}-[47][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(value);
}
export function createReliableHttpTransport(options) {
    const maxRetries = options.retry?.maxRetries ?? 2;
    if (!Number.isInteger(maxRetries) || maxRetries < 0 || maxRetries > 10) {
        throw new TypeError('Invalid HTTP retry count');
    }
    const baseDelay = validTimeout(options.retry?.baseDelayMs ?? 250);
    const maxDelay = validTimeout(options.retry?.maxDelayMs ?? 5_000);
    if (baseDelay > maxDelay)
        throw new TypeError('Invalid HTTP retry delays');
    const threshold = validTimeout(options.breaker?.failureThreshold ?? 5);
    const resetTimeout = validTimeout(options.breaker?.resetTimeoutMs ?? 30_000);
    const duration = validTimeout(options.timeoutMs ?? 10_000);
    const online = options.online ?? (() => globalThis.navigator?.onLine !== false);
    const events = options.onlineEvents ?? globalThis;
    const origins = httpOrigins(options.endpoints);
    const attempt = createHttpTransport(options);
    const circuits = new Map();
    function circuitFor(module) {
        let circuit = circuits.get(module);
        if (!circuit) {
            if (typeof origins === 'string' && circuits.size >= 256) {
                throw new SDKError('SDK_TRANSPORT_CIRCUIT_OPEN', { module, retryable: false });
            }
            circuit = { failures: 0, until: 0, probe: false, epoch: 0 };
            circuits.set(module, circuit);
        }
        return circuit;
    }
    return {
        async request(input) {
            requestUrl(origins, input);
            credentialsMode(input);
            const timeout = validTimeout(input.timeoutMs ?? duration);
            validResponseLimit(input.maxResponseBytes ?? options.maxResponseBytes ?? 1_048_576);
            if (input.body !== undefined && ['GET', 'HEAD'].includes(input.method)) {
                throw new TypeError('HTTP GET/HEAD cannot have a body');
            }
            const key = idempotencyKey(input);
            const safe = ['GET', 'HEAD', 'PUT', 'DELETE'].includes(input.method) || key !== undefined;
            const spec = {
                ...input,
                ...(input.query === undefined ? {} : { query: { ...input.query } }),
                ...(input.body === undefined ? {} : {
                    body: JSON.parse(JSON.stringify(input.body)),
                }),
                ...(key === undefined ? {} : { idempotencyKey: key }),
            };
            const scope = spec.auth === 'none' ? undefined : options.authScope();
            const check = () => {
                if (spec.auth !== 'none' && options.authScope() !== scope)
                    throw cancelled();
            };
            const controller = new AbortController();
            const abort = () => controller.abort();
            input.signal?.addEventListener('abort', abort, { once: true });
            if (input.signal?.aborted)
                abort();
            let timedOut = false;
            const deadline = performance.now() + timeout;
            const timer = setTimeout(() => { timedOut = true; abort(); }, timeout);
            let retries = 0;
            try {
                return await withAbort(controller.signal, async () => {
                    for (;;) {
                        controller.signal.throwIfAborted();
                        check();
                        if (!online()) {
                            if (!safe)
                                throw new SDKError('OFFLINE', { module: spec.module });
                            await waitOnline(events, online, controller.signal);
                            check();
                        }
                        const circuit = circuitFor(spec.module);
                        const probe = circuit.until !== 0;
                        if (probe && (performance.now() < circuit.until || circuit.probe)) {
                            throw new SDKError('SDK_TRANSPORT_CIRCUIT_OPEN', { module: spec.module, retryable: false });
                        }
                        if (probe)
                            circuit.probe = true;
                        const epoch = circuit.epoch;
                        let failure;
                        try {
                            const scopedAttempt = options.token && spec.auth !== 'none'
                                ? createHttpTransport({ ...options, token: () => {
                                        check();
                                        const token = options.token();
                                        check();
                                        return token;
                                    } }) : attempt;
                            const result = await scopedAttempt.request({
                                ...spec, signal: controller.signal,
                            });
                            check();
                            if (epoch === circuit.epoch) {
                                circuit.failures = 0;
                                if (probe) {
                                    circuit.until = 0;
                                    circuit.epoch++;
                                }
                            }
                            return result;
                        }
                        catch (error) {
                            failure = error;
                            const transient = timedOut || (error instanceof SDKError
                                && (['NETWORK_ERROR', 'TIMEOUT'].includes(error.code)
                                    || (error.httpStatus !== undefined && error.httpStatus >= 500)));
                            if (epoch === circuit.epoch) {
                                if (transient && (probe || ++circuit.failures >= threshold)) {
                                    circuit.until = performance.now() + resetTimeout;
                                    circuit.epoch++;
                                }
                                else if (!transient && error instanceof SDKError
                                    && error.httpStatus !== undefined) {
                                    circuit.failures = 0;
                                    if (probe) {
                                        circuit.until = 0;
                                        circuit.epoch++;
                                    }
                                }
                            }
                        }
                        finally {
                            if (probe)
                                circuit.probe = false;
                        }
                        controller.signal.throwIfAborted();
                        check();
                        if (!(failure instanceof SDKError))
                            throw failure;
                        if (failure.httpStatus === 401)
                            throw failure;
                        if (safe && failure.code === 'OFFLINE') {
                            await waitOnline(events, online, controller.signal);
                            continue;
                        }
                        if (!safe || !failure.retryable || retries >= maxRetries
                            || (failure.code === 'IDEMPOTENCY_IN_PROGRESS' && key === undefined))
                            throw failure;
                        const cap = Math.min(maxDelay, baseDelay * 2 ** retries++);
                        const delay = Math.max(failure.retryAfterMs ?? 0, Math.floor(Math.random() * cap));
                        if (delay >= deadline - performance.now())
                            throw failure;
                        await waitDelay(delay, controller.signal);
                    }
                });
            }
            catch (error) {
                if (controller.signal.aborted) {
                    if (timedOut)
                        throw new SDKError('TIMEOUT', { module: spec.module });
                    throw cancelled();
                }
                throw error;
            }
            finally {
                clearTimeout(timer);
                input.signal?.removeEventListener('abort', abort);
            }
        },
    };
}
function waitDelay(ms, signal) {
    return new Promise((resolve, reject) => {
        const abort = () => {
            clearTimeout(timer);
            signal.removeEventListener('abort', abort);
            reject(cancelled());
        };
        const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
        signal.addEventListener('abort', abort, { once: true });
        if (signal.aborted)
            abort();
    });
}
function waitOnline(events, online, signal) {
    return new Promise((resolve, reject) => {
        const cleanup = () => {
            events.removeEventListener?.('online', changed);
            signal.removeEventListener('abort', abort);
        };
        const changed = () => { if (online()) {
            cleanup();
            resolve();
        } };
        const abort = () => { cleanup(); reject(cancelled()); };
        events.addEventListener?.('online', changed);
        signal.addEventListener('abort', abort, { once: true });
        if (signal.aborted)
            abort();
        else
            changed();
    });
}
export function createHttpTransport(options) {
    const origins = httpOrigins(options.endpoints);
    const timeoutMs = validTimeout(options.timeoutMs ?? 10_000);
    const maxResponseBytes = validResponseLimit(options.maxResponseBytes ?? 1_048_576);
    const metadata = new Headers();
    const appId = options.appId !== undefined ? options.appId : (Object.hasOwn(options.endpoints, 'api')
        ? options.endpoints.appId : undefined);
    if (appId !== undefined) {
        if (!Number.isSafeInteger(appId) || appId < 1)
            throw new TypeError('Invalid HTTP application ID');
        metadata.set('X-App-Id', String(appId));
    }
    if (options.appVersion !== undefined)
        metadata.set('X-App-V', options.appVersion);
    if (options.os !== undefined)
        metadata.set('X-OS', String(options.os));
    if (options.region !== undefined)
        metadata.set('X-Region', options.region);
    if (options.sdkContext !== undefined) {
        for (const [key, value] of Object.entries(options.sdkContext)) {
            if (isSecretKey(key) || /^(idfa|gaid|idfv|ssaid|aid)$/i.test(key)
                || !['string', 'number', 'boolean'].includes(typeof value)) {
                throw new TypeError('Invalid SDK context');
            }
        }
        const context = JSON.stringify(options.sdkContext);
        if (context.length > 4096)
            throw new TypeError('SDK context is too large');
        metadata.set('X-SDK-Context', context);
    }
    const fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
    const online = options.online ?? (() => globalThis.navigator?.onLine !== false);
    return {
        async request(spec) {
            const duration = validTimeout(spec.timeoutMs ?? timeoutMs);
            const byteLimit = validResponseLimit(spec.maxResponseBytes ?? maxResponseBytes);
            const url = requestUrl(origins, spec);
            const key = idempotencyKey(spec);
            if (spec.body !== undefined && ['GET', 'HEAD'].includes(spec.method)) {
                throw new TypeError('HTTP GET/HEAD cannot have a body');
            }
            const cookies = credentialsMode(spec);
            if (spec.signal?.aborted)
                throw cancelled();
            const rid = spec.rid ?? key ?? randomUuid();
            if (!online())
                throw new SDKError('OFFLINE', { rid, module: spec.module });
            const headers = new Headers(metadata);
            headers.set('Content-Type', 'application/json');
            headers.set('X-Req-Id', rid);
            const rtSession = options.realtimeSession?.();
            if (rtSession && spec.module === 'realtime' && spec.auth !== 'none')
                headers.set('X-Rt-Session', rtSession);
            let token;
            if (spec.auth !== 'none') {
                token = options.token?.();
                if (token) {
                    if (decodeURIComponent(url.href).includes(token)) {
                        throw new TypeError('Credentials are not allowed in request URLs');
                    }
                    headers.set('Authorization', `Bearer ${token}`);
                }
            }
            if (key !== undefined)
                headers.set('Idempotency-Key', key);
            if (spec.ifMatch !== undefined)
                headers.set('If-Match', spec.ifMatch);
            if (spec.ifNoneMatch !== undefined)
                headers.set('If-None-Match', spec.ifNoneMatch);
            const body = spec.body === undefined ? undefined : JSON.stringify(spec.body);
            const logger = options.logger?.with({
                ...spec.context, rid, moduleId: spec.module,
                ...(spec.context === undefined ? {} : { parentRid: spec.context.rid }),
            });
            const controller = new AbortController();
            const abort = () => controller.abort();
            spec.signal?.addEventListener('abort', abort, { once: true });
            if (spec.signal?.aborted)
                abort();
            let timedOut = false;
            let responseLimitError;
            const diagnosticStart = performance.now();
            let diagnosticStatus = 0;
            let diagnosticError;
            const timer = setTimeout(() => {
                if (controller.signal.aborted)
                    return;
                timedOut = true;
                abort();
            }, duration);
            try {
                logger?.debug('HTTP request', { method: spec.method });
                return await withAbort(controller.signal, async () => {
                    let response;
                    let text;
                    const sentAt = Date.now();
                    try {
                        response = await fetcher(url.href, {
                            method: spec.method,
                            headers,
                            ...(body === undefined ? {} : { body }),
                            signal: controller.signal,
                            credentials: cookies,
                            cache: 'no-store',
                            redirect: 'error',
                            referrerPolicy: 'no-referrer',
                        });
                        diagnosticStatus = response.status;
                        const cached = Number(response.headers.get('Age')) > 0
                            || response.headers.get('CF-Cache-Status')?.trim().toUpperCase() === 'HIT';
                        if (!cached) {
                            options.clock?.sample(response.headers.get('X-Server-Time'), sentAt, Date.now());
                        }
                        controller.signal.throwIfAborted();
                        text = spec.method === 'HEAD' ? '' : await readResponse(response, byteLimit, controller.signal, () => {
                            responseLimitError = new SDKError('TRANSPORT_RESPONSE_TOO_LARGE', {
                                rid, module: spec.module, httpStatus: response.status, retryable: false,
                            });
                            abort();
                            throw responseLimitError;
                        });
                        controller.signal.throwIfAborted();
                    }
                    catch {
                        controller.signal.throwIfAborted();
                        throw new SDKError(online() ? 'NETWORK_ERROR' : 'OFFLINE', {
                            rid, module: spec.module,
                        });
                    }
                    logger?.debug('HTTP response', { httpStatus: response.status });
                    spec.onResponse?.({ status: response.status, etag: response.headers.get('ETag') });
                    if (response.status === 401 && token) {
                        try {
                            options.onUnauthorized?.(token);
                        }
                        catch { }
                    }
                    if (response.status === 304 && spec.acceptNotModified && spec.ifNoneMatch) {
                        return undefined;
                    }
                    if (response.ok && (spec.method === 'HEAD' || [204, 205].includes(response.status))) {
                        return undefined;
                    }
                    let data;
                    try {
                        data = JSON.parse(text);
                    }
                    catch { }
                    if (!response.ok || data === undefined) {
                        throw responseError(response.status, data, rid, {
                            module: spec.module,
                            retryAfterMs: retryAfter(response.headers.get('Retry-After'), options.clock),
                        });
                    }
                    return data;
                });
            }
            catch (error) {
                diagnosticError = responseLimitError?.code ?? (timedOut ? 'TIMEOUT'
                    : controller.signal.aborted ? 'SDK_MODULE_CANCELLED'
                        : error instanceof SDKError ? error.code : 'NETWORK_ERROR');
                if (responseLimitError)
                    throw responseLimitError;
                if (controller.signal.aborted) {
                    if (timedOut)
                        throw new SDKError('TIMEOUT', { rid, module: spec.module });
                    throw cancelled();
                }
                throw error;
            }
            finally {
                clearTimeout(timer);
                spec.signal?.removeEventListener('abort', abort);
                try {
                    options.onDiagnostic?.({ method: spec.method, path: diagnosticPath(spec.path),
                        status: diagnosticStatus, durationMs: Math.max(0, performance.now() - diagnosticStart),
                        rid, ...(diagnosticError === undefined ? {} : { errorCode: diagnosticError }) });
                }
                catch { }
            }
        },
    };
}
function httpOrigins(source) {
    const runtime = Object.hasOwn(source, 'api') && Object.hasOwn(source, 'cdn');
    const entries = runtime ? [['api', source.api]] : Object.entries(source);
    const origins = new Map(entries.map(([module, base]) => {
        const url = new URL(base);
        if (!(url.protocol === 'https:' || (url.protocol === 'http:' && isLoopback(url.hostname)))
            || url.username || url.password
            || url.search || url.hash || !['', '/'].includes(url.pathname)) {
            throw new TypeError('Invalid HTTP endpoint');
        }
        return [module, url.origin];
    }));
    if (new Set(origins.values()).size !== 1)
        throw new TypeError('Expected one API origin');
    return runtime ? origins.get('api') : origins;
}
function idempotencyKey(spec) {
    if (spec.rid !== undefined && !isIdempotencyKey(spec.rid)) {
        throw new SDKError('VALIDATION_FAILED', { module: spec.module, message: 'Invalid action id' });
    }
    if (spec.idempotencyKey !== undefined && !isIdempotencyKey(spec.idempotencyKey)) {
        throw new SDKError('VALIDATION_FAILED', { module: spec.module,
            message: 'Invalid HTTP idempotency key' });
    }
    return spec.idempotencyKey ?? (spec.idempotent ? randomUuid() : undefined);
}
const COOKIE_PATHS = ['/v1/auth/oauth/attempts', '/v1/auth/oauth/complete'];
function credentialsMode(spec) {
    if (spec.credentials === undefined)
        return 'omit';
    if (spec.credentials !== 'include' || spec.module !== 'auth' || spec.method !== 'POST'
        || !COOKIE_PATHS.includes(spec.path)) {
        throw new TypeError('HTTP credentials are not allowed for this request');
    }
    return 'include';
}
function isLoopback(host) {
    return host === 'localhost' || host === '[::1]' || /^127\.\d+\.\d+\.\d+$/.test(host);
}
function validResponseLimit(value) {
    if (!Number.isSafeInteger(value) || value < 1) {
        throw new TypeError('Invalid HTTP response byte limit');
    }
    return value;
}
async function readResponse(response, limit, signal, tooLarge) {
    const length = response.headers.get('Content-Length');
    if (length !== null && /^\d+$/.test(length) && Number(length) > limit) {
        void response.body?.cancel().catch(() => undefined);
        tooLarge();
    }
    if (!response.body)
        return '';
    const reader = response.body.getReader();
    const cancel = () => { void reader.cancel().catch(() => undefined); };
    signal.addEventListener('abort', cancel, { once: true });
    let buffer = new Uint8Array(0);
    let bytes = 0;
    try {
        for (;;) {
            signal.throwIfAborted();
            const chunk = await reader.read();
            signal.throwIfAborted();
            if (chunk.done)
                break;
            const offset = bytes;
            bytes += chunk.value.byteLength;
            if (bytes > limit)
                tooLarge();
            if (bytes > buffer.byteLength) {
                const grown = new Uint8Array(Math.min(limit, Math.max(bytes, buffer.byteLength * 2, 4096)));
                grown.set(buffer);
                buffer = grown;
            }
            buffer.set(chunk.value, offset);
        }
        return new TextDecoder().decode(buffer.subarray(0, bytes));
    }
    finally {
        signal.removeEventListener('abort', cancel);
        reader.releaseLock();
    }
}
function validTimeout(value) {
    if (!Number.isInteger(value) || value < 1 || value > 2_147_483_647) {
        throw new TypeError('Invalid HTTP timeout');
    }
    return value;
}
function requestUrl(endpoints, spec) {
    const base = typeof endpoints === 'string' ? endpoints : endpoints.get(spec.module);
    if (!base)
        throw new TypeError('Unknown HTTP module');
    if (!/^\/v1\/[^?#\\\s]+$/.test(spec.path))
        throw new TypeError('Invalid client path');
    for (const part of spec.path.split('/').slice(2)) {
        let decoded;
        try {
            decoded = decodeURIComponent(part);
        }
        catch {
            throw new TypeError('Invalid client path');
        }
        if (!decoded || ['.', '..'].includes(decoded) || /[%/\\?#\s]/.test(decoded)
            || decoded.includes('\u0000')) {
            throw new TypeError('Invalid client path');
        }
    }
    const url = new URL(spec.path, base);
    for (const [key, value] of Object.entries(spec.query ?? {})) {
        if (isSecretKey(key))
            throw new TypeError('Credentials are not allowed in request URLs');
        if (value !== undefined)
            url.searchParams.set(key, String(value));
    }
    return url;
}
function retryAfter(value, clock) {
    if (value === null)
        return undefined;
    const ms = /^\d+$/.test(value) ? Number(value) * 1000
        : (clock ? Date.parse(value) - clock.now() : NaN);
    return Number.isFinite(ms) && ms >= 0 ? Math.min(ms, 2_147_483_647) : undefined;
}
function cancelled() {
    return new DOMException('HTTP request cancelled', 'AbortError');
}
function withAbort(signal, run) {
    if (signal.aborted)
        return Promise.reject(cancelled());
    return new Promise((resolve, reject) => {
        const abort = () => reject(cancelled());
        signal.addEventListener('abort', abort, { once: true });
        void run().then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
    });
}

import { SDKError } from './error.js';
export { createFakeSecureStore, secureStoreContract } from './testing/secure-store.js';
export function configRecord(data, extra = {}) {
    return { data, priority: 0, conditionalsMode: 'merge', conditionals: [], version: 1, ...extra };
}
export function configRecords(configs) {
    return Object.fromEntries(Object.entries(configs).map(([scope, records]) => [scope,
        Object.fromEntries(Object.entries(records).map(([key, data]) => [key, configRecord(data)]))]));
}
function finiteNonNegative(value) {
    if (!Number.isFinite(value) || value < 0)
        throw new TypeError('Invalid test time');
}
export class FakeClock {
    time;
    nextId = 0;
    advancing = false;
    timers = new Map();
    constructor(startMs = 0) {
        finiteNonNegative(startMs);
        this.time = startMs;
    }
    now = () => this.time;
    get pendingTimers() { return this.timers.size; }
    setTimeout = (callback, delayMs) => {
        finiteNonNegative(delayMs);
        finiteNonNegative(this.time + delayMs);
        const id = ++this.nextId;
        this.timers.set(id, { at: this.time + delayMs, callback });
        return id;
    };
    clearTimeout = (id) => { this.timers.delete(id); };
    advanceBy(ms) {
        finiteNonNegative(ms);
        const target = this.time + ms;
        finiteNonNegative(target);
        if (this.advancing)
            throw new TypeError('FakeClock is already advancing');
        this.advancing = true;
        try {
            let executed = 0;
            for (;;) {
                let next;
                for (const [id, timer] of this.timers) {
                    if (timer.at <= target && (!next || timer.at < next.at))
                        next = { id, ...timer };
                }
                if (!next)
                    break;
                if (++executed > 10_000)
                    throw new Error('FakeClock timer limit exceeded');
                this.time = next.at;
                this.timers.delete(next.id);
                next.callback();
            }
            this.time = target;
        }
        finally {
            this.advancing = false;
        }
    }
    sleep(ms, signal) {
        return new Promise((resolve, reject) => {
            if (signal?.aborted) {
                reject(signal.reason);
                return;
            }
            const abort = () => {
                this.clearTimeout(id);
                signal?.removeEventListener('abort', abort);
                reject(signal?.reason);
            };
            const id = this.setTimeout(() => {
                signal?.removeEventListener('abort', abort);
                resolve();
            }, ms);
            signal?.addEventListener('abort', abort, { once: true });
        });
    }
}
export class FakeTransport {
    requests = [];
    scenarios;
    clock;
    constructor(options = {}) {
        this.scenarios = [...options.scenarios ?? []];
        this.clock = options.clock ?? {
            now: () => performance.now(),
            setTimeout: (callback, delay) => globalThis.setTimeout(callback, delay),
            clearTimeout: (id) => globalThis.clearTimeout(id),
        };
    }
    get pendingScenarios() { return this.scenarios.length; }
    enqueue(...scenarios) { this.scenarios.push(...scenarios); }
    async request(spec) {
        const recorded = {
            ...spec,
            ...(spec.body === undefined ? {} : { body: structuredClone(spec.body) }),
            ...(spec.query === undefined ? {} : { query: { ...spec.query } }),
            ...(spec.context === undefined ? {} : { context: { ...spec.context } }),
        };
        this.requests.push(recorded);
        if (spec.signal?.aborted)
            throw new DOMException('HTTP request cancelled', 'AbortError');
        if (spec.timeoutMs !== undefined)
            finiteNonNegative(spec.timeoutMs);
        const scenario = this.scenarios.shift();
        if (scenario === undefined)
            throw new Error('FakeTransport: no scenario for request');
        const controller = new AbortController();
        return new Promise((resolve, reject) => {
            let done = false;
            let delayTimer;
            let timeoutTimer;
            const finish = (run) => {
                if (done)
                    return;
                done = true;
                if (delayTimer !== undefined)
                    this.clock.clearTimeout(delayTimer);
                if (timeoutTimer !== undefined)
                    this.clock.clearTimeout(timeoutTimer);
                spec.signal?.removeEventListener('abort', abort);
                run();
            };
            const cancel = (code) => {
                finish(() => {
                    controller.abort();
                    reject(code === 'abort' ? new DOMException('HTTP request cancelled', 'AbortError') : new SDKError(code));
                });
            };
            const abort = () => cancel('abort');
            spec.signal?.addEventListener('abort', abort, { once: true });
            if (spec.timeoutMs !== undefined) {
                timeoutTimer = this.clock.setTimeout(() => cancel('TIMEOUT'), spec.timeoutMs);
            }
            const respond = (response) => {
                if (done)
                    return;
                try {
                    const delay = response.delayMs ?? 0;
                    finiteNonNegative(delay);
                    const deliver = () => finish(() => {
                        try {
                            if (response.error !== undefined) {
                                reject(response.error);
                                return;
                            }
                            recorded.onResponse?.({
                                status: response.status ?? 200, etag: response.etag ?? null,
                            });
                            resolve(structuredClone(response.body));
                        }
                        catch (error) {
                            reject(error);
                        }
                    });
                    if (delay === 0)
                        deliver();
                    else
                        delayTimer = this.clock.setTimeout(deliver, delay);
                }
                catch (error) {
                    finish(() => reject(error));
                }
            };
            try {
                const result = typeof scenario === 'function'
                    ? scenario({ ...recorded, signal: controller.signal }) : scenario;
                if (result instanceof Promise) {
                    void result.then(respond, (error) => finish(() => reject(error)));
                }
                else
                    respond(result);
            }
            catch (error) {
                finish(() => reject(error));
            }
        });
    }
}
export class FakeCdn {
    requests = [];
    imports = [];
    files = new Map();
    offline = false;
    put(url, file) {
        this.files.set(new URL(url).href, file);
        return this;
    }
    fetch = async (input, init) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        this.requests.push(init === undefined ? { url } : { url, init });
        init?.signal?.throwIfAborted();
        if (this.offline)
            throw new TypeError('Failed to fetch');
        const file = this.files.get(url);
        if (file?.redirect !== undefined) {
            if (init?.redirect === 'error')
                throw new TypeError('Failed to fetch: redirect');
            const response = new Response(JSON.stringify(this.files.get(file.redirect)?.json ?? null));
            Object.defineProperties(response, { url: { value: file.redirect },
                redirected: { value: true } });
            return response;
        }
        const response = file === undefined || file.json === undefined
            ? new Response('not found', { status: 404 })
            : new Response(JSON.stringify(file.json), { status: file.status ?? 200,
                headers: { 'Content-Type': 'application/json' } });
        Object.defineProperty(response, 'url', { value: url });
        return response;
    };
    import = async (url) => {
        this.imports.push(url);
        if (this.offline)
            throw new TypeError('Failed to fetch dynamically imported module');
        const file = this.files.get(url);
        if (file?.module === undefined) {
            throw new TypeError(`Failed to fetch dynamically imported module: ${url}`);
        }
        return file.module;
    };
}
function base64url(bytes) {
    return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export async function createTestJwtSigner(kid = crypto.randomUUID()) {
    if (typeof kid !== 'string' || kid.length === 0)
        throw new TypeError('Invalid test JWT kid');
    const pair = await crypto.subtle.generateKey('Ed25519', false, ['sign', 'verify']);
    const publicJwk = Object.freeze({
        ...await crypto.subtle.exportKey('jwk', pair.publicKey), kid, alg: 'EdDSA', use: 'sig',
    });
    const encoder = new TextEncoder();
    const header = base64url(encoder.encode(JSON.stringify({ alg: 'EdDSA', typ: 'JWT', kid })));
    return Object.freeze({
        publicJwk,
        async sign(claims) {
            const input = `${header}.${base64url(encoder.encode(JSON.stringify(claims)))}`;
            const signature = await crypto.subtle.sign('Ed25519', pair.privateKey, encoder.encode(input));
            return `${input}.${base64url(new Uint8Array(signature))}`;
        },
    });
}
export class FakeL10nSource {
    origin;
    requests = [];
    bundles;
    index;
    delayMs;
    fail = false;
    notModified = false;
    constructor(options = {}) {
        this.bundles = { ...options.bundles };
        this.index = options.index;
        this.origin = options.origin ?? 'network';
        this.delayMs = options.delayMs ?? 0;
    }
    load(request) {
        this.requests.push(request);
        const meta = { etag: `"${this.requests.length}"`, sha256: {}, version: {} };
        const respond = () => {
            if (this.fail)
                throw new Error('FakeL10nSource: offline');
            if (this.notModified)
                return { status: 'not-modified', meta };
            const bundles = {};
            for (const tag of request.chain) {
                const tree = this.bundles[tag];
                if (tree)
                    bundles[tag] = tree;
            }
            return this.index
                ? { status: 'updated', index: this.index, bundles, meta }
                : { status: 'updated', bundles, meta };
        };
        return new Promise((resolve, reject) => {
            const run = () => {
                try {
                    resolve(respond());
                }
                catch (error) {
                    reject(error);
                }
            };
            if (this.delayMs <= 0)
                return run();
            const timer = setTimeout(run, this.delayMs);
            request.signal.addEventListener('abort', () => {
                clearTimeout(timer);
                reject(new Error('aborted'));
            });
        });
    }
}

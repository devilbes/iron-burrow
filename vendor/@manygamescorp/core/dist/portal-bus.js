import { PortalBusError, PORTAL_RATE, parsePortalEnvelope, portalName, portalRecord, portalUuid, } from './portal-protocol.js';
export { PortalBusError } from './portal-protocol.js';
const MAX_RESOURCES = 128;
const timeoutValid = (value) => Number.isFinite(value)
    && value >= 0 && value <= 2 ** 31 - 1;
const schemaValue = (schema, value) => {
    try {
        const result = schema?.safeParse(value);
        if (result?.success)
            return result.data;
    }
    catch { }
    throw new PortalBusError('PAYLOAD_INVALID');
};
export class PortalBus {
    options;
    domains = new Map();
    selected = Object.freeze({});
    phase = 'new';
    nonce = '';
    offered = {};
    pending = new Map();
    active = new Map();
    remoteSubscriptions = new Map();
    localSubscriptions = new Map();
    listeners = new Map();
    seen = new Set();
    incoming = [];
    outgoing = [];
    handshake;
    finishHandshake;
    handshakeTimer;
    helloTimer;
    constructor(options) {
        if (!['host', 'game'].includes(options.role) || !['dev', 'test', 'prod'].includes(options.env)
            || !options.appCode || options.appCode.length > 200 || !options.sdkVersion
            || !timeoutValid(options.requestTimeoutMs)
            || !timeoutValid(options.handshakeTimeoutMs ?? options.requestTimeoutMs)
            || (options.handshakeTimeoutMs ?? options.requestTimeoutMs) === 0) {
            throw new PortalBusError('PAYLOAD_INVALID');
        }
        this.options = { ...options };
    }
    get capabilities() { return this.selected; }
    get status() { return this.phase; }
    register(domain) {
        if (this.phase !== 'new' || !portalName(domain.ns) || domain.ns === 'bus'
            || this.domains.has(domain.ns) || this.domains.size >= MAX_RESOURCES
            || !domain.versions.length || domain.versions.length > 16
            || domain.versions.some((v) => !Number.isSafeInteger(v) || v < 1)
            || Object.keys(domain.schemas).length > MAX_RESOURCES) {
            throw new PortalBusError('PAYLOAD_INVALID');
        }
        for (const [type, schema] of Object.entries(domain.schemas)) {
            if (!portalName(type) || typeof schema.safeParse !== 'function') {
                throw new PortalBusError('PAYLOAD_INVALID');
            }
        }
        for (const type of Object.keys(domain.handlers ?? {})) {
            if (!Object.hasOwn(domain.schemas, type) || typeof domain.handlers?.[type] !== 'function') {
                throw new PortalBusError('PAYLOAD_INVALID');
            }
        }
        for (const topic of domain.topics ?? []) {
            if (!Object.hasOwn(domain.schemas, topic))
                throw new PortalBusError('PAYLOAD_INVALID');
        }
        for (const [type, ms] of Object.entries(domain.timeouts ?? {})) {
            if (!Object.hasOwn(domain.schemas, type) || !timeoutValid(ms)) {
                throw new PortalBusError('PAYLOAD_INVALID');
            }
        }
        this.domains.set(domain.ns, Object.freeze({ ...domain,
            versions: [...new Set(domain.versions)], schemas: { ...domain.schemas },
            responseSchemas: { ...domain.responseSchemas }, handlers: { ...domain.handlers },
            topics: [...(domain.topics ?? [])], timeouts: { ...domain.timeouts },
        }));
    }
    start() {
        if (this.phase === 'closed')
            return Promise.reject(new PortalBusError('VERSION_MISMATCH'));
        if (this.handshake)
            return this.handshake;
        this.phase = 'handshake';
        this.handshake = new Promise((resolve) => { this.finishHandshake = resolve; });
        this.handshakeTimer = setTimeout(() => this.negotiated(null), this.options.handshakeTimeoutMs ?? this.options.requestTimeoutMs);
        if (this.options.role === 'host') {
            this.nonce = crypto.randomUUID();
            const hello = () => {
                try {
                    this.send('event', 'bus', 'hello', { busVersions: [1], channelNonce: this.nonce,
                        env: this.options.env, domains: this.advertise() });
                }
                catch {
                    this.reject('handshake_send');
                }
            };
            this.helloTimer = setInterval(hello, 500);
            hello();
        }
        return this.handshake;
    }
    request(ns, type, payload = {}) {
        return this.call('request', ns, type, payload);
    }
    on(ns, type, listener) {
        const domain = this.domain(ns, type);
        if (domain.topics?.includes(type))
            throw new PortalBusError('UNSUPPORTED_TYPE');
        const key = `${ns}:${type}`;
        const entries = this.listeners.get(key) ?? new Set();
        if (entries.size >= MAX_RESOURCES || this.listeners.size >= MAX_RESOURCES) {
            throw new PortalBusError('RATE_LIMITED', true);
        }
        entries.add(listener);
        this.listeners.set(key, entries);
        return () => { entries.delete(listener); if (!entries.size)
            this.listeners.delete(key); };
    }
    emit(ns, type, payload = {}) {
        const domain = this.domain(ns, type);
        this.ensureReady(ns);
        schemaValue(domain.schemas[type], payload);
        if (domain.topics?.includes(type) && ![...this.remoteSubscriptions.values()]
            .some((entry) => entry.ns === ns && entry.topic === type))
            return;
        this.send('event', ns, type, payload);
    }
    async subscribe(ns, topic, listener) {
        if (!this.domain(ns, topic).topics?.includes(topic)) {
            throw new PortalBusError('UNSUPPORTED_TYPE');
        }
        if (this.localSubscriptions.size >= MAX_RESOURCES)
            throw new PortalBusError('RATE_LIMITED');
        const id = crypto.randomUUID();
        this.localSubscriptions.set(id, { ns, topic, listener });
        try {
            const result = await this.call('subscribe', ns, topic, { topic }, id);
            if (!portalRecord(result) || result.subscriptionId !== id) {
                throw new PortalBusError('PAYLOAD_INVALID');
            }
        }
        catch (error) {
            this.localSubscriptions.delete(id);
            if (this.phase === 'ready') {
                void this.call('unsubscribe', ns, topic, { subscriptionId: id }).catch(() => { });
            }
            throw error;
        }
        let removed = false;
        return async () => {
            if (removed)
                return;
            if (this.phase === 'closed') {
                removed = true;
                return;
            }
            await this.call('unsubscribe', ns, topic, { subscriptionId: id });
            removed = true;
            this.localSubscriptions.delete(id);
        };
    }
    receive(value) {
        if (this.phase === 'closed' || this.phase === 'new' || this.phase === 'standalone')
            return;
        if (!this.budget('incoming')) {
            this.reject('rate');
            return;
        }
        const message = parsePortalEnvelope(value);
        if (!message) {
            this.reject('envelope');
            return;
        }
        if (this.seen.has(message.id)) {
            this.reject('duplicate');
            return;
        }
        this.seen.add(message.id);
        if (this.seen.size > 1024)
            this.seen.delete(this.seen.values().next().value);
        if (message.ns === 'bus') {
            this.control(message);
            return;
        }
        if (this.phase !== 'ready') {
            this.reject('handshake');
            return;
        }
        if (message.kind === 'response') {
            this.response(message);
            return;
        }
        if (message.kind === 'event') {
            try {
                const domain = this.domain(message.ns, message.type);
                this.ensureReady(message.ns);
                const payload = schemaValue(domain.schemas[message.type], message.payload);
                const listeners = domain.topics?.includes(message.type)
                    ? [...this.localSubscriptions.values()].filter((entry) => entry.ns === message.ns && entry.topic === message.type).map((entry) => entry.listener)
                    : [...(this.listeners.get(`${message.ns}:${message.type}`) ?? [])];
                for (const listener of listeners) {
                    try {
                        listener(payload);
                    }
                    catch {
                        this.reject('listener');
                    }
                }
            }
            catch {
                this.reject('payload');
            }
            return;
        }
        void this.dispatch(message);
    }
    dispose() {
        if (this.phase === 'closed')
            return;
        this.negotiated(null);
        this.phase = 'closed';
        for (const pending of this.pending.values()) {
            clearTimeout(pending.timer);
            pending.reject(new PortalBusError('HANDLER_FAILED'));
        }
        this.pending.clear();
        for (const controller of this.active.values())
            controller.abort();
        this.active.clear();
        this.remoteSubscriptions.clear();
        this.localSubscriptions.clear();
        this.listeners.clear();
        this.seen.clear();
    }
    reject(reason) {
        try {
            this.options.rejected?.(reason);
        }
        catch { }
    }
    advertise() {
        return Object.fromEntries([...this.domains].map(([ns, domain]) => [ns, [...domain.versions]]));
    }
    negotiated(domains) {
        clearTimeout(this.handshakeTimer);
        clearInterval(this.helloTimer);
        if (this.phase !== 'handshake')
            return;
        this.selected = Object.freeze({ ...(domains ?? {}) });
        this.phase = domains ? 'ready' : 'standalone';
        this.finishHandshake?.(domains ? this.selected : null);
    }
    versions(value) {
        return portalRecord(value) && Object.keys(value).length <= MAX_RESOURCES
            && Object.entries(value).every(([ns, versions]) => portalName(ns) && ns !== 'bus'
                && Array.isArray(versions) && versions.length > 0 && versions.length <= 16
                && versions.every((v) => typeof v === 'number' && Number.isSafeInteger(v) && v > 0));
    }
    control(message) {
        if (this.phase !== 'handshake' || message.kind !== 'event'
            || !portalRecord(message.payload)) {
            this.reject('handshake');
            return;
        }
        const p = message.payload;
        if (this.options.role === 'game' && message.type === 'hello') {
            if (!portalUuid(p.channelNonce) || p.env !== this.options.env
                || !Array.isArray(p.busVersions) || !this.versions(p.domains)
                || (this.nonce && this.nonce !== p.channelNonce)) {
                this.reject('handshake');
                return;
            }
            this.nonce = p.channelNonce;
            this.offered = p.domains;
            try {
                this.send('event', 'bus', 'hello.reply', {
                    busVersion: p.busVersions.includes(1) ? 1 : null, channelNonce: this.nonce,
                    appCode: this.options.appCode, sdkVersion: this.options.sdkVersion,
                    domains: this.advertise(),
                });
            }
            catch {
                this.reject('handshake_send');
            }
            return;
        }
        if (this.options.role === 'host' && message.type === 'hello.reply') {
            if (p.channelNonce !== this.nonce || p.appCode !== this.options.appCode
                || typeof p.sdkVersion !== 'string' || !p.sdkVersion || !this.versions(p.domains)
                || (p.busVersion !== 1 && p.busVersion !== null)) {
                this.reject('handshake');
                return;
            }
            const domains = {};
            for (const [ns, domain] of this.domains) {
                const common = domain.versions.filter((v) => p.domains[ns]
                    ?.includes(v));
                if (common.length)
                    domains[ns] = Math.max(...common);
            }
            try {
                this.send('event', 'bus', 'ready', { busVersion: p.busVersion,
                    domains: p.busVersion === 1 ? domains : {} });
                this.negotiated(p.busVersion === 1 ? domains : null);
            }
            catch {
                this.reject('handshake_send');
            }
            return;
        }
        if (this.options.role === 'game' && message.type === 'ready' && this.nonce) {
            if (!portalRecord(p.domains) || (p.busVersion !== 1 && p.busVersion !== null)) {
                this.reject('handshake');
                return;
            }
            const expected = {};
            for (const [ns, domain] of this.domains) {
                const common = domain.versions.filter((v) => this.offered[ns]?.includes(v));
                if (common.length)
                    expected[ns] = Math.max(...common);
            }
            const entries = Object.entries(p.domains);
            if (p.busVersion === 1 && (entries.length !== Object.keys(expected).length
                || entries.some(([ns, version]) => expected[ns] !== version))) {
                this.reject('handshake');
                return;
            }
            this.negotiated(p.busVersion === 1 ? expected : null);
            return;
        }
        this.reject('handshake');
    }
    budget(direction) {
        const now = performance.now();
        const times = this[direction].filter((time) => now - time < 1000);
        this[direction] = times;
        if (times.length >= PORTAL_RATE)
            return false;
        times.push(now);
        return true;
    }
    send(kind, ns, type, payload, correlationId = null, error, id = crypto.randomUUID()) {
        if (this.phase === 'closed')
            throw new PortalBusError('HANDLER_FAILED');
        const message = parsePortalEnvelope({ mpg: 'bus', v: 1, id, kind, ns, type, correlationId,
            payload, ts: Date.now(), ...(error ? { error } : {}) });
        if (!message)
            throw new PortalBusError('PAYLOAD_INVALID');
        if (!this.budget('outgoing'))
            throw new PortalBusError('RATE_LIMITED', true);
        this.options.send(message);
    }
    domain(ns, type) {
        const domain = this.domains.get(ns);
        if (!domain)
            throw new PortalBusError('UNSUPPORTED_NS');
        if (!Object.hasOwn(domain.schemas, type))
            throw new PortalBusError('UNSUPPORTED_TYPE');
        return domain;
    }
    ensureReady(ns) {
        if (this.phase !== 'ready' || !Object.hasOwn(this.selected, ns)) {
            throw new PortalBusError('UNSUPPORTED_NS');
        }
    }
    call(kind, ns, type, payload, id = crypto.randomUUID()) {
        return new Promise((resolve, reject) => {
            const domain = this.domain(ns, type);
            this.ensureReady(ns);
            if (kind === 'request')
                schemaValue(domain.schemas[type], payload);
            if (this.pending.size >= MAX_RESOURCES)
                throw new PortalBusError('RATE_LIMITED', true);
            const ms = domain.timeouts?.[type] ?? this.options.requestTimeoutMs;
            const timer = ms === 0 ? undefined : setTimeout(() => {
                this.pending.delete(id);
                reject(new PortalBusError('TIMEOUT', true));
            }, ms);
            this.pending.set(id, { kind, ns, type, resolve, reject, timer });
            try {
                this.send(kind, ns, type, payload, null, undefined, id);
            }
            catch (error) {
                clearTimeout(timer);
                this.pending.delete(id);
                reject(error);
            }
        });
    }
    response(message) {
        const pending = this.pending.get(message.correlationId);
        if (!pending || pending.ns !== message.ns || pending.type !== message.type) {
            this.reject('correlation');
            return;
        }
        this.pending.delete(message.correlationId);
        clearTimeout(pending.timer);
        if (message.error) {
            pending.reject(new PortalBusError(message.error.code, message.error.retryable));
        }
        else {
            try {
                const schema = pending.kind === 'request'
                    ? this.domains.get(message.ns)?.responseSchemas?.[message.type] : undefined;
                pending.resolve(schema ? schemaValue(schema, message.payload) : message.payload);
            }
            catch (error) {
                pending.reject(error);
            }
        }
    }
    async dispatch(message) {
        let timer;
        const controller = new AbortController();
        let responded = false;
        const respond = (payload, error) => {
            if (responded || this.phase !== 'ready')
                return;
            responded = true;
            try {
                this.send('response', message.ns, message.type, payload, message.id, error);
            }
            catch {
                this.reject('response_send');
            }
        };
        try {
            const domain = this.domain(message.ns, message.type);
            this.ensureReady(message.ns);
            if (this.active.size >= MAX_RESOURCES)
                throw new PortalBusError('RATE_LIMITED', true);
            if (message.kind === 'subscribe' || message.kind === 'unsubscribe') {
                if (!domain.topics?.includes(message.type))
                    throw new PortalBusError('UNSUPPORTED_TYPE');
                if (!portalRecord(message.payload))
                    throw new PortalBusError('PAYLOAD_INVALID');
                if (message.kind === 'subscribe') {
                    if (message.payload.topic !== message.type)
                        throw new PortalBusError('PAYLOAD_INVALID');
                    if (this.remoteSubscriptions.size >= MAX_RESOURCES) {
                        throw new PortalBusError('RATE_LIMITED', true);
                    }
                    this.remoteSubscriptions.set(message.id, { ns: message.ns, topic: message.type });
                    respond({ subscriptionId: message.id });
                }
                else {
                    const id = message.payload.subscriptionId;
                    if (!portalUuid(id))
                        throw new PortalBusError('PAYLOAD_INVALID');
                    const entry = this.remoteSubscriptions.get(id);
                    if (entry && (entry.ns !== message.ns || entry.topic !== message.type)) {
                        throw new PortalBusError('PAYLOAD_INVALID');
                    }
                    this.remoteSubscriptions.delete(id);
                    respond({});
                }
                return;
            }
            const payload = schemaValue(domain.schemas[message.type], message.payload);
            const handler = domain.handlers?.[message.type];
            if (!handler)
                throw new PortalBusError('UNSUPPORTED_TYPE');
            this.active.set(message.id, controller);
            controller.signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
            const ms = domain.timeouts?.[message.type] ?? this.options.requestTimeoutMs;
            if (ms)
                timer = setTimeout(() => {
                    respond({}, { code: 'TIMEOUT', message: 'TIMEOUT', retryable: true });
                    controller.abort();
                    this.active.delete(message.id);
                }, ms);
            const result = await handler(payload, { version: this.selected[message.ns],
                signal: controller.signal });
            if (!controller.signal.aborted) {
                const safeResult = result === undefined ? {} : result;
                if (!parsePortalEnvelope({ ...message, kind: 'response', id: crypto.randomUUID(),
                    correlationId: message.id, payload: safeResult }))
                    throw new PortalBusError('PAYLOAD_INVALID');
                respond(safeResult);
            }
        }
        catch (error) {
            if (!controller.signal.aborted) {
                const coreCodes = ['UNSUPPORTED_NS', 'UNSUPPORTED_TYPE', 'VERSION_MISMATCH',
                    'TIMEOUT', 'RATE_LIMITED', 'PAYLOAD_INVALID', 'HANDLER_FAILED'];
                const code = error instanceof PortalBusError
                    && (coreCodes.includes(error.code)
                        || (error.code.startsWith(`${message.ns}.`)
                            && /^[a-z][a-z0-9._-]*\.[A-Z][A-Z0-9_]{0,99}$/.test(error.code)))
                    ? error.code : 'HANDLER_FAILED';
                respond({}, { code, message: code,
                    retryable: error instanceof PortalBusError && error.retryable });
            }
        }
        finally {
            clearTimeout(timer);
            this.active.delete(message.id);
        }
    }
}

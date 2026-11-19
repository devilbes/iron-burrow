import { BROADCAST_TYPES } from '@manygamescorp/contracts-client/broadcast';
import { handleBroadcasts } from './broadcast.js';
import { defineModule } from '@manygamescorp/core/module';
import { SDKError } from '@manygamescorp/core/error';
import { SESSION_TRANSPORT } from '@manygamescorp/core/session-transport';
import { REALTIME_DELIVERY } from '@manygamescorp/core/realtime-port';
import { connectRealtime, realtimeAvailable } from './realtime-io.js';
import { HEX24, record, isRealtimeEnvelope } from '@manygamescorp/contracts-client/realtime';
export function createRealtime(port, storage, signal, now, options = {}, platform, filters, changed = () => { }, resync = () => { }) {
    const transports = [...(options.transports ?? ['ws', 'sse', 'poll'])];
    const upgradeMs = options.upgradeEveryMs ?? 300_000;
    if (!transports.length || new Set(transports).size !== transports.length
        || (options.autoAck !== undefined && typeof options.autoAck !== 'boolean')
        || transports.some((t) => !['sse', 'ws', 'poll'].includes(t))
        || !Number.isSafeInteger(upgradeMs) || upgradeMs < 1000 || upgradeMs > 2_147_483_647) {
        throw new RangeError('Invalid realtime options');
    }
    const lifetime = new AbortController();
    const live = AbortSignal.any([signal, lifetime.signal]);
    const saved = storage.get('cursor');
    let cursor = saved && typeof saved.epoch === 'string' && HEX24.test(saved.epoch)
        && Number.isSafeInteger(saved.lastSeq) && saved.lastSeq >= 0 ? saved : { lastSeq: 0 };
    let receivedCursor = { ...cursor };
    const delivered = new Map();
    const ids = new Set();
    let status = { state: 'stopped' };
    const metrics = { received: 0, duplicates: 0, invalid: 0, expired: 0,
        acknowledged: 0, reconnects: 0 };
    let connection;
    let candidate;
    let candidateCancel;
    let index = 0;
    let attempt = 0;
    let generation = 0;
    let lastFrame = now();
    let retry;
    let handshake;
    let upgrade;
    let ackTimer;
    let pauseTimer;
    let beat;
    let offline = platform?.device.info().online === false;
    let paused = false;
    let sending;
    let criticalPending = 0;
    let criticalChain = Promise.resolve();
    const acks = new Set();
    const saveConfirmedCursor = () => {
        if (options.autoAck !== false
            || [...delivered.values()].some(item => !item.acknowledged))
            return;
        cursor = { ...receivedCursor };
        storage.set('cursor', cursor);
    };
    const offs = [];
    const setState = (state, transport) => {
        status = { state, ...(transport ? { transport } : {}) };
        if (!live.aborted) {
            port.state(state, transport);
            changed(status);
        }
    };
    const cancelTimers = () => {
        clearTimeout(retry);
        clearTimeout(handshake);
        clearTimeout(upgrade);
        clearTimeout(ackTimer);
        clearInterval(beat);
        retry = handshake = upgrade = ackTimer = undefined;
        beat = undefined;
    };
    const close = () => {
        generation++;
        cancelTimers();
        candidateCancel?.abort();
        candidateCancel = undefined;
        candidate?.close();
        candidate = undefined;
        connection?.close();
        connection = undefined;
        acks.clear();
        if (!live.aborted)
            port.session();
    };
    const schedule = (delay) => {
        if (live.aborted)
            return;
        close();
        if (offline || paused) {
            setState('offline');
            return;
        }
        setState('connecting');
        const wait = delay ?? Math.max(100, Math.floor(Math.random()
            * Math.min(10_000, 500 * 2 ** Math.min(attempt++, 6))));
        retry = setTimeout(() => { retry = undefined; connect(false); }, wait);
    };
    const flush = () => {
        if (sending)
            return sending.then(() => flush());
        if (!connection || live.aborted || !acks.size)
            return Promise.resolve();
        clearTimeout(ackTimer);
        ackTimer = undefined;
        const current = connection;
        const run = generation;
        const batch = [...acks].slice(0, 100);
        const work = (async () => {
            try {
                await current.send({ t: 'ack', seqs: batch });
                if (run !== generation || live.aborted)
                    return;
                for (const seq of batch) {
                    acks.delete(seq);
                    const item = delivered.get(seq);
                    if (item)
                        item.acknowledged = true;
                }
                saveConfirmedCursor();
                metrics.acknowledged += batch.length;
            }
            catch {
                if (run === generation && current === connection && !live.aborted)
                    schedule();
            }
        })();
        sending = work;
        return work.finally(() => {
            if (sending === work)
                sending = undefined;
            if (acks.size && !live.aborted) {
                clearTimeout(ackTimer);
                ackTimer = setTimeout(() => { ackTimer = undefined; void flush(); }, 250);
            }
        });
    };
    const ack = (seq) => {
        acks.add(seq);
        if (acks.size >= 100) {
            void flush();
        }
        else if (ackTimer === undefined)
            ackTimer = setTimeout(() => {
                ackTimer = undefined;
                void flush();
            }, 250);
        if (acks.size > 1000)
            schedule();
    };
    const message = (raw) => {
        if (!isRealtimeEnvelope(raw)) {
            metrics.invalid++;
            return;
        }
        if (Date.parse(raw.expiresAt) <= now()) {
            metrics.expired++;
            return;
        }
        if (raw.filter !== undefined && !filters?.match(raw.filter))
            return;
        const guaranteed = raw.delivery === 'guaranteed';
        if (guaranteed && options.autoAck === false && raw.epoch !== cursor.epoch) {
            metrics.invalid++;
            schedule();
            return;
        }
        const known = guaranteed ? delivered.get(raw.seq) : undefined;
        if (known && (known.id !== raw.id || known.epoch !== raw.epoch)) {
            metrics.invalid++;
            return;
        }
        const duplicate = ids.has(raw.id) || (guaranteed && raw.epoch === cursor.epoch
            && raw.seq <= cursor.lastSeq);
        const unconfirmed = options.autoAck === false && known && !known.acknowledged;
        if (duplicate && !unconfirmed) {
            metrics.duplicates++;
            if (guaranteed && (options.autoAck !== false || known?.acknowledged
                || raw.seq <= cursor.lastSeq))
                ack(raw.seq);
            return;
        }
        if (raw.priority === 'critical' && criticalPending >= 100) {
            schedule();
            return;
        }
        const freeze = (value) => {
            if (typeof value === 'object' && value !== null) {
                Object.values(value).forEach(freeze);
                Object.freeze(value);
            }
        };
        freeze(raw);
        if (guaranteed) {
            if (!known && delivered.size >= 1000) {
                const confirmed = [...delivered.values()].find(item => item.acknowledged);
                if (!confirmed) {
                    schedule();
                    return;
                }
                delivered.delete(confirmed.seq);
            }
            const gap = raw.epoch !== receivedCursor.epoch || raw.seq > receivedCursor.lastSeq + 1;
            const next = { epoch: raw.epoch, lastSeq: raw.seq };
            if (raw.seq > receivedCursor.lastSeq)
                receivedCursor = next;
            delivered.set(raw.seq, known ?? { id: raw.id, epoch: raw.epoch, seq: raw.seq,
                acknowledged: false });
            if (options.autoAck !== false) {
                storage.set('cursor', next);
                cursor = next;
            }
            if (gap)
                resync('sequence_gap');
        }
        port.publish(raw);
        if (live.aborted)
            return;
        ids.add(raw.id);
        if (ids.size > 1000)
            ids.delete(ids.values().next().value);
        metrics.received++;
        if (guaranteed && options.autoAck !== false)
            ack(raw.seq);
        if (raw.priority === 'critical') {
            criticalPending++;
            const acknowledged = flush();
            criticalChain = criticalChain.then(async () => {
                await acknowledged;
                if (!live.aborted)
                    await port.critical(raw);
            }).catch(() => { }).finally(() => { criticalPending--; });
        }
    };
    const upgradeLater = () => {
        clearTimeout(upgrade);
        if (index > 0)
            upgrade = setTimeout(() => { connect(true); }, Math.floor(upgradeMs * (0.8 + Math.random() * 0.4)));
    };
    const connect = (upgrading) => {
        if (live.aborted || offline || paused || candidate)
            return;
        const target = upgrading ? transports.findIndex((kind, i) => i < index && port.available(kind))
            : transports.findIndex((kind, i) => i >= index && port.available(kind));
        if (target < 0) {
            if (upgrading) {
                upgradeLater();
                return;
            }
            index = 0;
            schedule();
            return;
        }
        const kind = transports.at(target);
        if (upgrading) {
            close();
            setState('connecting');
        }
        let sessionId;
        const run = generation;
        const cancel = new AbortController();
        candidateCancel = cancel;
        let opened = false;
        const failed = (delay) => {
            if (live.aborted || run !== generation || cancel.signal.aborted
                || (opened && connection !== owned))
                return;
            clearTimeout(handshake);
            handshake = undefined;
            cancel.abort();
            candidate?.close();
            candidate = undefined;
            candidateCancel = undefined;
            index = Math.min(target + 1, transports.length - 1);
            metrics.reconnects++;
            const hasFallback = transports.some((kind, i) => i > target && port.available(kind));
            schedule(delay ?? (!opened && hasFallback ? 0 : undefined));
        };
        const owned = port.connect(kind, () => ({ ...cursor, ...(sessionId ? { sessionId } : {}) }), AbortSignal.any([live, cancel.signal]), (raw) => {
            if (live.aborted || run !== generation || cancel.signal.aborted
                || (opened && connection !== owned))
                return;
            try {
                if (!record(raw))
                    throw new SDKError('RT_FRAME_INVALID');
                lastFrame = now();
                if (raw.t === 'hello') {
                    if (opened)
                        throw new SDKError('RT_FRAME_INVALID');
                    if (typeof raw.epoch !== 'string' || !HEX24.test(raw.epoch)
                        || typeof raw.sessionId !== 'string' || !HEX24.test(raw.sessionId)
                        || typeof raw.serverTime !== 'string' || !Number.isFinite(Date.parse(raw.serverTime))
                        || typeof raw.heartbeatSec !== 'number' || !Number.isFinite(raw.heartbeatSec)
                        || raw.heartbeatSec < 1 || raw.heartbeatSec > 60) {
                        throw new SDKError('RT_FRAME_INVALID');
                    }
                    opened = true;
                    clearTimeout(handshake);
                    handshake = undefined;
                    const previous = connection;
                    connection = candidate;
                    candidate = undefined;
                    previous?.close();
                    index = target;
                    const heartbeatMs = raw.heartbeatSec * 1000;
                    const epochChanged = cursor.epoch !== undefined && cursor.epoch !== raw.epoch;
                    if (cursor.epoch !== raw.epoch) {
                        cursor = { epoch: raw.epoch, lastSeq: 0 };
                        receivedCursor = { ...cursor };
                        delivered.clear();
                        if (options.autoAck === false)
                            ids.clear();
                    }
                    storage.set('cursor', cursor);
                    sessionId = raw.sessionId;
                    port.session(raw.sessionId);
                    setState('open', kind);
                    if (epochChanged)
                        resync('epoch');
                    upgradeLater();
                    const openedAt = now();
                    clearInterval(beat);
                    beat = setInterval(() => {
                        if (now() - lastFrame > heartbeatMs * 2) {
                            failed();
                            return;
                        }
                        if (now() - openedAt >= heartbeatMs * 2)
                            attempt = 0;
                        void connection?.send({ t: 'ping', ...cursor }).catch(() => failed());
                    }, heartbeatMs);
                    return;
                }
                if (!opened)
                    throw new SDKError('RT_FRAME_INVALID');
                if (raw.t === 'msg') {
                    const { t: _type, ...envelope } = raw;
                    message(envelope);
                }
                else if (raw.t === 'msgs' && Array.isArray(raw.items) && raw.items.length <= 50) {
                    for (const item of raw.items)
                        message(item);
                }
                else if (raw.t === 'reauth')
                    void connection?.send({ t: 'auth' }).catch(() => failed(60_000));
                else if (raw.t === 'reconnect')
                    failed(typeof raw.afterMs === 'number'
                        ? Math.max(0, Math.min(3_600_000, raw.afterMs)) : 0);
                else if (raw.t === 'error' && raw.code !== 'RT_FRAME_INVALID') {
                    failed(raw.code === 'UNAUTHORIZED' || raw.code === 'RT_TOO_MANY_SESSIONS' ? 60_000
                        : raw.code === 'RATE_LIMITED' ? Math.max(60_000, Math.min(3_600_000, Number(raw.retryAfterSec) * 1000 || 60_000)) : undefined);
                }
            }
            catch {
                metrics.invalid++;
                failed();
            }
        }, failed, () => {
            if (!live.aborted && run === generation && !cancel.signal.aborted
                && opened && connection === owned)
                lastFrame = now();
        });
        candidate = owned;
        handshake = setTimeout(() => failed(), 5000);
    };
    const recover = () => {
        if (live.aborted || offline || paused)
            return;
        index = 0;
        close();
        connect(false);
    };
    const resume = () => {
        offline = false;
        paused = false;
        clearTimeout(pauseTimer);
        recover();
    };
    if (platform) {
        offs.push(platform.lifecycle.on('online', () => {
            if (!offline)
                return;
            offline = false;
            recover();
        }), platform.lifecycle.on('resume', () => {
            clearTimeout(pauseTimer);
            if (!paused)
                return;
            paused = false;
            recover();
        }), platform.lifecycle.on('offline', () => { offline = true; schedule(); }), platform.lifecycle.on('pause', () => {
            if (platform.id !== 'cordova')
                return;
            clearTimeout(pauseTimer);
            pauseTimer = setTimeout(() => {
                paused = true;
                void connection?.send({ t: 'bye' }).catch(() => { });
                schedule();
            }, 30_000);
        }));
    }
    const dispose = () => {
        if (lifetime.signal.aborted)
            return;
        close();
        clearTimeout(pauseTimer);
        for (const off of offs.splice(0))
            off();
        lifetime.abort();
        status = { state: 'stopped' };
        ids.clear();
        delivered.clear();
        live.removeEventListener('abort', dispose);
    };
    live.addEventListener('abort', dispose, { once: true });
    if (!live.aborted) {
        setState(offline ? 'offline' : 'connecting');
        connect(false);
    }
    return { notice: () => undefined, status: () => ({ ...status }), metrics: () => ({ ...metrics }),
        async ack(message) {
            if (live.aborted)
                throw new SDKError('MODULE_NOT_ACTIVE', { module: 'realtime' });
            const item = record(message) && typeof message.seq === 'number'
                && Number.isSafeInteger(message.seq) && message.seq > 0
                ? delivered.get(message.seq) : undefined;
            if (!item || message.id !== item.id || message.epoch !== item.epoch
                || message.epoch !== cursor.epoch) {
                throw new SDKError('VALIDATION_FAILED', { module: 'realtime' });
            }
            if (item.acknowledged)
                return;
            if (!connection)
                throw new SDKError('UPSTREAM_UNAVAILABLE', { module: 'realtime', retryable: true });
            ack(item.seq);
            await flush();
            if (live.aborted)
                throw new SDKError('MODULE_NOT_ACTIVE', { module: 'realtime' });
            if (!item.acknowledged) {
                throw new SDKError('UPSTREAM_UNAVAILABLE', { module: 'realtime', retryable: true });
            }
        },
        async reconnect() { if (!live.aborted) {
            metrics.reconnects++;
            resume();
        } }, dispose };
}
export function realtime(options = {}) {
    let runtime;
    let registrationPort;
    let broadcastNotice;
    let offBroadcasts;
    const close = () => {
        offBroadcasts?.();
        offBroadcasts = undefined;
        broadcastNotice = undefined;
        runtime?.dispose();
        runtime = undefined;
        registrationPort = undefined;
    };
    return defineModule({
        manifest: {
            settings: { schemaVersion: 1, fields: [{ ref: 'availability' }] },
            id: 'realtime', version: '1.0.0', kind: 'service', engines: { core: '^1.0.0' }, targets: ['web', 'cordova'],
            permissions: ['http:realtime', 'storage', 'platform', 'device:info'], load: 'eager', entry: 'realtime.js',
            provides: ['realtime.handlers@1'], consumes: [SESSION_TRANSPORT, REALTIME_DELIVERY],
            events: { emits: ['realtime:connection:connected', 'realtime:connection:disconnected',
                    'realtime:connection:transport', 'realtime:connection:resync'], listens: BROADCAST_TYPES.map(type => `realtime:${type}`) },
        },
        init(ctx) {
            ctx.services.provide('realtime.handlers@1', {
                handle(call, type, handler) {
                    if (!registrationPort)
                        throw new SDKError('MODULE_NOT_ACTIVE', { module: 'realtime' });
                    return registrationPort.register(call.from, type, handler);
                },
            });
        },
        async start(ctx) {
            close();
            if (!ctx.realtime || !ctx.storage)
                throw new SDKError('SDK_PERMISSION_DENIED', { module: 'realtime' });
            const channel = ctx.services.require(SESSION_TRANSPORT).channel('realtime');
            const delivery = ctx.services.require(REALTIME_DELIVERY);
            const sessionSignal = AbortSignal.any([ctx.signal, channel.signal]);
            const port = { ...delivery,
                available: kind => realtimeAvailable(kind, channel),
                connect: (kind, cursor, caller, receive, closed, activity) => connectRealtime({ channel,
                    signal: sessionSignal }, kind, cursor, caller, receive, closed, activity),
            };
            registrationPort = port;
            runtime = createRealtime(port, ctx.storage, sessionSignal, ctx.time.now, options, ctx.platform, ctx.filters, (status) => {
                if (status.state === 'open') {
                    ctx.bus.emit('realtime:connection:connected', { state: 'open' });
                }
                else {
                    ctx.bus.emit('realtime:connection:disconnected', { state: status.state });
                }
                if (status.transport) {
                    const transport = status.transport;
                    ctx.bus.emit('realtime:connection:transport', { transport });
                }
            }, reason => ctx.bus.emit('realtime:connection:resync', { reason }));
            offBroadcasts = handleBroadcasts(ctx.realtime, sessionSignal, { ...options.broadcast,
                appVersion: options.broadcast?.appVersion ?? ctx.appVersion,
                reload: options.broadcast?.reload ?? (() => ctx.device?.app?.restart()),
                locale: ctx.platform?.device.info().language ?? 'en',
                refresh: () => ctx.configs.refresh(),
                notice: (value) => { broadcastNotice = value; }, }, ctx.time.now);
        },
        async stop() { close(); }, async dispose() { close(); },
        api() {
            if (!runtime)
                throw new SDKError('MODULE_NOT_ACTIVE', { module: 'realtime' });
            return { ...runtime, notice: () => broadcastNotice };
        },
    });
}
export const realtimeModule = realtime;

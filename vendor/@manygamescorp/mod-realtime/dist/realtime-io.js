import { SDKError } from '@manygamescorp/core/error';
import { VERSION } from '@manygamescorp/core/version';
import { HEX24, record } from '@manygamescorp/contracts-client/realtime';
export function realtimeAvailable(kind, channel) {
    return kind === 'poll' || channel.supports(kind === 'ws' ? 'socket' : 'stream');
}
export function connectRealtime(options, kind, cursor, caller, receive, disconnected, activity) {
    const lifetime = new AbortController();
    const signal = AbortSignal.any([lifetime.signal, caller, options.signal, options.channel.signal]);
    let socket;
    let session;
    let ended = false;
    const pollAcks = new Set();
    const close = () => {
        if (ended)
            return;
        ended = true;
        pollAcks.clear();
        lifetime.abort();
        signal.removeEventListener('abort', close);
        if (socket) {
            socket.close();
        }
    };
    signal.addEventListener('abort', close, { once: true });
    const fail = (delay) => { if (!ended) {
        close();
        disconnected(delay);
    } };
    const active = () => { signal.throwIfAborted(); if (ended)
        throw new SDKError('MODULE_NOT_ACTIVE'); };
    const accept = (raw) => {
        active();
        if (!record(raw) || typeof raw.t !== 'string')
            throw new SDKError('RT_FRAME_INVALID');
        if (raw.t === 'hello') {
            if (typeof raw.sessionId !== 'string' || !HEX24.test(raw.sessionId)) {
                throw new SDKError('RT_FRAME_INVALID');
            }
            session = raw.sessionId;
        }
        if (['hello', 'msg', 'msgs', 'ping', 'reauth', 'reconnect', 'error'].includes(raw.t))
            receive(raw);
    };
    const request = async (path, body, stream = false, authorize = false) => {
        active();
        const device = await options.channel.deviceId();
        active();
        const headers = { 'X-Rt-Device': device, 'X-Rt-Wire': '1' };
        if (session)
            headers['X-Rt-Session'] = session;
        if (stream) {
            headers['Accept'] = 'text/event-stream';
            const resume = cursor();
            if (resume.epoch)
                headers['X-Rt-Resume'] = `${resume.epoch}:${resume.lastSeq}`;
        }
        const response = await options.channel.request(path, { headers, signal,
            timeoutMs: stream ? null : 35_000, ...(body === undefined ? {} : { body }),
            ...(authorize ? { credentialPath: ['frames', 0, 'token'] } : {}) });
        active();
        if (!response.ok) {
            const delay = Number(response.headers.get('Retry-After'));
            fail(response.status === 401 ? 60_000 : response.status === 429
                ? Math.max(60_000, Math.min(3_600_000, Number.isFinite(delay) ? delay * 1000 : 60_000))
                : undefined);
            throw new SDKError('UPSTREAM_UNAVAILABLE');
        }
        return response;
    };
    const json = async (response) => {
        if (!response.body)
            throw new SDKError('RT_FRAME_INVALID');
        const reader = response.body.getReader();
        const cancelReader = () => { void reader.cancel().catch(() => { }); };
        signal.addEventListener('abort', cancelReader, { once: true });
        const decoder = new TextDecoder();
        let value = '';
        let bytes = 0;
        try {
            while (true) {
                const chunk = await reader.read();
                active();
                if (chunk.done)
                    break;
                bytes += chunk.value.byteLength;
                if (bytes > 1_048_576)
                    throw new SDKError('RT_FRAME_TOO_LARGE');
                value += decoder.decode(chunk.value, { stream: true });
            }
            return JSON.parse(value + decoder.decode());
        }
        finally {
            signal.removeEventListener('abort', cancelReader);
            cancelReader();
        }
    };
    const send = async (frame) => {
        active();
        const value = frame;
        if (!['ack', 'ping', 'auth', 'bye'].includes(String(value.t)))
            throw new SDKError('RT_FRAME_INVALID');
        if (socket) {
            if (frame.t === 'auth')
                await socket.authenticate(value);
            else
                socket.send(value);
            active();
            return;
        }
        if (frame.t === 'auth') {
            await options.channel.renew();
            active();
        }
        if (!session)
            throw new SDKError('MODULE_NOT_ACTIVE');
        if (kind === 'poll' && value.t === 'ack' && Array.isArray(value.seqs)) {
            for (const seq of value.seqs)
                pollAcks.add(seq);
            if (pollAcks.size > 1000)
                throw new SDKError('RT_FRAME_TOO_LARGE');
        }
        await request('/frames', { frames: [value] }, false, frame.t === 'auth');
        active();
        activity();
    };
    void (async () => {
        const deviceId = await options.channel.deviceId();
        active();
        if (kind === 'ws') {
            const { epoch, lastSeq } = cursor();
            socket = options.channel.socket('/ws', 'mg.rt.v1', { t: 'hello', deviceId,
                transport: 'ws', sdk: VERSION, wire: 1, epoch, lastSeq }, signal, {
                open() { },
                message(data) {
                    try {
                        if (typeof data !== 'string' || new TextEncoder().encode(data).length > 1_048_576) {
                            throw new SDKError('RT_FRAME_TOO_LARGE');
                        }
                        accept(JSON.parse(data));
                    }
                    catch {
                        fail();
                    }
                },
                close(code) {
                    fail(code === 4001 ? 0 : [4005, 4008].includes(code ?? 0) ? 60_000 : undefined);
                },
            });
            return;
        }
        if (kind === 'poll') {
            while (!signal.aborted) {
                const resume = cursor();
                const seqs = [...pollAcks].slice(0, 100);
                for (const seq of seqs)
                    pollAcks.delete(seq);
                const started = performance.now();
                const response = await request('/poll', { ...(resume.epoch ? { epoch: resume.epoch } : {}),
                    lastSeq: resume.lastSeq, frames: seqs.length ? [{ t: 'ack', seqs }] : [] });
                const batch = await json(response);
                if (!record(batch) || !Array.isArray(batch.frames) || batch.frames.length > 50) {
                    throw new SDKError('RT_FRAME_INVALID');
                }
                for (const frame of batch.frames)
                    accept(frame);
                active();
                activity();
                if (batch.frames.length && performance.now() - started < 250) {
                    await new Promise((resolve, reject) => {
                        const abort = () => { clearTimeout(timer); reject(signal.reason); };
                        const timer = setTimeout(() => {
                            signal.removeEventListener('abort', abort);
                            resolve();
                        }, 250);
                        signal.addEventListener('abort', abort, { once: true });
                    });
                }
            }
            return;
        }
        const response = await request('/stream', undefined, true);
        if (!response.headers.get('Content-Type')?.startsWith('text/event-stream') || !response.body) {
            throw new SDKError('RT_FRAME_INVALID');
        }
        const reader = response.body.getReader();
        const cancelReader = () => { void reader.cancel().catch(() => { }); };
        signal.addEventListener('abort', cancelReader, { once: true });
        const decoder = new TextDecoder();
        let buffer = '';
        try {
            while (!signal.aborted) {
                const chunk = await reader.read();
                active();
                if (chunk.done)
                    break;
                buffer = (buffer + decoder.decode(chunk.value, { stream: true })).replace(/\r\n/g, '\n');
                if (buffer.length > 1_048_576)
                    throw new SDKError('RT_FRAME_TOO_LARGE');
                let end;
                while ((end = buffer.indexOf('\n\n')) >= 0) {
                    const block = buffer.slice(0, end);
                    buffer = buffer.slice(end + 2);
                    const data = block.split('\n').filter((line) => line.startsWith('data:'))
                        .map((line) => line.slice(5).trimStart()).join('\n');
                    if (data)
                        accept(JSON.parse(data));
                }
            }
        }
        finally {
            signal.removeEventListener('abort', cancelReader);
            cancelReader();
        }
        fail();
    })().catch(() => fail());
    if (signal.aborted)
        close();
    return { send, close };
}

import { SDKError } from './error.js';
export async function readConfigBlob(link, signal, fetcher = globalThis.fetch, now = Date.now) {
    let url;
    try {
        url = new URL(link.url);
    }
    catch {
        throw invalidBlob();
    }
    if (url.protocol !== 'https:' || url.username || url.password || url.hash
        || !/^[a-f0-9]{64}$/i.test(link.sha256) || !Number.isFinite(Date.parse(link.expiresAt))
        || Date.parse(link.expiresAt) <= now())
        throw invalidBlob();
    const controller = new AbortController();
    const combined = AbortSignal.any([signal, controller.signal]);
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 10_000);
    const limit = 1_048_576;
    try {
        combined.throwIfAborted();
        const response = await abortable(fetcher(url.href, { signal: combined, credentials: 'omit',
            redirect: 'error', referrerPolicy: 'no-referrer' }), combined);
        combined.throwIfAborted();
        if (!response.ok || !response.body)
            throw invalidBlob();
        const reader = response.body.getReader();
        const abort = () => { void reader.cancel().catch(() => { }); };
        combined.addEventListener('abort', abort, { once: true });
        const chunks = [];
        let size = 0;
        try {
            for (;;) {
                const chunk = await reader.read();
                combined.throwIfAborted();
                if (chunk.done)
                    break;
                size += chunk.value.byteLength;
                if (size > limit) {
                    abort();
                    throw invalidBlob();
                }
                chunks.push(chunk.value);
            }
        }
        finally {
            combined.removeEventListener('abort', abort);
            reader.releaseLock();
        }
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.byteLength;
        }
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        combined.throwIfAborted();
        const actual = [...new Uint8Array(digest)]
            .map((byte) => byte.toString(16).padStart(2, '0')).join('');
        if (actual !== link.sha256.toLowerCase())
            throw invalidBlob();
        try {
            return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
        }
        catch {
            throw invalidBlob();
        }
    }
    catch (error) {
        if (timedOut && !signal.aborted)
            throw new SDKError('TIMEOUT', { module: 'configs' });
        if (combined.aborted)
            throw new DOMException('Config download cancelled', 'AbortError');
        if (error instanceof SDKError)
            throw error;
        throw invalidBlob();
    }
    finally {
        clearTimeout(timer);
    }
}
function invalidBlob() {
    return new SDKError('VALIDATION_FAILED', { module: 'configs',
        message: 'Invalid or unavailable config blob', retryable: false });
}
function abortable(promise, signal) {
    return new Promise((resolve, reject) => {
        const abort = () => reject(new DOMException('Config download cancelled', 'AbortError'));
        signal.addEventListener('abort', abort, { once: true });
        if (signal.aborted)
            abort();
        void promise.then(resolve, reject)
            .finally(() => signal.removeEventListener('abort', abort));
    });
}

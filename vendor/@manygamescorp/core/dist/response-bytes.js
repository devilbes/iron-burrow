export async function readResponseBytes(response, limit, signal, tooLarge) {
    const length = response.headers.get('Content-Length');
    if (signal.aborted || (length !== null && /^\d+$/.test(length) && Number(length) > limit)) {
        void response.body?.cancel().catch(() => { });
        signal.throwIfAborted();
        tooLarge();
    }
    if (!response.body)
        return new Uint8Array();
    const reader = response.body.getReader();
    const cancel = () => { void reader.cancel().catch(() => { }); };
    signal.addEventListener('abort', cancel, { once: true });
    let buffer = new Uint8Array(0);
    let size = 0;
    try {
        for (;;) {
            signal.throwIfAborted();
            const chunk = await reader.read();
            signal.throwIfAborted();
            if (chunk.done)
                break;
            if (chunk.value.byteLength > limit - size)
                tooLarge();
            const offset = size;
            size += chunk.value.byteLength;
            if (size > buffer.byteLength) {
                const grown = new Uint8Array(Math.min(limit, Math.max(size, buffer.byteLength * 2, 4096)));
                grown.set(buffer);
                buffer = grown;
            }
            buffer.set(chunk.value, offset);
        }
        return buffer.subarray(0, size);
    }
    catch (error) {
        if (!signal.aborted)
            cancel();
        throw error;
    }
    finally {
        signal.removeEventListener('abort', cancel);
        reader.releaseLock();
    }
}

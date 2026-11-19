export function createCallContext(init) {
    const ctx = {
        rid: init.rid ?? randomUuid(),
        moduleId: init.moduleId,
        operation: init.operation,
        ...(init.parent === undefined ? {} : { parentRid: init.parent.rid }),
    };
    return Object.freeze(ctx);
}
export function randomUuid() {
    const c = globalThis.crypto;
    if (typeof c.randomUUID === 'function')
        return c.randomUUID();
    const b = c.getRandomValues(new Uint8Array(16));
    b[6] = ((b[6] ?? 0) & 0x0f) | 0x40;
    b[8] = ((b[8] ?? 0) & 0x3f) | 0x80;
    const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export function randomUuidV7(now) {
    if (!Number.isFinite(now) || now < 0)
        throw new TypeError('Invalid UUIDv7 timestamp');
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    let timestamp = Math.trunc(now);
    for (let i = 5; i >= 0; i--) {
        bytes[i] = timestamp % 256;
        timestamp = Math.floor(timestamp / 256);
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x70;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, x => x.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const TIME_OFFSET_CHANGED = 'time:offsetChanged';
const WINDOW = 8;
const MAX_RTT_MS = 10_000;
export const OFFSET_NOTICE_MS = 1_000;
export function parseServerTime(header) {
    if (header === null)
        return undefined;
    const value = header.trim();
    if (!/^\d{1,12}(\.\d{1,9})?$/.test(value))
        return undefined;
    const ms = Math.round(Number(value) * 1000);
    return Number.isSafeInteger(ms) && ms > 0 ? ms : undefined;
}
export function createServerClock(options = {}) {
    const local = options.local ?? (() => Date.now());
    const samples = [];
    const listeners = new Set();
    let offset = 0;
    let synced = false;
    let announced = 0;
    const smoothed = () => {
        const fast = [...samples].sort((a, b) => a.rtt - b.rtt)
            .slice(0, Math.max(1, Math.ceil(samples.length / 2)))
            .map((s) => s.offset).sort((a, b) => a - b);
        const mid = fast.length >> 1;
        return Math.round(fast.length % 2 ? fast[mid] : (fast[mid - 1] + fast[mid]) / 2);
    };
    const view = Object.freeze({
        now: () => Math.round(local() + offset),
        offset: () => offset,
        synced: () => synced,
    });
    return Object.freeze({
        ...view,
        view,
        sample(header, sentAt, receivedAt) {
            const server = parseServerTime(header);
            const rtt = receivedAt - sentAt;
            if (server === undefined || !Number.isFinite(rtt) || rtt < 0 || rtt > MAX_RTT_MS)
                return;
            samples.push({ offset: server - (receivedAt - rtt / 2), rtt });
            if (samples.length > WINDOW)
                samples.shift();
            const first = !synced;
            const previous = offset;
            offset = smoothed();
            synced = true;
            if (!first && Math.abs(offset - announced) < OFFSET_NOTICE_MS)
                return;
            announced = offset;
            const change = Object.freeze({ offset, previous, synced: true });
            for (const listener of [...listeners]) {
                try {
                    listener(change);
                }
                catch { }
            }
        },
        onChange(listener) {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
    });
}

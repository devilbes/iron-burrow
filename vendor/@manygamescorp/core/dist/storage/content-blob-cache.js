import { VersionedBlobCache } from './blob-cache.js';
export function createContentBlobCache(options) {
    const cache = new VersionedBlobCache({
        ...options, references: pointer => pointer,
    });
    let queue = Promise.resolve();
    return {
        read: (sha256, signal) => cache.read(options.currentGid(), { sha256, version: 0 }, signal),
        write(sha256, bytes, signal) {
            const gid = options.currentGid();
            const job = queue.catch(() => { }).then(async () => {
                const entries = Object.entries(cache.pointer(gid) ?? {})
                    .filter(([key]) => key !== sha256);
                const pointer = Object.fromEntries([
                    ...entries.slice(-127), [sha256, { sha256, version: 0 }],
                ]);
                await cache.write({ gid, currentGid: options.currentGid, signal, pointer,
                    bodies: { [sha256]: bytes } });
            });
            queue = job;
            return job;
        },
    };
}

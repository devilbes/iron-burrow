const HASH = /^[a-f0-9]{64}$/;
export const ORPHAN_GRACE_MS = 10 * 60_000;
const queues = new WeakMap();
const written = new WeakMap();
function validRef(ref) {
    if (!ref || typeof ref !== 'object')
        return false;
    const candidate = ref;
    return typeof candidate.sha256 === 'string' && HASH.test(candidate.sha256)
        && typeof candidate.version === 'number' && Number.isSafeInteger(candidate.version)
        && candidate.version >= 0;
}
export async function blobDigest(bytes) {
    const hash = await globalThis.crypto.subtle.digest('SHA-256', Uint8Array.from(bytes).buffer);
    return [...new Uint8Array(hash)].map((n) => n.toString(16).padStart(2, '0')).join('');
}
export class VersionedBlobCache {
    #options;
    #queue;
    #key;
    #written;
    constructor(options) {
        if (!Number.isFinite(options.maxBytes) || options.maxBytes < 0) {
            throw new Error('invalid blob cache limit');
        }
        options.storage.scope('cache', options.namespace);
        this.#options = options;
        this.#key = options.storage.prefix + options.namespace;
        let queue = queues.get(options.blobs);
        if (!queue) {
            queue = new Map();
            queues.set(options.blobs, queue);
        }
        this.#queue = queue;
        let own = written.get(options.blobs);
        if (!own) {
            own = new Set();
            written.set(options.blobs, own);
        }
        this.#written = own;
    }
    #prefix(gid) {
        return `${this.#options.storage.scope(gid, this.#options.namespace).prefix}blob:`;
    }
    pointer(gid) {
        return this.#options.storage.scope(gid, this.#options.namespace).get('meta');
    }
    async read(gid, ref, signal) {
        if (!validRef(ref))
            return undefined;
        signal?.throwIfAborted();
        const bytes = await this.#options.blobs.get(this.#prefix(gid) + ref.sha256);
        signal?.throwIfAborted();
        if (!bytes || await blobDigest(bytes) !== ref.sha256)
            return undefined;
        signal?.throwIfAborted();
        return bytes;
    }
    write(write) {
        return this.#enqueue(async () => {
            try {
                write.signal.throwIfAborted();
                const refs = this.#options.references(write.pointer);
                if (Object.values(refs).some((ref) => !validRef(ref))) {
                    throw new Error('blob cache reference is invalid');
                }
                for (const [id, bytes] of Object.entries(write.bodies)) {
                    const ref = refs[id];
                    if (!ref || !validRef(ref) || await blobDigest(bytes) !== ref.sha256) {
                        throw new Error('blob cache integrity mismatch');
                    }
                    if (bytes.byteLength > this.#options.maxBytes)
                        throw new Error('blob exceeds cache limit');
                    write.signal.throwIfAborted();
                    const key = this.#prefix(write.gid) + ref.sha256;
                    this.#written.add(key);
                    await this.#options.blobs.put(key, bytes);
                    write.signal.throwIfAborted();
                }
                if (write.gid !== write.currentGid())
                    throw new Error('cache identity changed');
                write.signal.throwIfAborted();
                this.#options.storage.scope(write.gid, this.#options.namespace)
                    .set('meta', write.pointer);
            }
            finally {
                await this.#collect();
            }
        });
    }
    async #collect() {
        const { storage, blobs, namespace } = this.#options;
        let refs = new Set();
        try {
            for (const gid of storage.gids()) {
                const pointer = this.pointer(gid);
                if (!pointer || typeof pointer !== 'object')
                    continue;
                try {
                    for (const ref of Object.values(this.#options.references(pointer))) {
                        if (ref && validRef(ref))
                            refs.add(this.#prefix(gid) + ref.sha256);
                    }
                }
                catch {
                }
            }
        }
        catch {
            refs = undefined;
        }
        const kept = [];
        const pending = new Set();
        const fresh = Date.now() - ORPHAN_GRACE_MS;
        for (const file of await blobs.list(storage.prefix)) {
            const [, owner, kind] = file.key.slice(storage.prefix.length).split(':');
            if (!file.key.startsWith(storage.prefix) || owner !== namespace || kind !== 'blob')
                continue;
            if (!this.#written.has(file.key) && file.accessedAt > fresh
                && (!refs || !refs.has(file.key)))
                pending.add(file.key);
            if (!refs || refs.has(file.key) || pending.has(file.key))
                kept.push(file);
            else
                await this.#remove(file.key);
        }
        let size = kept.reduce((total, file) => total + file.size, 0);
        for (const file of kept.sort((a, b) => a.accessedAt - b.accessedAt)) {
            if (size <= this.#options.maxBytes)
                break;
            if (pending.has(file.key))
                continue;
            await this.#remove(file.key);
            size -= file.size;
        }
    }
    async #remove(key) {
        await this.#options.blobs.remove(key);
        this.#written.delete(key);
    }
    clean() {
        return this.#enqueue(() => this.#collect());
    }
    #enqueue(action) {
        const previous = this.#queue.get(this.#key) ?? Promise.resolve();
        const job = previous.catch(() => { }).then(() => {
            const locks = globalThis.navigator?.locks;
            return locks ? locks.request(`mpg:blob-cache:${this.#key}`, action) : action();
        });
        this.#queue.set(this.#key, job);
        const release = () => {
            if (this.#queue.get(this.#key) === job)
                this.#queue.delete(this.#key);
        };
        void job.then(release, release);
        return job;
    }
}

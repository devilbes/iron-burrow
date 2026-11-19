import { SDKError } from '../error.js';
const PART_SIZE = 2800;
const PARTS = 8;
const failed = () => new SDKError('SDK_SECURE_STORE_FAILED', {
    message: 'auth cookie operation failed',
});
export function authCookie(now, scope = 'page') {
    let doc;
    let path;
    let partitioned;
    try {
        if (globalThis.location?.protocol !== 'https:' || !globalThis.document)
            return undefined;
        doc = globalThis.document;
        const pathname = globalThis.location.pathname;
        path = scope === 'origin' ? '/' : pathname.slice(0, pathname.lastIndexOf('/') + 1) || '/';
        if (/[;\r\n]/.test(path))
            return undefined;
        partitioned = globalThis.window.self !== globalThis.window.top;
        void doc.cookie;
    }
    catch {
        return undefined;
    }
    const suffix = `; Path=${path}; Secure; SameSite=${partitioned ? 'None' : 'Lax'}`
        + (partitioned ? '; Partitioned' : '');
    const read = (name) => {
        const prefix = `${encodeURIComponent(name)}=`;
        return doc.cookie.split(';').map((part) => part.trim())
            .find((part) => part.startsWith(prefix))?.slice(prefix.length);
    };
    const put = (name, value, expiresAt) => {
        doc.cookie = `${encodeURIComponent(name)}=${value}${suffix}`
            + `; Max-Age=${Math.max(0, Math.floor((expiresAt - now()) / 1000))}`
            + `; Expires=${new Date(expiresAt).toUTCString()}`;
    };
    const get = (name) => {
        const manifest = read(name);
        const match = manifest && /^([\w-]{36})\.([1-8])$/.exec(manifest);
        if (!match)
            return undefined;
        let encoded = '';
        for (let i = 0; i < Number(match[2]); i += 1) {
            const part = read(`${name}:${i}`);
            if (!part?.startsWith(`${match[1]}.`) || part.length > PART_SIZE + 37)
                return undefined;
            encoded += part.slice(37);
        }
        try {
            return decodeURIComponent(encoded);
        }
        catch {
            return undefined;
        }
    };
    const remove = (name) => {
        let error = false;
        for (const key of [name, ...Array.from({ length: PARTS }, (_, i) => `${name}:${i}`)]) {
            try {
                put(key, '', 0);
                if (read(key) !== undefined)
                    error = true;
            }
            catch {
                error = true;
            }
        }
        if (error)
            throw failed();
    };
    return {
        get,
        set(name, value, expiresAt) {
            if (expiresAt <= now()) {
                remove(name);
                return;
            }
            const encoded = encodeURIComponent(value);
            if (encoded.length > PART_SIZE * PARTS)
                throw failed();
            const version = crypto.randomUUID();
            const count = Math.max(1, Math.ceil(encoded.length / PART_SIZE));
            for (let i = 0; i < PARTS; i += 1) {
                put(`${name}:${i}`, i < count
                    ? `${version}.${encoded.slice(i * PART_SIZE, (i + 1) * PART_SIZE)}` : '', i < count ? expiresAt : 0);
            }
            put(name, `${version}.${count}`, expiresAt);
            if (get(name) !== value)
                throw failed();
        },
        delete: remove,
    };
}

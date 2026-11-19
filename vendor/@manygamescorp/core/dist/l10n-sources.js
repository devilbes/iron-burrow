import { resolve } from '@manygamescorp/contracts-client/resolve';
import { SDKError } from './error.js';
import { readResponseBytes } from './response-bytes.js';
import { blobDigest, VersionedBlobCache } from './storage/blob-cache.js';
import { canonicalLocale } from './l10n/locale.js';
export function recordTree(value, facts) {
    if (!configRecord(value))
        return undefined;
    return resolve(value.data, value.conditionals, facts, { conditionalsMode: value.conditionalsMode, sides: ['client'] }).data;
}
export function configRecord(value) {
    return record(value) && Array.isArray(value.conditionals)
        && (value.conditionalsMode === 'merge' || value.conditionalsMode === 'replace');
}
const MAX_BLOB_BYTES = 10_000_000;
const SHA256 = /^[a-f\d]{64}$/i;
const SEGMENT = /^[\w-]{1,64}$/;
const FORM = /^@(zero|one|two|few|many|other|=-?\d+(\.\d+)?)$/;
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
function record(value) {
    return typeof value == 'object' && value !== null && !Array.isArray(value);
}
function abortIfNeeded(signal) {
    if (signal.aborted)
        throw new DOMException('Aborted', 'AbortError');
}
function validTree(value, depth = 0) {
    if (!record(value) || depth >= 8)
        return false;
    for (const [key, child] of Object.entries(value)) {
        if (!SEGMENT.test(key))
            return false;
        if (typeof child == 'string')
            continue;
        if (!record(child))
            return false;
        const keys = Object.keys(child);
        if (keys.some((name) => name.startsWith('@'))) {
            if (typeof child['@other'] != 'string' ||
                !keys.every((name) => FORM.test(name) && typeof child[name] == 'string'))
                return false;
        }
        else if (!validTree(child, depth + 1))
            return false;
    }
    return true;
}
export function validIndex(value) {
    return record(value) && Array.isArray(value.locales)
        && (value.defaultLocale === undefined || (typeof value.defaultLocale === 'string'
            && canonicalLocale(value.defaultLocale) === value.defaultLocale))
        && value.locales.every((entry) => record(entry) &&
            typeof entry.tag == 'string' &&
            canonicalLocale(entry.tag) == entry.tag &&
            typeof entry.name == 'string' &&
            entry.status == 'published');
}
function indexTree(value, facts) {
    const tree = recordTree(value, facts);
    if (!validIndex(tree))
        throw new Error('Invalid localization index');
    return tree;
}
function validVersion(value) {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}
function filterIndex(index, chain, hashes) {
    return index && { ...index, locales: index.locales.filter(({ tag }) => !chain.includes(tag) || Object.hasOwn(hashes, tag)) };
}
function descriptor(value) {
    if (!record(value) || typeof value.url !== 'string'
        || typeof value.sha256 !== 'string' || !SHA256.test(value.sha256)
        || !validVersion(value.version))
        throw new Error('Invalid localization URL descriptor');
    return { url: value.url, sha256: value.sha256.toLowerCase(), version: value.version };
}
function bundle(value, facts) {
    const tree = recordTree(value, facts);
    if (!validTree(tree))
        throw new Error('Invalid localization bundle');
    return tree;
}
export { blobDigest as l10nDigest } from './storage/blob-cache.js';
export class CachedL10nSource {
    origin;
    #options;
    #cache;
    constructor(options) {
        if (options.storage.appCode !== options.appCode)
            throw new Error('l10n storage app mismatch');
        this.#options = options;
        this.origin = options.source.origin ?? 'network';
        if (options.maxBytes !== undefined && !Number.isFinite(options.maxBytes)) {
            throw new Error('invalid l10n cache limit');
        }
        this.#cache = new VersionedBlobCache({
            storage: options.storage, blobs: options.blobs, namespace: 'l10n',
            maxBytes: Math.min(MAX_BLOB_BYTES, Math.max(0, options.maxBytes ?? MAX_BLOB_BYTES)),
            references: (pointer) => {
                if (!pointer?.meta?.sha256 || !pointer.meta.version)
                    return {};
                return Object.fromEntries(Object.entries(pointer.meta.sha256).map(([tag, sha256]) => [tag, { sha256, version: pointer.meta.version[tag] ?? 0 }]));
            },
        });
    }
    #pointer(gid) {
        try {
            const p = this.#cache.pointer(gid);
            if (!p || !Array.isArray(p.chain) || !p.meta || !p.meta.sha256 || !p.meta.version
                || (p.index !== undefined && !validIndex(p.index))) {
                return undefined;
            }
            return p;
        }
        catch {
            return undefined;
        }
    }
    #check(gid, signal) {
        signal?.throwIfAborted();
        if (gid !== this.#options.gid())
            throw new Error('l10n identity changed');
    }
    async #read(gid, p, chain, signal) {
        const bundles = {};
        const sha256 = {};
        const version = {};
        for (const tag of chain) {
            const hash = p.meta.sha256[tag];
            if (!hash || !/^[a-f0-9]{64}$/.test(hash))
                continue;
            try {
                const ref = { sha256: hash, version: p.meta.version[tag] ?? 0 };
                const bytes = await this.#cache.read(gid, ref, signal);
                if (!bytes)
                    continue;
                const parsed = JSON.parse(new TextDecoder().decode(bytes));
                const tree = configRecord(parsed)
                    ? recordTree(parsed, this.#options.facts?.() ?? {}) : parsed;
                if (!tree || typeof tree !== 'object' || Array.isArray(tree))
                    continue;
                bundles[tag] = tree;
                sha256[tag] = hash;
                version[tag] = ref.version;
            }
            catch {
                signal.throwIfAborted();
            }
        }
        this.#check(gid, signal);
        const etag = chain.every((tag) => !p.meta.sha256[tag] || sha256[tag])
            && JSON.stringify(chain) === JSON.stringify(p.chain) && p.meta.etag
            ? { etag: p.meta.etag } : {};
        return {
            status: 'updated', bundles, meta: { sha256, version, ...etag },
            ...(p.index ? { index: p.index } : {}),
        };
    }
    async readCache(request, complete = false) {
        const gid = this.#options.gid();
        const p = this.#pointer(gid);
        if (!p)
            return undefined;
        const result = await this.#read(gid, p, request.chain, request.signal);
        if (complete) {
            return request.chain.every((tag) => result.bundles?.[tag]
                || (!p.meta.sha256[tag] && p.chain.includes(tag))) ? result : undefined;
        }
        if (Object.keys(result.bundles ?? {}).length)
            return result;
        if (result.index) {
            const available = await this.#read(gid, p, Object.keys(p.meta.sha256).filter((tag) => !request.chain.includes(tag)), request.signal);
            if (Object.keys(available.bundles ?? {}).length) {
                return { ...result, bundles: available.bundles };
            }
        }
        return undefined;
    }
    async load(request) {
        const { chain, signal } = request;
        const { source } = this.#options;
        const gid = this.#options.gid();
        const p = this.#pointer(gid);
        const cache = p && await this.#read(gid, p, chain, signal);
        const result = await source.load({
            chain, signal, ...(cache ? { prev: cache.meta } : {}),
        });
        this.#check(gid, signal);
        if (result.status === 'not-modified') {
            return p ? this.#read(gid, p, chain, signal) : result;
        }
        const bundles = { ...result.bundles };
        const raw = {};
        const hashes = {};
        const versions = {};
        for (const tag of chain) {
            const hash = result.meta.sha256[tag];
            if (!bundles[tag] && hash && cache?.meta.sha256[tag] === hash) {
                const old = cache.bundles?.[tag];
                if (old)
                    bundles[tag] = old;
            }
            const tree = bundles[tag];
            if (!tree)
                continue;
            const bytes = result.blobs?.[tag] ?? encoder.encode(JSON.stringify(tree));
            const unchanged = !result.bundles?.[tag] && hash === cache?.meta.sha256[tag];
            const digest = unchanged && hash ? hash : await blobDigest(bytes);
            if (hash && digest !== hash)
                throw new Error('l10n integrity mismatch');
            hashes[tag] = digest;
            versions[tag] = result.meta.version[tag] ?? 0;
            if (!unchanged)
                raw[tag] = bytes;
        }
        signal.throwIfAborted();
        const meta = {
            sha256: hashes, version: versions, ...(result.meta.etag ? { etag: result.meta.etag } : {}),
        };
        const oldIndex = Array.isArray(result.index?.locales) ? result.index : p?.index;
        const index = filterIndex(oldIndex, chain, hashes);
        const retainedHashes = { ...p?.meta.sha256, ...hashes };
        const retainedVersions = { ...p?.meta.version, ...versions };
        for (const tag of Object.keys(retainedHashes)) {
            if ((chain.includes(tag) && !hashes[tag]) ||
                (index && !index.locales.some((locale) => locale.tag === tag))) {
                delete retainedHashes[tag];
                delete retainedVersions[tag];
            }
        }
        const pointer = {
            chain: [...chain],
            meta: { ...meta, sha256: retainedHashes, version: retainedVersions },
            ...(index ? { index } : {}),
        };
        const write = this.#cache.write({
            gid, currentGid: this.#options.gid, signal, pointer, bodies: raw,
        });
        try {
            await write;
        }
        catch {
            signal.throwIfAborted();
        }
        this.#check(gid);
        return { status: 'updated', bundles, meta, ...(index ? { index } : {}) };
    }
    clean() {
        return this.#cache.clean();
    }
}
export class ConfigsL10nSource {
    origin = 'network';
    #options;
    #raw;
    constructor(options) {
        this.#options = {
            transport: options.transport, onIntegrityFailure: options.onIntegrityFailure,
            facts: options.facts ?? (() => ({})),
        };
    }
    async readCache({ chain, prev, signal }) {
        abortIfNeeded(signal);
        const raw = this.#raw;
        if (!raw || !prev || JSON.stringify(chain) !== JSON.stringify(raw.chain)
            || raw.meta.etag !== prev.etag
            || Object.keys(raw.meta.sha256).length !== Object.keys(prev.sha256).length
            || Object.entries(raw.meta.sha256).some(([tag, sha]) => prev.sha256[tag] !== sha))
            return;
        const facts = this.#options.facts.call(this);
        const bundles = {};
        for (const tag of chain) {
            if (!raw.meta.sha256[tag])
                continue;
            const bytes = raw.blobs[tag];
            if (!bytes)
                return;
            bundles[tag] = bundle(JSON.parse(decoder.decode(bytes)), facts);
        }
        const index = raw.index === undefined ? undefined : indexTree(raw.index, facts);
        return { status: 'updated', bundles, blobs: raw.blobs, meta: prev,
            ...(index ? { index: filterIndex(index, chain, prev.sha256) } : {}) };
    }
    async load({ chain, prev, signal }) {
        abortIfNeeded(signal);
        if (chain.length > 199 ||
            chain.some((tag) => canonicalLocale(tag) != tag || tag == '_index'))
            throw new Error('Invalid localization chain');
        if (!prev)
            this.#raw = undefined;
        const keys = ['_index', ...chain];
        const headers = { 'Content-Type': 'application/json' };
        if (prev?.etag)
            headers['If-None-Match'] = prev.etag;
        const response = await this.#options.transport.request({
            method: 'POST',
            url: '/v1/configs/fetch',
            headers,
            body: { scopes: ['localization'], keys },
            signal,
            auth: 'player',
        });
        abortIfNeeded(signal);
        if (response.status == 304) {
            if (!prev)
                throw new Error('Localization cache missing for 304');
            return await this.readCache({ chain, prev, signal }) ?? { status: 'not-modified', meta: prev };
        }
        if (response.status != 200)
            throw new Error(`Localization fetch failed: ${response.status}`);
        const cached = await this.readCache({ chain, signal, ...(prev ? { prev } : {}) });
        const payload = await response.json();
        abortIfNeeded(signal);
        if (!record(payload))
            throw new Error('Invalid localization response');
        const { configs, configsURL: urls = {}, version: scopeVersions } = payload;
        const { localization: inline = {} } = record(configs) ? configs : {};
        if (!record(inline) || !record(urls))
            throw new Error('Invalid localization response');
        const scopeVersion = record(scopeVersions) ? scopeVersions.localization : undefined;
        if (scopeVersion !== undefined &&
            !validVersion(scopeVersion)) {
            throw new Error('Invalid localization version');
        }
        const readURL = async (tag, ref) => {
            const { url, sha256: sha } = ref;
            const controller = new AbortController();
            const downloadSignal = AbortSignal.any([signal, controller.signal]);
            const timer = setTimeout(() => controller.abort(new SDKError('TIMEOUT', { module: 'l10n' })), 10_000);
            let bytes;
            try {
                const blob = await abortableDownload(this.#options.transport.request({
                    method: 'GET', url, headers: {}, signal: downloadSignal, auth: 'none',
                }), downloadSignal);
                if (blob.status != 200) {
                    void blob.body?.cancel().catch(() => { });
                    downloadSignal.throwIfAborted();
                    throw new Error(`Localization download failed: ${blob.status}`);
                }
                bytes = await readResponseBytes(blob, MAX_BLOB_BYTES, downloadSignal, () => {
                    throw new Error('Localization blob too large');
                });
            }
            finally {
                clearTimeout(timer);
            }
            abortIfNeeded(signal);
            const actualHash = await blobDigest(bytes);
            abortIfNeeded(signal);
            if (actualHash != sha) {
                try {
                    this.#options.onIntegrityFailure?.call(this, tag);
                }
                catch {
                }
                throw new Error('Localization integrity failure');
            }
            try {
                return { tree: JSON.parse(decoder.decode(bytes)), bytes };
            }
            catch {
                throw new Error('Invalid localization JSON');
            }
        };
        let index;
        let rawIndex;
        const bundles = {};
        const blobs = {};
        const sha256 = {};
        const version = {};
        for (const tag of keys) {
            const isIndex = tag === '_index';
            let raw;
            let bytes;
            if (Object.hasOwn(inline, tag)) {
                raw = inline[tag];
            }
            else if (Object.hasOwn(urls, `localization/${tag}`)) {
                const ref = descriptor(urls[`localization/${tag}`]);
                if (!isIndex) {
                    sha256[tag] = ref.sha256;
                    version[tag] = ref.version;
                }
                if (!isIndex && prev?.sha256[tag]?.toLowerCase() === ref.sha256) {
                    bytes = cached?.blobs?.[tag];
                    if (!bytes)
                        continue;
                    raw = JSON.parse(decoder.decode(bytes));
                }
                else {
                    const downloaded = await readURL(tag, ref);
                    raw = downloaded.tree;
                    bytes = downloaded.bytes;
                }
            }
            else
                continue;
            if (isIndex) {
                rawIndex = raw;
                index = indexTree(raw, this.#options.facts.call(this));
                continue;
            }
            bundles[tag] = bundle(raw, this.#options.facts.call(this));
            if (!bytes) {
                bytes = encoder.encode(JSON.stringify(raw));
                if (bytes.byteLength > MAX_BLOB_BYTES)
                    throw new Error('Localization blob too large');
                sha256[tag] = await blobDigest(bytes);
                version[tag] = scopeVersion ?? 0;
            }
            abortIfNeeded(signal);
            blobs[tag] = bytes;
        }
        abortIfNeeded(signal);
        index = filterIndex(index, chain, sha256);
        const etag = response.headers.get('ETag');
        const meta = {
            ...(etag ? { etag } : {}),
            sha256,
            version,
        };
        this.#raw = { chain: [...chain], meta, blobs,
            ...(rawIndex !== undefined ? { index: rawIndex } : {}) };
        return { status: 'updated', ...(index ? { index } : {}), bundles, blobs, meta };
    }
}
function abortableDownload(pending, signal) {
    return new Promise((resolve, reject) => {
        const abort = () => reject(signal.reason);
        signal.addEventListener('abort', abort, { once: true });
        if (signal.aborted)
            abort();
        void pending.then((response) => {
            if (signal.aborted)
                void response.body?.cancel().catch(() => { });
            else
                resolve(response);
        }, reject).finally(() => signal.removeEventListener('abort', abort));
    });
}

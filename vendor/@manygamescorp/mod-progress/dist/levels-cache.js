import { object, recordValue } from './levels-validation.js';
const STORAGE_KEY = 'ranges';
const size = (value) => new TextEncoder().encode(JSON.stringify(value)).byteLength;
const id = (scope, key) => `${scope}/${key}`;
export function createLevelsCache(maxBytes, storage, resolve) {
    const entries = new Map();
    let hydrated = false;
    let bytes = 2;
    const cost = (entry) => size(entry) + 1;
    const remove = (key) => {
        const entry = entries.get(key);
        if (entry) {
            bytes -= cost(entry);
            entries.delete(key);
        }
    };
    const trim = () => {
        while (bytes > maxBytes || [...entries.values()].filter(e => e.key !== 'set').length > 64
            || entries.size > 72)
            remove(entries.keys().next().value);
    };
    const persist = () => {
        try {
            storage?.set(STORAGE_KEY, [...entries.values()].filter(e => e.raw));
        }
        catch {
            try {
                storage?.remove(STORAGE_KEY);
            }
            catch { }
        }
    };
    const hydrate = () => {
        if (hydrated)
            return;
        hydrated = true;
        try {
            const saved = storage?.get(STORAGE_KEY);
            if (Array.isArray(saved)) {
                for (const value of saved) {
                    if (!object(value) || typeof value.scope !== 'string' || typeof value.key !== 'string'
                        || !/^levels\.[a-z0-9_-]+(\.[a-z0-9_-]+)*$/.test(value.scope)
                        || !/^(set|r_[A-Za-z0-9_]{1,62})$/.test(value.key) || !object(value.raw)
                        || (value.etag !== undefined && (typeof value.etag !== 'string'
                            || value.etag.length > 1024 || /[\r\n]/.test(value.etag))))
                        continue;
                    const entry = value;
                    resolve?.(entry.raw);
                    remove(id(entry.scope, entry.key));
                    entries.set(id(entry.scope, entry.key), entry);
                    bytes += cost(entry);
                }
                const restored = entries.size;
                trim();
                if (entries.size !== restored)
                    persist();
            }
        }
        catch {
            entries.clear();
            bytes = 2;
        }
    };
    return {
        get(scope, key) {
            hydrate();
            const name = id(scope, key);
            const entry = entries.get(name);
            if (!entry)
                return undefined;
            try {
                const snapshot = entry.raw ? resolve?.(entry.raw) : entry.snapshot;
                if (!snapshot)
                    return undefined;
                entries.delete(name);
                entries.set(name, entry);
                return { ...snapshot, ...(entry.raw ? { raw: entry.raw } : {}),
                    ...(entry.etag ? { etag: entry.etag } : {}) };
            }
            catch {
                remove(name);
                persist();
                return undefined;
            }
        },
        has(scope, key, version) {
            hydrate();
            const entry = entries.get(id(scope, key));
            return !!entry && recordValue((entry.raw ?? entry.snapshot)?.version, scope) === version;
        },
        put(scope, key, snapshot, conditional) {
            hydrate();
            const raw = snapshot.raw;
            const entry = { scope, key,
                ...(conditional && snapshot.etag ? { etag: snapshot.etag } : {}),
                ...(raw ? { raw: { configs: { [scope]: {
                                [key]: recordValue(recordValue(raw.configs, scope), key)
                            } },
                        version: { [scope]: recordValue(raw.version, scope) }, ts: raw.ts } }
                    : { snapshot: { configs: { [scope]: {
                                    [key]: recordValue(recordValue(snapshot.configs, scope), key)
                                } },
                            applied: {}, segments: [], version: { [scope]: recordValue(snapshot.version, scope) },
                            ts: snapshot.ts,
                            ...(recordValue(recordValue(snapshot.levels, scope), key) ? { levels: { [scope]: {
                                        [key]: recordValue(recordValue(snapshot.levels, scope), key),
                                    } } } : {}) } }) };
            remove(id(scope, key));
            if (cost(entry) + 2 <= maxBytes) {
                entries.set(id(scope, key), entry);
                bytes += cost(entry);
                trim();
            }
            persist();
        },
        reset() { entries.clear(); bytes = 2; hydrated = false; },
        clear(scope) {
            hydrate();
            for (const [name, entry] of entries)
                if (!scope || entry.scope === scope)
                    remove(name);
            persist();
        },
    };
}

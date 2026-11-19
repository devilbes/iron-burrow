import { dataClient, dataModule } from './data-module.js';
import { invalidData, jsonCopy, mutationKey, safeName } from '@manygamescorp/core/data-validation';
function keyName(key) {
    if (typeof key !== 'string' || !/^[A-Za-z0-9:_-]{1,128}$/.test(key) || !safeName(key)) {
        invalidData();
    }
    return key;
}
function scopeName(scope) {
    if (scope === undefined || scope === 'global')
        return undefined;
    if (typeof scope !== 'string' || !/^[a-z][a-z0-9_-]{0,31}$/.test(scope)
        || !safeName(scope))
        invalidData();
    return scope;
}
export function createKv(http, signal) {
    const client = dataClient('kv', http, signal);
    const path = (key) => `/me/${encodeURIComponent(keyName(key))}`;
    return {
        get(key, options = {}) {
            return client.request({ method: 'GET', path: path(key),
                query: { scope: scopeName(options.scope) } }, options.signal);
        },
        list(options = {}) {
            return client.request({ method: 'GET', path: '/me',
                query: { scope: scopeName(options.scope) } }, options.signal);
        },
        query(keys, options = {}) {
            if (!Array.isArray(keys) || keys.length < 1 || keys.length > 50)
                invalidData();
            const scope = scopeName(options.scope);
            const body = { keys: [...new Set(keys.map(keyName))],
                ...(scope === undefined ? {} : { scope }) };
            return client.request({ method: 'POST', path: '/me/query', body }, options.signal);
        },
        set(key, value, options = {}) {
            keyName(key);
            const scope = scopeName(options.scope);
            const data = { [key]: jsonCopy(value) };
            return client.request({ method: 'PUT', path: '/me',
                body: { data, ...(scope === undefined ? {} : { scope }) },
                idempotencyKey: mutationKey(options.idempotencyKey) }, options.signal);
        },
        delete(key, options = {}) {
            return client.request({ method: 'DELETE', path: path(key),
                query: { scope: scopeName(options.scope) },
                idempotencyKey: mutationKey(options.idempotencyKey) }, options.signal);
        },
        dispose() { client.dispose(); },
    };
}
export function kvModule() {
    return dataModule({
        settings: { schemaVersion: 1, fields: [{ ref: 'availability' }] },
        id: 'kv', version: '1.0.0', kind: 'service', engines: { core: '^1.0.0' }, targets: ['web', 'cordova'],
        permissions: ['http:player-data'], load: 'eager', entry: 'kv.js',
        events: { emits: [], listens: [] },
    }, createKv);
}

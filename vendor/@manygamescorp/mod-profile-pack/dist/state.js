import { dataClient, dataModule } from './data-module.js';
import { invalidData, jsonCopy, mutationKey, record, versionHeader } from '@manygamescorp/core/data-validation';
export const GAME_STATE_MAX_BYTES = 1_048_576;
export const GAME_STATE_PUBLIC_MAX_BYTES = 8_192;
const MAX_DEPTH = 64;
function object(value, maxBytes) {
    if (!record(value))
        invalidData();
    return jsonCopy(value, maxBytes, MAX_DEPTH);
}
export function createGameState(http, signal) {
    const client = dataClient('gamestate', http, signal);
    return {
        get(options = {}) {
            return client.request({ method: 'GET', path: '/me' }, options.signal);
        },
        set(data, options) {
            if (!record(options))
                invalidData();
            const body = { data: object(data, GAME_STATE_MAX_BYTES),
                ...(options.publicData === undefined ? {} : { publicData: options.publicData === null
                        ? null : object(options.publicData, GAME_STATE_PUBLIC_MAX_BYTES) }) };
            if (options.version === undefined)
                invalidData();
            return client.request({ method: 'PUT', path: '/me', body,
                ifMatch: versionHeader(options.version, 0),
                idempotencyKey: mutationKey(options.idempotencyKey) }, options.signal);
        },
        clear(options = {}) {
            const header = versionHeader(options.version, 0);
            return client.request({ method: 'DELETE', path: '/me',
                ...(header === undefined ? {} : { ifMatch: header }),
                idempotencyKey: mutationKey(options.idempotencyKey) }, options.signal);
        },
        dispose() { client.dispose(); },
    };
}
export function gameStateModule() {
    return dataModule({
        settings: { schemaVersion: 1, fields: [{ ref: 'availability' }] },
        id: 'gamestate', version: '1.0.0', kind: 'service', engines: { core: '^1.0.0' }, targets: ['web', 'cordova'],
        permissions: ['http:game-states'], load: 'eager', entry: 'state.js',
        events: { emits: [], listens: [] },
    }, createGameState);
}

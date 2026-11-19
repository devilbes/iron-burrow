import { isAssetRef } from './vendor/contracts-client/asset-ref.js';
export const PROTOCOL_VERSION = 1;
export const MAX_MESSAGE_BYTES = 256 * 1024;
export const MAX_MODULES = 64;
export const MODULE_ID = /^[a-z][a-z0-9-]{0,31}$/;
const SCREEN = /^(?:main|core|window:[a-z][a-z0-9-]{0,31})$/;
const LOCALE = /^[a-z]{2}(?:-[A-Za-z0-9]{2,8})?$/;
const MAX_SEQ = 2 ** 31 - 1;
const plain = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)
    && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const only = (value, keys) => Object.keys(value).every((key) => keys.includes(key));
const seqOf = (data) => {
    const seq = plain(data) ? data['seq'] : undefined;
    return typeof seq === 'number' && Number.isInteger(seq) && seq >= 0 && seq <= MAX_SEQ ? seq : 0;
};
export const isPanelOrigin = (origin, origins = []) => {
    try {
        const url = new URL(origin);
        return (url.protocol === 'https:' || url.protocol === 'http:')
            && url.origin === origin && origins.includes(origin);
    }
    catch {
        return false;
    }
};
export function parsePreviewMessage(data) {
    const fail = { ok: false, seq: seqOf(data) };
    if (!plain(data))
        return fail;
    try {
        if (JSON.stringify(data).length > MAX_MESSAGE_BYTES)
            return fail;
    }
    catch {
        return fail;
    }
    if (!only(data, ['type', 'v', 'seq', 'settings', 'modules', 'screen', 'orientation',
        'locale']))
        return fail;
    const { type, v, seq, settings, modules, screen, orientation, locale } = data;
    if (type !== 'preview' || v !== PROTOCOL_VERSION || seq !== seqOf(data) || !plain(settings)
        || !Array.isArray(modules) || modules.length > MAX_MODULES
        || typeof screen !== 'string' || !SCREEN.test(screen)
        || (orientation !== 'portrait' && orientation !== 'landscape')
        || (locale !== undefined && (typeof locale !== 'string' || !LOCALE.test(locale))))
        return fail;
    const seen = new Set();
    const list = [];
    for (const item of modules) {
        if (!plain(item) || !only(item, ['id', 'version', 'settings'])
            || typeof item['id'] !== 'string' || !MODULE_ID.test(item['id']) || seen.has(item['id'])
            || !plain(item['settings'])
            || (item['version'] !== undefined
                && (typeof item['version'] !== 'string' || item['version'].length > 64)))
            return fail;
        seen.add(item['id']);
        list.push({ id: item['id'], ...(item['version'] === undefined ? {}
                : { version: item['version'] }), settings: item['settings'] });
    }
    return { ok: true, message: { type: 'preview', v: PROTOCOL_VERSION, seq, settings,
            modules: list, screen: screen, orientation,
            ...(locale === undefined ? {} : { locale }) } };
}
export const langOf = (locale) => locale?.toLowerCase().startsWith('ru') ? 'ru' : 'en';
export function isAllowedImage(value, pageOrigin) {
    if (!isAssetRef(value))
        return false;
    if (!value.startsWith('https://'))
        return true;
    return new URL(value).origin === pageOrigin;
}

import { isAssetHost } from '@manygamescorp/contracts-client/asset-ref';
import { SDKError } from './error.js';
export function parsePlatformConfig(input) {
    let assetError;
    let appIdError;
    try {
        if (typeof input !== 'object' || input === null || Array.isArray(input)
            || !Object.hasOwn(input, 'endpoints') || !Object.hasOwn(input, 'cdn'))
            invalid();
        const source = input;
        const copy = structuredClone({ endpoints: source.endpoints, cdn: source.cdn });
        if (typeof copy !== 'object' || copy === null || Array.isArray(copy))
            invalid();
        const record = copy;
        const endpoints = record.endpoints;
        if (typeof endpoints !== 'object' || endpoints === null || Array.isArray(endpoints)
            || Object.keys(endpoints).some((key) => !['api', 'realtime'].includes(key))
            || !Object.hasOwn(endpoints, 'api'))
            invalid();
        const api = address(endpoints.api, true);
        const rt = Object.hasOwn(endpoints, 'realtime')
            ? address(endpoints.realtime, true).origin : undefined;
        const cdn = address(record.cdn, false);
        if (Object.hasOwn(source, 'app'))
            invalid();
        const appId = Object.hasOwn(source, 'appId') ? source.appId : undefined;
        if (appId === undefined) {
            appIdError = new SDKError('SDK_PLATFORM_APP_ID_REQUIRED', {
                message: 'Add the numeric application appId to platform.json', retryable: false,
            });
            throw appIdError;
        }
        if (typeof appId !== 'number' || !Number.isSafeInteger(appId) || appId < 1)
            invalid();
        const clientAuthoritative = Object.hasOwn(source, 'clientAuthoritative')
            ? source.clientAuthoritative : undefined;
        if (clientAuthoritative !== undefined && typeof clientAuthoritative !== 'boolean')
            invalid();
        const gameType = Object.hasOwn(source, 'gameType') ? source.gameType : undefined;
        if (gameType !== undefined && (typeof gameType !== 'string'
            || !['server', 'client', 'offline'].includes(gameType)))
            invalid();
        const store = Object.hasOwn(source, 'store') ? source.store : undefined;
        if (store !== undefined && (typeof store !== 'string' || !/^[a-z][a-z0-9_]{0,31}$/.test(store))) {
            invalid();
        }
        const declared = Object.hasOwn(source, 'environment') ? source.environment : undefined;
        const environment = typeof declared === 'string'
            && ['local', 'dev', 'test', 'prod'].includes(declared) ? declared : undefined;
        const assets = Object.hasOwn(source, 'assets') ? source.assets : undefined;
        let assetSettings;
        try {
            if (typeof assets !== 'object' || assets === null || Array.isArray(assets)
                || !Object.hasOwn(assets, 'cdnBase') || Object.keys(assets).some((key) => !['cdnBase', 'allowedHosts'].includes(key)))
                invalid();
            const cdnBase = assets.cdnBase;
            if (typeof cdnBase !== 'string' || cdnBase.includes('%'))
                invalid();
            address(cdnBase, false);
            const hosts = assets['allowedHosts'];
            if (hosts !== undefined && (!Array.isArray(hosts) || hosts.length > 32
                || hosts.some(host => !isAssetHost(host))))
                invalid();
            assetSettings = Object.freeze({ cdnBase: cdnBase.endsWith('/') ? cdnBase : `${cdnBase}/`,
                ...(hosts !== undefined
                    ? { allowedHosts: Object.freeze([...hosts]) } : {}) });
        }
        catch {
            assetError = new SDKError('SDK_PLATFORM_CONFIG_INVALID', {
                message: 'Configure assets.cdnBase with the environment public app-assets URL', retryable: false,
            });
            throw assetError;
        }
        let loginProviders;
        if (Object.hasOwn(source, 'loginProviders')) {
            const publicValue = source.loginProviders;
            if (typeof publicValue !== 'object' || publicValue === null
                || Array.isArray(publicValue))
                invalid();
            const publicRecord = publicValue;
            const exact = (value, keys) => typeof value === 'object' && value !== null && !Array.isArray(value)
                && Object.keys(value).every((key) => keys.includes(key));
            if (typeof publicRecord.version !== 'string'
                || !exact(publicRecord, ['version', 'google', 'facebook'])
                || !exact(publicRecord.google, ['enabled', 'webClientId', 'androidClientId'])
                || !exact(publicRecord.facebook, ['enabled', 'appId', 'redirectUris']))
                invalid();
            const { supportedPlatforms: _platforms, ...projection } = parseProviderConfig({
                ...publicRecord, supportedPlatforms: { google: [], facebook: [] },
            });
            loginProviders = Object.freeze(projection);
        }
        const moduleConfig = Object.hasOwn(source, 'moduleConfig') ? source.moduleConfig : undefined;
        if (moduleConfig !== undefined && (typeof moduleConfig !== 'object' || moduleConfig === null
            || Array.isArray(moduleConfig) || Object.keys(moduleConfig).length > 64
            || JSON.stringify(moduleConfig).length > 64 * 1024))
            invalid();
        const settings = moduleConfig === undefined ? undefined
            : structuredClone(moduleConfig);
        return Object.freeze({ assets: assetSettings,
            ...(loginProviders === undefined ? {} : { loginProviders }),
            ...(settings === undefined ? {} : { moduleConfig: settings }),
            appId,
            ...(clientAuthoritative === undefined ? {} : { clientAuthoritative }),
            ...(gameType === undefined ? {} : { gameType: gameType }),
            ...(store === undefined ? {} : { store }),
            ...(environment === undefined ? {} : { environment: environment }),
            endpoints: Object.freeze({ api: api.origin, ...(rt === undefined ? {} : { realtime: rt }) }),
            cdn: cdn.href });
    }
    catch (error) {
        if (appIdError !== undefined && error === appIdError)
            throw appIdError;
        if (assetError !== undefined && error === assetError)
            throw assetError;
        return invalid();
    }
}
export function createEndpoints(platformConfig) {
    const config = parsePlatformConfig(platformConfig);
    return Object.freeze({
        appId: config.appId,
        api: config.endpoints.api, cdn: config.cdn,
        service: (service) => `${service === 'realtime' ? config.endpoints.realtime ?? config.endpoints.api
            : config.endpoints.api}${servicePrefix(service)}`,
    });
}
export function servicePrefix(service) {
    if (typeof service !== 'string' || service.length > 64
        || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(service)) {
        throw new SDKError('SDK_PERMISSION_DENIED');
    }
    return `/v1/${service}`;
}
function address(value, originOnly) {
    if (typeof value !== 'string' || value.length > 2048 || /[\s\\?#]/.test(value))
        invalid();
    const url = new URL(value);
    if (!(url.protocol === 'https:' || (url.protocol === 'http:'
        && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))
        || url.username || url.password || (originOnly && url.pathname !== '/'))
        invalid();
    if (value !== url.href && value !== url.origin)
        invalid();
    return url;
}
function invalid() {
    throw new SDKError('SDK_PLATFORM_CONFIG_INVALID', {
        message: 'Invalid platform.json', retryable: false,
    });
}
export function parseProviderConfig(value) {
    const object = (value) => (typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {});
    const text = (value, limit = 1024) => typeof value === 'string' && value.length > 0 && value.length <= limit;
    const https = (value) => {
        if (!text(value, 4096))
            return false;
        try {
            const url = new URL(value);
            return url.protocol === 'https:' && !url.username && !url.password;
        }
        catch {
            return false;
        }
    };
    const callbackUri = (value) => {
        if (!https(value) || value.length > 2048)
            return false;
        const url = new URL(value);
        return !url.search && !url.hash && url.pathname === '/v1/auth/oauth/callback/facebook'
            && url.href === value && url.hostname !== 'localhost' && !url.hostname.startsWith('[')
            && !/^\d+(?:\.\d+){3}$/.test(url.hostname);
    };
    const v = object(value), g = object(v.google), f = object(v.facebook);
    const platforms = object(v.supportedPlatforms);
    const strings = (items, allowed) => Array.isArray(items) && items.length <= allowed.length && new Set(items).size === items.length
        && items.every((item) => typeof item === 'string' && allowed.includes(item));
    const googleId = (value) => value === null
        || (text(value, 256) && /^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(value));
    const facebookId = (value) => value === null
        || (text(value, 32) && /^[1-9][0-9]*$/.test(value));
    const has = (key) => Object.hasOwn(v, key);
    if (typeof value !== 'object' || value === null || Array.isArray(value)
        || ((has('google') || has('facebook')) && !has('version'))
        || (has('version') && (!text(v.version, 24) || !/^(0|[a-f0-9]{24})$/.test(v.version)))
        || (has('google') && (typeof g.enabled !== 'boolean' || !googleId(g.webClientId)
            || !googleId(g.androidClientId) || Array.isArray(v.google)))
        || (has('facebook') && (typeof f.enabled !== 'boolean' || !facebookId(f.appId)
            || !Array.isArray(f.redirectUris) || f.redirectUris.length > 4
            || new Set(f.redirectUris).size !== f.redirectUris.length
            || !f.redirectUris.every(callbackUri)
            || Array.isArray(v.facebook)))
        || (has('supportedPlatforms') && (typeof v.supportedPlatforms !== 'object'
            || v.supportedPlatforms === null || Array.isArray(v.supportedPlatforms)
            || (Object.hasOwn(platforms, 'google') && !strings(platforms.google, ['web', 'android']))
            || (Object.hasOwn(platforms, 'facebook') && !strings(platforms.facebook, ['web']))))) {
        throw new SDKError('SDK_AUTH_RESPONSE_INVALID', { module: 'auth', retryable: false });
    }
    return Object.freeze({
        ...(has('version') ? { version: v.version } : {}),
        ...(has('google') ? { google: Object.freeze({ enabled: g.enabled,
                webClientId: g.webClientId,
                androidClientId: g.androidClientId }) } : {}),
        ...(has('facebook') ? { facebook: Object.freeze({ enabled: f.enabled,
                appId: f.appId,
                redirectUris: Object.freeze([...f.redirectUris]) }) } : {}),
        ...(has('supportedPlatforms') ? { supportedPlatforms: Object.freeze({
                ...(Object.hasOwn(platforms, 'google') ? {
                    google: Object.freeze([...platforms.google])
                } : {}),
                ...(Object.hasOwn(platforms, 'facebook') ? {
                    facebook: Object.freeze([...platforms.facebook])
                } : {}),
            }) } : {}),
    });
}
export function parseOAuthConfigResponse(value) {
    const fail = () => {
        throw new SDKError('SDK_AUTH_RESPONSE_INVALID', { module: 'auth', retryable: false });
    };
    const record = (item, keys) => {
        if (typeof item !== 'object' || item === null || Array.isArray(item)
            || Object.keys(item).some((key) => !keys.includes(key)))
            return fail();
        return item;
    };
    const googleId = (item) => {
        if (item === undefined)
            return null;
        if (typeof item !== 'string' || item.length > 256
            || !/^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(item))
            return fail();
        return item;
    };
    const body = record(value, ['google', 'apple', 'facebook']);
    let google;
    const platforms = {};
    if (Object.hasOwn(body, 'google')) {
        const ids = record(record(body.google, ['clientIds']).clientIds, ['web', 'android', 'ios']);
        if (ids.ios !== undefined && (typeof ids.ios !== 'string' || ids.ios.length === 0
            || ids.ios.length > 256))
            fail();
        const web = googleId(ids.web), android = googleId(ids.android);
        google = Object.freeze({ enabled: true, webClientId: web, androidClientId: android });
        platforms.google = [...(web === null ? [] : ['web']),
            ...(android === null ? [] : ['android'])];
    }
    if (Object.hasOwn(body, 'apple')) {
        const serviceId = record(body.apple, ['serviceId']).serviceId;
        if (serviceId !== undefined && (typeof serviceId !== 'string' || serviceId.length === 0
            || serviceId.length > 256))
            fail();
    }
    let facebook;
    if (Object.hasOwn(body, 'facebook')) {
        const appId = record(body.facebook, ['appId']).appId;
        if (typeof appId !== 'string' || appId.length > 32 || !/^[1-9][0-9]*$/.test(appId))
            fail();
        facebook = Object.freeze({ enabled: true, appId: appId,
            redirectUris: Object.freeze([]) });
        platforms.facebook = ['web'];
    }
    return Object.freeze({
        ...(google === undefined ? {} : { google }),
        ...(facebook === undefined ? {} : { facebook }),
        supportedPlatforms: Object.freeze({
            ...(platforms.google === undefined ? {} : { google: Object.freeze(platforms.google) }),
            ...(platforms.facebook === undefined ? {} : { facebook: Object.freeze(platforms.facebook) }),
        }),
    });
}

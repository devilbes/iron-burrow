import { isAssetHost } from '@manygamescorp/contracts-client/asset-ref';
import { resolveAssetRef } from './asset-ref.js';
import { SDKError } from './error.js';
const KEY = /^apps\/([1-9][0-9]*)\/(inventory-icon|offer-icon|offer-banner|avatar|app-icon|notification-image|config-asset|build-artifact|skin)\/[a-f0-9]{64}\.[a-z][a-z0-9]{0,15}$/;
export function createAssets(cdnBase, allowedHosts = []) {
    if (allowedHosts.length > 32 || allowedHosts.some(host => !isAssetHost(host)))
        missingBase();
    const hosts = Object.freeze([...allowedHosts]);
    let base;
    if (cdnBase !== undefined) {
        try {
            const url = new URL(cdnBase);
            if (typeof cdnBase !== 'string' || cdnBase.length > 2048 || /[\s\\%?#]/.test(cdnBase)
                || url.username || url.password || (cdnBase !== url.href && cdnBase !== url.origin)
                || !(url.protocol === 'https:' || (url.protocol === 'http:'
                    && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))))
                throw new Error();
            base = cdnBase.endsWith('/') ? cdnBase : `${cdnBase}/`;
        }
        catch {
            missingBase();
        }
    }
    const assets = {
        resolve(ref, options = {}) {
            const resolved = resolveAssetRef(ref, { ...options, assetUrl: assets.url,
                allowedHosts: hosts });
            if (!resolved)
                throw new SDKError('VALIDATION_FAILED', { module: 'assets', retryable: false });
            return resolved.url;
        },
        url(key) {
            const match = typeof key === 'string' && key.length <= 256 ? KEY.exec(key) : null;
            if (!match || match[0] !== key || !Number.isSafeInteger(Number(match[1]))) {
                throw new SDKError('VALIDATION_FAILED', {
                    module: 'assets', message: 'Asset key must be apps/<appId>/<kind>/<sha256>.<ext>, without a URL host',
                    retryable: false,
                });
            }
            if (!base)
                missingBase();
            return `${base}${key}`;
        },
    };
    return Object.freeze(assets);
}
function missingBase() {
    throw new SDKError('SDK_PLATFORM_CONFIG_INVALID', {
        module: 'assets', message: 'Configure assets.cdnBase with the environment public app-assets URL',
        retryable: false,
    });
}

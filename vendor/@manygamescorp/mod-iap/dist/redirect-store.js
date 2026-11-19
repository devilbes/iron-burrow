import { SDKError } from '@manygamescorp/core/error';
import { own } from './store.js';
import { storePrices } from './store-prices.js';
export function redirectUrl(value) {
    if (typeof value !== 'string' || value.length > 4096)
        return false;
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && !url.username && !url.password;
    }
    catch {
        return false;
    }
}
export function redirectPaymentsDomain() {
    return { ns: 'payments', versions: [1],
        schemas: { 'checkout.open': { safeParse(value) {
                    return { success: typeof value === 'object' && value !== null
                            && Object.keys(value).length === 2
                            && typeof own(value, 'orderId') === 'string'
                            && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(String(own(value, 'orderId')))
                            && redirectUrl(own(value, 'url')), data: value };
                } } },
        responseSchemas: { 'checkout.open': { safeParse(value) {
                    return { success: typeof value === 'object' && value !== null
                            && Object.keys(value).length === 1
                            && (own(value, 'status') === 'completed' || own(value, 'status') === 'canceled'), data: value };
                } } }, timeouts: { 'checkout.open': 30 * 60 * 1000 } };
}
export function redirectStore(deps) {
    if (!/^[a-z][a-z0-9_]{0,63}$/.test(deps.storeId)) {
        throw new SDKError('VALIDATION_FAILED', { module: 'iap' });
    }
    return {
        id: deps.storeId, provider: deps.storeId, storeKey: deps.storeId,
        confirmation: 'redirect',
        init: async () => { },
        products: (requests, signal) => storePrices(deps.http, deps.storeId, deps.storeId, requests, signal),
        async purchase(request, signal) {
            signal?.throwIfAborted();
            const url = own(request.confirmation, 'url');
            if (own(request.confirmation, 'type') !== 'redirect' || !redirectUrl(url)) {
                return { status: 'failed', code: 'SDK_IAP_STORE_ERROR' };
            }
            void deps.portal.request('payments', 'checkout.open', { orderId: request.orderId, url })
                .catch(() => undefined);
            return { status: 'pending' };
        },
        finish: async () => { }, restore: async () => [], subscriptions: async () => [],
        onTransaction: () => () => { },
    };
}

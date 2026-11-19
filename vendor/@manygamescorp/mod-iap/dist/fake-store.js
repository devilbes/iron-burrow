import { storePrices } from './store-prices.js';
import { randomUuid } from '@manygamescorp/core/context';
import { SDKError } from '@manygamescorp/core/error';
import { productionBuild } from './store.js';
export function fakeReceipt(orderId, transactionId, productId) {
    return `fake-receipt:v1:${orderId}:${transactionId}:${productId}`;
}
export const fakeStoreState = () => ({ owned: new Map(), deferred: new Map() });
export function fakeStore(options = {}) {
    if (productionBuild()) {
        throw new SDKError('SDK_PERMISSION_DENIED', { module: 'iap',
            message: 'The fake store is not available in production builds' });
    }
    const storeKey = options.storeKey ?? 'google_play';
    if (!/^[a-z][a-z0-9_]{0,31}$/.test(storeKey)) {
        throw new SDKError('VALIDATION_FAILED', { module: 'iap', message: 'Unknown storeKey' });
    }
    const ask = options.ask ?? (() => Promise.reject(new SDKError('SDK_IAP_NOT_AVAILABLE', { module: 'iap', message: 'fakePaymentSheet missing' })));
    const { owned, deferred } = options.state ?? fakeStoreState();
    const handlers = new Set();
    const deliver = (transaction) => {
        for (const handler of [...handlers]) {
            try {
                handler(transaction);
            }
            catch { }
        }
    };
    const purchased = (request) => {
        const transactionId = `fake-${randomUuid()}`;
        const transaction = { orderId: request.orderId, transactionId,
            productRef: { productKey: request.productKey, ...request.binding },
            proof: { type: 'receipt', value: fakeReceipt(request.orderId, transactionId, request.sku) } };
        owned.set(transactionId, { transaction, productKey: request.productKey,
            type: request.type, finished: false });
        return transaction;
    };
    let http;
    const quotes = new Map();
    const product = (item) => ({
        productKey: item.productKey, sku: item.sku, title: item.name,
        price: null, currency: null, priceText: '—'
    });
    return {
        id: 'fake', provider: 'fake_store', storeKey, fake: true,
        async init(_signal, context) { http = context?.http; quotes.clear(); },
        async products(products, signal) {
            if (!http)
                throw new SDKError('SDK_IAP_STORE_ERROR', { module: 'iap' });
            const answer = await storePrices(http, 'fake_store', storeKey, products, signal);
            quotes.clear();
            for (const item of answer.slice(0, 200))
                quotes.set(item.productKey, item);
            return answer;
        },
        async purchase(request, signal) {
            if (request.type !== 'consumable' && [...owned.values()].some((item) => item.transaction.productRef.productId === request.sku))
                return { status: 'already_owned' };
            const item = { productKey: request.productKey, sku: request.sku,
                binding: request.binding, type: request.type, name: request.productKey };
            const cached = quotes.get(item.productKey);
            const asking = options.outcome === undefined || options.outcome === 'ask';
            const shown = request.product ?? (cached?.sku === item.sku ? cached : undefined)
                ?? (http && asking
                    ? (await storePrices(http, 'fake_store', storeKey, [item], signal)).at(0) : product(item));
            const outcome = options.outcome === undefined || options.outcome === 'ask'
                ? await ask({ orderId: request.orderId, productKey: request.productKey,
                    sku: request.sku, type: request.type, title: shown.title, priceText: shown.priceText,
                    price: shown.price, currency: shown.currency,
                    ...(request.offer ? { offer: request.offer } : {}) })
                : options.outcome;
            switch (outcome) {
                case 'success': return { status: 'purchased', transaction: purchased(request) };
                case 'cancel': return { status: 'canceled' };
                case 'pending':
                    deferred.set(request.orderId, request);
                    return { status: 'pending' };
                default: return { status: 'failed', code: 'SDK_IAP_STORE_ERROR' };
            }
        },
        async finish(transaction) {
            const item = owned.get(transaction.transactionId);
            if (!item)
                return;
            item.finished = true;
            if (item.type === 'consumable')
                owned.delete(transaction.transactionId);
        },
        async restore() {
            return [...owned.values()].filter((item) => item.type !== 'consumable')
                .map((item) => item.transaction);
        },
        async subscriptions() {
            return [...owned.values()].filter((item) => item.type === 'subscription')
                .map((item) => ({ productKey: item.productKey, state: 'active' }));
        },
        onTransaction(handler) {
            handlers.add(handler);
            const unfinished = [...owned.values()].filter((item) => !item.finished)
                .map((item) => item.transaction);
            void Promise.resolve().then(() => {
                for (const transaction of unfinished)
                    if (handlers.has(handler))
                        handler(transaction);
            });
            return () => { handlers.delete(handler); };
        },
        settle(orderId, outcome) {
            const request = deferred.get(orderId);
            if (!request)
                return;
            deferred.delete(orderId);
            if (outcome === 'success')
                deliver(purchased(request));
        },
    };
}

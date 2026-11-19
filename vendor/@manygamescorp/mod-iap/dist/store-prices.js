import { SDKError } from '@manygamescorp/core/error';
import { own } from './store.js';
export async function storePrices(http, provider, storeKey, requests, signal) {
    const result = [];
    for (let offset = 0; offset < requests.length; offset += 20) {
        signal?.throwIfAborted();
        const batch = requests.slice(offset, offset + 20);
        const answer = await http.request({ method: 'POST', path: '/store/products',
            body: { provider, storeKey, productKeys: [...new Set(batch.map(item => item.productKey))] },
            ...(signal ? { signal } : {}) });
        signal?.throwIfAborted();
        const products = own(answer, 'products');
        const invalid = () => { throw new SDKError('SDK_IAP_STORE_ERROR', { module: 'iap' }); };
        if (!Array.isArray(products) || products.length > batch.length)
            invalid();
        const quotes = new Map();
        for (const value of products) {
            const key = own(value, 'productKey'), sku = own(value, 'sku');
            const price = own(value, 'price'), currency = own(value, 'currency');
            const item = batch.find(item => item.productKey === key && item.sku === sku);
            if (!item || quotes.has(item.productKey)
                || !(price === null && currency === null || typeof price === 'number'
                    && Number.isFinite(price) && price >= 0 && typeof currency === 'string'
                    && /^[A-Z]{3}$/.test(currency)))
                invalid();
            const amount = price, code = currency;
            quotes.set(item.productKey, { productKey: item.productKey, sku: item.sku,
                title: item.name, price: amount, currency: code,
                priceText: formatStorePrice(amount, code) });
        }
        for (const item of batch)
            result.push(quotes.get(item.productKey) ?? {
                productKey: item.productKey, sku: item.sku, title: item.name,
                price: null, currency: null, priceText: '—'
            });
    }
    return result;
}
export function formatStorePrice(price, currency) {
    if (price === null || currency === null)
        return '—';
    const lang = typeof document !== 'undefined' && document.documentElement?.lang || 'en';
    try {
        return new Intl.NumberFormat(lang, { style: 'currency', currency }).format(price);
    }
    catch {
        return `${price} ${currency}`;
    }
}

import { SDKError } from '@manygamescorp/core/error';
function gameOrder(order) {
    return { orderId: order.orderId, offerKey: order.offerKey, variantKey: order.variantKey,
        placementKey: order.placementKey, productKey: order.productKey,
        productType: order.productType, consumable: order.consumable,
        entities: order.entities.map(({ id, amount }) => ({ id, amount })),
        status: order.status, grantStatus: order.grantStatus,
        environment: order.environment, price: order.price, currency: order.currency,
        createdAt: order.createdAt, updatedAt: order.updatedAt, expiresAt: order.expiresAt,
        validatedAt: order.validatedAt, grantedAt: order.grantedAt };
}
function gameOffer(offer) {
    const { product, ...view } = offer;
    if (!product)
        return view;
    const { sku: _sku, binding: _binding, store, ...info } = product;
    return { ...view, product: { ...info, ...(store ? { title: store.title } : {}),
            price: store?.price ?? null, currency: store?.currency ?? null,
            priceText: store?.priceText ?? '—' } };
}
export function iapErrorCode(error) {
    const code = typeof error === 'string' ? error
        : typeof error === 'object' && error !== null && 'code' in error ? error.code : '';
    switch (code) {
        case 'SDK_IAP_CANCELED':
        case 'SDK_IAP_PENDING':
        case 'SDK_IAP_FAILED':
        case 'SDK_IAP_ALREADY_OWNED':
        case 'SDK_IAP_VALIDATION_FAILED':
        case 'SDK_IAP_NETWORK_ERROR':
        case 'SDK_IAP_STORE_ERROR': return code;
        case 'SDK_IAP_NOT_AVAILABLE':
        case 'IAP_PROVIDER_UNAVAILABLE':
        case 'IAP_STORE_NOT_SUPPORTED':
        case 'IAP_OFFER_NOT_FOUND':
        case 'store_unavailable':
        case 'no_product':
        case 'schedule':
        case 'cooldown':
        case 'limit_offer':
        case 'limit_placement':
        case 'unavailable': return 'SDK_IAP_NOT_AVAILABLE';
        case 'NETWORK_ERROR':
        case 'TIMEOUT':
        case 'UPSTREAM_UNAVAILABLE':
            return 'SDK_IAP_NETWORK_ERROR';
        case 'VALIDATION_FAILED':
        case 'IAP_RECEIPT_PRODUCT_MISMATCH':
        case 'IAP_STORE_VALIDATION_FAILED':
        case 'IAP_PURCHASE_ACCOUNT_MISMATCH':
            return 'SDK_IAP_VALIDATION_FAILED';
        default: return 'SDK_IAP_STORE_ERROR';
    }
}
function outcome(result) {
    const order = result.order ? { order: gameOrder(result.order) } : {};
    if (result.status === 'granted')
        return { orderId: result.orderId, status: 'purchased', ...order };
    if (result.status === 'pending')
        return { orderId: result.orderId, status: 'pending',
            code: 'SDK_IAP_PENDING', ...order };
    if (result.status === 'cancelled')
        return { orderId: result.orderId, status: 'canceled',
            code: 'SDK_IAP_CANCELED', ...order };
    const code = iapErrorCode(result.code);
    return { orderId: result.orderId,
        status: code === 'SDK_IAP_ALREADY_OWNED' ? 'already_owned'
            : code === 'SDK_IAP_NOT_AVAILABLE' ? 'not_available' : 'failed', code, ...order };
}
export function iapError(error) {
    return new SDKError(iapErrorCode(error), { module: 'iap',
        ...(error instanceof SDKError ? {
            ...(error.rid === undefined ? {} : { rid: error.rid }),
            ...(error.httpStatus === undefined ? {} : { httpStatus: error.httpStatus }),
            retryable: error.retryable,
            ...(error.retryAfterMs === undefined ? {} : { retryAfterMs: error.retryAfterMs }),
        } : {}) });
}
function gameEntitlement(value) {
    return { productKey: value.productKey, orderId: value.orderId, kind: value.kind,
        state: value.state, autoRenew: value.autoRenew, expiresAt: value.expiresAt };
}
export function publicIap(raw) {
    const safe = async (operation) => {
        try {
            return await operation();
        }
        catch (error) {
            if (error instanceof SDKError && ['MODULE_NOT_ACTIVE', 'VALIDATION_FAILED', 'NOT_FOUND'].includes(error.code))
                throw error;
            throw iapError(error);
        }
    };
    const state = (value) => ({ ...value,
        pendingOrders: value.pendingOrders.map(gameOrder),
        entitlements: value.entitlements.map(gameEntitlement) });
    return {
        load: async (options) => state(await safe(() => raw.load(options))),
        state: () => { const value = raw.state(); return value ? state(value) : undefined; },
        offers: (input) => raw.offers(input).map(gameOffer),
        offer: (input) => {
            const value = raw.offer(input);
            return value ? gameOffer(value) : undefined;
        },
        products: async (options) => (await safe(() => raw.products(options))).map((product) => ({ productKey: product.productKey,
            title: product.title, price: product.price, currency: product.currency,
            priceText: product.priceText })),
        purchase: async (input) => {
            try {
                return outcome(await raw.purchase(input));
            }
            catch (error) {
                if (error instanceof SDKError && ['MODULE_NOT_ACTIVE', 'VALIDATION_FAILED', 'NOT_FOUND'].includes(error.code))
                    throw error;
                const code = iapErrorCode(error);
                return { orderId: null,
                    status: code === 'SDK_IAP_NOT_AVAILABLE' ? 'not_available' : 'failed', code };
            }
        },
        createAdOrder: async (input) => {
            const value = await safe(() => raw.createAdOrder(input));
            return { ...gameOrder(value), ...(value.ads ? { ads: value.ads } : {}) };
        },
        claim: async (id) => {
            const value = await safe(() => raw.claim(id));
            return { ...value, order: gameOrder(value.order) };
        },
        cancelOrder: async (orderId, reason) => gameOrder(await safe(() => raw.cancelOrder(orderId, reason))),
        order: async (orderId, options) => gameOrder(await safe(() => raw.order(orderId, options))),
        waitOrder: async (orderId, options) => gameOrder(await safe(() => raw.waitOrder(orderId, options))),
        orders: async (query) => {
            const page = await safe(() => raw.orders(query));
            return { ...page, items: page.items.map(gameOrder) };
        },
        pendingOrders: async () => (await safe(() => raw.pendingOrders())).map(gameOrder),
        entitlements: async (options) => (await safe(() => raw.entitlements(options))).map(gameEntitlement),
        subscriptions: async (options) => (await safe(() => raw.entitlements(options))).filter((item) => item.kind === 'subscription').map(gameEntitlement),
        openSubscriptionManagement: () => safe(() => raw.openSubscriptionManagement()),
        restore: async () => {
            const value = await safe(() => raw.restore());
            return { restored: value.restored,
                orders: value.orders.map(({ orderId, status }) => ({ orderId, status })),
                entitlements: value.entitlements.map(gameEntitlement),
                conflicts: value.conflicts.map(() => ({ code: 'SDK_IAP_ALREADY_OWNED' })) };
        },
        dispose: () => raw.dispose(),
    };
}

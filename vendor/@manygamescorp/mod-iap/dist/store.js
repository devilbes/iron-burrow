export function own(value, key) {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? new Map(Object.entries(value)).get(key) : undefined;
}
export function productionBuild() {
    const env = import.meta.env;
    return env?.PROD === true || env?.MODE === 'production';
}
export function fakeAllowed(environment) {
    return !productionBuild()
        && (environment === 'local' || environment === 'dev' || environment === 'test');
}
export function storeBinding(bindings, storeKey) {
    const value = own(bindings, storeKey);
    const productId = own(value, 'productId');
    if (typeof productId !== 'string' || !/^[A-Za-z0-9._-]{1,128}$/.test(productId)) {
        return undefined;
    }
    const basePlanId = own(value, 'basePlanId'), offerId = own(value, 'offerId');
    if ([basePlanId, offerId].some((id) => id !== undefined
        && (typeof id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,62}$/.test(id))))
        return undefined;
    if (offerId !== undefined && basePlanId === undefined)
        return undefined;
    return { productId, ...(typeof basePlanId === 'string' ? { basePlanId } : {}),
        ...(typeof offerId === 'string' ? { offerId } : {}) };
}
export function isStoreAdapter(value) {
    const adapter = value;
    return adapter !== null && typeof adapter === 'object'
        && typeof adapter.id === 'string' && typeof adapter.provider === 'string'
        && typeof adapter.storeKey === 'string'
        && typeof adapter.init === 'function' && typeof adapter.products === 'function'
        && typeof adapter.purchase === 'function' && typeof adapter.finish === 'function'
        && typeof adapter.restore === 'function' && typeof adapter.subscriptions === 'function'
        && typeof adapter.onTransaction === 'function';
}

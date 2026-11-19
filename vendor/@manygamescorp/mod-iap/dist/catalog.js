import { own, storeBinding } from './store.js';
export const OFFERS_SCOPE = 'iap.offers';
export const PLACEMENTS_SCOPE = 'iap.placements';
export const PRODUCTS_SCOPE = 'iap.settings.products';
export const NO_USAGE = Object.freeze({ session: 0, recent: Object.freeze([]), total: 0,
    lastAt: null });
const KEY = /^[A-Za-z0-9_-]{1,64}$/;
const HOUR = 3_600_000;
const DAY = 86_400_000;
function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
const count = (value) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
const text = (value, max = 1024) => typeof value === 'string' && value.length <= max ? value : undefined;
function limits(value) {
    if (!record(value))
        return {};
    return Object.fromEntries(['perSession', 'perHour', 'perDay', 'total']
        .flatMap((key) => {
        const limit = count(own(value, key));
        return limit === undefined ? [] : [[key, limit]];
    }));
}
function variant(value, kind = 'free') {
    if (!record(value) || typeof value.key !== 'string' || !KEY.test(value.key)
        || (kind === 'paid' ? value.entities !== undefined : !Array.isArray(value.entities)))
        return undefined;
    const source = Array.isArray(value.entities) ? value.entities : [];
    if (source.length > 16)
        return undefined;
    const entities = source.flatMap((item) => record(item)
        && typeof item.id === 'string' && /^[A-Za-z0-9_:-]{1,128}$/.test(item.id)
        && typeof item.amount === 'number' && Number.isInteger(item.amount)
        && item.amount >= 1 && item.amount <= 1_000_000
        ? [{ id: item.id, amount: item.amount }] : []);
    const productKey = typeof value.productKey === 'string' && KEY.test(value.productKey)
        ? value.productKey : undefined;
    if (entities.length !== source.length
        || new Set(entities.map((item) => item.id)).size !== entities.length
        || (kind === 'paid' ? productKey === undefined : productKey !== undefined || entities.length === 0))
        return undefined;
    const description = text(value.description);
    return { key: value.key, ...(description === undefined ? {} : { description }),
        ...(productKey === undefined ? {} : { productKey }), entities, custom: value.custom ?? null,
        ...(value.ui === undefined ? {} : { ui: value.ui }) };
}
export function parseOffer(value) {
    if (!record(value) || value.enabled === false)
        return undefined;
    const kind = value.kind;
    if (kind !== 'paid' && kind !== 'free' && kind !== 'ad')
        return undefined;
    const variants = Array.isArray(value.variants)
        ? value.variants.slice(0, 16).flatMap((item) => variant(item, kind) ?? []) : [];
    if (variants.length === 0 || !Array.isArray(value.variants)
        || variants.length !== value.variants.length)
        return undefined;
    const format = value.format === 'rewarded' || value.format === 'rewarded_interstitial'
        ? value.format : undefined;
    if (kind === 'ad' && format === undefined)
        return undefined;
    const description = text(value.description);
    const iconUrl = text(value.iconUrl, 2048);
    return {
        name: text(value.name, 128) ?? '', kind, ...(format === undefined ? {} : { format }),
        ...(description === undefined ? {} : { description }),
        limits: limits(value.limits), cooldownSec: count(value.cooldownSec) ?? 0,
        durationSec: count(value.durationSec) ?? null,
        schedule: typeof value.schedule === 'string' ? value.schedule : null, variants,
        ...(iconUrl === undefined ? {} : { iconUrl }),
        ...(value.ui === undefined ? {} : { ui: value.ui }),
        ...(value.customs === undefined ? {} : { customs: value.customs }),
    };
}
export function placementOfferKeys(value) {
    if (!record(value) || !Array.isArray(value.offers))
        return [];
    return [...new Set(value.offers.slice(0, 32).filter((key) => typeof key === 'string' && KEY.test(key)))];
}
export function parseProduct(productKey, value, storeKey, prices) {
    if (!record(value) || value.skus !== undefined)
        return undefined;
    const type = value.type;
    if (type !== 'consumable' && type !== 'non_consumable' && type !== 'subscription')
        return undefined;
    const binding = storeKey === null ? undefined : storeBinding(value.bindings, storeKey);
    const sku = binding?.productId;
    const entities = variant({ key: 'default', entities: value.entities })?.entities ?? [];
    if (entities.length === 0)
        return undefined;
    const store = prices?.get(productKey);
    return { productKey, type, name: text(value.name, 128) ?? productKey,
        ...(sku === undefined ? {} : { sku }), ...(binding ? { binding } : {}), entities,
        ...(store && sku !== undefined && store.sku === sku ? { store } : {}) };
}
const ISO = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2}))?$/;
function isoTime(value) {
    return ISO.test(value.trim()) ? Date.parse(value.trim()) : NaN;
}
export function scheduleWindow(schedule, durationSec) {
    if (schedule === null || schedule.trim() === '')
        return null;
    const [first, second, ...rest] = schedule.split('/');
    if (rest.length > 0)
        return undefined;
    const from = isoTime(first);
    if (!Number.isFinite(from))
        return undefined;
    if (second !== undefined) {
        const until = isoTime(second);
        return Number.isFinite(until) ? { from, until } : undefined;
    }
    return { from, until: durationSec === null ? Infinity : from + durationSec * 1000 };
}
function used(usage, now) {
    return {
        hour: usage.recent.filter((at) => at > now - HOUR).length,
        day: usage.recent.filter((at) => at > now - DAY).length,
    };
}
function windowReopens(recent, now, windowMs, limit) {
    const inside = recent.filter((at) => at > now - windowMs).sort((a, b) => a - b);
    if (inside.length < limit)
        return null;
    if (limit <= 0)
        return undefined;
    return inside.at(-limit) + windowMs;
}
function limitsReopen(blocks) {
    let latest = null;
    for (const at of blocks) {
        if (at === undefined)
            return undefined;
        if (at !== null)
            latest = Math.max(latest ?? at, at);
    }
    return latest;
}
const iso = (at) => typeof at === 'number' && Number.isFinite(at) ? { availableAt: new Date(at).toISOString() } : {};
function offerAvailability(data, key, input, product, placementLimits) {
    const { now } = input;
    const span = scheduleWindow(data.schedule, data.durationSec);
    const endsAt = span && Number.isFinite(span.until) ? new Date(span.until).toISOString()
        : undefined;
    const ends = endsAt === undefined ? {} : { endsAt };
    if (span === undefined || (span && (now < span.from || now >= span.until))) {
        return { reason: 'schedule', ...(span && now < span.from ? iso(span.from) : {}), ...ends };
    }
    if (data.kind === 'paid') {
        if (input.storeKey === null)
            return { reason: 'store_unavailable', ...ends };
        if (!product?.sku)
            return { reason: 'no_product', ...ends };
    }
    const state = own(input.offerState, key);
    const usage = input.usage?.(key) ?? NO_USAGE;
    const { perSession, perHour, perDay, total } = data.limits;
    const clientWindow = (windowMs, limit) => {
        if (limit === undefined)
            return undefined;
        const at = windowReopens(usage.recent, now, windowMs, limit);
        return at === null ? undefined : at;
    };
    const remaining = state?.remaining;
    const exhausted = (left) => typeof left === 'number' && left <= 0;
    const serverLimits = remaining && Object.values(remaining).some(exhausted) ? limitsReopen([
        exhausted(remaining.hour) ? clientWindow(HOUR, perHour) : null,
        exhausted(remaining.day) ? clientWindow(DAY, perDay) : null,
        exhausted(remaining.total) ? undefined : null
    ]) : null;
    const offerUsed = used(usage, now);
    const clientLimits = limitsReopen([
        perSession !== undefined && usage.session >= perSession ? undefined : null,
        perHour !== undefined && offerUsed.hour >= perHour
            ? windowReopens(usage.recent, now, HOUR, perHour) : null,
        perDay !== undefined && offerUsed.day >= perDay
            ? windowReopens(usage.recent, now, DAY, perDay) : null,
        total !== undefined && usage.total >= total ? undefined : null
    ]);
    const limitsAt = limitsReopen([serverLimits, clientLimits]);
    const cooldown = (until) => ({ reason: 'cooldown',
        ...iso(limitsAt === null ? until
            : limitsAt === undefined ? undefined : Math.max(until, limitsAt)),
        ...ends });
    const serverCooldown = state?.cooldownUntil ? Date.parse(state.cooldownUntil) : NaN;
    if (Number.isFinite(serverCooldown) && serverCooldown > now)
        return cooldown(serverCooldown);
    if (serverLimits !== null)
        return { reason: 'limit_offer', ...iso(serverLimits), ...ends };
    if (data.cooldownSec > 0 && usage.lastAt !== null
        && usage.lastAt + data.cooldownSec * 1000 > now) {
        return cooldown(usage.lastAt + data.cooldownSec * 1000);
    }
    if (clientLimits !== null)
        return { reason: 'limit_offer', ...iso(clientLimits), ...ends };
    const placementUsage = input.placementUsage?.(input.placement) ?? NO_USAGE;
    const placementLimitsAt = limitsReopen([
        placementLimits.perSession !== undefined && placementUsage.session >= placementLimits.perSession
            ? undefined : null,
        placementLimits.perDay !== undefined && used(placementUsage, now).day >= placementLimits.perDay
            ? windowReopens(placementUsage.recent, now, DAY, placementLimits.perDay) : null
    ]);
    if (placementLimitsAt !== null) {
        return { reason: 'limit_placement', ...iso(placementLimitsAt), ...ends };
    }
    return ends;
}
export function showcase(input) {
    const placement = own(input.placements, input.placement);
    const placementLimits = limits(own(placement, 'limits'));
    const out = [];
    for (const key of placementOfferKeys(placement)) {
        const offer = offerOf(key, input, placementLimits);
        if (offer)
            out.push(offer);
    }
    return out;
}
export function offerWithVariant(key, variantKey, input) {
    return offerOf(key, input, limits(own(own(input.placements, input.placement), 'limits')), variantKey);
}
export function offerOf(key, input, placementLimits = {}, variantKey) {
    if (!KEY.test(key))
        return undefined;
    const data = parseOffer(own(input.offers, key));
    if (!data)
        return undefined;
    const chosen = variantKey === undefined
        ? data.variants.find((item) => item.key === 'default') ?? data.variants.at(0)
        : data.variants.find((item) => item.key === variantKey);
    if (!chosen)
        return undefined;
    const productKey = data.kind === 'paid' ? chosen.productKey : undefined;
    const product = productKey === undefined ? undefined
        : parseProduct(productKey, own(input.products, productKey), input.storeKey, input.prices);
    const { reason, availableAt, endsAt } = offerAvailability(data, key, input, product, placementLimits);
    const label = own(input.applied, key);
    const applied = typeof label === 'string' ? label : null;
    return {
        key, kind: data.kind, ...(data.format === undefined ? {} : { format: data.format }),
        name: data.name, ...(data.description === undefined ? {} : { description: data.description }),
        ...(data.iconUrl === undefined ? {} : { iconUrl: data.iconUrl }),
        ...(data.customs === undefined ? {} : { customs: data.customs }),
        ...(data.ui === undefined ? {} : { ui: data.ui }),
        placement: input.placement, applied: applied ?? null,
        scopeVersion: input.scopeVersion ?? null,
        variant: product ? { ...chosen, entities: product.entities } : chosen,
        variants: data.variants.map((item) => {
            const linked = item.productKey ? parseProduct(item.productKey, own(input.products, item.productKey), input.storeKey, input.prices) : undefined;
            return linked ? { ...item, entities: linked.entities } : item;
        }),
        limits: data.limits, cooldownSec: data.cooldownSec,
        ...(product === undefined ? {} : { product }),
        available: reason === undefined, ...(reason === undefined ? {} : { reason }),
        ...(availableAt === undefined ? {} : { availableAt }),
        ...(endsAt === undefined ? {} : { endsAt }),
    };
}
export function addUsage(usage, now) {
    const recent = [...usage.recent.filter((at) => at > now - DAY), now].slice(-1000);
    return { session: usage.session + 1, recent, total: Math.min(usage.total + 1, Number.MAX_SAFE_INTEGER), lastAt: now };
}

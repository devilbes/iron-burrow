import { FACT_CATALOG, factDefinition as definition, } from '@manygamescorp/contracts-client/facts';
import { filterValueFits } from '@manygamescorp/contracts-client/filters';
import { SDKError } from './error.js';
import { createFilters } from './filters.js';
const KEY = /^[a-z][a-z0-9_-]*(?:\.[a-z][a-z0-9_-]*)*$/;
const UNSAFE = new Set(['__proto__', 'prototype', 'constructor', '_bsontype']);
const DAY = 86_400_000;
const MAX_FACTS = 256;
const MAX_BYTES = 65_536;
export const CUSTOM = 'custom.';
const ab = (key) => key === 'ab' || key === 'abg' || key.startsWith('ab.');
function invalid() {
    throw new SDKError('VALIDATION_FAILED', {
        message: 'Invalid fact name, type or facts limit', module: 'facts',
    });
}
function denied() {
    throw new SDKError('SDK_PERMISSION_DENIED', { message: 'Fact belongs to another owner', module: 'facts' });
}
function name(key) {
    return key.length <= 128 && KEY.test(key) && !key.split('.').some((part) => UNSAFE.has(part));
}
function factKey(key) {
    if (key.startsWith(CUSTOM)) {
        if (!name(key.slice(CUSTOM.length)))
            invalid();
        return;
    }
    const canonical = FACT_CATALOG.some((entry) => entry.name === key && !entry.name.endsWith('.*'));
    if (key.length > 128 || (!KEY.test(key) && !canonical)
        || key.split('.').some((part) => UNSAFE.has(part)))
        invalid();
}
function valueValid(value, type = 'scalar') {
    const scalar = value === null || typeof value === 'boolean'
        || (typeof value === 'number' && Number.isFinite(value))
        || (typeof value === 'string' && value.length <= 256);
    return scalar && (type === 'scalar' || typeof value === type);
}
function batch(input, prefix = '') {
    try {
        return checkedBatch(input, prefix);
    }
    catch {
        return invalid();
    }
}
function checkedBatch(input, prefix) {
    if (typeof input !== 'object' || input === null || Array.isArray(input))
        invalid();
    const proto = Object.getPrototypeOf(input);
    if (proto !== Object.prototype && proto !== null)
        invalid();
    const keys = Reflect.ownKeys(input);
    if (keys.length > MAX_FACTS)
        invalid();
    const out = Object.create(null);
    for (const key of keys) {
        if (typeof key !== 'string')
            invalid();
        factKey(prefix + key);
        const descriptor = Object.getOwnPropertyDescriptor(input, key);
        if (!descriptor?.enumerable || !('value' in descriptor)
            || !valueValid(descriptor.value, prefix ? 'scalar' : definition(key)?.type))
            invalid();
        out[prefix + key] = descriptor.value;
    }
    return out;
}
export function parseFilterParams(data) {
    const params = typeof data === 'object' && data !== null && !Array.isArray(data)
        ? data.params : undefined;
    if (typeof params !== 'object' || params === null || Array.isArray(params))
        return undefined;
    const out = Object.create(null);
    for (const [key, value] of Object.entries(params).slice(0, MAX_FACTS)) {
        const { type, values, open, allowEmpty } = (typeof value === 'object' && value !== null ? value : {});
        if (!name(key)
            || !['string', 'number', 'boolean', 'enum', 'version', 'date'].includes(type))
            continue;
        if (type === 'enum' && open !== true && !(Array.isArray(values) && values.length <= 64
            && values.every((item) => typeof item === 'string')))
            continue;
        out[key] = Object.freeze({ type: type,
            ...(type === 'enum' && Array.isArray(values)
                ? { values: Object.freeze([...values]) } : {}),
            ...(open === true ? { open: true } : {}),
            ...(allowEmpty === true ? { allowEmpty: true } : {}) });
    }
    return Object.freeze(out);
}
function typed(param, value) {
    return filterValueFits(param, value);
}
function restoredFacts(input) {
    const out = Object.create(null);
    if (typeof input !== 'object' || input === null || Array.isArray(input))
        return out;
    for (const key of Object.keys(input)) {
        try {
            const value = batch({ [key]: Reflect.get(input, key) })[key];
            const entry = definition(key);
            if (value !== undefined && (key.startsWith(CUSTOM)
                || (entry && !entry.identifier && (entry.owner !== 'core' || ab(key)))))
                out[key] = value;
        }
        catch { }
    }
    return out;
}
function restored(input, now) {
    try {
        const state = input;
        if (state?.version === 1 && Number.isSafeInteger(state.installedAt)
            && state.installedAt >= 0 && Number.isSafeInteger(state.sessionCount)
            && state.sessionCount >= 0) {
            const next = { version: 1, installedAt: state.installedAt,
                sessionCount: state.sessionCount, facts: restoredFacts(state.facts) };
            if (Object.keys(next.facts).length > MAX_FACTS
                || new TextEncoder().encode(JSON.stringify(next)).byteLength > MAX_BYTES)
                invalid();
            return next;
        }
    }
    catch { }
    return { version: 1, installedAt: now, sessionCount: 0, facts: Object.create(null) };
}
export function filterName(key) {
    return key.startsWith(CUSTOM) ? key.slice(CUSTOM.length) : `$${key}`;
}
export function createFacts(options) {
    const { platform, appVersion, gid, identity } = options;
    const clock = options.now ?? Date.now;
    const now = () => {
        const value = clock();
        if (!Number.isSafeInteger(value) || value < 0)
            invalid();
        return value;
    };
    if (typeof platform !== 'string' || !platform || !valueValid(platform, 'string')
        || (appVersion !== undefined && (!appVersion || !valueValid(appVersion, 'string')))
        || (options.store !== undefined && (!options.store || !valueValid(options.store, 'string')))
        || (identity !== undefined && !(Number.isSafeInteger(identity.uid)
            && Number.isSafeInteger(identity.gid))))
        invalid();
    const storage = options.storage?.scope(gid, 'core.facts');
    const initial = restored(storage?.get('state'), now());
    let state = { ...initial,
        sessionCount: Math.min(Number.MAX_SAFE_INTEGER, initial.sessionCount + 1) };
    let segment;
    let registry;
    const listeners = new Set();
    const derived = () => {
        const ms = now();
        const seconds = Math.floor(ms / 1000);
        const days = (at) => (typeof at === 'number'
            ? { value: Math.max(0, Math.floor((seconds - at) / 86_400)) } : undefined);
        const registered = days(state.facts['account.registeredAt']);
        const login = days(state.facts['account.lastLoginAt']);
        return {
            'session.count': state.sessionCount,
            'install.days': Math.max(0, Math.floor((ms - state.installedAt) / DAY)),
            platform,
            ...(appVersion === undefined ? {} : { 'app.version': appVersion, v: appVersion }),
            ...(options.store === undefined ? {} : { store: options.store }),
            'time.now': seconds,
            'time.dayOfWeek': new Date(ms).getUTCDay(),
            'time.tzOffsetMin': 0 - new Date(ms).getTimezoneOffset() || 0,
            ...(registered ? { 'account.daysSinceRegistration': registered.value } : {}),
            ...(login ? { 'account.daysSinceLastLogin': login.value } : {}),
            ...(segment ? { segment } : {}),
        };
    };
    const snapshot = () => Object.freeze({ ...state.facts, ...derived() });
    const persist = (next) => {
        if (Object.keys(next.facts).length > MAX_FACTS
            || new TextEncoder().encode(JSON.stringify(next)).byteLength > MAX_BYTES)
            invalid();
        storage?.set('state', next);
        state = next;
    };
    persist(state);
    const commit = (update) => {
        const facts = { ...state.facts };
        const changed = [];
        for (const [key, value] of Object.entries(update)) {
            if (facts[key] === value && (value !== undefined || !Object.hasOwn(facts, key)))
                continue;
            if (value === undefined)
                delete facts[key];
            else
                facts[key] = value;
            changed.push(key);
        }
        if (changed.length === 0)
            return;
        persist({ ...state, facts });
        for (const listener of [...listeners]) {
            try {
                listener(changed);
            }
            catch { }
        }
    };
    const read = (key) => {
        const facts = snapshot();
        return Object.hasOwn(facts, key) ? facts[key] : undefined;
    };
    const view = (owner) => {
        if (typeof owner !== 'string' || owner.length > 64 || !KEY.test(owner)
            || owner.split('.').some((part) => UNSAFE.has(part)) || owner === 'core') {
            throw new SDKError('SDK_PERMISSION_DENIED', { message: 'Fact owner is not permitted', module: 'facts' });
        }
        return Object.freeze({
            get: read,
            snapshot,
            set(input) {
                const update = batch(input);
                for (const key of Object.keys(update)) {
                    const entry = definition(key);
                    if (!entry || entry.owner !== owner || key.startsWith(CUSTOM))
                        denied();
                }
                commit(update);
            },
        });
    };
    const context = Object.freeze({
        get(key) {
            if (typeof key !== 'string')
                return undefined;
            if (!key.startsWith('$'))
                return read(CUSTOM + key);
            return definition(key.slice(1))?.identifier ? undefined : read(key.slice(1));
        },
        set(input) {
            const values = batch(input, CUSTOM);
            const update = { ...values };
            const unknown = [];
            for (const [key, value] of Object.entries(values)) {
                const param = key.slice(CUSTOM.length);
                if (value === null) {
                    update[key] = undefined;
                    continue;
                }
                const entry = registry && Object.hasOwn(registry, param) ? registry[param] : undefined;
                if (entry && !typed(entry, value))
                    invalid();
                if (registry && !entry)
                    unknown.push(param);
            }
            commit(update);
            for (const param of unknown) {
                try {
                    options.onUnknownParam?.(param);
                }
                catch { }
            }
        },
        snapshot: () => Object.freeze(Object.fromEntries(Object.entries(snapshot())
            .map(([key, value]) => [filterName(key), value]))),
    });
    return Object.freeze({
        gid, context, view, snapshot,
        filters: createFilters(() => facts(), () => registry ?? {}),
        facts,
        segments(keys) {
            const next = Object.freeze([...new Set(keys)].sort());
            if (segment && JSON.stringify(segment) === JSON.stringify(next))
                return false;
            segment = next;
            return true;
        },
        ab(values) {
            const update = {};
            for (const key of Object.keys(state.facts))
                if (ab(key))
                    update[key] = undefined;
            for (const [key, value] of Object.entries(batch(values))) {
                if (!ab(key) || typeof value !== 'string')
                    invalid();
                update[key] = value;
            }
            commit(update);
        },
        filterParameters: () => registry ?? {},
        params(next) { registry = next; },
        subscribe(listener) {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
    });
    function facts() {
        return Object.freeze({ ...snapshot(),
            ...(identity ? { uid: identity.uid, gid: identity.gid } : {}) });
    }
}

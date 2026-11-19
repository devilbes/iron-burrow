import { factDefinition } from '@manygamescorp/contracts-client/facts';
import { CUSTOM, filterName } from './facts.js';
export const CONTEXT_CHANGED = 'sdk:context:changed';
export const PROVIDER_ORDER = Object.freeze(['core', 'device', 'auth', 'profile', 'iap', 'inventory', 'game']);
const CLOCK = ['time.now', 'time.dayOfWeek', 'time.tzOffsetMin', 'install.days',
    'account.daysSinceRegistration', 'account.daysSinceLastLogin'];
function rank(key) {
    const owner = key.startsWith(CUSTOM) ? 'game' : factDefinition(key)?.owner ?? 'game';
    const index = PROVIDER_ORDER.indexOf(owner);
    return index >= 0 ? index : PROVIDER_ORDER.length - 1.5;
}
export function createContextEngine(options) {
    const batchMs = options.batchMs ?? 100;
    const tickMs = options.tickMs ?? 60_000;
    const maxHoldMs = options.maxHoldMs ?? 300_000;
    let pending = new Set();
    let purchased = false;
    let timer;
    let ticker;
    let epoch = 0;
    let disposed = false;
    const holds = new Map();
    const schedule = () => {
        if (disposed || timer !== undefined || holds.size > 0)
            return;
        if (pending.size === 0 && !purchased)
            return;
        timer = setTimeout(run, batchMs);
    };
    function run() {
        timer = undefined;
        if (disposed || holds.size > 0 || (pending.size === 0 && !purchased))
            return;
        const keys = pending;
        const purchase = purchased;
        pending = new Set();
        purchased = false;
        let segmentsChanged = false;
        try {
            segmentsChanged = options.recompute(keys, purchase);
        }
        catch {
        }
        const names = [...keys].filter((key) => !factDefinition(key)?.identifier)
            .sort((a, b) => rank(a) - rank(b) || (a < b ? -1 : a > b ? 1 : 0)).map(filterName);
        if (names.length > 0 || segmentsChanged) {
            options.emit(CONTEXT_CHANGED, Object.freeze({ keys: Object.freeze(names), segmentsChanged }));
        }
        engine.sync();
    }
    const engine = {
        changed(keys) {
            for (const key of keys)
                pending.add(key);
            schedule();
        },
        purchase() { purchased = true; schedule(); },
        hold() {
            const id = Symbol('hold');
            const owner = epoch;
            const release = () => {
                const expiry = holds.get(id);
                if (expiry === undefined)
                    return;
                clearTimeout(expiry);
                holds.delete(id);
                if (owner === epoch)
                    schedule();
            };
            holds.set(id, setTimeout(release, maxHoldMs));
            return Object.freeze({ facts: options.snapshot(), release });
        },
        sync() {
            const wanted = !disposed && options.timeDependent();
            if (wanted && ticker === undefined) {
                ticker = setInterval(() => engine.changed(CLOCK), tickMs);
            }
            else if (!wanted && ticker !== undefined) {
                clearInterval(ticker);
                ticker = undefined;
            }
        },
        flush() {
            if (timer !== undefined)
                clearTimeout(timer);
            run();
        },
        discard() {
            if (timer !== undefined)
                clearTimeout(timer);
            timer = undefined;
            pending = new Set();
            purchased = false;
        },
        reset() {
            epoch += 1;
            if (timer !== undefined)
                clearTimeout(timer);
            timer = undefined;
            for (const expiry of holds.values())
                clearTimeout(expiry);
            holds.clear();
            pending = new Set();
            purchased = false;
            if (ticker !== undefined)
                clearInterval(ticker);
            ticker = undefined;
        },
        dispose() {
            engine.reset();
            disposed = true;
        },
    };
    return engine;
}

import { uiSlotItem } from './ui-slot.js';
import { SDKError } from './error.js';
export const BOTTOMMENU_CAPABILITY = 'bottommenu.registry@1';
export const BOTTOMMENU_SLOT_TAKEN = 'UI_BOTTOMMENU_SLOT_TAKEN';
export function bottomMenuItem(services, spec) {
    const unified = uiSlotItem(services, 'bottomMenu', spec);
    if (unified)
        return unified;
    let client;
    try {
        client = services.get(BOTTOMMENU_CAPABILITY);
    }
    catch {
    }
    let active = false;
    try {
        active = client?.register(spec) === true;
    }
    catch (error) {
        if (error?.code !== BOTTOMMENU_SLOT_TAKEN)
            throw error;
        throw new SDKError(BOTTOMMENU_SLOT_TAKEN, { module: 'bottommenu', cause: error,
            message: `Bottom menu slot ${String(spec.slot)} is taken in a shared context`,
            details: { id: spec.id, slot: spec.slot } });
    }
    const call = (fn) => {
        if (!active || !client)
            return;
        try {
            fn(client);
        }
        catch (error) {
            if (!(error instanceof SDKError) || error.code !== 'MODULE_NOT_ACTIVE')
                throw error;
        }
    };
    return Object.freeze({
        get active() { return active; },
        setValue: (v) => call((c) => c.setValue(spec.id, v)),
        setBadge: (b) => call((c) => c.setBadge(spec.id, b)),
        setTimer: (t) => call((c) => c.setTimer(spec.id, t)),
        setProgress: (p) => call((c) => c.setProgress(spec.id, p)),
        setState: (s) => call((c) => c.setState(spec.id, s)),
        dispose: () => { call((c) => c.unregister(spec.id)); active = false; },
    });
}

import { uiSlotItem } from './ui-slot.js';
import { SDKError } from './error.js';
export const TOPBAR_CAPABILITY = 'topbar.registry@1';
export const TOPBAR_CONTEXTS = Object.freeze(['main', 'core']);
export const TOPBAR_CONTEXT = /^[a-z][a-z0-9_-]{0,31}$/;
export const TOPBAR_ID = /^[a-z0-9][a-z0-9_.-]{0,63}$/;
export const TOPBAR_MAX_ITEMS = 32;
export const TOPBAR_MAX_CONTEXTS = 8;
export const TOPBAR_MAX_VALUE = 32;
export function topBarItem(services, spec) {
    const unified = uiSlotItem(services, 'topbar', spec);
    if (unified)
        return unified;
    let client;
    try {
        client = services.get(TOPBAR_CAPABILITY);
    }
    catch {
        client = undefined;
    }
    let active = client?.register(spec) === true;
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
        setValue: (value) => call((c) => c.setValue(spec.id, value)),
        setBadge: (badge) => call((c) => c.setBadge(spec.id, badge)),
        setTimer: (endsAt) => call((c) => c.setTimer(spec.id, endsAt)),
        setProgress: (progress) => call((c) => c.setProgress(spec.id, progress)),
        setState: (state) => call((c) => c.setState(spec.id, state)),
        dispose: () => { call((c) => c.unregister(spec.id)); active = false; },
    });
}

import { SDKError } from './error.js';
export const UI_SLOTS_CAPABILITY = 'ui.slots@1';
export function uiSlotItem(services, zone, spec) {
    let client;
    try {
        client = services.get(UI_SLOTS_CAPABILITY);
    }
    catch {
        return undefined;
    }
    if (!client?.registerSlot)
        return undefined;
    const handle = client.registerSlot(zone, spec);
    let disposed = false;
    const update = (patch) => {
        if (disposed)
            return;
        try {
            if (services.get(UI_SLOTS_CAPABILITY))
                handle.update(patch);
        }
        catch (error) {
            if (!(error instanceof SDKError) || error.code !== 'MODULE_NOT_ACTIVE')
                throw error;
        }
    };
    return Object.freeze({ get active() { return !disposed && handle.active; },
        setValue: (value) => update({ value }),
        setBadge: (badge) => update({ badge }),
        setTimer: (timer) => update({ timer }),
        setProgress: (progress) => update({ progress }),
        setState: (state) => update({ state }),
        dispose: () => { if (!disposed)
            handle.dispose(); disposed = true; } });
}

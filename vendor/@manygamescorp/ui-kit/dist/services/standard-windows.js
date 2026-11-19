import { error } from './error.js';
import { popup, confirm } from './popup.js';
import { settings } from './settings.js';
export const STANDARD_WINDOWS = Object.freeze(['error', 'popup', 'confirm', 'settings']);
const COMPONENTS = {
    error: error, popup: popup,
    confirm: confirm, settings: settings,
};
export function standardWindowsModule(options = {}) {
    const latest = new Map();
    let host;
    const elementId = (name) => name;
    const { text } = options;
    return {
        manifest: { id: 'ui', ui: { contributes: STANDARD_WINDOWS.map((name) => ({
                    id: elementId(name), kind: 'popup', component: name,
                    ...(name === 'error' ? { slot: 'system' } : {}), title: name, order: 1000
                })) } },
        components: COMPONENTS,
        elementId,
        props(id, extra) {
            if (extra)
                latest.set(id, extra);
            return { ...extra, ...(text && id === elementId('error') ? { l10n: text } : {}) };
        },
        intent(id, intent, payload) {
            const handler = latest.get(id)?.['onAction'];
            if (intent === 'action') {
                const actions = latest.get(id)?.['actions'];
                const picked = typeof payload?.['id'] === 'string' ? payload['id'] : '';
                handler?.(picked, payload);
                if (!actions?.find((action) => action.id === picked)?.keepOpen)
                    host?.close(id);
            }
            else if (intent !== 'close')
                handler?.(intent, payload);
            if (intent === 'close')
                latest.delete(id);
        },
        attach(shellHost) { host = shellHost; return () => { host = undefined; latest.clear(); }; },
    };
}
export function registerStandardWindows(windows, shell, module) {
    const offs = STANDARD_WINDOWS.map((name) => windows.register(`ui.${name}`, {
        main: { canShow: () => true, open: (params) => {
                const ticket = shell.open(module.elementId(name), { ...params });
                return { closed: ticket.closed, close: () => ticket.close() };
            } },
    }));
    return () => { for (const off of offs)
        off(); };
}
export const STANDARD_WINDOW_PRIORITY = Object.freeze({ error: 100, confirm: 50, settings: 10, popup: 10 });
function withRetry(params) {
    const { onRetry, ...rest } = params;
    if (typeof onRetry !== 'function')
        return params;
    const owner = rest['onAction'];
    return { ...rest, retry: true, onAction: (id, payload) => {
            if (id === 'retry')
                onRetry();
            owner?.(id, payload);
        } };
}
export function standardWindowsApi(queue) {
    const show = (name, params = {}) => queue.show(`ui.${name}`, params, { priority: STANDARD_WINDOW_PRIORITY[name] }).closed;
    const api = {
        showError: (params) => show('error', withRetry(params)),
        showPopup: (params) => show('popup', params),
        showConfirm: (params) => show('confirm', params),
        showSettings: (params) => show('settings', { values: {}, ...params }),
    };
    return Object.freeze(api);
}

import catalog from './catalog.json' with { type: 'json' };
function freezeView(entry) {
    const artboards = entry['artboards'];
    return Object.freeze({ component: String(entry['component']), source: String(entry['source']),
        artboards: Object.freeze({ portrait: Object.freeze([...artboards.portrait]),
            landscape: Object.freeze([...artboards.landscape]) }) });
}
const definitions = new Map();
for (const entry of catalog) {
    if (!entry['artboards'] || entry['devOnly'])
        continue;
    const definition = Object.freeze({
        ...freezeView(entry),
        id: String(entry['id']), kind: entry['kind'],
        locked: entry['locked'] === true,
        variants: Object.freeze(Object.fromEntries(Object.entries(entry['variants'] ?? {})
            .map(([name, value]) => [name, freezeView(value)]))),
    });
    definitions.set(definition.id, definition);
}
export function windowDefinition(id) {
    const definition = definitions.get(id);
    if (!definition)
        throw new TypeError(`UI_WINDOW_UNKNOWN:${id}`);
    return definition;
}
export const KIT_WINDOWS = Object.freeze([...definitions.values()]);
const loaders = {
    'services/collection': () => import('./services/collection.js'),
    'services/cross-promo': () => import('./services/cross-promo.js'),
    'services/daily-rewards': () => import('./services/daily-rewards.js'),
    'services/error': () => import('./services/error.js'),
    'services/iap-windows': () => import('./services/iap-windows.js'),
    'services/inventory-windows': () => import('./services/inventory-windows.js'),
    'services/leaderboard-window': () => import('./services/leaderboard-window.js'),
    'services/level-windows': () => import('./services/level-windows.js'),
    'services/login': () => import('./services/login.js'),
    'services/mailbox': () => import('./services/mailbox.js'),
    'services/popup': () => import('./services/popup.js'),
    'services/progress': () => import('./services/progress.js'),
    'services/progress-windows': () => import('./services/progress-windows.js'),
    'services/reward-window': () => import('./services/reward-window.js'),
    'services/settings': () => import('./services/settings.js'),
    'services/shop': () => import('./services/shop.js'),
};
export async function loadWindow(id, variant) {
    const definition = windowDefinition(id);
    if (variant !== undefined && !Object.hasOwn(definition.variants, variant)) {
        throw new TypeError(`UI_WINDOW_VARIANT_UNKNOWN:${id}:${variant}`);
    }
    const view = variant === undefined ? definition : definition.variants[variant];
    const module = await loaders[view.source]();
    return module[view.component];
}

import { selectAssetVariant } from './asset-variants.js';
const KEY = Symbol.for('@manygamescorp/ui-kit/skin@1');
const LEVELS = { kit: 0, mechanic: 1, game: 2, scope: 3 };
function store() {
    const scope = globalThis;
    return scope[KEY] ??= { layers: [], targets: new Set(), docs: new Map(), redraws: new Set(),
        sheets: new WeakMap(), own: new WeakSet(), listeners: new Set() };
}
export function skinLayers() {
    return store().layers;
}
function sheetOf(doc, entry) {
    const View = doc.defaultView;
    if (!View?.CSSStyleSheet || !('replaceSync' in View.CSSStyleSheet.prototype))
        return undefined;
    const s = store();
    let byKey = s.sheets.get(doc);
    if (!byKey) {
        byKey = new Map();
        s.sheets.set(doc, byKey);
    }
    const key = `${entry.baseURL ?? ''}\n${entry.text}`;
    let found = byKey.get(key);
    if (!found) {
        found = entry.baseURL ? new View.CSSStyleSheet({ baseURL: entry.baseURL })
            : new View.CSSStyleSheet();
        found.replaceSync(entry.text);
        byKey.set(key, found);
        s.own.add(found);
    }
    return found;
}
export function skinSheets(doc, targets, scope, source = skinLayers()) {
    const layers = source.filter(layer => layer.level !== 'scope'
        || layer.scope === scope);
    const base = layers.map(layer => layer.neutralBase).lastIndexOf(true);
    const entries = layers.slice(Math.max(0, base)).flatMap(layer => layer.sheets);
    return entries
        .filter((entry) => targets.includes(entry.target))
        .map((entry) => sheetOf(doc, entry))
        .filter((sheet) => sheet !== undefined);
}
function adopt(target, sheets) {
    const own = store().own;
    const kept = target.adoptedStyleSheets.filter((sheet) => !own.has(sheet));
    const next = [...kept, ...sheets];
    const current = target.adoptedStyleSheets;
    if (next.length === current.length && next.every((sheet, i) => sheet === current[i]))
        return;
    target.adoptedStyleSheets = next;
}
function adoptDocument(doc) {
    if (!('adoptedStyleSheets' in doc))
        return;
    const names = [...(store().docs.get(doc)?.keys() ?? [])];
    const targets = store().layers.length || names.includes('shell')
        ? ['fonts', 'shell', ...names] : ['fonts', ...names];
    adopt(doc, [...new Set([...skinSheets(doc, targets),
            ...store().layers.filter(layer => layer.level === 'scope').flatMap(layer => layer.sheets
                .filter(entry => entry.target === 'fonts').map(entry => sheetOf(doc, entry))
                .filter((sheet) => sheet !== undefined))])]);
}
function knowDocument(doc, name) {
    const docs = store().docs;
    const names = docs.get(doc) ?? new Map();
    const added = !docs.has(doc) || (name !== undefined && !names.has(name));
    if (name !== undefined)
        names.set(name, (names.get(name) ?? 0) + 1);
    docs.set(doc, names);
    if (added)
        adoptDocument(doc);
}
function forgetDocumentName(doc, name) {
    const names = store().docs.get(doc);
    const count = names?.get(name);
    if (!names || count === undefined)
        return;
    if (count > 1) {
        names.set(name, count - 1);
        return;
    }
    names.delete(name);
    adoptDocument(doc);
}
function adoptRoot(target) {
    const doc = target.root.ownerDocument ?? target.root.host?.ownerDocument;
    if (!doc)
        return;
    adopt(target.root, skinSheets(doc, target.name ? ['*', target.name] : ['*'], target.scope));
}
export function followSkin(target) {
    const s = store();
    if (target.scope && !validSkinScope(target.scope)) {
        throw new TypeError('UI_SKIN_INVALID:scope');
    }
    s.targets.add(target);
    if (target.scope) {
        void s.preload?.(target.scope).catch(() => undefined);
    }
    const doc = target.root.ownerDocument ?? target.root.host?.ownerDocument;
    if (doc) {
        knowDocument(doc);
        adoptDocument(doc);
    }
    adoptRoot(target);
    return () => { s.targets.delete(target); };
}
export function adoptSkinInto(root, name, redraw = () => undefined, scope) {
    if ('host' in root)
        return followSkin({ root, name, redraw, ...(scope ? { scope } : {}) });
    if (scope)
        throw new TypeError('UI_SKIN_SCOPE_REQUIRES_SHADOW_ROOT');
    const s = store();
    knowDocument(root, name);
    const entry = () => redraw();
    s.redraws.add(entry);
    let released = false;
    return () => {
        if (released)
            return;
        released = true;
        s.redraws.delete(entry);
        if (name !== undefined)
            forgetDocumentName(root, name);
    };
}
function changed(doc, scope) {
    const s = store();
    if (doc && !s.docs.has(doc))
        s.docs.set(doc, new Map());
    for (const each of s.docs.keys())
        adoptDocument(each);
    for (const target of [...s.targets]) {
        if (scope !== undefined && target.scope !== scope)
            continue;
        adoptRoot(target);
    }
    for (const target of [...s.targets]) {
        if (scope !== undefined && target.scope !== scope)
            continue;
        try {
            target.redraw();
        }
        catch { }
    }
    for (const redraw of [...s.redraws]) {
        try {
            redraw();
        }
        catch { }
    }
    for (const listener of [...s.listeners]) {
        try {
            listener();
        }
        catch { }
    }
}
export function addSkinLayer(layer, doc) {
    const s = store();
    const others = s.layers.filter((each) => each.level !== layer.level
        || (layer.level === 'mechanic' && each.id !== layer.id)
        || (layer.level === 'scope' && each.scope !== layer.scope));
    const index = others.findIndex((each) => LEVELS[each.level] > LEVELS[layer.level]);
    s.layers = index < 0 ? [...others, layer] : [...others.slice(0, index), layer,
        ...others.slice(index)];
    changed(doc, layer.level === 'scope' ? layer.scope : undefined);
    return () => {
        if (!s.layers.includes(layer))
            return;
        s.layers = s.layers.filter((each) => each !== layer);
        changed(undefined, layer.level === 'scope' ? layer.scope : undefined);
    };
}
export function assetOfLayer(layer, key, locale, density) {
    const variants = layer.assetVariants && Object.hasOwn(layer.assetVariants, key)
        ? layer.assetVariants[key] : undefined;
    return (variants && selectAssetVariant(variants, locale, density))
        ?? (Object.hasOwn(layer.assets, key) ? layer.assets[key] : undefined);
}
export function skinAssetOf(key, scope, locale, density) {
    const name = key.startsWith('skin:') ? key.slice(5) : undefined;
    if (!name)
        return undefined;
    const layers = store().layers.filter(layer => layer.level !== 'scope' || layer.scope === scope);
    for (let i = layers.length - 1; i >= 0; i -= 1) {
        const layer = layers[i];
        const url = assetOfLayer(layer, name, locale, density);
        if (url !== undefined)
            return url;
        if (layers[i].neutralBase) {
            layers[i].missing?.(`asset:${name}`);
            return undefined;
        }
    }
    return undefined;
}
export function displayTitleOf(scope) {
    const layers = store().layers.filter(layer => layer.level !== 'scope' || layer.scope === scope);
    for (let i = layers.length - 1; i >= 0; i -= 1) {
        const spec = layers[i].displayTitle;
        if (spec)
            return spec;
        if (layers[i].neutralBase)
            return undefined;
    }
    return undefined;
}
export function windowTemplateOf(target, scope, orientation) {
    const layers = store().layers.filter(layer => layer.level !== 'scope' || layer.scope === scope);
    for (let i = layers.length - 1; i >= 0; i--) {
        const template = layers[i].windows?.[target];
        if (template)
            return orientation ? template[orientation] ?? template : template;
        if (layers[i].neutralBase)
            return undefined;
    }
    return undefined;
}
export function closePositionOf() {
    const layers = store().layers;
    for (let i = layers.length - 1; i >= 0; i -= 1) {
        const position = layers[i].closePosition;
        if (position)
            return position;
        if (layers[i].neutralBase)
            return undefined;
    }
    return undefined;
}
export function onSkinChange(listener) {
    const s = store();
    s.listeners.add(listener);
    return () => { s.listeners.delete(listener); };
}
export function validSkinScope(scope) {
    return typeof scope === 'string' && scope.length <= 128
        && /^[a-z][a-z0-9-]*(:[a-z0-9-]+)?$/.exec(scope)?.[0] === scope;
}
export function useScopePreloader(preload) {
    const s = store();
    s.preload = preload;
    for (const target of s.targets) {
        if (target.scope)
            void preload(target.scope).catch(() => undefined);
    }
    return () => { if (s.preload === preload)
        s.preload = undefined; };
}
let renderScope;
export function renderingSkinScope() { return renderScope; }
export function withRenderingSkinScope(scope, render) {
    const previous = renderScope;
    renderScope = scope;
    try {
        return render();
    }
    finally {
        renderScope = previous;
    }
}
let renderLayer;
export function renderingSkinLayer() { return renderLayer; }
export function withRenderingSkinLayer(layer, render) {
    const previous = renderLayer;
    renderLayer = layer;
    try {
        return render();
    }
    finally {
        renderLayer = previous;
    }
}
export function beginSkinBundle() {
    const s = store();
    const generation = (s.bundleGeneration ?? 0) + 1;
    s.bundleGeneration = generation;
    return () => s.bundleGeneration === generation;
}

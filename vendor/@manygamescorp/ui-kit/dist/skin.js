import { withRenderingSkinLayer, adoptSkinInto, displayTitleOf, onSkinChange, skinAssetOf, skinLayers, validSkinScope } from './skin-layer.js';
import { component } from './features/shared.js';
import { displayTitleView } from './features/display-title.js';
import { nameComponents } from './core.js';
import { defineSkin, absolute, pageBase, invalid, TARGET } from './skin-spec.js';
export { defineSkin, useSkin, skinSheetsOf } from './skin-spec.js';
export { onSkinChange };
export function activeSkins() {
    return skinLayers().map(({ id, level, scope }) => ({ id, level, ...(scope ? { scope } : {}) }));
}
export function skinAssetUrl(key, options = {}) {
    return skinAssetOf(key, options.scope);
}
export function withSkinAssets(assetUrl) {
    return (key) => {
        const skin = skinAssetOf(key);
        if (skin !== undefined)
            return skin;
        if (key.startsWith('skin:'))
            throw new TypeError('UI_SKIN_ASSET_MISSING');
        if (!assetUrl)
            throw new TypeError(`UI_SKIN_ASSET_MISSING:${key}`);
        return assetUrl(key);
    };
}
export function adoptSkin(root, name, options) {
    if (name !== undefined && !TARGET.test(name))
        invalid(`target ${name}`);
    const { scope, redraw } = typeof options === 'function' ? { redraw: options, scope: undefined } : options ?? {};
    if (scope !== undefined && !validSkinScope(scope))
        invalid('scope');
    return adoptSkinInto(root, name, redraw, scope);
}
export function skinFromManifest(id, skin, moduleBase) {
    const base = absolute(moduleBase, pageBase(), 'base');
    return defineSkin({ id, base, assets: skin.assets ?? {},
        css: Object.fromEntries(Object.entries(skin.css ?? {})
            .map(([target, file]) => [target, new URL(file, base.endsWith('/') ? base : `${base}/`)])),
        ...(skin.displayTitle ? { displayTitle: skin.displayTitle } : {}),
        ...(skin.closePosition ? { closePosition: skin.closePosition } : {}),
        ...(skin.windows ? { windows: skin.windows } : {}) });
}
export const displayTitle = component((p) => displayTitleView(p.text, { arc: p.arc ?? displayTitleOf(p.skinScope)?.arc, idBase: p.elementId }), { styles: ':host{display:block;text-align:center}' });
nameComponents({ displayTitle });
export { displayTitleView };
export { registerSkin, loadSkin, resolveSkin, initSkins, updateSkinsConfig, preloadSkinScope } from './skin-catalog.js';
export { parseSkinBundle, loadSkinBundle, applySkinBundle } from './skin-bundle.js';
export function renderWithSkin(skin, render) {
    return withRenderingSkinLayer({ id: skin.id, level: 'game', assets: skin.assets, sheets: [] }, render);
}
export { createSkinSlot } from './skin-slot.js';

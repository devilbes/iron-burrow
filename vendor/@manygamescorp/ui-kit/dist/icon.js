import { view as h } from './core.js';
import { skinLayers, renderingSkinScope, renderingSkinLayer } from './skin-layer.js';
export function iconUrl(key, options = {}) {
    if (options.itemId && options.assetUrl) {
        try {
            return options.assetUrl(options.itemId);
        }
        catch { }
    }
    const scope = options.scope ?? renderingSkinScope();
    const layer = renderingSkinLayer() ?? skinLayers().filter(layer => layer.level !== 'scope' || layer.scope === scope).at(-1);
    if (layer) {
        const url = layer.assets[`icon-${key}`]
            ?? (key === 'close' ? layer.assets['close'] : undefined);
        if (url === undefined)
            layer.missing?.(`icon:icon-${key}`);
        return url;
    }
    return undefined;
}
export function skinIcon(key, size = 24, options = {}) {
    const src = iconUrl(key, options);
    const sprite = src?.match(/^(.*)#sprite=(\d+),(\d+),(\d+),(\d+),(\d+),(\d+)$/);
    if (sprite) {
        const [, href, x, y, width, height, atlasWidth, atlasHeight] = sprite;
        return h('svg', { width: size, height: size, viewBox: `0 0 ${width} ${height}`,
            class: 'mp-art-icon', ...options.attributes,
            'data-part': 'icon', 'data-icon': key, 'aria-hidden': 'true' }, h('image', { 'image-rendering': 'optimizeQuality', href, x: -Number(x), y: -Number(y), width: atlasWidth, height: atlasHeight }));
    }
    return src ? h('img', { src, alt: '', width: size, height: size,
        class: 'mp-art-icon', ...options.attributes,
        'data-part': 'icon', 'data-icon': key, 'aria-hidden': 'true' }) : null;
}
export function icon(key, size = 24, options = {}) {
    return skinIcon(key, size, options) ?? h('span', {
        ...options.attributes, 'data-part': 'icon', 'data-icon': key, 'aria-hidden': 'true',
    });
}

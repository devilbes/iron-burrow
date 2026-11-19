import { isAssetRef } from './preview/vendor/contracts-client/asset-ref.js';
import { view as h, sync, createViewComponent, nameComponents } from './core.js';
import { assetOfLayer, skinAssetOf, renderingSkinScope, renderingSkinLayer } from './skin-layer.js';
const devMode = () => /^(localhost|127\.0\.0\.1|\[::1\])$/.test(globalThis.location?.hostname ?? '');
function warn(options) {
    if (options.dev ?? devMode())
        console.warn('UI_ASSET_REF_INVALID');
}
export function assetImageView(ref, options = {}, attrs = {}) {
    const placeholder = () => h('span', { ...attrs, role: 'img', 'aria-label': attrs['alt'] ?? '',
        'data-part': 'asset-placeholder' }, h('svg', { width: 16, height: 16, viewBox: '0 0 16 16',
        'data-part': 'asset-placeholder', 'aria-hidden': 'true' }, h('path', { d: 'M4 8 8 4 12 8 8 12Z', fill: 'none', stroke: 'currentColor' })));
    if (!isAssetRef(ref)) {
        warn(options);
        return placeholder();
    }
    const skin = ref.startsWith('skin:');
    let src;
    try {
        if (skin) {
            const key = ref.slice(5);
            const scope = options.skinScope ?? renderingSkinScope();
            const fixed = renderingSkinLayer();
            const density = options.density ?? globalThis.devicePixelRatio;
            src = fixed ? assetOfLayer(fixed, key, options.lang, density)
                : skinAssetOf(ref, scope, options.lang, density);
        }
        else
            src = options.assetUrl?.(ref);
    }
    catch { }
    if (!src) {
        warn(options);
        return placeholder();
    }
    const fail = (event) => {
        const target = event.currentTarget;
        target?.removeAttribute('src');
        target?.removeAttribute('href');
        target?.setAttribute('data-part', 'asset-placeholder');
        const root = ['image', 'use'].includes(target?.localName ?? '') ? target?.parentElement : target;
        if (root?.parentNode) {
            const staging = root.ownerDocument.createElement('span');
            sync(staging, [placeholder()], new AbortController().signal);
            root.replaceWith(staging.firstChild);
        }
        warn(options);
    };
    const sprite = skin && src.match(/^(.*)#sprite=(\d+),(\d+),(\d+),(\d+),(\d+),(\d+)$/);
    if (sprite) {
        const [, href, x, y, width, height, atlasWidth, atlasHeight] = sprite;
        return h('svg', { ...attrs, viewBox: `0 0 ${width} ${height}`, role: 'img',
            'data-part': attrs['data-part'] ?? 'asset-image', 'data-asset-kind': 'skin' }, h('image', { href, x: -Number(x), y: -Number(y), width: atlasWidth, height: atlasHeight, onError: fail }));
    }
    if (skin && /\.svg#[a-zA-Z][\w.-]*$/.test(src)) {
        return h('svg', { ...attrs, role: 'img', 'aria-label': attrs['alt'] ?? '',
            'data-part': attrs['data-part'] ?? 'asset-image', 'data-asset-kind': 'skin' }, h('use', { href: src, onError: fail }));
    }
    return h('img', { alt: '', ...attrs, src, loading: 'lazy', decoding: 'async',
        referrerpolicy: 'no-referrer', 'data-part': attrs['data-part'] ?? 'asset-image',
        'data-asset-kind': skin ? 'skin' : 'image', 'data-loading': true,
        onLoad: event => event.currentTarget?.removeAttribute('data-loading'),
        onError: fail });
}
export const ASSET_IMAGE_CSS = `
img[data-asset-kind],svg[data-asset-kind]{max-width:100%;object-fit:contain}
img[data-asset-kind][data-loading]{background:var(--kit-asset-placeholder,currentColor);opacity:.2}
[data-part=asset-placeholder]{display:inline-block;min-width:1em;min-height:1em}
`;
export const AssetImage = createViewComponent({
    styles: ':host{display:inline-block}' + ASSET_IMAGE_CSS,
    local: () => ({}), render: p => assetImageView(p.ref, p, {
        alt: p.alt ?? '', ...(p.width !== undefined ? { width: p.width } : {}),
        ...(p.height !== undefined ? { height: p.height } : {})
    }),
});
nameComponents({ AssetImage });

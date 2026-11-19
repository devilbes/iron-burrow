import { skinKeys } from './skin-keys.generated.js';
import { defineSkin, invalid } from './skin-spec.js';
const keys = new Set(skinKeys);
const ID = /^[a-z][a-z0-9-]{0,63}$/;
export function bundlePath(value) {
    if (typeof value !== 'string' || value.length > 256
        || !/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_.-]+)*\.[a-zA-Z0-9]+$/.test(value)
        || value.split('/').some(part => part === '.' || part === '..'))
        invalid('bundle path');
    return value;
}
export function bundleAssetPath(value) {
    if (typeof value !== 'string' || value.length > 320)
        invalid('bundle asset');
    const [rawPath, fragment = '', ...extra] = value.split('#');
    const path = bundlePath(rawPath);
    if (extra.length)
        invalid('bundle asset');
    if (value.includes('#')) {
        if (!path.endsWith('.png')
            || !/^sprite=(?:0|[1-9][0-9]{0,4})(?:,(?:0|[1-9][0-9]{0,4})){5}$/.test(fragment)) {
            invalid('bundle sprite');
        }
        const [x, y, width, height, atlasWidth, atlasHeight] = fragment.slice(7).split(',').map(Number);
        if (!width || !height || !atlasWidth || !atlasHeight
            || atlasWidth > 32768 || atlasHeight > 32768
            || x + width > atlasWidth || y + height > atlasHeight)
            invalid('bundle sprite');
    }
    return { path, fragment: fragment ? `#${fragment}` : '' };
}
export function object(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)
        || Object.keys(value).some(key => ['__proto__', 'constructor', 'prototype'].includes(key))) {
        invalid('bundle object');
    }
    return value;
}
function only(value, names) {
    if (Object.keys(value).some(key => !names.includes(key)))
        invalid('bundle field');
}
function path(value, extension) {
    const result = bundlePath(value);
    if (!result.endsWith(extension))
        invalid('bundle file type');
    return result;
}
export function parseSkinBundle(value) {
    const spec = object(value);
    only(spec, ['id', 'version', 'kind', 'extends', 'compat', 'tokens', 'fonts', 'displayTitle',
        'closePosition', 'overrides', 'locales', 'integrity']);
    if (typeof spec['id'] !== 'string' || !ID.test(spec['id']) || spec['kind'] !== 'skin'
        || typeof spec['version'] !== 'string'
        || !/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(spec['version'])
        || (spec['extends'] !== undefined && (typeof spec['extends'] !== 'string'
            || !ID.test(spec['extends']))) || spec['integrity'] !== 'integrity.json')
        invalid('bundle metadata');
    const compat = object(spec['compat']);
    only(compat, ['ui-kit']);
    if (typeof compat['ui-kit'] !== 'string' || !compat['ui-kit'].trim()
        || compat['ui-kit'].length > 256)
        invalid('bundle compat');
    const tokens = object(spec['tokens'] ?? {});
    for (const [key, value] of Object.entries(tokens)) {
        if (!keys.has(`token:${key}`) || typeof value !== 'string'
            || /url\s*\(|image-set\s*\(/i.test(value))
            invalid('bundle token');
    }
    if (spec['fonts'] !== undefined && (!Array.isArray(spec['fonts'])
        || spec['fonts'].length > 16))
        invalid('bundle fonts');
    for (const font of spec['fonts'] ?? []) {
        const item = object(font);
        only(item, ['family', 'url', 'weight', 'style', 'unicodeRange']);
        const file = bundlePath(item['url']);
        if (!/\.(woff2?|ttf|otf)$/.test(file))
            invalid('bundle font');
    }
    if (spec['displayTitle'] !== undefined && spec['displayTitle'] !== true) {
        only(object(spec['displayTitle']), ['arc', 'windows']);
    }
    defineSkin({ id: spec['id'], tokens, fonts: spec['fonts'], displayTitle: spec['displayTitle'],
        closePosition: spec['closePosition'], base: 'https://invalid.invalid/' });
    const components = new Set();
    for (const [key, override] of Object.entries(object(spec['overrides'] ?? {}))) {
        if (!keys.has(key))
            invalid('bundle key');
        if (key.startsWith('window:')) {
            const window = object(override);
            only(window, ['component', 'template', 'css']);
            if (typeof window['component'] !== 'string' || !keys.has(`component:${window['component']}`)
                || components.has(window['component']))
                invalid('bundle window component');
            components.add(window['component']);
            path(window['template'], '.json');
            if (window['css'] !== undefined)
                path(window['css'], '.css');
        }
        else if (key.startsWith('component:'))
            path(override, '.css');
        else if (key.startsWith('icon:') || key.startsWith('asset:'))
            bundleAssetPath(override);
        else if (key.startsWith('slot:'))
            path(override, '.css');
        else
            invalid('bundle override');
    }
    for (const [locale, file] of Object.entries(object(spec['locales'] ?? {}))) {
        if (!/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(locale))
            invalid('bundle locale');
        path(file, '.json');
    }
    return structuredClone(spec);
}
export function parseSkinTemplate(value, window) {
    const spec = object(value);
    only(spec, ['mode', 'slots', 'layout']);
    const allowed = (name) => typeof name === 'string'
        && keys.has(`slot:${window.slice('window:'.length)}:${name}`);
    if (spec['slots'] !== undefined && (!Array.isArray(spec['slots'])
        || spec['slots'].some(name => !allowed(name))))
        invalid('bundle slot');
    const used = new Set();
    let count = 0;
    const visit = (value, depth) => {
        if (++count > 128 || depth > 8)
            invalid('bundle layout size');
        const node = object(value);
        if ('slot' in node) {
            only(node, ['slot']);
            if (!allowed(node['slot']) || used.has(node['slot']))
                invalid('bundle layout slot');
            used.add(node['slot']);
            return;
        }
        only(node, ['tag', 'class', 'children']);
        if (!['div', 'section', 'article', 'header', 'footer', 'aside', 'main'].includes(String(node['tag']))
            || (node['class'] !== undefined && (typeof node['class'] !== 'string'
                || !/^[A-Za-z0-9_ -]{0,256}$/.test(node['class'])))
            || !Array.isArray(node['children']))
            invalid('bundle layout');
        for (const child of node['children'])
            visit(child, depth + 1);
    };
    if (spec['layout'] !== undefined)
        visit(spec['layout'], 0);
    return defineSkin({ id: 'validation', windows: { target: spec } })
        .windows['target'];
}

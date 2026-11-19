import { addSkinLayer, validSkinScope } from './skin-layer.js';
const ID = /^[a-z][a-z0-9-]{0,63}$/;
export const TARGET = /^(?:\*|[a-zA-Z][a-zA-Z0-9-]{0,63})$/;
const TOKEN = /^--[a-z][a-z0-9-]{0,63}$/;
const KEY = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const FAMILY = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,63}$/;
const MAX_CSS = 256 * 1024;
const CLOSE = ['head-right', 'head-left', 'corner-out'];
export function invalid(why) {
    throw new TypeError(`UI_SKIN_INVALID:${why}`);
}
export function pageBase() {
    return globalThis.document?.baseURI ?? globalThis.location?.href ?? 'https://invalid.invalid/';
}
export function absolute(value, base, why) {
    if (typeof value !== 'string' || !value || value.length > 2048)
        invalid(why);
    let url;
    try {
        url = new URL(value, base);
    }
    catch {
        return invalid(why);
    }
    if (!['https:', 'http:', 'file:'].includes(url.protocol) || url.username || url.password
        || /["'\\\s]/.test(url.href))
        invalid(why);
    return url.href;
}
function tokenValue(value, name) {
    if (typeof value !== 'string' || value.length > 512 || /[;{}<>\\]|\/\*/.test(value)) {
        invalid(`token ${name}`);
    }
    return value.trim();
}
export function defineSkin(spec) {
    if (typeof spec !== 'object' || spec === null || !ID.test(String(spec.id)))
        invalid('id');
    const parent = spec.extends;
    const ownCss = spec.css;
    if (parent !== undefined && parent !== 'neutral') {
        if (!parent || typeof parent !== 'object' || !Object.isFrozen(parent))
            invalid('extends');
        spec = { ...parent, ...spec, extends: parent,
            base: spec.base ?? pageBase(),
            tokens: { ...parent.tokens, ...spec.tokens },
            css: { ...Object.fromEntries(Object.entries(parent.css)
                    .map(([key, value]) => [key, 'text' in value ? value.text : new URL(value.url)])), ...spec.css },
            assets: { ...parent.assets, ...spec.assets },
            assetVariants: { ...parent.assetVariants, ...spec.assetVariants },
            windows: { ...parent.windows, ...spec.windows },
            fonts: [...parent.fonts, ...(spec.fonts ?? [])],
        };
    }
    const base = absolute(spec.base ?? pageBase(), pageBase(), 'base');
    const folder = base.endsWith('/') || spec.base === undefined ? base : `${base}/`;
    const tokens = {};
    for (const [name, value] of Object.entries(spec.tokens ?? {})) {
        if (!TOKEN.test(name))
            invalid(`token ${name}`);
        tokens[name] = tokenValue(value, name);
    }
    const css = {};
    for (const [target, value] of Object.entries(spec.css ?? {})) {
        if (!TARGET.test(target) || target === 'fonts')
            invalid(`css ${target}`);
        if (value instanceof URL)
            css[target] = { url: absolute(value.href, folder, `css ${target}`) };
        else if (typeof value === 'string' && value.length <= MAX_CSS)
            css[target] = { text: value };
        else
            invalid(`css ${target}`);
    }
    if (parent && parent !== 'neutral') {
        for (const [target, value] of Object.entries(parent.css)) {
            if (!ownCss || !Object.hasOwn(ownCss, target)) {
                css[target] = 'text' in value ? { text: value.text, baseURL: value.baseURL ?? parent.base }
                    : { url: value.url };
            }
        }
    }
    const assets = Object.create(null);
    for (const [key, value] of Object.entries(spec.assets ?? {})) {
        if (!KEY.test(key))
            invalid(`asset ${key}`);
        assets[key] = absolute(value, folder, `asset ${key}`);
    }
    const assetVariants = Object.create(null);
    for (const [key, variants] of Object.entries(spec.assetVariants ?? {})) {
        if (!KEY.test(key) || !Array.isArray(variants) || variants.length < 1 || variants.length > 32)
            invalid('asset variants');
        const seen = new Set();
        assetVariants[key] = Object.freeze(variants.map((v) => {
            if (!v || (v.locale !== undefined && !/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(v.locale))
                || (v.density !== undefined && (!Number.isFinite(v.density) || v.density < 1 || v.density > 4)))
                invalid('asset variant');
            const id = `${v.locale?.toLowerCase() ?? ''}:${v.density ?? 1}`;
            if (seen.has(id))
                invalid('duplicate asset variant');
            seen.add(id);
            return Object.freeze({ ...v, url: absolute(v.url, folder, 'asset variant') });
        }));
    }
    const fonts = (spec.fonts ?? []).map((font, i) => {
        if (!FAMILY.test(String(font?.family)))
            invalid(`font ${i}`);
        const weight = font.weight === undefined ? undefined : String(font.weight);
        if (weight !== undefined && !/^(?:[1-9]00(?: [1-9]00)?|normal|bold)$/.test(weight)) {
            invalid(`font ${i}`);
        }
        if (font.style !== undefined && font.style !== 'normal' && font.style !== 'italic') {
            invalid(`font ${i}`);
        }
        if (font.unicodeRange !== undefined && !/^[Uu+0-9A-Fa-f?, -]{1,512}$/.test(font.unicodeRange)) {
            invalid(`font ${i}`);
        }
        return Object.freeze({ family: font.family, url: absolute(font.url, folder, `font ${i}`),
            ...(weight !== undefined ? { weight } : {}), ...(font.style ? { style: font.style } : {}),
            ...(font.unicodeRange ? { unicodeRange: font.unicodeRange } : {}) });
    });
    const title = spec.displayTitle === true ? {} : spec.displayTitle;
    if (title !== undefined && (typeof title !== 'object' || title === null
        || (title.arc !== undefined
            && !(Number.isFinite(title.arc) && title.arc >= 0 && title.arc <= 48))
        || (title.windows !== undefined && typeof title.windows !== 'boolean')))
        invalid('displayTitle');
    const close = spec.closePosition;
    if (close !== undefined && !CLOSE.includes(close))
        invalid('closePosition');
    const windows = {};
    const layout = (template, target) => {
        if (!template || typeof template !== 'object' || Array.isArray(template)
            || !['centered', 'fullscreen'].includes(template.mode)
            || (template.slots !== undefined && (!Array.isArray(template.slots)
                || template.slots.length > 32 || new Set(template.slots).size !== template.slots.length
                || template.slots.some(slot => typeof slot !== 'string' || !KEY.test(slot))))
            || (template.heading !== undefined && (!template.heading
                || ['ru', 'en'].some(lang => typeof template.heading?.[lang] !== 'string'
                    || template.heading[lang].length > 256))))
            invalid(`window ${target}`);
        return Object.freeze({ mode: template.mode,
            ...(template.layout ? { layout: template.layout } : {}),
            ...(template.slots ? { slots: Object.freeze([...template.slots]) } : {}),
            ...(template.heading ? { heading: Object.freeze({ ...template.heading }) } : {}) });
    };
    for (const [target, template] of Object.entries(spec.windows ?? {})) {
        if (!TARGET.test(target) || target === '*' || !template)
            invalid(`window ${target}`);
        windows[target] = Object.freeze({ ...layout(template, target),
            ...(template.portrait !== undefined ? { portrait: layout(template.portrait, target) } : {}),
            ...(template.landscape !== undefined
                ? { landscape: layout(template.landscape, target) } : {}) });
    }
    return Object.freeze({ id: spec.id, base: folder,
        ...(parent ? { extends: parent === 'neutral' ? parent : parent.id } : {}), tokens: Object.freeze(tokens),
        css: Object.freeze(css), windows: Object.freeze(windows),
        assets: Object.freeze(assets), assetVariants: Object.freeze(assetVariants),
        fonts: Object.freeze(fonts),
        ...(title ? { displayTitle: Object.freeze({ ...title }) } : {}),
        ...(close ? { closePosition: close } : {}) });
}
function declarations(skin) {
    return [...Object.entries(skin.tokens).map(([name, value]) => `${name}:${value}`),
        ...Object.entries(skin.assets).map(([key, url]) => `--kit-asset-${key}:url("${url}")`)]
        .join(';');
}
function fontFaces(skin) {
    return skin.fonts.map((font) => `@font-face{font-family:"${font.family}";`
        + `src:url("${font.url}")${/\.woff2(?:$|[?#])/.test(font.url) ? ' format("woff2")' : ''};`
        + `font-display:swap${font.weight ? `;font-weight:${font.weight}` : ''}`
        + `${font.style ? `;font-style:${font.style}` : ''}`
        + `${font.unicodeRange ? `;unicode-range:${font.unicodeRange}` : ''}}`).join('\n');
}
export async function skinSheetsOf(skin, fetcher, signal) {
    const sheets = [];
    for (const font of skin.fonts) {
        sheets.push({ target: 'fonts', text: fontFaces({ ...skin, fonts: [font] }) });
    }
    const vars = declarations(skin);
    if (vars) {
        sheets.push({ target: '*', text: `:host{${vars}}` });
        sheets.push({ target: 'shell', text: `:root,html .mpg-shell{${vars}}` });
    }
    const css = await Promise.all(Object.entries(skin.css).map(async ([target, value]) => {
        signal?.throwIfAborted();
        if ('text' in value)
            return { target, text: value.text, baseURL: value.baseURL ?? skin.base };
        const load = fetcher ?? globalThis.fetch;
        if (!load)
            throw new Error(`UI_SKIN_CSS_LOAD_FAILED:${value.url}`);
        let text;
        try {
            const response = await load(value.url, { ...(signal ? { signal } : {}) });
            if (!response.ok)
                throw new Error('status');
            text = await response.text();
        }
        catch (cause) {
            throw new Error(`UI_SKIN_CSS_LOAD_FAILED:${value.url}`, { cause });
        }
        if (text.length > MAX_CSS)
            throw new Error(`UI_SKIN_CSS_LOAD_FAILED:${value.url}`);
        signal?.throwIfAborted();
        return { target, text, baseURL: value.url };
    }));
    return [...sheets, ...css];
}
const REQUIRED_ICON_KEYS = ['icon-close', 'icon-menu', 'icon-back', 'icon-settings'];
function warnAssetUrls(skin, sheets) {
    for (const sheet of sheets) {
        if (!sheet.baseURL)
            continue;
        const css = sheet.text.replace(/\/\*[\s\S]*?\*\//g, '');
        for (const match of css.matchAll(/url\(\s*["']?([^"'()\s]+)["']?\s*\)/gi)) {
            const path = match[1];
            if (/^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(path))
                continue;
            const file = new URL(path, skin.base).pathname.split('/').at(-1);
            const key = Object.keys(skin.assets).find((key) => new URL(skin.assets[key]).pathname.split('/').at(-1) === file);
            if (key !== undefined)
                console.warn(`UI_SKIN_RELATIVE_ASSET:${skin.id}:${sheet.target}:use var(--kit-asset-${key})`);
        }
    }
}
async function preloadAssets(skin, doc, signal) {
    signal?.throwIfAborted();
    const Image = doc?.defaultView?.Image;
    if (!Image)
        return;
    const urls = new Set(Object.values(skin.assets).map(url => url.replace(/#sprite=.*$/, '')));
    await Promise.all([...urls].map(url => new Promise((resolve, reject) => {
        const image = new Image();
        const timer = setTimeout(() => fail(new Error('timeout')), 15000);
        const clean = () => {
            clearTimeout(timer);
            image.onload = null;
            image.onerror = null;
            signal?.removeEventListener('abort', abort);
        };
        const fail = (cause) => {
            clean();
            image.removeAttribute('src');
            reject(new Error(`UI_SKIN_ASSET_LOAD_FAILED:${url}`, { cause }));
        };
        const abort = () => fail(signal?.reason);
        signal?.addEventListener('abort', abort, { once: true });
        if (signal?.aborted) {
            abort();
            return;
        }
        image.onerror = fail;
        image.onload = () => {
            const decoded = image.decode ? image.decode() : Promise.resolve();
            void decoded.then(() => { clean(); resolve(); }, fail);
        };
        image.src = url;
    })));
}
export async function useSkin(skin, options = {}) {
    return (await prepareSkin(skin, options))();
}
export async function prepareSkin(skin, options = {}) {
    const level = options.level ?? 'game';
    if (level !== 'kit' && level !== 'game' && level !== 'mechanic' && level !== 'scope')
        invalid('level');
    if (level !== 'scope' && options.scope !== undefined)
        invalid('scope level');
    if (level === 'scope' && (!options.scope || !validSkinScope(options.scope)))
        invalid('scope');
    if (level === 'scope' && ('shell' in skin.css || 'fonts' in skin.css))
        invalid('scope target');
    options.signal?.throwIfAborted();
    const controller = new AbortController();
    const signal = options.signal
        ? AbortSignal.any([controller.signal, options.signal]) : controller.signal;
    let loadedSheets;
    try {
        [loadedSheets] = await Promise.all([skinSheetsOf(skin, options.fetch, signal),
            preloadAssets(skin, options.document ?? globalThis.document, signal)]);
        signal.throwIfAborted();
    }
    catch (cause) {
        controller.abort(cause);
        throw cause;
    }
    const sheets = loadedSheets
        .filter(entry => level !== 'scope' || entry.target !== 'shell');
    for (const entry of sheets) {
        if (entry.target !== 'fonts' && /@(?:import|font-face)\b/i.test(entry.text))
            invalid('css rule');
        const doc = options.document ?? globalThis.document;
        if (doc) {
            const View = doc.defaultView;
            if (View?.CSSStyleSheet)
                new View.CSSStyleSheet().replaceSync(entry.text);
        }
    }
    if (options.dev ?? /^(localhost|127\.0\.0\.1|\[::1\])$/.test(globalThis.location?.hostname ?? '')) {
        for (const key of REQUIRED_ICON_KEYS) {
            if (!skin.assets[key] && !(key === 'icon-close' && skin.assets['close'])) {
                console.warn(`UI_SKIN_MISSING_ICON:${skin.id}:${key}`);
            }
        }
        warnAssetUrls(skin, sheets);
    }
    return () => {
        signal.throwIfAborted();
        const remove = addSkinLayer({ id: skin.id, level,
            ...(options.scope ? { scope: options.scope } : {}), sheets, assets: skin.assets,
            ...(options.missing ? { missing: options.missing } : {}),
            ...(options.neutralBase ? { neutralBase: true } : {}),
            assetVariants: skin.assetVariants,
            ...(skin.windows ? { windows: skin.windows } : {}),
            ...(skin.displayTitle ? { displayTitle: skin.displayTitle } : {}),
            ...(skin.closePosition ? { closePosition: skin.closePosition } : {}) }, options.document ?? globalThis.document);
        return Object.freeze({ id: skin.id, level,
            ...(options.scope ? { scope: options.scope } : {}), remove });
    };
}

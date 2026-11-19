import { defineSkin, useSkin, prepareSkin } from './skin-spec.js';
import { bundlePath, bundleAssetPath, object, parseSkinBundle, parseSkinTemplate } from './skin-bundle-schema.js';
import { beginSkinBundle } from './skin-layer.js';
const MAX_FILE = 1024 * 1024;
const MAX_PNG_FILE = 2 * MAX_FILE;
const MAX_TOTAL = 8 * MAX_FILE;
function fail() { throw new Error('UI_SKIN_BUNDLE_INVALID'); }
const decode = (bytes) => new TextDecoder('utf-8', { fatal: true }).decode(bytes);
const json = (bytes) => JSON.parse(decode(bytes));
function baseURL(value) {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password
        || url.search || url.hash || !url.pathname.endsWith('/'))
        fail();
    return url;
}
function rewriteCssUrls(text, resolve) {
    const whitespace = (char) => /[ \t\n\r\f]/.test(char);
    const name = (char) => /[a-z0-9_\-\u0080-\uffff]/i.test(char);
    if ([...text].some(char => {
        const code = char.charCodeAt(0);
        return char === '\\' || code === 127 || (code < 32 && !whitespace(char));
    }))
        fail();
    let output = '';
    let copied = 0;
    let cursor = 0;
    const spaces = () => {
        while (cursor < text.length && whitespace(text[cursor]))
            cursor++;
    };
    const string = () => {
        const quote = text[cursor++];
        const start = cursor;
        while (cursor < text.length && text[cursor] !== quote) {
            if (/[\n\r\f]/.test(text[cursor]))
                fail();
            cursor++;
        }
        if (cursor === text.length)
            fail();
        const value = text.slice(start, cursor);
        cursor++;
        return value;
    };
    while (cursor < text.length) {
        const char = text[cursor];
        if (char === '"' || char === "'") {
            string();
            continue;
        }
        if (!name(char)) {
            cursor++;
            continue;
        }
        const start = cursor++;
        while (cursor < text.length && name(text[cursor]))
            cursor++;
        if (text.slice(start, cursor).toLowerCase() !== 'url' || text[cursor] !== '(')
            continue;
        cursor++;
        spaces();
        let value;
        if (text[cursor] === '"' || text[cursor] === "'") {
            value = string();
            spaces();
        }
        else {
            const valueStart = cursor;
            while (cursor < text.length && text[cursor] !== ')' && !whitespace(text[cursor])) {
                if (text[cursor] === '(' || text[cursor] === '"' || text[cursor] === "'")
                    fail();
                cursor++;
            }
            value = text.slice(valueStart, cursor);
            spaces();
        }
        if (!value || text[cursor] !== ')')
            fail();
        cursor++;
        output += text.slice(copied, start) + `url("${resolve(value)}")`;
        copied = cursor;
    }
    return output + text.slice(copied);
}
async function digest(bytes) {
    const hash = await globalThis.crypto.subtle.digest('SHA-256', new Uint8Array(bytes));
    return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}
async function read(url, context, limit = MAX_FILE) {
    const { signal, options } = context;
    signal.throwIfAborted();
    const response = await (options.fetch ?? globalThis.fetch)(url.href, {
        signal, credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer',
    });
    signal.throwIfAborted();
    if (!response.ok || !response.body)
        fail();
    const reader = response.body.getReader();
    const cancel = () => { void reader.cancel().catch(() => { }); };
    signal.addEventListener('abort', cancel, { once: true });
    const chunks = [];
    let size = 0;
    try {
        for (;;) {
            const item = await reader.read();
            signal.throwIfAborted();
            if (item.done)
                break;
            size += item.value.byteLength;
            context.total += item.value.byteLength;
            if (size > limit || context.total > MAX_TOTAL)
                fail();
            chunks.push(item.value);
        }
    }
    finally {
        signal.removeEventListener('abort', cancel);
        await reader.cancel().catch(() => { });
        reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return bytes;
}
async function load(ref, context) {
    const { manifest } = ref;
    if (!manifest || manifest.kind !== 'skin'
        || !context.options.satisfies(manifest.version, manifest.version)
        || !context.options.satisfies(context.options.uiKitVersion, manifest.compat?.['ui-kit'])
        || context.seen.has(manifest.id) || context.seen.size >= 8)
        fail();
    context.seen.add(manifest.id);
    const base = baseURL(ref.baseURL);
    const raw = await read(new URL('skin.json', base), context);
    const spec = parseSkinBundle(json(raw));
    if (!(manifest.id === spec.id || manifest.id === `ui.skin.${spec.id}` || manifest.id === `skin-${spec.id}`)
        || manifest.version !== spec.version || manifest.compat['ui-kit'] !== spec.compat['ui-kit']
        || !context.options.satisfies(context.options.uiKitVersion, spec.compat['ui-kit']))
        fail();
    const hashes = object(json(await read(new URL(spec.integrity, base), context)));
    const entries = Object.entries(hashes);
    if (!entries.length || entries.length > 128 || !Object.hasOwn(hashes, 'skin.json'))
        fail();
    const files = new Map();
    for (const [path, hash] of entries) {
        bundlePath(path);
        if (path === spec.integrity || typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash))
            fail();
        const bytes = path === 'skin.json' ? raw : await read(new URL(path, base), context, path.endsWith('.png') ? MAX_PNG_FILE : MAX_FILE);
        if (await digest(bytes) !== hash)
            throw new Error('UI_SKIN_INTEGRITY');
        context.signal.throwIfAborted();
        files.set(path, bytes);
    }
    const file = (path) => files.get(bundlePath(path)) ?? fail();
    const url = (path) => { file(path); return new URL(path, base).href; };
    const css = (path) => {
        const text = decode(file(path)).replace(/\/\*[\s\S]*?\*\//g, '');
        if (/\\|@(?:import|namespace|font-face)|image-set\s*\(/i.test(text))
            fail();
        return rewriteCssUrls(text, value => {
            const resolved = new URL(value, new URL(path, base));
            if (!resolved.href.startsWith(base.href) || resolved.search || resolved.hash)
                fail();
            return url(resolved.href.slice(base.href.length));
        });
    };
    let parent;
    if (spec.extends && spec.extends !== 'neutral') {
        const next = await context.options.resolve?.(spec.extends);
        context.signal.throwIfAborted();
        if (!next || !(next.manifest.id === spec.extends
            || next.manifest.id === `ui.skin.${spec.extends}` || next.manifest.id === `skin-${spec.extends}`))
            fail();
        parent = await load(next, context);
    }
    const sheets = {};
    const append = (target, text) => { sheets[target] = `${sheets[target] ?? ''}\n${text}`; };
    for (const [target, value] of Object.entries(parent?.css ?? {})) {
        if (!('text' in value))
            fail();
        append(target, value.text);
    }
    if (files.has('tokens.css')) {
        const text = css('tokens.css');
        append('*', text);
        append('shell', text);
    }
    const assets = { ...parent?.assets };
    const windows = { ...parent?.windows };
    const overrides = spec.overrides ?? {};
    for (const [key, value] of Object.entries(overrides)) {
        if (key.startsWith('window:')) {
            if (manifest.ui?.windows && !manifest.ui.windows.includes(key))
                fail();
            const entry = value;
            windows[entry.component] = parseSkinTemplate(json(file(entry.template)), key);
            if (entry.css)
                append(entry.component, css(entry.css));
        }
        else if (key.startsWith('component:'))
            append(key.slice(10), css(value));
        else if (key.startsWith('slot:')) {
            const parts = key.split(':');
            const window = overrides[`window:${parts[1]}:${parts[2]}`];
            if (!window || typeof window === 'string')
                fail();
            append(window.component, `[data-skin-slot="${parts[3]}"]{${css(value)}}`);
        }
        else {
            const asset = bundleAssetPath(value);
            assets[key.slice(key.indexOf(':') + 1)] = url(asset.path) + asset.fragment;
        }
    }
    for (const path of Object.values(spec.locales ?? {})) {
        const dictionary = object(json(file(path)));
        if (Object.values(dictionary).some(text => typeof text !== 'string' || text.length > 4096))
            fail();
    }
    const fonts = [...parent?.fonts ?? [], ...(spec.fonts ?? [])
            .map(font => ({ ...font, url: url(font.url) }))];
    return defineSkin({ id: spec.id, base: base.href, tokens: { ...parent?.tokens, ...spec.tokens },
        css: sheets, assets, fonts, windows,
        ...((spec.displayTitle ?? parent?.displayTitle) !== undefined
            ? { displayTitle: spec.displayTitle ?? parent.displayTitle } : {}),
        ...((spec.closePosition ?? parent?.closePosition) !== undefined
            ? { closePosition: spec.closePosition ?? parent.closePosition } : {}) });
}
export async function loadSkinBundle(ref, options) {
    const timeout = options.timeoutMs ?? 5000;
    if (!Number.isFinite(timeout) || timeout <= 0 || timeout > 30000)
        fail();
    const signal = AbortSignal.any([...(options.signal ? [options.signal] : []),
        AbortSignal.timeout(timeout)]);
    signal.throwIfAborted();
    return new Promise((resolve, reject) => {
        const abort = () => reject(new Error('UI_SKIN_BUNDLE_CANCELLED'));
        signal.addEventListener('abort', abort, { once: true });
        void load(ref, { options, signal, seen: new Set(), total: 0 }).then(resolve, reject)
            .finally(() => signal.removeEventListener('abort', abort));
    });
}
export async function applySkinBundle(ref, options) {
    const current = beginSkinBundle();
    const timeout = options.timeoutMs ?? 5000;
    if (!Number.isFinite(timeout) || timeout <= 0 || timeout > 30000)
        fail();
    const signal = AbortSignal.any([...(options.signal ? [options.signal] : []),
        AbortSignal.timeout(timeout)]);
    const settings = { ...options, signal };
    const reported = new Set();
    const report = (key) => {
        if (key && (!/^(?:icon:icon-|asset:)[a-z0-9_-]{1,64}$/.test(key)
            || reported.has(key) || reported.size >= 128))
            return;
        if (key)
            reported.add(key);
        const id = ref?.manifest?.id ?? '';
        const detail = {
            skin: /^[a-z][a-z0-9.-]{0,127}$/.test(id) ? id : '',
            fallback: 'neutral', code: 'UI_SKIN_MISSING', ...(key ? { key } : {})
        };
        if (options.dev ?? /^(localhost|127\.0\.0\.1|\[::1\])$/.test(globalThis.location?.hostname ?? ''))
            console.warn('UI_SKIN_MISSING', detail);
        try {
            options.diagnostic?.('sdk:ui:skin-fallback', detail);
        }
        catch { }
    };
    try {
        if (!ref)
            fail();
        const skin = await loadSkinBundle(ref, settings);
        signal.throwIfAborted();
        const commit = await prepareSkin(skin, { ...settings, dev: false, missing: report, neutralBase: true });
        if (!current())
            throw new Error('UI_SKIN_BUNDLE_SUPERSEDED');
        return commit();
    }
    catch (error) {
        if (options.signal?.aborted || !current())
            throw error;
        report();
        return useSkin(defineSkin({ id: 'neutral' }), { ...options, dev: false, neutralBase: true });
    }
}
export { parseSkinBundle };

import { skinWindowView, windowFocus } from './skin-layout.js';
import { HUD_LAYOUT, MENU_LAYOUT, WINDOW_TARGET_LAYOUT } from './layout.js';
import { windowOrientation } from './window-layout.js';
import { withWindowContext } from './window-context.js';
import { followSkin, withRenderingSkinScope, skinSheets, withRenderingSkinLayer } from './skin-layer.js';
const SVG = 'http://www.w3.org/2000/svg';
const NAME = /^[a-z][a-z0-9-]*(?::[a-z]+)?$/i;
const PROPS = new Set(['value', 'checked', 'disabled']);
export function view(tag, attrs = {}, ...children) {
    if (!NAME.test(tag))
        throw new TypeError(`Invalid tag ${tag}`);
    const plain = {};
    const on = {};
    for (const [name, value] of Object.entries(attrs)) {
        if (typeof value === 'function') {
            if (!/^on[A-Z][a-z]+$/.test(name))
                throw new TypeError(`Invalid listener ${name}`);
            on[name.slice(2).toLowerCase()] = value;
        }
        else {
            if (!NAME.test(name) || /^on/i.test(name) || name.toLowerCase() === 'style') {
                throw new TypeError(`Invalid attribute ${name}`);
            }
            plain[name] = value;
        }
    }
    return Object.freeze({ tag, attrs: Object.freeze(plain), on: Object.freeze(on),
        children: Object.freeze(children.flat()) });
}
const bound = new WeakMap();
function namespace(tag, parent) {
    return tag === 'svg' || parent.namespaceURI === SVG ? SVG : undefined;
}
function create(doc, node, parent, signal) {
    const ns = namespace(node.tag, parent);
    const element = ns ? doc.createElementNS(ns, node.tag) : doc.createElement(node.tag);
    bound.set(element, { attrs: {}, on: {}, listening: new Set() });
    apply(element, node, signal);
    sync(element, node.children, signal);
    return element;
}
function apply(element, node, signal) {
    const state = bound.get(element);
    for (const name of Object.keys(state.attrs)) {
        if (!(name in node.attrs))
            element.removeAttribute(name);
    }
    for (const [name, value] of Object.entries(node.attrs)) {
        if (state.attrs[name] === value && Object.hasOwn(state.attrs, name))
            continue;
        if (PROPS.has(name) && name in element) {
            const target = element;
            const next = name === 'value' ? String(value ?? '') : value === true;
            if (target[name] !== next)
                target[name] = next;
        }
        if (name !== 'value' && (value === undefined || value === false))
            element.removeAttribute(name);
        else if (name !== 'value')
            element.setAttribute(name, value === true ? '' : String(value));
    }
    state.attrs = node.attrs;
    state.on = node.on;
    for (const type of Object.keys(node.on)) {
        if (state.listening.has(type))
            continue;
        state.listening.add(type);
        element.addEventListener(type, (event) => { bound.get(element)?.on[type]?.(event); }, { signal });
    }
}
function same(element, node, parent) {
    if (element.nodeType !== 1)
        return false;
    const el = element;
    const ns = namespace(node.tag, parent) ?? 'http://www.w3.org/1999/xhtml';
    return el.namespaceURI === ns && el.localName === node.tag && bound.has(el);
}
export function sync(parent, children, signal) {
    const doc = parent.ownerDocument ?? parent;
    const wanted = children.filter((child) => child !== null && child !== undefined
        && child !== false);
    wanted.forEach((child, index) => {
        const existing = parent.childNodes[index];
        if (typeof child !== 'object') {
            const text = String(child);
            if (existing?.nodeType === 3) {
                if (existing.textContent !== text)
                    existing.textContent = text;
            }
            else if (existing)
                parent.replaceChild(doc.createTextNode(text), existing);
            else
                parent.appendChild(doc.createTextNode(text));
            return;
        }
        if (existing && same(existing, child, parent)) {
            apply(existing, child, signal);
            sync(existing, child.children, signal);
        }
        else if (existing) {
            parent.replaceChild(create(doc, child, parent, signal), existing);
        }
        else
            parent.appendChild(create(doc, child, parent, signal));
    });
    while (parent.childNodes.length > wanted.length)
        parent.lastChild?.remove();
}
const names = new WeakMap();
export function nameComponents(components) {
    for (const [name, component] of Object.entries(components))
        names.set(component, name);
}
export function componentName(component) {
    return names.get(component);
}
const sheets = new WeakMap();
function sheet(doc, text) {
    const View = doc.defaultView;
    if (!View?.CSSStyleSheet || !('replaceSync' in View.CSSStyleSheet.prototype))
        return undefined;
    let byText = sheets.get(doc);
    if (!byText) {
        byText = new Map();
        sheets.set(doc, byText);
    }
    let found = byText.get(text);
    if (!found) {
        found = new View.CSSStyleSheet();
        found.replaceSync(text);
        byText.set(text, found);
    }
    return found;
}
export function createViewComponent(options) {
    const mounted = new WeakMap();
    const draw = (entry) => {
        if (entry.controller.signal.aborted)
            return;
        const scope = entry.props.skinScope;
        const fixed = typeof options.skin === 'object' ? options.skin : undefined;
        const name = entry.name;
        const layout = name === 'hud' ? HUD_LAYOUT : name === 'bottomMenu'
            ? HUD_LAYOUT + MENU_LAYOUT : '';
        const own = sheet(entry.document, options.styles + layout + WINDOW_TARGET_LAYOUT);
        const current = entry.ctx.root.adoptedStyleSheets;
        const pinned = fixed ? skinSheets(entry.document, name ? ['*', name] : ['*'], undefined, [fixed]) : [];
        const others = current.filter(value => value !== entry.ownStyle && !pinned.includes(value));
        const next = [...(own ? [own] : []), ...others, ...pinned];
        if (current.length !== next.length || next.some((value, index) => value !== current[index])) {
            entry.ctx.root.adoptedStyleSheets = next;
        }
        entry.ownStyle = own;
        const viewport = entry.document.defaultView;
        const orientation = options.responsive ? windowOrientation(entry.props.orientation, { width: viewport?.innerWidth ?? 0, height: viewport?.innerHeight ?? 0 }) : undefined;
        const restoreFocus = orientation && entry.orientation && orientation !== entry.orientation
            ? windowFocus(entry.ctx.root) : undefined;
        if (orientation) {
            entry.orientation = orientation;
            entry.ctx.root.host?.setAttribute?.('data-orientation', orientation);
        }
        const props = orientation ? { ...entry.props, orientation } : entry.props;
        withRenderingSkinLayer(fixed, () => withRenderingSkinScope(scope, () => {
            withWindowContext({ component: name, orientation }, () => {
                const tree = options.render(props, entry.ctx);
                sync(entry.ctx.root, [fixed || options.skin === false ? tree
                        : skinWindowView(tree, name, scope, orientation)], entry.controller.signal);
            });
        }));
        options.rendered?.(props, entry.ctx);
        restoreFocus?.();
    };
    const self = Object.freeze({
        ...(options.presentation ? { presentation: options.presentation } : {}),
        ...(options.popupKind ? { popupKind: options.popupKind } : {}),
        mount(container, props) {
            if (mounted.has(container))
                throw new Error('UI_KIT_ALREADY_MOUNTED');
            const root = container.shadowRoot ?? container.attachShadow({ mode: 'open' });
            const styles = sheet(container.ownerDocument, options.styles);
            if (styles)
                root.adoptedStyleSheets = [styles];
            const controller = new AbortController();
            const entry = { props, controller, document: container.ownerDocument,
                name: names.get(this) ?? names.get(self),
                ownStyle: styles, ctx: Object.freeze({ local: options.local(),
                    root, signal: controller.signal, refresh: () => draw(entry) }) };
            mounted.set(container, entry);
            if (options.responsive) {
                const win = container.ownerDocument.defaultView;
                win?.addEventListener?.('resize', () => {
                    const orientation = windowOrientation(entry.props.orientation, { width: win.innerWidth, height: win.innerHeight });
                    if (orientation !== entry.orientation)
                        draw(entry);
                }, { signal: controller.signal });
            }
            if (options.skin === undefined) {
                const name = entry.name;
                entry.release = followSkin({ root, name,
                    get scope() { return entry.props.skinScope; },
                    redraw: () => draw(entry) });
            }
            draw(entry);
        },
        update(container, props) {
            const entry = mounted.get(container);
            if (!entry)
                return;
            entry.props = props;
            if (options.skin === undefined) {
                entry.release?.();
                const name = entry.name;
                entry.release = followSkin({ root: entry.ctx.root, name,
                    get scope() { return entry.props.skinScope; },
                    redraw: () => draw(entry) });
            }
            draw(entry);
        },
        unmount(container) {
            const entry = mounted.get(container);
            if (!entry)
                return;
            entry.controller.abort();
            if (options.responsive)
                container.removeAttribute?.('data-orientation');
            entry.release?.();
            mounted.delete(container);
            entry.ctx.root.replaceChildren();
        },
    });
    return self;
}

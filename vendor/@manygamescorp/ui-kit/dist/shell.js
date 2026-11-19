import { kitText } from './services/login-strings.js';
import { icon, icon as skinIconView, iconUrl } from './icon.js';
import { NEUTRAL_CSS as CONTROL_CSS } from './neutral.js';
import { SHELL_LAYOUT, POPUP_LAYOUT } from './layout.js';
import { closeIcon } from './features/shared.js';
import { closePositionOf, skinLayers, adoptSkinInto } from './skin-layer.js';
import serviceSlots from './catalog.json' with { type: 'json' };
import { hud as hudComponent } from './services/hud.js';
import { hudRegistryView } from './services/hud-registry.js';
import { bottomMenu } from './services/bottommenu.js';
import { topBarView } from './services/topbar.js';
export const SHELL_SLOTS = Object.freeze([
    'topBar.left', 'topBar.center', 'topBar.right', 'leftHandle', 'rightHandle',
    'bottomBar.left', 'bottomBar.center', 'bottomBar.right', 'screen', 'overlay', 'system', 'reward',
    'settings',
]);
export function popupKindOf(entry) {
    return entry.contribution.popupKind
        ?? entry.owner.components[entry.contribution.component]?.popupKind ?? 'info';
}
const ordered = (a, b) => (a.contribution.order ?? 0) - (b.contribution.order ?? 0)
    || (a.contribution.id < b.contribution.id ? -1 : a.contribution.id > b.contribution.id ? 1 : 0);
export function slotOf(item) {
    if (item.kind === 'route')
        return 'screen';
    if (item.kind === 'popup' || item.kind === 'window') {
        return item.slot === 'reward' ? 'reward' : item.slot === 'system' ? 'system' : 'overlay';
    }
    if (!item.slot || item.slot === 'screen' || item.slot === 'overlay'
        || item.slot === 'system' || item.slot === 'reward') {
        throw new Error(`UI_SHELL_CONTRIBUTION_INVALID:${item.id}`);
    }
    return item.slot;
}
export class UiRegistry {
    #modules = new Map();
    #entries = new Map();
    #installed;
    constructor(installed = () => true) {
        this.#installed = installed;
    }
    add(module) {
        const { id } = module.manifest;
        if (this.#modules.has(id))
            throw new Error(`UI_OBJECT_ID_COLLISION:${id}`);
        const items = module.manifest.ui?.contributes ?? [];
        const seen = new Set();
        for (const item of items) {
            if (this.#entries.has(item.id) || seen.has(item.id)) {
                throw new Error(`UI_OBJECT_ID_COLLISION:${item.id}`);
            }
            seen.add(item.id);
            slotOf(item);
            if (!Object.hasOwn(module.components, item.component)) {
                throw new Error(`UI_KIT_COMPONENT_MISSING:${item.component}`);
            }
        }
        this.#modules.set(id, module);
        const added = items.map((contribution) => Object.freeze({ contribution, owner: module,
            missing: Object.freeze((contribution.requiredServices ?? [])
                .filter((service) => !this.#installed(service))) }));
        for (const entry of added)
            this.#entries.set(entry.contribution.id, entry);
        return added;
    }
    remove(moduleId) {
        const module = this.#modules.get(moduleId);
        if (!module)
            return [];
        this.#modules.delete(moduleId);
        const removed = [...this.#entries.values()].filter((entry) => entry.owner === module);
        for (const entry of removed)
            this.#entries.delete(entry.contribution.id);
        return removed;
    }
    get(elementId) {
        return this.#entries.get(elementId);
    }
    slot(slot) {
        return [...this.#entries.values()].filter((entry) => {
            const { kind } = entry.contribution;
            return slotOf(entry.contribution) === slot && kind !== 'popup' && kind !== 'window';
        }).sort(ordered);
    }
    routes() {
        return this.slot('screen');
    }
    modules() {
        return [...this.#modules.values()];
    }
}
export const SHELL_LABELS = Object.freeze({
    ru: Object.freeze({ menu: 'Меню', settings: 'Настройки', close: 'Закрыть',
        empty: 'Пусто', missing: (services) => `Модуль не подключён или в разработке: ${services.join(', ')}` }),
    en: Object.freeze({ menu: 'Menu', settings: 'Settings', close: 'Close',
        empty: 'Empty', missing: (services) => `Module not connected or in development: ${services.join(', ')}` }),
});
export const SHELL_ICONS = Object.freeze(['menu', 'settings', 'user', 'login', 'globe',
    'sliders', 'data', 'trophy', 'bag', 'coins', 'ad', 'bug', 'info']);
const PORTRAIT_QUERY = '(orientation:portrait),(max-width:640px)';
const NEUTRAL_CSS = `
.mpg-shell [data-slot]:empty{pointer-events:none}
/* Layer hosts outlive the last live popup during its exit animation. Only live popups
   receive input, so a closing layer cannot swallow the next tap on a bar or window below. */
.mpg-shell [data-slot="overlay"],.mpg-shell [data-slot="system"]{pointer-events:none}
.mpg-shell [data-part="popup"]:not([data-closing]){pointer-events:auto}
/* Clip the game scene only: clipping the shell also clips popup scrollports and fixed scrims. */
.mpg-shell{position:relative;isolation:isolate}
.mpg-shell [data-slot="screen"]{isolation:isolate;min-width:0;min-height:0;position:relative;contain:paint}
html,body{
  background-image:var(--kit-asset-page-texture,none);
  background-repeat:var(--kit-page-texture-repeat,repeat);
  background-size:var(--kit-page-texture-size,auto);
  background-position:var(--kit-page-texture-position,center);
}
.mpg-shell [data-region="page-frame"]{
  position:absolute;inset:0;pointer-events:none;z-index:3;
  border:0 solid transparent;
  border-image-source:var(--kit-asset-page-frame,none);
  border-image-slice:var(--kit-page-frame-slice,0);
  border-image-width:var(--kit-page-frame-width,0px);
  border-image-repeat:var(--kit-page-frame-repeat,stretch);
}
`;
const sheets = new WeakMap();
function adoptStyles(doc) {
    const View = doc.defaultView;
    if (!View?.CSSStyleSheet
        || !('replaceSync' in View.CSSStyleSheet.prototype))
        return;
    const existing = sheets.get(doc);
    const sheet = existing ?? new View.CSSStyleSheet();
    sheet.replaceSync(SHELL_LAYOUT + POPUP_LAYOUT
        + CONTROL_CSS.replace(':host{display:block}', '')
            .replace('*,*::before,*::after', '.mpg-shell *,.mpg-shell *::before,.mpg-shell *::after')
            .replaceAll('button', '.mpg-shell button') + NEUTRAL_CSS);
    sheets.set(doc, sheet);
    if (!existing)
        doc.adoptedStyleSheets = [...doc.adoptedStyleSheets, sheet];
}
const edgeColors = new WeakMap();
function restoreEdgeToEdge(doc) {
    const saved = edgeColors.get(doc);
    if (!saved)
        return;
    doc.documentElement.style.setProperty('background-color', ...saved.root);
    if (doc.body && saved.body)
        doc.body.style.setProperty('background-color', ...saved.body);
    if (saved.meta) {
        if (saved.content === null)
            saved.meta.removeAttribute('content');
        else
            saved.meta.setAttribute('content', saved.content);
    }
    saved.created?.remove();
    edgeColors.delete(doc);
}
function paintEdgeToEdge(container) {
    const doc = container.ownerDocument;
    const View = doc.defaultView;
    if (typeof View?.getComputedStyle !== 'function')
        return;
    const probe = doc.createElement('div');
    probe.className = 'mpg-shell';
    probe.hidden = true;
    container.append(probe);
    const style = View.getComputedStyle(probe);
    const color = (style.getPropertyValue('--mp-bg-edge-top') || style.getPropertyValue('--mp-night')).trim();
    const page = style.getPropertyValue('--kit-page-background').trim();
    const bottom = page || (style.getPropertyValue('--mp-bg-edge-bottom') || color).trim() || color;
    probe.remove();
    if (!bottom) {
        restoreEdgeToEdge(doc);
        return;
    }
    let meta = doc.head?.querySelector('meta[name="theme-color"]') ?? null;
    if (!edgeColors.has(doc)) {
        const colors = (style) => [style.getPropertyValue('background-color'), style.getPropertyPriority('background-color')];
        const created = !meta && doc.head ? doc.createElement('meta') : undefined;
        edgeColors.set(doc, { root: colors(doc.documentElement.style),
            ...(doc.body ? { body: colors(doc.body.style) } : {}), meta,
            content: meta?.getAttribute('content') ?? null, ...(created ? { created } : {}) });
        if (created) {
            created.name = 'theme-color';
            doc.head.append(created);
            meta = created;
        }
    }
    doc.documentElement.style.backgroundColor = bottom;
    if (doc.body)
        doc.body.style.backgroundColor = bottom;
    if (!meta && doc.head) {
        meta = doc.createElement('meta');
        meta.name = 'theme-color';
        doc.head.append(meta);
    }
    meta?.setAttribute('content', page || color || bottom);
}
const ZONE_MAX_WIDTH = 800;
const POPUP_MARGIN = 0.05;
const POPUP_MIN_BAND = 320;
const LANDSCAPE_PHONE_MAX_WIDTH = 960;
const CLOSE_MS = 200;
const SETTINGS = '\u0000settings';
const LAYERS = ['overlay', 'system', 'reward'];
export function createUiShell(container, options) {
    const doc = container.ownerDocument;
    const win = doc.defaultView;
    adoptStyles(doc);
    paintEdgeToEdge(container);
    let lang = options.lang ?? 'ru';
    const labels = () => ({
        menu: kitText(options.text, lang)('kit.shell.menu'),
        settings: kitText(options.text, lang)('kit.shell.settings'),
        close: kitText(options.text, lang)('kit.shell.close'),
        empty: kitText(options.text, lang)('kit.shell.empty'),
        missing: services => kitText(options.text, lang)('kit.shell.missing', { services: services.join(', ') }),
        ...options.labels,
    });
    const text = (key) => (key ? options.text?.(key) ?? key : '');
    const localized = (key) => kitText(options.text, lang)(key);
    const registry = new UiRegistry(options.installed);
    const controller = new AbortController();
    const { signal } = controller;
    const node = (tag, attrs = {}, value) => {
        const element = doc.createElement(tag);
        for (const [name, attr] of Object.entries(attrs))
            element.setAttribute(name, attr);
        if (value !== undefined)
            element.textContent = value;
        return element;
    };
    const domOf = (icon, ns) => {
        const svgNs = 'http://www.w3.org/2000/svg';
        const namespace = icon.tag === 'svg' ? svgNs : ns;
        const element = namespace ? doc.createElementNS(namespace, icon.tag)
            : doc.createElement(icon.tag);
        for (const [name, value] of Object.entries(icon.attrs)) {
            element.setAttribute(name, String(value));
        }
        for (const child of icon.children) {
            if (child && typeof child === 'object')
                element.append(domOf(child, namespace));
        }
        return element;
    };
    const root = node('div', { class: 'mpg-shell', 'data-shell': '', 'data-menu': 'closed' });
    const slots = Object.fromEntries(SHELL_SLOTS.filter((slot) => slot !== 'settings')
        .map((slot) => [slot, node('div', { 'data-slot': slot })]));
    root.append(node('div', { 'data-region': 'ad-banner-top', 'aria-hidden': 'true' }), ...Object.values(slots), node('div', { 'data-region': 'ad-banner-bottom', 'aria-hidden': 'true' }), node('div', { 'data-region': 'page-frame', 'aria-hidden': 'true' }));
    container.replaceChildren(root);
    const updateInset = () => {
        const slot = serviceSlots.find((item) => item.id === 'ad-banner-slot');
        const enabled = slot.requiredServices.every((id) => options.installed?.(id) ?? true);
        const inset = (enabled ? options.ads?.bannerInset() : undefined) ?? { top: 0, bottom: 0 };
        for (const edge of ['top', 'bottom']) {
            const value = inset[edge];
            root.style.setProperty(`--kit-ad-inset-${edge}`, `${Number.isFinite(value) ? Math.max(0, Math.min(512, value)) : 0}px`);
        }
    };
    const offInset = options.ads?.onChange(updateInset);
    updateInset();
    const menuToggle = node('button', { type: 'button', 'data-part': 'menu-toggle',
        'aria-expanded': 'false' });
    const settingsButton = node('button', { type: 'button', 'data-part': 'settings' });
    const menu = node('nav', { 'data-part': 'menu' });
    const hosted = { 'topBar.left': node('span', { 'data-part': 'hosted' }),
        'topBar.right': node('span', { 'data-part': 'hosted' }) };
    slots['topBar.left'].append(menuToggle, hosted['topBar.left']);
    const title = node('span', { 'data-part': 'title' }, options.title);
    slots['topBar.center'].append(title);
    const topBarHosts = ['left', 'center', 'right'].map((slot) => {
        const host = node('span', { 'data-part': 'topbar', 'data-group': slot });
        slots[`topBar.${slot}`].append(host);
        return { slot, host };
    });
    slots['topBar.right'].append(hosted['topBar.right'], settingsButton);
    const topBarProps = (slot) => ({
        elementId: `kit.topbar.${slot}`, lang, ...(options.text ? { l10n: options.text } : {}), slot: 'top', group: slot,
        ariaLabel: `${localized('sdk.topbar.label')} ${localized(`sdk.topbar.${slot}`)}`,
        items: options.topBar ? topBarView(options.topBar, (key) => text(key), undefined, slot) : [],
        emitIntent: (intent, payload) => {
            const id = payload?.['id'];
            if (intent === 'open' && typeof id === 'string')
                options.topBar?.click(id);
        }
    });
    const renderTopBar = () => {
        const enabled = options.zones?.settings();
        const on = options.topBar?.context() === 'core'
            ? enabled?.topbarCore !== false : enabled?.topbarMain !== false;
        const bars = ['topBar.left', 'topBar.center', 'topBar.right'].map(slot => slots[slot]);
        if (!on)
            for (const bar of bars)
                bar.remove();
        else if (bars.some(bar => bar.parentElement !== root))
            root.prepend(...bars);
        title.hidden = (options.topBar?.items().some((i) => i.slot === 'center') ?? false);
        for (const { slot, host } of topBarHosts) {
            if (!on)
                host.remove();
            else if (!host.parentElement)
                slots[`topBar.${slot}`].append(host);
        }
        if (options.topBar)
            for (const { slot, host } of topBarHosts) {
                hudComponent.update(host, topBarProps(slot));
            }
    };
    if (options.topBar)
        for (const { slot, host } of topBarHosts) {
            hudComponent.mount(host, topBarProps(slot));
        }
    const offTopBar = options.topBar?.onChange(renderTopBar);
    renderTopBar();
    const hudHosts = ['left', 'right'].map((slot) => {
        const host = node('div', { 'data-part': `hud.${slot}` });
        root.append(host);
        return { slot, host };
    });
    const hudProps = (slot) => ({ elementId: `kit.hud.${slot}`, lang, ...(options.text ? { l10n: options.text } : {}), slot,
        ariaLabel: localized(`sdk.hud.${slot}`),
        items: options.hud ? hudRegistryView(options.hud, slot, (key) => text(key), lang) : [],
        emitIntent: (intent, payload) => {
            if (intent === 'open' && typeof payload?.['id'] === 'string')
                options.hud?.open(payload['id']);
        } });
    const renderHud = () => {
        for (const { host } of hudHosts) {
            if (options.zones?.settings().hud === false)
                host.remove();
            else if (!host.parentElement)
                root.append(host);
        }
        if (options.hud)
            for (const { slot, host } of hudHosts) {
                hudComponent.update(host, hudProps(slot));
            }
    };
    if (options.hud)
        for (const { slot, host } of hudHosts)
            hudComponent.mount(host, hudProps(slot));
    const offHud = options.hud?.onChange(renderHud);
    const bottomHost = node('div', { 'data-part': 'bottommenu' });
    slots['bottomBar.center'].append(bottomHost);
    if (options.bottomMenu)
        root.dataset['bottommenu'] = 'on';
    let route;
    const portrait = win?.matchMedia?.(PORTRAIT_QUERY);
    portrait?.addEventListener?.('change', () => renderBottom(), { signal });
    const bottomProps = () => ({ elementId: 'kit.bottommenu', lang,
        items: options.bottomMenu?.slots() ?? [], text: (key) => text(key),
        orientation: portrait && !portrait.matches ? 'landscape' : 'portrait',
        ...(route === undefined ? {} : { current: route }),
        emitIntent: (intent, payload) => { if (intent === 'open' && typeof payload?.['id'] === 'string')
            options.bottomMenu?.click(payload['id']); } });
    const renderBottom = () => {
        const enabled = options.zones?.settings().bottomMenu !== false;
        if (!enabled) {
            bottomHost.remove();
            delete root.dataset['bottommenu'];
        }
        else if (!bottomHost.parentElement) {
            slots['bottomBar.center'].append(bottomHost);
            if (options.bottomMenu)
                root.dataset['bottommenu'] = 'on';
        }
        if (options.bottomMenu)
            bottomMenu.update(bottomHost, bottomProps());
    };
    if (options.bottomMenu)
        bottomMenu.mount(bottomHost, bottomProps());
    const offBottom = options.bottomMenu?.onChange(renderBottom);
    renderHud();
    renderBottom();
    const offZones = options.zones?.onChange(() => { renderTopBar(); renderHud(); renderBottom(); });
    slots.leftHandle.append(menu);
    const setMenu = (open) => {
        root.dataset['menu'] = open ? 'open' : 'closed';
        menuToggle.setAttribute('aria-expanded', String(open));
    };
    menuToggle.addEventListener('click', () => setMenu(root.dataset['menu'] !== 'open'), { signal });
    settingsButton.addEventListener('click', () => shell.openSettings(), { signal });
    const chrome = () => {
        const l = labels();
        menuToggle.replaceChildren(domOf(icon('menu')), node('span', {}, l.menu));
        menuToggle.title = l.menu;
        settingsButton.replaceChildren(domOf(icon('settings')));
        settingsButton.setAttribute('aria-label', l.settings);
        settingsButton.title = l.settings;
    };
    const mounted = new Map();
    const detach = new Map();
    const component = (entry) => entry.owner.components[entry.contribution.component];
    const props = (record) => {
        const { entry, extra } = record;
        const id = entry.contribution.id;
        const emitIntent = (intent, payload) => {
            const { kind } = entry.contribution;
            if (intent === 'close' && (kind === 'popup' || kind === 'window')) {
                closeElement(id, payload);
                return;
            }
            entry.owner.intent?.(id, intent, payload);
            if (intent === 'action')
                options.elementAction?.(id, payload);
        };
        return { ...entry.owner.props?.(id, extra), ...extra,
            ...(options.text ? { l10n: options.text } : {}),
            elementId: id, lang,
            emitIntent };
    };
    const mount = (entry, parent, extra) => {
        const host = node('div', { 'data-element': entry.contribution.id,
            'data-kind': entry.contribution.kind,
            ...(['popup', 'window'].includes(entry.contribution.kind)
                ? { 'data-pop-kind': extra?.['fullscreen'] === true ? 'fullscreen' : popupKindOf(entry) } : {}) });
        parent.append(host);
        const record = { entry, host, ...(extra ? { extra } : {}) };
        mounted.set(entry.contribution.id, record);
        component(entry).mount(host, props(record));
    };
    const unmount = (elementId) => {
        const record = mounted.get(elementId);
        if (!record)
            return;
        mounted.delete(elementId);
        component(record.entry).unmount(record.host);
        record.host.remove();
    };
    const update = (elementId) => {
        for (const layer of LAYERS)
            for (const item of stacks[layer]) {
                if (elementId === undefined || item.entry.contribution.id === elementId) {
                    updateCloseButton(item);
                }
            }
        for (const record of [...mounted.values()]) {
            if (elementId !== undefined && record.entry.contribution.id !== elementId)
                continue;
            if (mounted.get(record.entry.contribution.id) !== record)
                continue;
            component(record.entry).update(record.host, props(record));
        }
    };
    const routeFromHash = () => {
        const id = (win?.location.hash ?? '').replace(/^#\/?/, '');
        return registry.get(id)?.contribution.kind === 'route' ? id : undefined;
    };
    const renderMenu = () => {
        const routes = registry.routes();
        if (routes.length === 0) {
            menu.replaceChildren(node('p', { 'data-part': 'menu-empty' }, labels().empty));
            return;
        }
        menu.replaceChildren(...routes.map((entry) => {
            const { id, icon, title } = entry.contribution;
            const item = node('button', { type: 'button', 'data-part': 'menu-item', 'data-route': id, title: title ? text(title) : '',
                ...(entry.missing.length > 0 ? { 'data-state': 'missing' } : {}),
                ...(id === route ? { 'aria-current': 'page' } : {}) });
            if (icon)
                item.append(domOf(skinIconView(icon)));
            item.append(node('span', { 'data-part': 'label' }, text(title ?? id)));
            item.addEventListener('click', () => shell.navigate(id), { signal });
            return item;
        }));
    };
    const renderScreen = () => {
        for (const [id, record] of [...mounted]) {
            if (record.host.parentElement === slots.screen)
                unmount(id);
        }
        slots.screen.replaceChildren();
        const entry = route === undefined ? undefined : registry.get(route);
        if (!entry) {
            delete slots.screen.dataset['current'];
            return;
        }
        slots.screen.dataset['current'] = entry.contribution.id;
        if (entry.missing.length > 0) {
            const view = node('section', { 'data-element': entry.contribution.id,
                'data-state': 'missing', 'data-part': 'missing' });
            view.append(node('h2', { 'data-part': 'missing-title' }, text(entry.contribution.title ?? entry.contribution.id)), node('p', { 'data-part': 'missing-text' }, labels().missing(entry.missing)));
            slots.screen.append(view);
            return;
        }
        mount(entry, slots.screen);
    };
    const show = (id) => {
        const next = id ?? (options.home && registry.get(options.home) ? options.home
            : registry.routes()[0]?.contribution.id);
        setMenu(false);
        if (next === route && slots.screen.childElementCount > 0)
            return;
        route = next;
        if (route !== undefined)
            options.state?.setScreen(route, options.screenKind?.(route) ?? 'neutral');
        options.topBar?.setContext(route === undefined ? 'main'
            : options.topBarContext?.(route) ?? 'main');
        const context = route === undefined ? 'main' : options.topBarContext?.(route) ?? 'main';
        options.hud?.setContext(context);
        options.bottomMenu?.setContext(context);
        options.zones?.screen.setMode(context);
        renderScreen();
        renderMenu();
        renderBottom();
    };
    win?.addEventListener('hashchange', () => show(routeFromHash()), { signal });
    const slotParent = (slot) => slot === 'topBar.left' || slot === 'topBar.right' ? hosted[slot]
        : slots[slot];
    const mountSlots = (entries) => {
        for (const entry of entries) {
            const { kind, slot } = entry.contribution;
            if ((kind !== 'hud' && kind !== 'component') || !slot || slot === 'settings'
                || entry.missing.length > 0)
                continue;
            mount(entry, slotParent(slot));
        }
        for (const slot of SHELL_SLOTS) {
            if (slot === 'settings' || slot === 'screen')
                continue;
            const parent = slotParent(slot);
            for (const entry of registry.slot(slot)) {
                const host = mounted.get(entry.contribution.id)?.host;
                if (host?.parentElement === parent)
                    parent.append(host);
            }
        }
    };
    root.addEventListener('kit:reward:landed', (event) => {
        const id = event.detail?.id;
        if (typeof id === 'string')
            options.topBar?.landReward(id);
    }, { signal });
    const stacks = { overlay: [], system: [], reward: [] };
    const gameplay = (item) => item.extra?.['fullscreen'] === true;
    const fullscreenChanged = () => {
        options.state?.setFullscreenPopup(Object.values(stacks).some((stack) => stack.some((item) => !item.closing && (gameplay(item) || popupKindOf(item.entry) === 'fullscreen'
            || item.entry.owner.components[item.entry.contribution.component]?.presentation === 'fullscreen'))));
    };
    const reducedMotion = () => !win?.matchMedia
        || win.matchMedia('(prefers-reduced-motion:reduce)').matches;
    const px = (value) => `${Math.max(0, Math.round(value))}px`;
    const measure = () => {
        if (typeof root.getBoundingClientRect !== 'function')
            return;
        const shellBox = root.getBoundingClientRect();
        const work = slots.screen.getBoundingClientRect();
        if (work.width <= 0 || work.height <= 0)
            return;
        const short = work.height * (1 - 2 * POPUP_MARGIN) < POPUP_MIN_BAND;
        const phone = short && shellBox.width <= LANDSCAPE_PHONE_MAX_WIDTH;
        const area = short ? shellBox : work;
        const zone = phone ? area.width : Math.min(area.width, ZONE_MAX_WIDTH);
        const side = area.left - shellBox.left + (area.width - zone) / 2 + zone * POPUP_MARGIN;
        const sideEnd = shellBox.right - area.right + (area.width - zone) / 2 + zone * POPUP_MARGIN;
        root.style.setProperty('--kit-window-content-height', px(area.height * 0.8));
        root.style.setProperty('--kit-pop-l', px(side));
        root.style.setProperty('--kit-pop-r', px(sideEnd));
        root.style.setProperty('--kit-pop-top', px(area.top - shellBox.top + area.height * POPUP_MARGIN));
        root.style.setProperty('--kit-pop-bottom', px(shellBox.bottom - area.bottom + area.height * POPUP_MARGIN));
        root.style.setProperty('--kit-zone-top', px(work.top - shellBox.top));
    };
    win?.addEventListener('resize', measure, { signal });
    const geometry = win;
    const resize = geometry?.ResizeObserver ? new geometry.ResizeObserver(measure) : undefined;
    resize?.observe(root);
    resize?.observe(slots.screen);
    signal.addEventListener('abort', () => resize?.disconnect(), { once: true });
    const background = new Map();
    const topWindow = () => LAYERS.flatMap(layer => stacks[layer])
        .filter(item => !item.closing && item.wrap).at(-1);
    const restack = () => {
        const live = LAYERS.flatMap((layer) => stacks[layer])
            .filter((item) => !item.closing && item.wrap);
        for (const child of [...root.children]) {
            if (LAYERS.some(layer => slots[layer] === child))
                continue;
            if (live.length) {
                if (!background.has(child))
                    background.set(child, child.inert);
                child.inert = true;
            }
        }
        if (!live.length) {
            for (const [child, inert] of background)
                child.inert = inert;
            background.clear();
        }
        live.forEach((item, index) => {
            const covered = index < live.length - 1;
            if (!item.wrap)
                return;
            item.wrap.inert = covered;
            if (covered)
                item.wrap.dataset['covered'] = '';
            else
                delete item.wrap.dataset['covered'];
        });
    };
    const windowTitle = (entry) => entry.contribution.id === SETTINGS ? labels().settings
        : text(entry.contribution.title) || entry.contribution.id;
    const renderSettings = (body) => {
        const rows = registry.slot('settings');
        if (rows.length === 0)
            body.append(node('p', {}, labels().empty));
        for (const entry of rows) {
            const row = node('div', { 'data-part': 'settings-row', 'data-row': entry.contribution.id });
            body.append(row);
            if (entry.missing.length > 0) {
                row.append(node('span', { 'data-state': 'missing' }, `${text(entry.contribution.title ?? entry.contribution.id)}: `
                    + labels().missing(entry.missing)));
            }
            else
                mount(entry, row);
        }
    };
    const canDismiss = (item) => {
        const shown = { ...item.entry.owner.props?.(item.entry.contribution.id, item.extra),
            ...item.extra };
        return shown['dismissible'] !== false && shown['closable'] !== false;
    };
    const updateCloseButton = (item) => {
        if (item.closeButton)
            item.closeButton.disabled = !canDismiss(item);
    };
    const dismiss = (item) => {
        const top = LAYERS.flatMap((layer) => stacks[layer]).filter((next) => !next.closing).at(-1);
        if (item !== top || !canDismiss(item))
            return;
        closeElement(item.entry.contribution.id, undefined, item);
    };
    doc.addEventListener?.('keydown', (event) => {
        if (event.key !== 'Escape' || event.defaultPrevented)
            return;
        const top = LAYERS.flatMap((layer) => stacks[layer]).reverse().find((item) => !item.closing);
        if (!top || gameplay(top))
            return;
        event.preventDefault();
        dismiss(top);
    }, { signal });
    const focused = () => {
        let at = (doc.activeElement ?? null);
        while (at?.shadowRoot?.activeElement)
            at = at.shadowRoot.activeElement;
        return at;
    };
    const within = (outer, element) => {
        for (let at = element ?? null; at;) {
            if (at === outer)
                return true;
            at = at.parentNode ?? at.host ?? null;
        }
        return false;
    };
    const tabStops = (frame) => {
        const stops = [];
        const visit = (element) => {
            if (element.inert || element.hidden || element.matches(':disabled'))
                return;
            const style = win?.getComputedStyle(element);
            if (style?.display === 'none' || style?.visibility === 'hidden')
                return;
            if (element.tabIndex >= 0 && element.getClientRects().length)
                stops.push(element);
            const children = element.localName === 'slot'
                ? element.assignedElements({ flatten: true })
                : undefined;
            for (const child of children?.length ? children
                : (element.shadowRoot ?? element).children)
                visit(child);
        };
        visit(frame);
        return stops.sort((a, b) => (a.tabIndex || Infinity) - (b.tabIndex || Infinity));
    };
    doc.addEventListener?.('keydown', (event) => {
        const frame = topWindow()?.frame;
        if (event.key !== 'Tab' || !frame)
            return;
        const stops = tabStops(frame);
        const index = stops.indexOf(focused());
        const next = index < 0 ? (event.shiftKey ? stops.at(-1) : stops[0])
            : stops[(index + (event.shiftKey ? -1 : 1) + stops.length) % stops.length];
        event.preventDefault();
        event.stopImmediatePropagation();
        (next ?? frame).focus({ preventScroll: true });
    }, { signal, capture: true });
    doc.addEventListener?.('focusin', () => {
        const frame = topWindow()?.frame;
        if (frame && !within(frame, focused()))
            frame.focus({ preventScroll: true });
    }, { signal, capture: true });
    const refocus = (closed) => {
        const active = focused();
        const lost = !active || active === doc.body
            || (closed.wrap !== undefined && within(closed.wrap, active));
        if (!lost)
            return;
        const top = LAYERS.flatMap((layer) => stacks[layer])
            .filter((item) => !item.closing && item.wrap).at(-1);
        const opener = closed.opener;
        const reachable = opener && opener.isConnected !== false
            && (top ? within(top.wrap, opener) : !opener.closest?.('[inert]'));
        const target = reachable ? opener : top?.frame;
        target?.focus?.({ preventScroll: true });
    };
    const present = (layer, next) => {
        const windowSignal = AbortSignal.any([signal, next.controller.signal]);
        const parent = slots[layer];
        const id = next.entry.contribution.id;
        next.opener = focused();
        measure();
        parent.dataset['open'] = '';
        const wrap = node('div', { 'data-part': 'popup', 'data-popup': id === SETTINGS ? 'settings' : id,
            'data-pop-kind': popupKindOf(next.entry) });
        next.wrap = wrap;
        if (gameplay(next))
            wrap.dataset['gameplay'] = '';
        wrap.addEventListener('click', (event) => {
            const hit = event.composedPath()[0];
            const onBackdrop = hit === wrap || hit?.classList?.contains('dialog-backdrop') === true;
            if (onBackdrop && !next.closing && !gameplay(next)
                && stacks[layer].filter((item) => !item.closing).at(-1) === next)
                dismiss(next);
        }, { signal: windowSignal });
        parent.append(wrap);
        restack();
        fullscreenChanged();
        if (next.entry.owner.components[next.entry.contribution.component]?.presentation === 'fullscreen') {
            const body = node('div', { 'data-part': 'fullscreen-host', 'data-window': id });
            wrap.append(body);
            mount(next.entry, body, next.extra);
            return;
        }
        const frame = node('div', { 'data-part': 'window', role: 'dialog', 'aria-modal': 'true',
            'data-window': id === SETTINGS ? 'settings' : id, 'aria-label': windowTitle(next.entry) });
        if (gameplay(next))
            frame.dataset['fullscreen'] = '';
        const head = node('div', { 'data-part': 'window-head' });
        const closeButton = node('button', { type: 'button', 'data-part': 'window-close',
            'aria-label': labels().close });
        const closeArt = skinLayers().length ? iconUrl('close') : undefined;
        const closeAt = closePositionOf();
        if (closeAt)
            closeButton.dataset['close'] = closeAt;
        if (closeArt === undefined)
            closeButton.append(domOf(closeIcon()));
        else {
            closeButton.dataset['art'] = '';
            closeButton.append(domOf(icon('close')));
        }
        const body = node('div', { 'data-part': 'window-body' });
        head.append(node('span', { 'data-part': 'window-title' }, windowTitle(next.entry)), closeButton);
        frame.append(head, body);
        wrap.append(frame);
        next.closeButton = closeButton;
        updateCloseButton(next);
        closeButton.addEventListener('click', () => dismiss(next), { signal: windowSignal });
        if (id === SETTINGS)
            renderSettings(body);
        else
            mount(next.entry, body, next.extra);
        frame.tabIndex = -1;
        next.frame = frame;
        if (topWindow() === next)
            frame.focus?.({ preventScroll: true });
    };
    function closeElement(elementId, payload, target) {
        for (const layer of LAYERS) {
            const ours = (item) => item.entry.contribution.id === elementId
                && !item.closing && (target === undefined || target === item);
            for (const item of stacks[layer].filter(ours)) {
                item.closing = true;
                if (item.wrap)
                    item.wrap.inert = true;
                const finish = () => {
                    if (!stacks[layer].includes(item))
                        return;
                    item.controller.abort();
                    if (elementId === SETTINGS) {
                        for (const entry of registry.slot('settings'))
                            unmount(entry.contribution.id);
                    }
                    else
                        unmount(elementId);
                    item.wrap?.remove();
                    stacks[layer] = stacks[layer].filter((other) => other !== item);
                    if (stacks[layer].length === 0)
                        delete slots[layer].dataset['open'];
                    restack();
                    item.done();
                };
                fullscreenChanged();
                restack();
                item.finish = finish;
                if (elementId !== SETTINGS)
                    item.entry.owner.intent?.(elementId, 'close', payload);
                if (item.wrap && !reducedMotion()) {
                    item.wrap.dataset['closing'] = '';
                    const timer = win?.setTimeout(finish, CLOSE_MS);
                    item.controller.signal.addEventListener('abort', () => win?.clearTimeout(timer), { once: true });
                }
                else
                    finish();
                refocus(item);
            }
        }
    }
    const enqueue = (entry, extra) => {
        let done;
        const closed = new Promise((resolve) => { done = resolve; });
        const layer = slotOf(entry.contribution);
        const item = { entry, done, controller: new AbortController(),
            ...(extra ? { extra } : {}) };
        for (const old of stacks[layer].filter((other) => other.entry.contribution.id === entry.contribution.id)) {
            if (!old.closing)
                closeElement(entry.contribution.id);
            old.finish?.();
        }
        stacks[layer].push(item);
        present(layer, item);
        return { closed, close: () => closeElement(entry.contribution.id, undefined, item) };
    };
    const shell = {
        registry,
        add(module) {
            const entries = registry.add(module);
            const host = {
                open: (elementId, extra) => shell.open(elementId, extra),
                close: (elementId) => closeElement(elementId),
                navigate: (routeId) => shell.navigate(routeId),
                update: (elementId) => {
                    for (const entry of entries) {
                        if (elementId === undefined || entry.contribution.id === elementId) {
                            update(entry.contribution.id);
                        }
                    }
                },
            };
            const off = module.attach?.(host);
            if (typeof off === 'function')
                detach.set(module.manifest.id, off);
            mountSlots(entries);
            if (route === undefined || !registry.get(route))
                show(routeFromHash());
            else
                renderMenu();
        },
        remove(moduleId) {
            detach.get(moduleId)?.();
            detach.delete(moduleId);
            const removed = registry.remove(moduleId);
            for (const entry of removed)
                closeElement(entry.contribution.id);
            for (const entry of removed)
                unmount(entry.contribution.id);
            if (route !== undefined && removed.some((entry) => entry.contribution.id === route)) {
                route = undefined;
                show(routeFromHash());
            }
            else
                renderMenu();
        },
        navigate(routeId) {
            if (registry.get(routeId)?.contribution.kind !== 'route')
                return;
            if (win && win.location.hash !== `#/${routeId}`)
                win.location.hash = `#/${routeId}`;
            show(routeId);
        },
        current: () => route,
        open(elementId, extra) {
            const entry = registry.get(elementId);
            const kind = entry?.contribution.kind;
            if (!entry || (kind !== 'popup' && kind !== 'window')) {
                throw new Error(`UI_SHELL_ELEMENT_UNKNOWN:${elementId}`);
            }
            if (entry.missing.length > 0)
                return { closed: Promise.resolve(), close: () => undefined };
            return enqueue(entry, extra);
        },
        openSettings() {
            if (stacks.overlay.some((item) => item.entry.contribution.id === SETTINGS
                && !item.closing))
                return;
            enqueue({ contribution: { id: SETTINGS, kind: 'window', component: SETTINGS, popupKind: 'content' },
                owner: { manifest: { id: SETTINGS }, components: {} }, missing: [] });
        },
        closeSettings() { closeElement(SETTINGS); },
        refresh(next) {
            if (next?.lang)
                lang = next.lang;
            chrome();
            renderMenu();
            for (const layer of LAYERS) {
                for (const item of stacks[layer]) {
                    const titleNode = item.wrap?.querySelector('[data-part="window-title"]');
                    if (titleNode)
                        titleNode.textContent = windowTitle(item.entry);
                    item.frame?.setAttribute('aria-label', windowTitle(item.entry));
                    item.wrap?.querySelector('[data-part="window-close"]')
                        ?.setAttribute('aria-label', labels().close);
                }
            }
            measure();
            const entry = route === undefined ? undefined : registry.get(route);
            const missingTitle = slots.screen.querySelector('[data-part="missing-title"]');
            const missingText = slots.screen.querySelector('[data-part="missing-text"]');
            if (entry && missingTitle)
                missingTitle.textContent = text(entry.contribution.title ?? '');
            if (entry && missingText)
                missingText.textContent = labels().missing(entry.missing);
            renderTopBar();
            renderHud();
            renderBottom();
            update();
        },
        dispose() {
            releaseSkin();
            offInset?.();
            offTopBar?.();
            offHud?.();
            offBottom?.();
            offZones?.();
            if (options.topBar)
                for (const { host } of topBarHosts)
                    hudComponent.unmount(host);
            if (options.hud)
                for (const { host } of hudHosts)
                    hudComponent.unmount(host);
            if (options.bottomMenu)
                bottomMenu.unmount(bottomHost);
            for (const off of detach.values())
                off();
            detach.clear();
            for (const id of [...mounted.keys()])
                unmount(id);
            for (const layer of LAYERS) {
                for (const item of stacks[layer]) {
                    item.controller.abort();
                    item.done();
                }
                stacks[layer] = [];
            }
            restack();
            fullscreenChanged();
            controller.abort();
            container.replaceChildren();
        },
    };
    const releaseSkin = adoptSkinInto(doc, 'shell', () => {
        adoptStyles(doc);
        paintEdgeToEdge(container);
        chrome();
        renderMenu();
        for (const layer of LAYERS)
            for (const item of stacks[layer]) {
                const button = item.wrap?.querySelector('[data-part=window-close]');
                if (button)
                    button.replaceChildren(domOf(icon('close')));
            }
    });
    paintEdgeToEdge(container);
    chrome();
    renderMenu();
    return shell;
}

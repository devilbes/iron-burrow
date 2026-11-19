import { kitText } from '../services/login-strings.js';
import { ASSET_IMAGE_CSS, assetImageView } from '../asset-image.js';
import { icon as registryIcon, iconUrl } from '../icon.js';
import { createViewComponent, view as h } from '../core.js';
import { NEUTRAL_CSS } from '../neutral.js';
import { WINDOW_LAYOUT } from '../layout.js';
import { closePositionOf, displayTitleOf, skinLayers, windowTemplateOf } from '../skin-layer.js';
import { displayTitleView } from './display-title.js';
import { renderingWindow } from '../window-context.js';
export { h };
export function assetImage(p, key, attrs = {}) {
    if (key === undefined || key === null || key === '')
        return null;
    return assetImageView(key, p, attrs);
}
export function windowTitle(p, title) {
    const spec = displayTitleOf(p.skinScope);
    if (!spec || spec.windows === false)
        return h('h3', {}, title);
    return h('h3', { class: 'dialog-display-title' }, displayTitleView(title, { arc: spec.arc, idBase: p.elementId }));
}
export function moduleImage(value, attrs = {}) {
    try {
        const url = new URL(value);
        if (!['https:', 'http:', 'file:'].includes(url.protocol) || url.username || url.password
            || url.search || url.hash)
            return null;
        const image = '[a-z][a-zA-Z0-9]*-[0-9a-f]{12}\\.(png|webp|jpg)';
        const module = '[a-z][a-z0-9-]*';
        const number = '(?:0|[1-9][0-9]*)';
        const ident = '(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)';
        const version = `${number}\\.${number}\\.${number}(?:-${ident}(?:\\.${ident})*)?`
            + '(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?';
        if (!new RegExp(`/sdk-modules/${module}/${image}$`).test(url.pathname)
            && !new RegExp(`/sdk/modules/${module}/${version}/settings/${image}$`).test(url.pathname))
            return null;
        return h('img', { alt: '', ...attrs, src: value });
    }
    catch {
        return null;
    }
}
export function component(render, options = {}) {
    const { styles = '', rendered, ...rest } = options;
    return createViewComponent({ ...rest, responsive: true,
        styles: NEUTRAL_CSS + ASSET_IMAGE_CSS + styles + WINDOW_LAYOUT,
        local: () => ({}),
        render: (p, ctx) => {
            const key = p.playerKey ?? '';
            if (ctx.local['_player'] !== key) {
                for (const name of Object.keys(ctx.local))
                    delete ctx.local[name];
                ctx.local['_player'] = key;
            }
            return render(p, ctx.local, ctx);
        }, rendered: (_p, ctx) => {
            const focus = ctx.local['_focus'];
            if (focus) {
                const target = ctx.root.querySelector(`[data-testid="${CSS.escape(focus)}"]`);
                if (target && !target.disabled) {
                    delete ctx.local['_focus'];
                    target.focus();
                }
            }
            const dialog = ctx.root.querySelector('[role="dialog"]');
            if (dialog && !dialog.contains(ctx.root.activeElement)) {
                if (dialog.matches('.dialog,.col-page') || dialog.hasAttribute('tabindex')) {
                    dialog.focus({ preventScroll: true });
                }
                else
                    (dialog.querySelector('button:not(:disabled)') ?? dialog).focus();
            }
            rendered?.(_p, ctx);
        } });
}
export function text(p, key, params) {
    return kitText(p.l10n, p.lang)(key, params);
}
export function button(label, intent, p, options = {}) {
    return h('button', { type: 'button', disabled: options.disabled ?? p.busy,
        'data-variant': options.ghost ? 'ghost' : undefined, 'data-part': options.part,
        class: options.className, 'aria-label': options.ariaLabel,
        'data-testid': options.testid ?? `${p.elementId}.${intent}`,
        onClick: () => {
            if (!(options.disabled ?? p.busy)) {
                if (options.click)
                    options.click();
                else
                    p.emitIntent(intent, options.payload?.());
            }
        } }, ...(options.prefix ? [options.prefix] : []), label, ...(options.suffix ? [options.suffix] : []));
}
export function heading(p, title, subtitle) {
    return h('header', {}, h('span', { class: 'badge' }, text(p, 'kit.shared.play-with-manyplay')), h('h2', {}, title), h('p', { class: 'hint' }, subtitle));
}
export function details(p, value, testid) {
    return h('details', { 'data-part': 'details' }, h('summary', {}, text(p, 'kit.shared.details')), h('pre', { 'data-testid': testid }, JSON.stringify(value, null, 2) ?? '—'));
}
export function outcome(p, value, testid) {
    return value?.error ? h('p', { class: 'error', role: 'alert',
        'data-testid': `${testid}.error` }, text(p, 'kit.shared.action-failed-please-try-again'), details(p, value.error)) : null;
}
export function field(d, name, initial, testid) {
    d[name] ??= initial;
    return h('input', { value: d[name], maxlength: 64, 'data-testid': testid,
        onInput: (e) => { d[name] = e.target.value; } });
}
export function record(value) {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value : {};
}
export function dialog(p, title, close, ...children) {
    return windowDialog(p, { title }, close, ...children);
}
export function titledDialog(p, title, eyebrow, close, ...children) {
    return windowDialog(p, { title, eyebrow: eyebrow ? h('span', { class: 'dialog-eyebrow' }, eyebrow) : undefined }, close, ...children);
}
export function windowDialog(p, head, close, ...children) {
    const { title } = head;
    const context = renderingWindow();
    const orientation = (p.orientation === 'auto' ? undefined : p.orientation) ?? context?.orientation;
    const target = head.template ?? context?.component;
    const template = target ? windowTemplateOf(target, p.skinScope, orientation) : undefined;
    return h('div', { class: 'dialog-backdrop', 'data-window-mode': template?.mode,
        'data-orientation': orientation, 'data-window-id': p.elementId }, h('div', { class: 'dialog', role: 'dialog',
        'aria-modal': 'true', 'aria-label': title, tabindex: -1, onKeydown: (e) => {
            const event = e;
            if (event.key === 'Escape' && !p.busy && head.closable !== false) {
                event.preventDefault();
                close();
            }
            if (event.key !== 'Tab')
                return;
            const node = event.currentTarget;
            const buttons = [...node.querySelectorAll('button:not(:disabled),input')];
            if (!buttons.length) {
                event.preventDefault();
                node.focus();
                return;
            }
            const first = buttons[0];
            const last = buttons.at(-1);
            const active = node.getRootNode();
            if (event.shiftKey && (active.activeElement === first || active.activeElement === node)) {
                event.preventDefault();
                last?.focus();
            }
            if (!event.shiftKey && active.activeElement === last) {
                event.preventDefault();
                first?.focus();
            }
        } }, head.art ? h('div', { class: head.artLarge ? 'dialog-art dialog-art--large' : 'dialog-art',
        'data-part': 'art', 'aria-hidden': 'true' }, head.art) : null, h('div', { class: 'dialog-head', 'data-part': 'window-head' }, headTitle(p, template?.heading ? { ...head, eyebrow: h('p', { class: 'window-template-heading' }, template.heading[p.lang] ?? template.heading[p.lang.split('-')[0] ?? 'en'] ?? template.heading.en) } : head), head.actions ?? null, head.closable !== false ? closeButton(p, close) : null), ...children));
}
export function windowSlots(p, target, slots) {
    const order = windowTemplateOf(target, p.skinScope, p.orientation === 'auto' ? undefined : p.orientation)?.slots ?? [];
    return [...new Set([...order, ...Object.keys(slots)])]
        .filter(key => Object.hasOwn(slots, key)).map(key => {
        const node = slots[key];
        return node && typeof node === 'object'
            ? { ...node, attrs: { ...node.attrs, 'data-skin-slot': key } } : node;
    });
}
export function headTitle(p, head) {
    const title = head.eyebrow || head.subtitle ? h('div', { class: 'dialog-title' }, head.eyebrow, windowTitle(p, head.title), head.subtitle ? h('p', { class: 'dialog-subtitle',
        'data-part': 'window-subtitle' }, head.subtitle) : null)
        : windowTitle(p, head.title);
    return { ...title, attrs: { ...title.attrs, 'data-skin-slot': 'title' } };
}
export function closeButton(p, close) {
    const art = iconUrl('close', { scope: p.skinScope });
    const custom = art !== undefined && skinLayers()
        .some(layer => layer.level !== 'scope' || layer.scope === p.skinScope);
    return h('button', { type: 'button', class: 'dialog-close', 'data-part': 'window-close',
        'data-close': closePositionOf(), 'data-art': custom ? '' : undefined,
        'aria-label': text(p, 'kit.shared.close'), disabled: p.busy,
        onClick: () => { if (!p.busy)
            close(); } }, registryIcon('close', 20, { scope: p.skinScope,
        ...(custom ? { attributes: { class: 'dialog-close-art' } } : {}) }));
}
export function closeIcon() { return registryIcon('close', 20); }

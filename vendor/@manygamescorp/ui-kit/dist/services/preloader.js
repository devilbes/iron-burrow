import { icon as registryIcon } from '../icon.js';
import { nameComponents, createViewComponent, view as h } from '../core.js';
import { text } from '../features/shared.js';
const mark = (size) => registryIcon('brand-mark', size);
export function preloaderView(p) {
    const status = p.status ?? text(p, 'kit.preloader.loading');
    const value = p.progress !== undefined && Number.isFinite(p.progress)
        ? Math.max(0, Math.min(100, p.progress)) : undefined;
    return h('div', { class: 'mp-preloader', role: 'dialog', 'aria-modal': 'true', 'aria-label': status,
        tabindex: -1, 'data-part': 'root', 'data-step': p.error ? 'error' : 'loading',
        'aria-busy': p.error ? undefined : 'true', hidden: p.loading === false }, h('div', { class: 'mp-preloader__body', role: 'status', 'aria-live': 'polite', 'data-part': 'loading' }, h('div', { class: 'mp-preloader__brand', 'data-part': 'logo' }, mark(80), h('span', { class: 'mp-preloader__name' }, p.game)), h('div', { class: 'mp-preloader__copy' }, h('h2', { class: 'mp-title', 'data-part': 'status' }, status), h('progress', { max: 100, value, 'aria-label': status }), p.caption ? h('p', { class: 'mp-caption', 'data-part': 'caption' }, p.caption) : null, p.error ? h('p', { role: 'alert', class: 'mp-error', 'data-part': 'error' }, p.error) : null, p.error ? h('button', { type: 'button', class: 'mp-button mp-button--primary',
        'data-testid': `${p.elementId}.retry`, disabled: p.busy,
        onClick: () => { if (!p.busy)
            p.emitIntent('retry'); } }, text(p, 'kit.preloader.retry')) : null)));
}
export const preloader = createViewComponent({
    presentation: 'fullscreen', styles: ':host{display:block}[hidden]{display:none!important}', local: () => ({}), render: preloaderView,
});
nameComponents({ preloader });

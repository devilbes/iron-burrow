import { nameComponents } from '../core.js';
import { component, h, text, dialog, button } from '../features/shared.js';
const TOGGLES = ['sound', 'music', 'vibration', 'notifications'];
export function settingsView(p) {
    const values = p.values ?? {};
    const languages = p.languages ?? [{ id: 'ru', label: 'Русский' },
        { id: 'en', label: 'English' }];
    return dialog(p, text(p, 'kit.settings.settings'), () => p.emitIntent('close'), h('div', { class: 'std-content', 'data-part': 'settings' }, ...TOGGLES.filter((key) => values[key] !== undefined).map((key) => {
        const on = values[key] === true;
        const label = text(p, `kit.settings.labels-${key}`);
        return h('div', { class: 'row', 'data-part': 'settings-row' }, h('span', {}, label), h('button', { type: 'button', role: 'switch', 'aria-checked': String(on),
            'aria-label': label, 'data-testid': `${p.elementId}.${key}`, disabled: p.busy,
            'data-variant': on ? undefined : 'ghost',
            onClick: () => { if (!p.busy)
                p.emitIntent('set', { key, value: !on }); } }, on ? text(p, 'kit.settings.on') : text(p, 'kit.settings.off')));
    }), h('div', { class: 'row', 'data-part': 'language', role: 'group',
        'aria-label': text(p, 'kit.settings.language') }, ...languages.map((item) => h('button', { type: 'button', 'aria-pressed': String(item.id === p.lang),
        'data-variant': item.id === p.lang ? undefined : 'ghost', disabled: p.busy,
        'data-testid': `${p.elementId}.language.${item.id}`,
        onClick: () => { if (!p.busy && item.id !== p.lang)
            p.emitIntent('language', { id: item.id }); } }, item.label))), h('div', { class: 'row', 'data-part': 'account' }, h('span', {}, p.account?.name ?? text(p, 'kit.settings.not-signed-in')), button(p.account ? 'ManyPlay ID' : text(p, 'kit.settings.sign-in'), 'open', p, { ghost: true, testid: `${p.elementId}.account`, payload: () => ({ id: 'account' }) })), ...(p.links ?? []).slice(0, 8).map((link) => button(link.label, 'open', p, { ghost: true, testid: `${p.elementId}.link.${link.id}`, payload: () => ({ id: link.id }) })), p.version ? h('p', { class: 'hint', 'data-part': 'version' }, p.version) : null));
}
export const settings = component(settingsView, { presentation: 'fullscreen', popupKind: 'content' });
nameComponents({ settings });

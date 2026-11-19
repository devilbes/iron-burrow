import { FEATURE_STRINGS } from './feature-strings.js';
import { kitText, loginText } from './login-strings.js';
import { MANYPLAY_ID_LAYER } from '../skins/manyplay/id-layer.js';
import { icon as registryIcon } from '../icon.js';
import { nameComponents } from '../core.js';
import { component, h, closeIcon, assetImage } from '../features/shared.js';
import { providerMark } from './provider-marks.js';
export const WEB_LOGIN_STRINGS = Object.freeze({
    ru: Object.freeze(Object.fromEntries(Object.entries(FEATURE_STRINGS['ru'] ?? {})
        .filter(([key]) => key.startsWith('kit.web.')))),
    en: Object.freeze(Object.fromEntries(Object.entries(FEATURE_STRINGS['en'] ?? {})
        .filter(([key]) => key.startsWith('kit.web.')))),
});
export function webLoginText(lang = 'en') {
    return loginText(lang);
}
const NAMES = { google: 'Google', apple: 'Apple',
    facebook: 'Facebook' };
const points = (value, lang) => new Intl.NumberFormat(lang).format(value).replace(/[\u00a0\u202f]/g, ' ');
function mark(size, _tile) { return registryIcon('web-brand-mark', size); }
function logo(mobile) {
    return h('div', { class: 'web-logo', role: 'img', 'aria-label': 'ManyPlay ID', 'data-part': 'logo' }, mark(32, mobile ? 'var(--mp-night)' : 'var(--mp-navy)'), h('span', { class: 'web-logo__name' }, 'ManyPlay'), h('span', { class: 'web-logo__id' }, 'ID'));
}
const initial = (name) => (/[\p{L}\p{N}]/u.exec(name)?.[0] ?? '?').toUpperCase();
export function webLoginView(p, draft = {}) {
    const t = kitText(p.text, p.lang);
    const games = p.games.slice(0, 12);
    const current = games.find((game) => game.current) ?? games[0];
    const signedIn = p.signedIn ?? p.account !== undefined;
    const missing = p.mobile && current && !current.connected ? current : undefined;
    const busy = p.busy === true;
    const emit = (intent, payload) => () => {
        if (busy)
            return;
        if (payload)
            p.emitIntent(intent, payload);
        else
            p.emitIntent(intent);
    };
    const tile = (game, index, cls) => h('span', {
        class: `web-game ${cls} web-game--c${index % 6}`,
        'aria-hidden': 'true'
    }, assetImage(p, game.icon) ?? initial(game.name));
    const summary = p.account ? h('section', { class: 'web-total', 'data-part': 'points' }, h('span', { class: 'web-total__who' }, h('span', { class: 'web-caps' }, t('kit.web.total')), h('span', { class: 'web-total__name' }, p.account.nickname, h('span', { class: 'web-id' }, 'ID'))), h('span', { class: 'web-total__value' }, h('b', {}, points(p.account.points, p.lang)), h('span', {}, t('kit.web.unit')))) : null;
    const form = signedIn || missing ? null : h('form', { class: 'web-form', 'data-part': 'sign-in',
        novalidate: true, onSubmit: (e) => {
            e.preventDefault();
            if (!busy && p.ready !== false)
                p.emitIntent('email', { value: (draft['email'] ?? '').trim() });
        } }, h('h2', { class: 'web-h2' }, t('kit.web.signIn.title')), h('p', { class: 'web-text' }, t('kit.web.signIn.text')), h('label', { class: 'web-label', for: `${p.elementId}-email` }, t('kit.web.email.label')), h('input', { id: `${p.elementId}-email`, type: 'email', name: 'email', value: draft['email'] ?? '',
        class: `mp-input web-input${p.error ? ' mp-input--error' : ''}`, autocomplete: 'email',
        inputmode: 'email', placeholder: t('kit.web.email.placeholder'), maxlength: 128, 'data-testid': `${p.elementId}.email`,
        'aria-invalid': p.error ? 'true' : 'false',
        onInput: (e) => { draft['email'] = e.target.value; } }), p.error ? h('p', { class: 'mp-error', role: 'alert', 'data-part': 'error' }, t('kit.web.error')) : null, h('button', { type: 'submit', class: 'mp-button mp-button--primary', 'data-part': 'submit',
        'data-testid': `${p.elementId}.email-submit`, disabled: busy || p.ready === false,
        onClick: (e) => {
            e.preventDefault();
            if (!busy && p.ready !== false)
                p.emitIntent('email', { value: (draft['email'] ?? '').trim() });
        } }, t('kit.web.email.submit')), p.providers.length ? h('div', { class: 'web-divider', 'data-part': 'divider' }, h('span', {}, t('kit.web.or'))) : null, p.providers.length ? h('div', { class: 'web-socials', 'data-part': 'providers' }, ...p.providers.map((id) => h('button', { type: 'button',
        class: `mp-button mp-button--social mp-button--${id}`, 'data-provider': id,
        'data-testid': `${p.elementId}.provider.${id}`, 'aria-label': t('kit.web.provider.aria', { name: NAMES[id] }),
        disabled: busy, onClick: emit('provider', { id }) }, providerMark(id, 24)))) : null, p.termsUrl || p.privacyUrl ? h('p', { class: 'web-consent', 'data-part': 'terms' }, `${t('kit.web.consent')} `, p.termsUrl ? h('a', { href: p.termsUrl, target: '_blank', rel: 'noopener noreferrer' }, t('kit.web.terms')) : null, p.termsUrl && p.privacyUrl ? ` ${t('kit.web.and')} ` : null, p.privacyUrl ? h('a', { href: p.privacyUrl, target: '_blank', rel: 'noopener noreferrer' }, t('kit.web.privacy')) : null)
        : null);
    if (p.mobile) {
        const picker = h('div', { class: 'web-picker', role: 'group', 'aria-label': t('kit.web.picker'),
            'data-part': 'games' }, ...games.map((game, i) => h('span', { class: 'web-picker__item' }, h('button', { type: 'button', class: 'web-picker__button', 'data-testid': `${p.elementId}.game.${game.id}`,
            'aria-pressed': game === current ? 'true' : 'false',
            'aria-label': game === current ? t('kit.web.chosen', { name: game.name }) : game.name, disabled: busy,
            onClick: emit('select-game', { id: game.id }) }, tile(game, i, 'web-game--m')), h('span', { class: 'web-picker__caret', 'aria-hidden': 'true' }))));
        const chosen = missing ? games.indexOf(missing) : -1;
        return h('main', { class: 'web web--mobile', 'data-part': 'web-login', 'data-mobile': 'true',
            'aria-busy': busy ? 'true' : undefined }, h('header', { class: 'web-bar' }, logo(true), h('div', { class: 'web-bar__actions' }, p.account ? h('button', { type: 'button', class: 'web-avatar', 'aria-label': t('kit.web.profile'),
            'data-testid': `${p.elementId}.profile`, disabled: busy, onClick: emit('profile') }, initial(p.account.nickname)) : null, h('button', { type: 'button', class: 'mp-icon-button', 'aria-label': t('kit.web.menu'),
            'data-testid': `${p.elementId}.menu`, disabled: busy, onClick: emit('menu') }, h('span', { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
            'stroke-width': 2, 'stroke-linecap': 'round', 'aria-hidden': 'true', focusable: 'false' }, registryIcon('web-login-web-login-view-1', 24))))), h('section', { class: 'web-hero' }, h('h1', { class: 'web-h1' }, t('kit.web.title')), picker), missing ? h('section', { class: 'web-card', 'data-part': 'not-connected', role: 'status' }, tile(missing, chosen, 'web-game--xl'), h('h2', { class: 'web-h2' }, t('kit.web.missing.title', { name: missing.name })), h('p', { class: 'web-text' }, t('kit.web.missing.text')), h('div', { class: 'web-card__actions' }, h('button', { type: 'button', class: 'mp-button mp-button--primary mp-button--cta',
            'data-testid': `${p.elementId}.open-game`, disabled: busy,
            onClick: emit('open-game', { id: missing.id }) }, h('span', { class: `web-game web-game--xs web-game--c${chosen % 6}`, 'aria-hidden': 'true' }, initial(missing.name)), h('span', {}, t('kit.web.open', { name: missing.name }))), h('button', { type: 'button', class: 'mp-button mp-button--secondary',
            'data-testid': `${p.elementId}.help`, disabled: busy, onClick: emit('help') }, t('kit.web.how')), h('p', { class: 'web-nogame' }, `${t('kit.web.noGame')} `, h('button', { type: 'button', class: 'mp-link web-download',
            'data-testid': `${p.elementId}.download`, disabled: busy,
            onClick: emit('download', { id: missing.id }) }, t('kit.web.download')))))
            : h('div', { class: 'web-body' }, summary, form));
    }
    const section = p.section ?? 'rewards';
    return h('main', { class: 'web', 'data-part': 'web-login', 'aria-busy': busy ? 'true' : undefined }, h('header', { class: 'web-top' }, logo(false), p.closable ? h('button', { type: 'button',
        class: 'mp-icon-button', 'aria-label': t('kit.web.close'), 'data-testid': `${p.elementId}.close`,
        disabled: busy, onClick: emit('close') }, closeIcon()) : null), h('div', { class: 'web-intro' }, h('h1', { class: 'web-h2' }, t('kit.web.title')), h('p', { class: 'web-text' }, t('kit.web.intro'))), summary, form, h('div', { class: 'web-strip', role: 'list', 'aria-label': t('kit.web.games'), 'data-part': 'games' }, ...games.map((game, i) => h('button', { type: 'button', role: 'listitem',
        class: 'web-strip__game', 'aria-current': game.current ? 'true' : undefined,
        'data-testid': `${p.elementId}.game.${game.id}`, disabled: busy,
        onClick: emit('open-game', { id: game.id }) }, tile(game, i, game.connected ? '' : 'web-game--off'), h('span', { class: 'web-strip__name' }, game.name), game.connected ? null : h('span', { class: 'web-badge' }, t('kit.web.notConnected'))))), h('nav', { class: 'web-nav', 'aria-label': t('kit.web.sections'), 'data-part': 'sections' }, ...['rewards', 'games', 'help'].map((id) => h('button', { type: 'button',
        class: 'web-nav__item', 'aria-current': id === section ? 'page' : undefined,
        'data-testid': `${p.elementId}.section.${id}`, disabled: busy,
        onClick: emit('section', { id }) }, t(`kit.web.section.${id}`)))));
}
export const webLogin = component((p, d) => webLoginView(p, d), { presentation: 'fullscreen', skin: MANYPLAY_ID_LAYER });
nameComponents({ webLogin });

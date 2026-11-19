import { MANYPLAY_ID_LAYER } from '../skins/manyplay/id-layer.js';
import { icon as registryIcon } from '../icon.js';
import { assetImage, closeIcon } from '../features/shared.js';
import { accountWindow } from './account-window.js';
import { publicName } from '../features/public-name.js';
import { nameComponents, createViewComponent, view as h } from '../core.js';
import { clock, groupDigits, kitText, loginErrorText } from './login-strings.js';
import { providerMark } from './provider-marks.js';
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
function logoMark(size, _part = 'logo-mark') { return h('span', { 'data-part': _part }, registryIcon('brand-mark', size)); }
function logo(large = false) {
    return h('div', { class: `mp-logo${large ? ' mp-logo--large' : ''}`, role: 'img',
        'aria-label': 'ManyPlay ID', 'data-part': 'logo' }, logoMark(large ? 40 : 28), h('span', { class: 'mp-logo__name' }, 'ManyPlay'), h('span', { class: 'mp-logo__id' }, 'ID'));
}
const glyph = (key, size = 24) => registryIcon(key, size);
const BACK = 'back';
const WARNING = 'warning';
const mailIcon = (size = 40, _stroke = '1.8') => registryIcon('login-mail', size);
const errorLine = (message) => h('p', { class: 'mp-error', role: 'alert',
    'data-part': 'error' }, registryIcon('login-error-line-2', 16), message);
const errorText = (text, state) => loginErrorText(text, state.error, state.emailRequired ? text(`kit.login.provider.${state.emailRequired}`) : '');
function heading(title, body) {
    return h('div', { class: 'mp-heading', 'data-part': 'heading' }, h('h2', { class: 'mp-title', id: 'mp-login-title' }, title), body ? body : null);
}
function steps(text, current) {
    const items = [];
    ['email', 'code', 'done'].forEach((key, i) => {
        if (i)
            items.push(h('li', { class: `mp-steps__line${i <= current ? ' mp-steps__line--done' : ''}`,
                'aria-hidden': 'true' }));
        items.push(h('li', {
            class: `mp-step${i < current ? ' mp-step--done' : ''}${i === current ? ' mp-step--current' : ''}`,
            'data-part': 'step', 'aria-current': i === current ? 'step' : undefined
        }, h('span', { class: 'mp-step__num', 'aria-hidden': 'true' }, i < current ? glyph('check', 14) : String(i + 1)), text(`kit.login.step.${key}`)));
    });
    return h('ol', { class: 'mp-steps', 'data-part': 'steps' }, ...items);
}
const icon = (key) => registryIcon(`benefit-${key}`, 24);
const BENEFITS = ['progress', 'devices', 'points'];
export const LOGIN_SCREENS = Object.freeze({ start: 'id-start', email: 'id-email', code: 'id-code',
    confirm: 'id-confirm', 'email-required': 'id-social-email', accounts: 'id-accounts',
    'switch-account': 'id-accounts', profile: 'id-account', done: 'id-confirm',
    'loading-player': 'id-loading', 'signed-out': 'id-start', closed: 'id-closed' });
function link(href, label, part) {
    return h('a', { class: 'mp-link', href, target: '_blank', rel: 'noopener noreferrer',
        'data-part': part }, label);
}
function emailForm(props, ctx, text, intro, formHead = null) {
    const { state, emitIntent } = props;
    const valid = EMAIL.test(ctx.local.email.trim());
    const error = errorText(text, state);
    const submit = (event) => {
        event.preventDefault();
        if (valid && !state.busy)
            emitIntent('submit-email', { email: ctx.local.email.trim() });
    };
    return h('form', { class: 'mp-form', 'data-part': 'email-form', novalidate: true,
        onSubmit: submit }, h('div', { class: 'mp-intro', 'data-part': 'intro' }, ...intro), formHead, h('div', { class: 'mp-content mp-field-card' }, h('label', { class: 'mp-field', 'data-part': 'email-field' }, h('span', { class: 'mp-caption' }, text('kit.login.email.label')), h('input', { class: `mp-input${error ? ' mp-input--error' : ''}`, type: 'email', name: 'email',
        autocomplete: 'email', inputmode: 'email', autocapitalize: 'off', spellcheck: 'false',
        maxlength: '128', placeholder: text('kit.login.email.placeholder'),
        'aria-invalid': error ? 'true' : 'false', 'aria-describedby': 'mp-email-note',
        'data-part': 'email-input',
        value: ctx.local.email,
        onInput: (event) => {
            ctx.local.email = event.target.value;
            ctx.refresh();
        } })), h('p', { class: 'mp-caption mp-note', id: 'mp-email-note', 'data-part': 'email-note' }, text('kit.login.email.note')), error ? errorLine(error) : null), h('div', { class: 'mp-actionbar' }, h('button', { class: 'mp-button mp-button--primary mp-button--cta', type: 'submit',
        'data-part': 'submit', disabled: !valid || state.busy,
        'aria-busy': state.busy ? 'true' : 'false', onClick: submit }, text('kit.login.email.submit')), h('button', { class: 'mp-button mp-button--secondary', type: 'button', 'data-part': 'cancel',
        disabled: state.busy, onClick: () => { if (!state.busy)
            emitIntent('cancel'); } }, text('kit.login.cancel'))), helpLinks(props, text));
}
function helpLinks(props, text) {
    return props.helpUrl || props.faqUrl ? h('p', { class: 'mp-links mp-help', 'data-part': 'help' }, props.helpUrl ? link(props.helpUrl, text('kit.login.start.help'), 'help-link') : null, props.helpUrl && props.faqUrl ? ' · ' : null, props.faqUrl ? link(props.faqUrl, text('kit.login.start.faq'), 'faq-link') : null) : null;
}
function start(props, text) {
    const { state, emitIntent } = props;
    const error = errorText(text, state);
    const intro = h('div', { class: 'mp-intro', 'data-part': 'intro' }, logo(true), heading(text('kit.login.start.title')), h('ul', { class: 'mp-benefits', 'data-part': 'benefits' }, ...BENEFITS.map((key) => h('li', { class: 'mp-benefit', 'data-part': 'benefit' }, h('span', { class: 'mp-benefit__icon' }, icon(key)), h('span', { class: 'mp-benefit__text' }, h('span', { class: 'mp-benefit__title' }, text(`kit.login.start.${key}.title`)), h('span', { class: 'mp-caption' }, text(`kit.login.start.${key}.text`)))))));
    return [intro, h('div', { class: 'mp-content mp-start__actions' }, h('div', { class: 'mp-actions', 'data-part': 'methods' }, h('button', { class: 'mp-button mp-button--primary', type: 'button', 'data-part': 'email',
            'data-provider': 'email', disabled: state.busy,
            onClick: () => emitIntent('provider', { pr: 'email' }) }, mailIcon(20, '2'), text('kit.login.start.email')), state.providers.length ? h('div', { class: 'mp-divider', 'data-part': 'divider' }, h('span', {}, text('kit.login.start.or'))) : null, state.providers.length ? h('div', { class: 'mp-socials', 'data-part': 'socials' }, ...state.providers.map((pr) => h('button', {
            class: `mp-button mp-button--social mp-button--${pr}`, type: 'button',
            'data-part': 'provider', 'data-provider': pr, disabled: state.busy,
            'aria-label': text(`kit.login.provider.${pr}`),
            onClick: () => emitIntent('provider', { pr })
        }, providerMark(pr), h('span', {}, text(`kit.login.start.${pr}`))))) : null), error ? h('p', { class: 'mp-error mp-toast', role: 'alert', 'data-part': 'error' }, error)
            : null, props.termsUrl || props.privacyUrl ? h('p', { class: 'mp-caption mp-consent', 'data-part': 'consent' }, `${text('kit.login.start.consent')} `, props.termsUrl ? link(props.termsUrl, text('kit.login.start.terms'), 'consent-terms') : null, props.termsUrl && props.privacyUrl ? ` ${text('kit.login.start.and')} ` : null, props.privacyUrl ? link(props.privacyUrl, text('kit.login.start.privacy'), 'consent-privacy') : null) : null),
        helpLinks(props, text)];
}
function sentTo(text, email) {
    const mark = '\u0001';
    const [before = '', after = ''] = text('kit.login.code.sent', { email: mark }).split(mark);
    return [before, h('b', { 'data-part': 'masked-email' }, email), after];
}
function codeStep(props, ctx, text, now) {
    const { state, emitIntent } = props;
    const value = state.busy && state.code ? state.code : ctx.local.code;
    const error = errorText(text, state);
    const wait = state.resendAt === undefined ? 0 : state.resendAt - now;
    const cells = Array.from({ length: 6 }, (_v, i) => h('span', {
        class: `mp-cell${i === value.length && !state.busy ? ' mp-cell--active' : ''}`
            + `${error ? ' mp-cell--error' : ''}`, 'data-part': 'code-cell'
    }, value[i] ?? ''));
    const acceptCode = (event) => {
        if (state.busy || ctx.local.composing || event.isComposing)
            return;
        const input = event.target;
        const digits = input.value.replace(/[^0-9]/g, '').slice(0, 6);
        if (digits !== input.value)
            input.value = digits;
        const changed = digits !== ctx.local.code;
        ctx.local.code = digits;
        ctx.refresh();
        if (changed && digits.length === 6)
            emitIntent('submit-code', { code: digits });
    };
    const complete = value.length === 6;
    const tick = '\u0001';
    const [before = '', after = ''] = text('kit.login.code.resendIn', { time: tick }).split(tick);
    return [
        h('div', { class: 'mp-intro', 'data-part': 'intro' }, heading(text('kit.login.code.title'), h('p', { class: 'mp-text', 'data-part': 'sent-to' }, h('span', { class: 'mp-sent' }, ...sentTo(text, state.maskedEmail ?? '')), h('span', { class: 'mp-sep', 'aria-hidden': 'true' }, ' · '), h('button', { class: 'mp-link', type: 'button', 'data-part': 'change-email',
            disabled: state.busy, onClick: () => emitIntent('change-email') }, text('kit.login.code.edit'))))),
        h('div', { class: 'mp-content mp-card', 'data-part': 'code-card' }, h('button', { class: 'mp-chip', type: 'button', 'data-part': 'paste', hidden: !!value.length,
            disabled: state.busy, onClick: () => emitIntent('paste-code') }, glyph('clipboard', 16), text('kit.login.code.paste')), h('label', { class: 'mp-code', 'data-part': 'code' }, h('span', { class: 'mp-sr' }, text('kit.login.code.label')), h('input', { class: 'mp-code__input', type: 'text', name: 'code', inputmode: 'numeric',
            autocomplete: 'one-time-code', pattern: '[0-9]*',
            'aria-invalid': error ? 'true' : 'false', 'data-part': 'code-input',
            ...(ctx.local.composing ? {} : { value }),
            disabled: state.busy,
            onCompositionstart: () => { ctx.local.composing = true; },
            onCompositionend: (event) => {
                ctx.local.composing = false;
                acceptCode(event);
            },
            onInput: acceptCode }), h('span', { class: 'mp-cells', 'aria-hidden': 'true' }, ...cells)), state.codeSource === 'link' && !error ? h('p', { class: 'mp-status', 'data-part': 'status' }, text('kit.login.code.fromLink')) : null, error ? errorLine(error) : null, h('div', { class: 'mp-stack', 'data-part': 'code-actions' }, h('button', { class: 'mp-resend', type: 'button', 'data-part': 'resend',
            disabled: wait > 0 || state.busy, onClick: () => emitIntent('resend-code') }, ...(wait > 0 ? [before, h('b', {}, clock(wait)), after] : [text('kit.login.code.resend')])), h('p', { class: 'mp-caption', 'data-part': 'spam' }, text('kit.login.code.spam')))),
        h('div', { class: 'mp-actionbar' }, h('button', { class: 'mp-button mp-button--primary mp-button--cta', type: 'button',
            'data-part': 'code-submit', disabled: !complete || state.busy,
            'aria-busy': state.busy ? 'true' : 'false',
            onClick: () => { if (complete && !state.busy)
                emitIntent('submit-code', { code: value }); } }, text('kit.login.code.submit')), h('p', { class: 'mp-caption mp-warning-note', role: 'note', 'data-part': 'code-warning' }, text('kit.login.code.warning'))),
    ];
}
function accountCard(props, text, account) {
    const { state } = props;
    const nickname = account.nickname?.trim();
    const initial = (nickname || state.maskedEmail || '').slice(0, 1).toUpperCase();
    const details = state.maskedEmail;
    return h('section', { class: 'mp-confirm-cards' }, h('div', { class: 'mp-account', 'data-part': 'account' }, h('span', { class: 'mp-avatar', 'aria-hidden': 'true', 'data-part': 'account-avatar' }, initial || logoMark(40)), h('span', { class: 'mp-account__text' }, h('span', { class: 'mp-account__name mp-account__name--id' }, logoMark(18, 'account-mark'), nickname || text('kit.login.account.name')), details ? h('span', { class: 'mp-caption', 'data-part': 'account-details' }, details)
        : null)), h('div', { class: 'mp-account', 'data-part': 'game-card' }, assetImage(props, props.appIcon, { class: 'mp-account-avatar', alt: '' })
        ?? h('span', { class: 'mp-game-mark', 'aria-hidden': 'true' }, props.game.slice(0, 1).toUpperCase()), h('span', { class: 'mp-account__text' }, h('span', { class: 'mp-account__name' }, props.game), h('span', { class: 'mp-caption' }, text('kit.login.account.gid', { gid: groupDigits(account.gid) })))));
}
function confirm(props, text) {
    const { state, emitIntent, game } = props;
    const error = errorText(text, state);
    return [
        h('div', { class: 'mp-intro', 'data-part': 'intro' }, heading(text('kit.login.confirm.title', { game }))),
        h('div', { class: 'mp-content' }, state.account ? accountCard(props, text, state.account) : null, state.conflict ? h('div', { class: 'mp-warning', role: 'note', 'data-part': 'conflict' }, glyph(WARNING, 24), h('span', { class: 'mp-warning__text' }, h('span', { class: 'mp-warning__state' }, text('kit.login.confirm.state')), h('span', { class: 'mp-warning__title' }, text('kit.login.confirm.conflictTitle')), h('span', {}, text('kit.login.confirm.conflict', { game })))) : null, error ? h('p', { class: 'mp-error', role: 'alert', 'data-part': 'error' }, error) : null),
        h('div', { class: 'mp-actionbar' }, h('button', { class: 'mp-button mp-button--primary', type: 'button',
            'data-part': 'confirm', disabled: state.busy, 'aria-busy': state.busy ? 'true' : 'false',
            onClick: () => emitIntent('confirm-switch') }, text('kit.login.confirm.yes')), h('button', { class: 'mp-button mp-button--secondary', type: 'button', 'data-part': 'cancel',
            disabled: state.busy,
            onClick: () => { if (!state.busy)
                emitIntent('cancel'); } }, text('kit.login.confirm.no'))),
    ];
}
function done(props, text) {
    const { state, emitIntent } = props;
    return [
        h('div', { class: 'mp-done', role: 'status', 'data-part': 'done' }, h('span', { class: 'mp-done__check', 'aria-hidden': 'true' }, registryIcon('login-done-4', 28)), h('h2', { class: 'mp-title', id: 'mp-login-title' }, text(state.created ? 'kit.login.done.created' : 'kit.login.done.signedIn')), state.account ? h('p', { class: 'mp-caption' }, text('kit.login.account.gid', { gid: groupDigits(state.account.gid) })) : null),
        h('button', { class: 'mp-button mp-button--primary', type: 'button', 'data-part': 'continue',
            onClick: () => emitIntent('cancel') }, text('kit.login.done.continue')),
    ];
}
function switched(props, text) {
    const name = props.state.maskedEmail ?? props.state.account?.nickname
        ?? publicName(props.state.account?.gid);
    return [h('div', { class: 'mp-switch' }, h('span', { class: 'mp-switch-avatar', 'aria-hidden': 'true' }, name.slice(0, 1).toUpperCase()), h('div', {}, h('h2', { class: 'mp-title' }, text('kit.login.switch.title')), h('p', { class: 'mp-text' }, name))),
        h('p', { class: 'mp-text' }, text('kit.login.switch.text')),
        h('div', { class: 'mp-actions' }, h('button', { class: 'mp-button mp-button--primary', type: 'button',
            'data-part': 'restart', disabled: props.state.busy,
            onClick: () => { if (!props.state.busy)
                props.emitIntent('restart-game'); } }, text('kit.login.switch.continue')), h('button', { class: 'mp-button mp-button--danger', type: 'button',
            'data-part': 'wrong-account', onClick: () => props.emitIntent('logout') }, text('kit.login.switch.notMe')))];
}
function signedOut(props, text) {
    return [h('div', { class: 'mp-switch' }, h('span', { class: 'mp-signedout-marker', 'aria-hidden': 'true' }, registryIcon('login-signed-out-5', 24)), h('h2', { class: 'mp-title' }, text('kit.login.signedOut.title'))),
        h('p', { class: 'mp-text' }, text('kit.login.signedOut.text')),
        h('p', { class: 'mp-caption' }, text('kit.login.signedOut.guest')),
        h('div', { class: 'mp-actions' }, h('button', { class: 'mp-button mp-button--primary', type: 'button',
            'data-part': 'signin-again', disabled: props.state.busy,
            onClick: () => { if (!props.state.busy)
                props.emitIntent('signin-again'); } }, text('kit.login.signedOut.signin')), h('button', { class: 'mp-button mp-button--secondary', type: 'button',
            'data-part': 'continue-guest', disabled: props.state.busy,
            onClick: () => { if (!props.state.busy)
                props.emitIntent('continue-guest'); } }, text('kit.login.signedOut.continueGuest')))];
}
function loading(props, text) {
    const progress = props.loadingProgress;
    return h('div', { role: 'status', 'aria-live': 'polite', class: 'mp-loading',
        'data-part': 'loading' }, h('div', { class: 'mp-loading-brand' }, logoMark(80), logo()), h('div', { class: 'mp-loading-copy' }, h('h2', { class: 'mp-title' }, text('kit.login.loading.title')), props.state.maskedEmail ? h('p', { class: 'mp-text' }, props.state.maskedEmail) : null, h('progress', { max: 100,
        value: progress !== undefined && Number.isFinite(progress)
            ? Math.max(0, Math.min(100, progress)) : undefined,
        'aria-label': text('kit.login.loading.aria') }), h('p', { class: 'mp-caption' }, text('kit.login.loading.caption')), props.state.error ? h('p', { role: 'alert', class: 'mp-error' }, text('kit.login.error.default')) : null, props.state.error ? h('button', { type: 'button', class: 'mp-button mp-button--primary',
        disabled: props.state.busy, onClick: () => props.emitIntent('retry-player') }, text('kit.login.loading.retry')) : null, props.state.error && props.state.account && !props.state.account.anonymous
        ? h('button', { type: 'button', class: 'mp-button mp-button--danger',
            'data-part': 'wrong-account', onClick: () => props.emitIntent('logout') }, text('kit.login.switch.notMe')) : null), h('p', { class: 'mp-caption mp-loading-note' }, text('kit.login.loading.note')));
}
export function loginView(props, ctx) {
    const { state, emitIntent } = props;
    const pendingAccount = state.step === 'profile' && state.busy
        && state.account?.anonymous === false && !state.accountDetails;
    const clearAccountLoading = () => {
        clearTimeout(ctx.local.accountLoadingTimer);
        ctx.local.accountLoadingTimer = undefined;
        ctx.local.accountLoadingVisible = false;
    };
    if (!pendingAccount)
        clearAccountLoading();
    else if (!ctx.local.accountLoadingVisible && ctx.local.accountLoadingTimer === undefined
        && !ctx.signal.aborted) {
        ctx.local.accountLoadingTimer = setTimeout(() => {
            ctx.local.accountLoadingTimer = undefined;
            ctx.local.accountLoadingVisible = true;
            ctx.refresh();
        }, 300);
        if (!ctx.local.accountLoadingHooked) {
            ctx.local.accountLoadingHooked = true;
            ctx.signal.addEventListener('abort', clearAccountLoading, { once: true });
        }
    }
    const text = kitText(props.text, props.lang);
    const now = props.now();
    let body;
    switch (state.step) {
        case 'email':
            body = [steps(text, 0), emailForm(props, ctx, text, [
                    h('span', { class: 'mp-tile', 'aria-hidden': 'true' }, mailIcon()),
                    heading(text('kit.login.email.title'), h('p', { class: 'mp-text' }, text(state.child ? 'kit.login.email.child'
                        : 'kit.login.email.text')))
                ])];
            break;
        case 'email-required': {
            const provider = text(`kit.login.provider.${state.emailRequired ?? 'apple'}`);
            const account = text(`kit.login.provider.account.${state.emailRequired ?? 'apple'}`);
            body = [steps(text, 0), emailForm(props, ctx, text, [
                    h('span', { class: 'mp-chip mp-chip--provider', 'data-part': 'provider-ok' }, h('span', { class: `mp-chip__mark mp-chip__mark--${state.emailRequired ?? 'apple'}` }, providerMark(state.emailRequired ?? 'apple', 14)), text('kit.login.required.chip', { provider }), h('span', { class: 'mp-chip__check' }, glyph('check', 16))),
                    heading(text('kit.login.required.title'), h('p', { class: 'mp-text' }, text('kit.login.required.text', { provider, account }))),
                    h('p', { class: 'mp-text mp-side-note', 'aria-hidden': 'true' }, text('kit.login.required.side', { provider, account }))
                ], h('div', { class: 'mp-form-head', 'aria-hidden': 'true' }, h('h2', { class: 'mp-title' }, text('kit.login.required.title')), h('p', { class: 'mp-text' }, text('kit.login.required.text', { provider, account }))))];
            break;
        }
        case 'code':
            body = [steps(text, 1), ...codeStep(props, ctx, text, now)];
            break;
        case 'confirm':
            body = [steps(text, 2), ...confirm(props, text)];
            break;
        case 'switch-account':
            body = switched(props, text);
            break;
        case 'signed-out':
            body = signedOut(props, text);
            break;
        case 'profile': return accountWindow(props, ctx);
        case 'done':
            body = done(props, text);
            break;
        case 'closed':
            body = [];
            break;
        default: body = [
            ...(props.accounts?.length ? [heading(text('kit.login.accounts.title', { game: props.game }))] : []),
            ...(props.accounts ?? []).slice(0, 8).map((a) => h('button', {
                class: 'mp-account', type: 'button', 'data-part': 'remembered-account',
                disabled: state.busy, 'aria-current': a.uid === state.account?.uid ? 'true' : undefined,
                onClick: () => emitIntent('select-account', { uid: a.uid })
            }, assetImage(props, a.avatar, { class: 'mp-account-avatar', alt: '' }) ?? logoMark(40), h('span', {}, h('strong', {}, publicName(a.gid, a.name)), h('span', { class: 'mp-caption' }, a.maskedEmail), h('span', { class: 'mp-caption' }, text('kit.login.account.gid', { gid: groupDigits(a.gid) }))), a.uid === state.account?.uid ? h('span', { class: 'mp-current', role: 'img', 'aria-label': text('kit.login.accounts.current') }, glyph('check', 20)) : null)),
            ...(props.accounts?.length ? [h('button', { class: 'mp-button mp-button--primary',
                    type: 'button', 'data-part': 'email', 'data-provider': 'email', disabled: state.busy,
                    onClick: () => emitIntent('provider', { pr: 'email' }) }, text('kit.login.accounts.other'))] : start(props, text)),
        ];
    }
    const playerSwitch = props.loadingPlayer === true;
    const locked = playerSwitch || state.step === 'loading-player';
    const choice = state.step === 'switch-account' || state.step === 'signed-out';
    const closable = state.step === 'switch-account' && !playerSwitch;
    const cancel = () => {
        if ((closable || (!locked && !choice)) && !state.busy)
            emitIntent('cancel');
    };
    const gridSteps = ['email', 'email-required', 'code', 'confirm'];
    const welcome = !['email', 'email-required', 'code', 'confirm', 'switch-account', 'signed-out',
        'done', 'closed'].includes(state.step) && !props.accounts?.length;
    if (!gridSteps.includes(state.step) && !welcome)
        body = [h('div', { class: 'mp-content mp-center' }, ...body)];
    const lead = () => {
        if (closable)
            return h('button', { class: 'mp-icon-button', type: 'button', 'data-part': 'close',
                disabled: state.busy, 'aria-label': text('kit.login.close'), onClick: cancel }, closeIcon());
        if (locked || choice)
            return null;
        const back = (part, intent) => h('button', { class: 'mp-icon-button', type: 'button',
            'data-part': part, disabled: state.busy, 'aria-label': text('kit.login.back'),
            onClick: () => { if (!state.busy)
                emitIntent(intent); } }, glyph(BACK));
        if (state.step === 'email' || state.step === 'email-required')
            return back('back', 'back');
        if (state.step === 'code')
            return back('back', 'change-email');
        if (state.step === 'confirm')
            return h('button', { class: 'mp-icon-button', type: 'button',
                'data-part': 'close', disabled: state.busy, 'aria-label': text('kit.login.confirm.cancelAria'),
                onClick: cancel }, glyph(BACK));
        return h('button', { class: 'mp-icon-button', type: 'button', 'data-part': 'close',
            disabled: locked || state.busy, 'aria-label': text('kit.login.close'), onClick: cancel }, closeIcon());
    };
    return h('div', { class: `mp-login mp-login--${state.step} mp-login--${props.orientation ?? 'auto'}`,
        'data-window-id': 'login', 'data-screen': LOGIN_SCREENS[state.step],
        role: 'dialog', 'aria-modal': 'true', 'aria-label': 'ManyPlay ID', tabindex: -1,
        'data-part': 'root', 'data-step': locked ? 'loading' : state.step,
        'aria-busy': locked || state.busy ? 'true' : undefined, hidden: state.step === 'closed' && !locked,
        onKeydown: (e) => {
            const event = e;
            if (event.key === 'Escape') {
                event.stopPropagation();
                cancel();
            }
            if (event.key === 'Tab') {
                const nodes = [...event.currentTarget.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]')];
                const active = ctx.root.activeElement;
                if (!nodes.length) {
                    event.preventDefault();
                    event.currentTarget.focus();
                    return;
                }
                if (!nodes.includes(active)) {
                    event.preventDefault();
                    (event.shiftKey ? nodes.at(-1) : nodes[0])?.focus();
                    return;
                }
                if (event.shiftKey && active === nodes[0]) {
                    event.preventDefault();
                    nodes.at(-1)?.focus();
                }
                if (!event.shiftKey && active === nodes.at(-1)) {
                    event.preventDefault();
                    nodes[0]?.focus();
                }
            }
        } }, h('section', { class: 'mp-panel', 'data-part': 'panel' }, h('header', { class: 'mp-top', 'data-part': 'header' }, lead(), welcome && !locked ? h('button', { class: 'mp-link mp-later', type: 'button', 'data-part': 'later',
        disabled: state.busy, onClick: () => { if (!state.busy)
            emitIntent('cancel'); } }, text('kit.login.start.later')) : welcome ? null : logo()), ...(locked ? [h('div', { class: 'mp-content mp-center' }, loading(props, text))] : body), !state.account?.anonymous && state.account && !locked && !choice && state.step !== 'confirm' ? h('button', {
        class: 'mp-link mp-signout', type: 'button', 'data-part': 'signout', disabled: state.busy,
        onClick: () => emitIntent('logout')
    }, text('kit.login.profile.logout')) : null), !playerSwitch && props.cookieDetails ? h('div', { class: 'mp-cookie', role: 'status' }, text('kit.login.cookie.text'), h('button', { type: 'button', class: 'mp-button mp-button--secondary', onClick: () => emitIntent('forget-accounts') }, text('kit.login.cookie.forget'))) : null, !locked && !welcome && !gridSteps.includes(state.step) && props.orientation !== 'landscape'
        ? h('footer', { class: 'mp-footer', 'data-part': 'footer' }, h('label', {}, text('kit.login.footer.language'), h('select', { value: props.lang ?? 'en', 'aria-label': text('kit.login.footer.language'),
            disabled: locked, onChange: (e) => emitIntent('language', { lang: e.target.value }) }, ...(props.languages ?? [{ id: props.lang ?? 'en', label: props.lang ?? 'en' }])
            .map(item => h('option', { value: item.id, selected: props.lang === item.id }, item.label)))), props.privacyUrl ? h('a', { href: props.privacyUrl, target: '_blank', rel: 'noopener noreferrer' }, text('kit.login.footer.privacy')) : null, props.termsUrl ? h('a', { href: props.termsUrl, target: '_blank', rel: 'noopener noreferrer' }, text('kit.login.footer.terms')) : null, !locked && !choice ? h('button', { type: 'button', class: 'mp-link', disabled: locked,
            onClick: () => emitIntent('cookie-settings') }, text('kit.login.footer.cookies')) : null, logo()) : null);
}
function focusMain(root) {
    const target = root.querySelector('[data-part=email-input],[data-part=code-input],'
        + '[data-part=confirm],[data-part=continue],[data-part=email]');
    (target ?? root.querySelector('[role=dialog]'))?.focus({ preventScroll: true });
}
function idWindow(accountOnly = false) {
    const accountProps = (props) => accountOnly
        ? { ...props, state: { ...props.state, step: 'profile' } } : props;
    return createViewComponent({
        presentation: 'fullscreen', responsive: true, skin: MANYPLAY_ID_LAYER,
        styles: ':host{display:block}[hidden]{display:none!important}',
        local: () => ({ nickname: '', suggestion: undefined,
            accountPage: undefined, gameCount: 0, email: '', code: '', composing: false, error: undefined, step: undefined, timer: undefined,
            hooked: false, focusHooked: false, opener: undefined }),
        render: (props, ctx) => {
            props = accountProps(props);
            const { state } = props;
            if (!ctx.local.focusHooked && ctx.root.ownerDocument) {
                ctx.local.focusHooked = true;
                ctx.local.opener = ctx.root.ownerDocument.activeElement;
                ctx.signal.addEventListener('abort', () => {
                    if (ctx.local.opener?.isConnected)
                        ctx.local.opener.focus();
                }, { once: true });
            }
            if (state.error !== ctx.local.error) {
                if (state.error && state.step === 'code')
                    ctx.local.code = '';
                ctx.local.error = state.error;
            }
            if (state.step !== ctx.local.step) {
                ctx.local.composing = false;
                if (state.step === 'code')
                    ctx.local.code = '';
                if (state.step === 'email' && state.emailHint && !ctx.local.email.trim()) {
                    ctx.local.email = state.emailHint;
                }
            }
            if (state.step === 'profile'
                && `${state.account?.gid}:${state.accountScreen ?? 'home'}` !== ctx.local.accountPage) {
                ctx.local.nickname = '';
                ctx.local.suggestion = undefined;
            }
            if (state.step !== 'profile') {
                ctx.local.nickname = '';
                ctx.local.suggestion = undefined;
                ctx.local.accountPage = undefined;
                ctx.local.gameCount = 0;
            }
            return loginView(props, ctx);
        },
        rendered: (props, ctx) => {
            props = accountProps(props);
            const { state } = props;
            if (props.loadingPlayer || state.step === 'loading-player') {
                ctx.local.email = '';
                ctx.local.code = '';
            }
            if (state.step !== ctx.local.step) {
                ctx.local.step = state.step;
                if (state.step === 'closed')
                    ctx.local.opener?.focus();
                else
                    focusMain(ctx.root);
            }
            if (state.step === 'profile') {
                const page = `${state.account?.gid}:${state.accountScreen ?? 'home'}`;
                if (page !== ctx.local.accountPage) {
                    ctx.local.accountPage = page;
                    (ctx.root.querySelector('[data-part=account-title]')
                        ?? ctx.root.querySelector('[data-part=root]'))?.focus();
                }
                const count = state.games?.length ?? 0;
                if (state.accountScreen === 'games' && count > ctx.local.gameCount && ctx.local.gameCount > 0) {
                    const first = state.games?.[ctx.local.gameCount]?.appId;
                    ctx.root.querySelector(`[data-game-id="${first}"]`)?.focus();
                }
                ctx.local.gameCount = count;
            }
            const win = ctx.root.ownerDocument?.defaultView;
            const wait = state.step === 'code' && state.resendAt !== undefined
                ? state.resendAt - props.now() : 0;
            if (win && wait > 0 && ctx.local.timer === undefined && !ctx.signal.aborted) {
                ctx.local.timer = win.setTimeout(() => {
                    ctx.local.timer = undefined;
                    ctx.refresh();
                }, Math.min(1000, wait));
                if (!ctx.local.hooked) {
                    ctx.local.hooked = true;
                    ctx.signal.addEventListener('abort', () => {
                        if (ctx.local.timer !== undefined)
                            win.clearTimeout(ctx.local.timer);
                    }, { once: true });
                }
            }
        },
    });
}
export const login = idWindow();
export const idAccount = idWindow(true);
nameComponents({ login, idAccount });
export { createPortalLogin } from './portal-login.js';

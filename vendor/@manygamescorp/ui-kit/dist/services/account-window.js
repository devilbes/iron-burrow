import { icon as registryIcon } from '../icon.js';
import { assetImage, closeIcon } from '../features/shared.js';
import { view as h } from '../core.js';
import { accountStrings } from './account-strings.js';
import { accountIcon as icon } from './account-icons.js';
import { providerMark } from './provider-marks.js';
import { groupDigits, kitText, loginErrorText } from './login-strings.js';
export function accountWindow(props, ctx) {
    const { state, emitIntent } = props;
    const text = kitText(props.text, props.lang ?? 'en');
    const t = accountStrings(text);
    const methodsError = (error) => {
        const key = `kit.login.error.${error.code}`;
        return text(key) === key ? t.methodsError : loginErrorText(text, error);
    };
    const details = state.accountDetails;
    const cross = details?.crossFeatures === true;
    const crossCurrency = cross ? props.crossCurrency : undefined;
    const asked = state.accountScreen ?? 'home';
    const requested = asked === 'catalog' ? 'games' : asked === 'friends' ? 'home' : asked;
    const screen = ['games', 'currency'].includes(requested)
        && !(cross && (requested !== 'currency' || crossCurrency)) ? 'home' : requested;
    const guest = state.account?.anonymous ?? true;
    const name = details?.nickname ?? state.account?.nickname ?? '';
    const initials = (n) => {
        const caps = n.replace(/[^A-Z]/g, '');
        return (caps.length >= 2 ? caps.slice(0, 2) : n.slice(0, 2)).toUpperCase();
    };
    const ava = (value = name) => h('div', { class: `acw-ava${guest ? ' guest' : ''}`, 'aria-hidden': 'true' }, (!guest ? assetImage(props, props.avatar) : null) ?? (value ? initials(value) : icon('user')));
    const go = (next) => emitIntent('account-screen', { screen: next });
    const button = (label, action, part, variant = 'secondary', glyph) => h('button', { class: `mp-button ${variant.split(' ').map((v) => `mp-button--${v}`).join(' ')}`,
        type: 'button', 'data-part': part, disabled: state.busy, onClick: action }, glyph ? icon(glyph) : null, label);
    const soonRow = (part, label, glyph) => h('li', { 'data-part': part, 'aria-disabled': 'true' }, h('span', { class: 'mpa-tile', 'aria-hidden': 'true' }, icon(glyph)), h('span', { class: 'mpa-row__text' }, h('b', {}, label), h('small', {}, t.soon)));
    const metric = props.gameMetric;
    const gameInitial = (name) => (/[\p{L}\p{N}]/u.exec(name)?.[0] ?? '?').toUpperCase();
    const about = () => h('div', { class: 'acw-about', 'data-part': 'gid' }, h('span', {}, t.gidLabel(props.game), ' ', h('code', {}, state.account?.gid ?? '—')), state.accountCopied ? h('span', { class: 'acw-copied', role: 'status' }, icon('check'), t.copied)
        : button(t.copy, () => emitIntent('copy-gid'), 'copy-gid', 'ghost sm', 'copy'));
    const loading = (label) => h('div', { class: 'acw-loading', role: 'status' }, h('span', { class: 'spinner', 'aria-hidden': 'true' }), label);
    const skeletons = () => h('div', { class: 'acw-list', 'aria-hidden': 'true' }, ...Array.from({ length: 3 }, () => h('div', { class: 'acw-skel' }, h('span', { class: 'sq' }), h('span', { class: 'ln' }))));
    const failure = (action) => h('div', { class: 'acw-center', role: 'alert', 'data-part': 'account-error' }, h('div', { class: 'acw-bigico danger' }, icon('plug')), h('h3', {}, screen === 'games' ? t.gamesError : t.accountError), h('p', {}, t.gamesErrorText), button(t.retry, () => emitIntent(action), 'retry', 'primary sm'));
    const mpMark = (large = false, size, image) => h('span', {
        class: `mpa-mark${large ? ' mpa-mark--lg' : ''}${size ? ` mpa-mark--${size}` : ''}`,
        viewBox: '0 0 256 256', 'aria-hidden': 'true', focusable: 'false'
    }, image ?? registryIcon('account-window-mp-mark-1', 24));
    const idCard = (sub) => h('section', { class: 'mp-confirm-cards', 'data-part': 'id-card' }, h('div', { class: 'mp-account' }, h('span', { class: 'mp-avatar', 'aria-hidden': 'true' }, (assetImage(props, props.avatar) ?? name.slice(0, 1).toUpperCase()) || icon('user')), h('span', { class: 'mp-account__text' }, h('span', { class: 'mp-account__name mp-account__name--id' }, mpMark(false, 18), h('b', { 'data-part': 'card-nickname' }, name)), sub ? h('span', { class: 'mp-caption' }, sub) : null)));
    let body = [];
    let title = '';
    let head;
    if (guest) {
        body = [h('div', { class: 'acw-head' }, ava(''), h('h2', { class: 'acw-nick' }, t.guest), h('p', { class: 'help' }, t.guestText)),
            button(t.signIn, () => emitIntent('account-switch'), 'signin', 'primary'),
            h('ul', { class: 'acw-bullets' }, ...t.guestB.map((b, i) => h('li', {}, icon(['cloud', 'user', 'gift'][i]), b))), about()];
    }
    else if (!details) {
        body = state.busy ? [ctx.local.accountLoadingVisible
                ? h('div', { class: 'acw-account-loading', 'data-part': 'account-loading' }, loading(t.loading)) : null]
            : [failure('account-retry'), about()];
    }
    else if (screen === 'home' || screen === 'games') {
        const mine = screen !== 'home';
        const group = [];
        const gid = groupDigits(state.account?.gid ?? '');
        const tab = (id, label) => h('button', { class: 'mpa-tab', type: 'button',
            'data-part': `account-tab-${id}`, 'aria-current': (id === 'games') === mine ? 'page' : undefined,
            disabled: state.busy, onClick: () => { if ((id === 'games') !== mine)
                go(id); } }, label);
        head = h('header', { class: 'mpa-head', 'data-part': 'account-head' }, h('button', { class: 'mp-icon-button', type: 'button', 'data-part': 'close', disabled: state.busy,
            'aria-label': t.close, onClick: () => { if (!state.busy)
                emitIntent('cancel'); } }, closeIcon()), h('div', { class: 'mpa-who' }, ava(name.slice(0, 1)), h('span', { class: 'mpa-who__text' }, h('span', { class: 'mpa-who__name' }, mpMark(), h('b', { 'data-part': 'nickname' }, name)), h('small', { 'data-part': 'account-id' }, `${t.idLabel} ${gid}`))), h('button', { class: 'mp-icon-button', type: 'button', 'data-part': 'account-settings',
            disabled: state.busy, 'aria-label': t.settingsOpen, onClick: () => go('settings') }, icon('gear')));
        if (cross)
            body.push(h('nav', { class: 'mpa-tabs', 'data-part': 'tabs', 'aria-label': t.tabs }, tab('home', t.tabProfile), tab('games', t.games)));
        if (!mine) {
            if (crossCurrency)
                body.push(h('section', { class: 'mpa-points', 'data-part': 'points' }, h('div', { class: 'mpa-points__top' }, h('span', { class: 'mpa-caps mpa-caps--light' }, t.earned(props.game)), mpMark(true, undefined, assetImage(props, crossCurrency.iconUrl, { width: 40, height: 40 }))), h('div', { class: 'mpa-points__value', 'data-part': 'metric' }, h('b', {}, String(crossCurrency.value)), crossCurrency.label ? h('span', { class: 'mpa-points__unit' }, crossCurrency.label) : null), h('div', { class: 'mpa-points__bottom' }, h('b', {}, name), h('span', { class: 'mpa-idbadge' }, t.idLabel))));
            if (crossCurrency)
                body.push(h('button', { class: 'mpa-link-row', type: 'button',
                    'data-part': 'account-currency', onClick: () => go('currency') }, h('span', { class: 'mpa-tile mpa-tile--gold' }, icon('gift')), h('span', { class: 'mpa-row__text' }, h('b', {}, t.rewards), h('small', {}, t.rewardsSub(props.game))), icon('right')));
            if (cross)
                body.push(h('ul', { class: 'mpa-list', 'data-part': 'account-soon' }, soonRow('friends-soon', t.friends, 'user'), !crossCurrency ? soonRow('currency-soon', t.currency, 'gift') : null));
            const providers = [...new Set([...state.linked, ...state.linkable])];
            const method = (key, label, sub, mark, linked, provider) => h('li', { 'data-part': 'method', 'data-method': key }, mark, h('span', { class: 'mpa-row__text' }, h('b', {}, label), sub ? h('small', {}, sub) : null), linked ? h('span', { class: 'mpa-linked' }, icon('check'), t.linked)
                : button(t.link, () => emitIntent('link', { pr: provider }), `link-${key}`, 'primary sm'));
            group.push(h('section', { class: 'mpa-section', 'data-part': 'provider-methods' }, h('h2', { class: 'mpa-caps' }, t.methods), h('ul', { class: 'mpa-list' }, method('email', 'Email', details.email ?? '—', h('span', { class: 'mpa-tile' }, icon('mail')), true), ...providers.map((provider) => method(provider, text(`kit.login.provider.${provider}`), state.linked.includes(provider) ? '' : t.notLinked, h('span', { class: `mpa-tile mpa-tile--${provider}` }, providerMark(provider, 22)), state.linked.includes(provider), provider))), state.error ? h('p', { role: 'alert', class: 'acw-status err', 'data-part': 'methods-error' }, methodsError(state.error)) : null));
            group.push(h('div', { class: 'mpa-foot-actions', 'data-part': 'account-actions' }, button(t.logout, () => go('logout'), 'logout', 'text'), h('span', { class: 'mpa-soon-action', 'data-part': 'logout-all' }, h('button', { class: 'mp-button mp-button--text mp-button--ghost', type: 'button', disabled: true,
                'aria-disabled': 'true', 'aria-label': `${t.logoutAll} — ${t.soon}` }, t.logoutAll)), h('span', { class: 'mpa-soon-action', 'data-part': 'account-delete' }, h('button', { class: 'mp-button mp-button--text mp-button--ghost', type: 'button', disabled: true,
                'aria-disabled': 'true', 'aria-label': `${t.deleteAccount} — ${t.soon}` }, t.deleteAccount))));
        }
        else {
            const isCurrent = (g) => props.currentAppId !== undefined ? g.appId === props.currentAppId
                : g.gid !== null && g.gid === state.account?.gid;
            const all = state.games ?? [];
            const num = (v) => typeof v === 'number' ? new Intl.NumberFormat(props.lang ?? 'en').format(v) : v;
            const row = (g, playing) => {
                const current = isCurrent(g);
                const link = props.gameLink ? g.links[props.gameLink.key] : undefined;
                const safe = link && /^https?:\/\//.test(link);
                const value = current ? metric : props.gameMetrics?.[g.appId];
                const earned = crossCurrency ? props.crossEarned?.[g.appId] : undefined;
                return h('li', { 'aria-current': current ? 'true' : undefined, 'data-part': 'game-row',
                    'data-game-id': g.appId, tabindex: -1 }, h('span', { class: `mpa-game mpa-game--c${(g.appId + 5) % 6}` }, assetImage(props, g.iconUrl) ?? gameInitial(g.name), playing ? h('span', { class: 'mpa-game__check', role: 'img', 'aria-label': t.hasProfile }, icon('check')) : null), h('span', { class: 'mpa-row__text' }, h('b', {}, g.name), playing && (value || earned !== undefined) ? h('small', {}, value ? `${value.label} ${num(value.value)}${value.unit ? ` ${value.unit}` : ''}` : null, value && earned !== undefined ? ' · ' : null, earned !== undefined ? `${value ? t.earnedWord : t.earnedWordCap} ` : null, earned !== undefined ? h('span', { class: 'mpa-em', 'data-part': 'cross-earned' }, `${num(earned)} ${crossCurrency.unit ?? crossCurrency.label}`) : null) : null), current ? h('span', { class: 'mpa-now acw-playing', 'data-part': 'playing' }, t.now)
                    : safe ? h('a', { class: `mp-button mp-button--sm ${playing ? 'mp-button--primary' : 'mp-button--secondary'}`, href: link,
                        target: '_blank', rel: 'noopener noreferrer', 'data-part': 'open-game',
                        'aria-label': t.openAria(g.name, props.gameLink?.label ?? '') }, playing ? t.play : t.install) : null);
            };
            const section = (title, part, items, playing) => items.length ? h('section', { class: 'mpa-section' }, h('h2', { class: 'mpa-caps' }, title), h('ul', { class: 'mpa-list', 'data-part': part }, ...items.map((g) => row(g, playing)))) : null;
            const playingNow = all.filter((g) => g.playing);
            const others = all.filter((g) => !g.playing);
            body.push(playingNow.length ? h('p', { class: 'mpa-note mpa-note--side' }, t.gamesNote) : null);
            group.push(section(t.playingNow, 'my-games', playingNow, true), playingNow.length ? h('p', { class: 'mpa-note mpa-note--list', 'data-part': 'games-note' }, t.gamesNote) : null, section(t.otherGames, 'catalog-games', others, false));
            if (state.busy)
                group.push(skeletons(), loading(t.loadingMore));
            else if (state.error)
                group.push(failure('account-more'));
            else if (state.gamesCursor !== null)
                group.push(button(t.more, () => emitIntent('account-more'), 'games-more'));
            else if (!all.length)
                group.push(h('div', { class: 'acw-center', 'data-part': 'games-empty' }, h('div', { class: 'acw-bigico' }, icon('grid')), h('h3', {}, t.gamesEmptyTitle), h('p', {}, t.gamesEmptyText)));
            else if (!others.length && playingNow.length === 1 && isCurrent(playingNow[0]))
                group.push(h('div', { class: 'alert', 'data-part': 'games-only-current' }, icon('info'), h('p', {}, t.noProfiles)));
        }
        body.push(h('div', { class: 'mpa-lists' }, ...group));
    }
    else if (screen === 'currency' && crossCurrency) {
        title = t.currency;
        body = [h('div', { class: 'acw-center', 'data-part': 'cross-currency' }, h('div', { class: 'acw-bigico' }, icon('gift')), h('h3', {}, t.currency), h('p', {}, t.currencyText)),
            h('div', { class: 'acw-card' }, h('span', { class: 'ri', 'aria-hidden': 'true' }, icon('star')), h('span', { class: 'rt' }, h('small', {}, crossCurrency.label), h('b', { class: 'acw-amount', 'data-part': 'cross-currency-value' }, crossCurrency.value)))];
    }
    else if (screen === 'settings') {
        title = t.settings;
        const row = (part, tile, label, sub, action) => h('li', { 'data-part': part }, tile, h('span', { class: 'mpa-row__text' }, h('b', {}, label), sub ? h('small', {}, sub) : null), action);
        const providers = ['apple', 'google', 'facebook'].filter((provider) => state.linked.includes(provider) || state.linkable.includes(provider));
        body = [h('div', { class: 'mpa-lists' }, h('section', { class: 'mpa-section', 'data-part': 'account-section' }, h('h2', { class: 'mpa-caps' }, t.account), h('ul', { class: 'mpa-list' }, soonRow('avatar-soon', t.avatar, 'user'), row('nickname-row', h('span', { class: 'mpa-tile' }, icon('user')), t.nick, name, button(t.change, () => go('nickname'), 'nickname-change', 'primary sm')), h('li', { 'data-part': 'email-row' }, h('span', { class: 'mpa-tile' }, icon('mail')), h('span', { class: 'mpa-row__text' }, h('b', {}, t.signInWith), h('small', { 'data-part': 'full-email' }, details.email ?? '—'))))), providers.length ? h('section', { class: 'mpa-section', 'data-part': 'provider-links' }, h('h2', { class: 'mpa-caps' }, t.methods), h('ul', { class: 'mpa-list' }, ...providers.map((provider) => {
                const linked = state.linked.includes(provider);
                return row(`method-${provider}`, h('span', { class: `mpa-tile mpa-tile--${provider}` }, providerMark(provider, 22)), { google: 'Google', apple: 'Apple', facebook: 'Facebook' }[provider], linked ? t.linked : t.notLinked, button(linked ? t.unlink : t.link, () => emitIntent(linked ? 'unlink' : 'link', { pr: provider }), `${linked ? 'unlink' : 'link'}-${provider}`, linked ? 'secondary sm' : 'primary sm'));
            })), state.error ? h('p', { role: 'alert', class: 'acw-status err', 'data-part': 'methods-error' }, methodsError(state.error)) : null) : null, about()),
            h('ul', { class: 'mpa-list', 'data-part': 'privacy-soon' }, soonRow('online-soon', t.online, 'user'), soonRow('requests-soon', t.requests, 'user')),
            h('div', { class: 'mpa-actions' }, h('button', { class: 'mp-button mp-button--secondary', type: 'button', disabled: true,
                'data-part': 'switch-account', 'aria-label': `${t.switchAccount} — ${t.soon}` }, `${t.switchAccount} — ${t.soon}`), button(t.logout, () => go('logout'), 'logout', 'secondary'))];
    }
    else if (screen === 'nickname' || screen === 'nickname-success') {
        title = t.nick;
        if (screen === 'nickname-success')
            body = [h('div', { class: 'acw-center' }, h('div', { class: 'acw-bigico ok' }, icon('check')), h('h3', {}, t.nickDone), h('p', {}, t.nickDoneText(name))),
                h('div', { class: 'mpa-actions' }, button(t.done, () => go('home'), 'nickname-done', 'primary'))];
        else if (details.nicknameChangesRemaining === 0 || state.error?.code === 'ACCOUNT_NICKNAME_LIMIT') {
            body = [idCard(t.nickCurrent), h('div', { class: 'mp-warning', role: 'note', 'data-part': 'nickname-limit' }, icon('alert'), h('span', { class: 'mp-warning__text' }, h('span', { class: 'mp-warning__title' }, t.nickLimit), h('span', {}, t.nickLimitText))), about()];
        }
        else {
            if (state.nicknameDraft !== ctx.local.suggestion) {
                ctx.local.suggestion = state.nicknameDraft;
                if (state.nicknameDraft)
                    ctx.local.nickname = state.nicknameDraft;
            }
            const draft = ctx.local.nickname;
            const valid = /^[A-Za-z][A-Za-z0-9_]{2,23}$/.test(draft) && draft !== name;
            const checked = state.nicknameAvailability?.nickname === draft
                ? state.nicknameAvailability : undefined;
            const taken = state.error?.code === 'ACCOUNT_NICKNAME_TAKEN' || checked?.available === false;
            const save = (e) => {
                e.preventDefault();
                if (valid && !state.busy)
                    emitIntent('nickname-save', { nickname: draft });
            };
            body = [idCard(t.nickCurrent), h('form', { class: 'mpa-form', onSubmit: save }, h('label', { class: `mp-field${taken ? ' is-invalid' : ''}` }, h('span', { class: 'mp-caption' }, t.nickNew), h('div', { class: 'acw-nickrow' }, h('input', { class: `mp-input${taken ? ' mp-input--error' : ''}`, value: draft, maxlength: 24,
                    autocomplete: 'off', spellcheck: 'false', 'data-part': 'nickname-input', disabled: state.busy,
                    'aria-invalid': taken ? 'true' : 'false', 'aria-describedby': 'acwNickRules',
                    onInput: (e) => {
                        ctx.local.nickname = e.target.value;
                        emitIntent('nickname-check', { nickname: ctx.local.nickname });
                        ctx.refresh();
                    } }), h('button', { class: 'mp-icon-button', type: 'button', 'aria-label': t.nickRandom, 'data-part': 'nickname-suggest',
                    disabled: state.busy, onClick: () => emitIntent('nickname-suggest') }, icon('dice')))), h('p', { class: 'mp-caption', id: 'acwNickRules' }, t.nickRules), taken ? h('p', { role: 'alert', class: 'acw-status err' }, t.nickTaken(draft))
                    : state.error ? h('p', { role: 'alert', class: 'acw-status err' }, loginErrorText(text, state.error))
                        : state.nicknameChecking ? h('p', { class: 'acw-status', role: 'status' }, t.nickChecking)
                            : checked?.available ? h('p', { class: 'acw-status ok', role: 'status' }, icon('check'), t.nickFree) : null, h('div', { class: 'mpa-note-box', role: 'note' }, icon('info'), h('span', {}, t.nickHint)), h('div', { class: 'mp-warning', role: 'note' }, icon('alert'), h('span', { class: 'mp-warning__text' }, t.nickWarn)), h('div', { class: 'mpa-actions' }, h('button', { class: 'mp-button mp-button--primary', type: 'submit', 'data-part': 'nickname-save',
                    disabled: !valid || state.busy, onClick: save }, state.busy ? t.nickSaving : t.nickSave)))];
        }
    }
    else if (screen === 'logout') {
        title = t.logoutTitle;
        body = [idCard(details.email ?? ''), h('p', { class: 'mpa-text', 'data-part': 'logout-text' }, t.logoutText),
            state.error ? failure('account-retry') : null,
            h('div', { class: 'mpa-actions' }, button(t.logoutConfirm, () => emitIntent('account-logout'), 'logout-confirm', 'primary'), button(t.stay, () => go('settings'), 'logout-stay', 'secondary'))];
    }
    const close = () => { if (!state.busy)
        emitIntent('cancel'); };
    return h('div', { class: `mp-account-window mp-account-window--${props.orientation ?? 'auto'}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': t.dialog,
        'data-window-id': 'id-account',
        lang: props.lang ?? 'en', tabindex: -1, 'data-part': 'root', 'data-step': 'profile', 'data-screen': guest ? 'guest' : screen,
        onKeydown: (e) => {
            const key = e;
            if (key.key === 'Escape') {
                key.stopPropagation();
                close();
            }
            if (key.key === 'Tab') {
                const nodes = [...key.currentTarget.querySelectorAll('button:not(:disabled),input:not(:disabled),a[href]')];
                const active = ctx.root.activeElement;
                if (!nodes.includes(active) || (key.shiftKey && active === nodes[0])
                    || (!key.shiftKey && active === nodes.at(-1))) {
                    key.preventDefault();
                    (key.shiftKey ? nodes.at(-1) : nodes[0])?.focus();
                }
            }
        } }, h('section', { class: 'acw', 'data-part': 'panel' }, head ?? h('header', { class: 'acw-top' }, title
        ? h('button', { class: 'mp-icon-button', type: 'button', 'data-part': 'account-back', disabled: state.busy,
            'aria-label': t.back, onClick: () => go(['nickname', 'nickname-success', 'logout'].includes(screen) ? 'settings' : 'home') }, icon('back')) : null, h('div', { class: 'acw-logo', 'data-part': 'logo' }, mpMark(false, 28), h('span', {}, 'ManyPlay'), h('span', { class: 'acw-idbadge' }, 'ID')), h('span', { class: 'grow' }), title ? null : h('button', { class: 'mp-icon-button', type: 'button', 'data-part': 'close', disabled: state.busy,
        'aria-label': t.close, onClick: close }, closeIcon())), title ? h('h2', { class: 'acw-title', tabindex: -1, 'data-part': 'account-title' }, title) : null, h('div', { class: 'acw-body', 'aria-busy': state.busy ? 'true' : undefined }, ...body), head || title ? null : h('footer', { class: 'acw-foot' }, props.privacyUrl ? h('a', { href: props.privacyUrl, target: '_blank', rel: 'noopener noreferrer' }, t.privacyPolicy) : null, props.termsUrl ? h('a', { href: props.termsUrl, target: '_blank', rel: 'noopener noreferrer' }, t.terms) : null)));
}

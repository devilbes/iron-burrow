import { FEATURE_STRINGS } from '../services/feature-strings.js';
import { kitText } from '../services/login-strings.js';
import { readNotice } from './progress-status.js';
import { nameComponents } from '../core.js';
import { component, h, button, dialog, assetImage } from './shared.js';
import { iconOr, checkIcon, lockIcon, clockIcon, spanText } from './daily-parts.js';
export const DAILY_STRINGS = Object.freeze({
    ru: Object.freeze(Object.fromEntries(Object.entries(FEATURE_STRINGS['ru'] ?? {})
        .filter(([key]) => key.startsWith('kit.daily.')))),
    en: Object.freeze(Object.fromEntries(Object.entries(FEATURE_STRINGS['en'] ?? {})
        .filter(([key]) => key.startsWith('kit.daily.')))),
});
export function dailyText(p) {
    return kitText(p.l10n, p.lang);
}
function withTime(template, time) {
    const at = template.indexOf('{time}');
    if (at < 0)
        return [template];
    return [template.slice(0, at), h('b', {}, time), template.slice(at + '{time}'.length)];
}
const STATES = ['claimed', 'available', 'pending', 'locked'];
export function dailyRewardView(p) {
    const t = dailyText(p);
    const notice = readNotice(p);
    if (notice)
        return h('section', { class: 'daily-reward', 'data-part': 'daily-reward',
            'aria-busy': p.loading ?? false }, notice);
    const days = p.days.slice(0, 7);
    const available = days.find(day => day.status === 'available' && day.operationId);
    const claimed = days.filter(day => day.status === 'claimed').length;
    const open = days.findIndex(day => day.status !== 'claimed' && day.status !== 'locked');
    const current = Math.min(days.length, open >= 0 ? open + 1 : Math.max(1, claimed));
    const fmt = (amount) => typeof amount === 'number'
        ? new Intl.NumberFormat(p.lang).format(amount) : amount;
    const art = (item, size) => assetImage(p, item.art, { class: 'mp-art-icon', width: size, height: size }) ?? iconOr(item.icon, size);
    const state = (status) => STATES.includes(status) ? t(`kit.daily.state.${status}`) : '';
    const badge = (day) => day.status === 'claimed'
        ? h('span', { class: 'daily-check', role: 'img', 'aria-label': state('claimed') }, checkIcon(14))
        : day.status === 'locked' ? h('span', { class: 'daily-lock', role: 'img',
            'aria-label': state('locked') }, lockIcon(12)) : null;
    const tile = (day) => {
        const today = day.status === 'available' || day.status === 'pending' || day.status === 'failed';
        return h('li', { class: 'daily-day', 'data-part': 'daily-day', 'data-state': day.status,
            'data-wide': day.wide, 'aria-current': today ? 'date' : undefined,
            'aria-label': `${day.title}, ${fmt(day.amount)}, ${state(day.status).toLowerCase()}` }, day.wide ? h('div', { class: 'daily-day-text' }, h('span', { class: 'daily-day-title' }, day.title), h('span', { class: 'daily-amount' }, day.caption ?? t('kit.daily.bigPrize')))
            : h('span', { class: 'daily-day-title' }, today ? t('kit.daily.today') : day.title), day.wide ? h('div', { class: 'daily-art' }, ...[day, ...(day.extra ?? [])].map(r => h('span', { class: 'daily-art-item' }, art(r, 40), h('span', { class: 'daily-amount' }, fmt(r.amount)))))
            : h('span', { class: 'daily-art' }, art(day, 40)), day.wide ? null : h('span', { class: 'daily-amount' }, fmt(day.amount)), badge(day));
    };
    const time = p.nextInMs === undefined ? '' : spanText(p, p.nextInMs);
    return h('section', { class: 'daily-reward', 'data-part': 'daily-reward', 'aria-busy': p.busy ?? false }, h('header', {}, h('h2', {}, p.title ?? t('kit.daily.title')), p.subtitle ? h('p', { class: 'hint' }, p.subtitle) : null), h('div', { class: 'daily-streak', 'data-part': 'daily-streak' }, h('div', { class: 'daily-streak-row' }, h('span', { class: 'daily-long' }, p.subtitle ?? t('kit.daily.subtitle')), h('span', { class: 'daily-short' }, t('kit.daily.streak')), h('b', {}, t('kit.daily.progress', { n: current, total: days.length }))), h('progress', { class: 'daily-bar', value: current, max: Math.max(1, days.length),
        'aria-label': t('kit.daily.streak') })), h('ul', { class: 'daily-days', 'data-part': 'daily-days', 'aria-label': t('kit.daily.days') }, ...days.map(tile)), p.nextInMs === undefined ? null : h('div', { class: 'daily-hint', 'data-part': 'daily-hint' }, clockIcon(16), h('span', { role: 'timer', class: 'daily-long' }, ...withTime(t('kit.daily.hint'), time)), h('span', { role: 'timer', class: 'daily-short' }, ...withTime(t('kit.daily.hintShort'), time))), available ? button(t('kit.daily.claim'), 'claim', p, {
        disabled: !p.ready || p.busy || p.retryClaim, className: 'daily-cta window-footer',
        suffix: h('span', { class: 'daily-art-item' }, art(available, 20), h('b', {}, fmt(available.amount))),
        testid: `progress.claim.${available.operationId}`,
        payload: () => ({ key: p.trackKey, operationId: available.operationId })
    }) : null);
}
export const dailyReward = component(p => dialog(p, p.title ?? dailyText(p)('kit.daily.window'), () => p.emitIntent('close'), dailyRewardView(p)), { presentation: 'fullscreen', popupKind: 'content' });
nameComponents({ dailyReward });

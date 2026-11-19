import { nameComponents } from '../core.js';
import { publicName } from '../features/public-name.js';
import { kvView } from './kv.js';
import { component, h, assetImage, text, heading, button, details, outcome, record, field } from '../features/shared.js';
const SYSTEM_FIELDS = [
    ['level', 'kit.profile.system_fields-levels-cleared'],
    ['score', 'kit.profile.system_fields-score'],
    ['xp', 'kit.profile.system_fields-xp'],
    ['coins', 'kit.shared.currency'],
    ['gamesPlayed', 'kit.profile.system_fields-games-played'],
    ['gamesWon', 'kit.profile.system_fields-games-won'],
    ['totalScore', 'kit.profile.system_fields-total-score'],
    ['highestScore', 'kit.profile.system_fields-highest-score'],
    ['winRate', 'kit.profile.system_fields-win-rate'],
    ['friendsCount', 'kit.profile.system_fields-friends'],
    ['referralCode', 'kit.profile.system_fields-referral-code'],
    ['locale', 'kit.profile.system_fields-locale'],
    ['country', 'kit.profile.system_fields-country'],
];
export function profileView(p, d, ctx) {
    const snapshot = record(p.profile?.value);
    const name = publicName(p.gid, snapshot['name'], undefined, p.lang);
    const off = p.busy || !p.ready;
    return h('section', { 'data-testid': 'data' }, heading(p, p.public ? text(p, 'kit.profile.player-profile') : text(p, 'kit.profile.your-player'), p.public ? text(p, 'kit.profile.public-player-data-in-this-game')
        : text(p, 'kit.profile.name-progress-and-saved-game')), p.public ? h('div', { class: 'row' }, h('label', {}, text(p, 'kit.profile.player-id'), field(d, 'gid', String(p.gid ?? ''), 'public-profile.gid')), button(text(p, 'kit.profile.view-profile'), 'profile.get', p, { disabled: off, payload: () => ({ gid: d['gid'] }) })) : null, h('div', { class: 'card' }, h('div', { class: 'row' }, assetImage(p, snapshot['avatar'], { class: 'avatar', alt: text(p, 'kit.profile.avatar') })
        ?? h('div', { class: 'avatar', 'aria-label': text(p, 'kit.profile.avatar') }, name.slice(0, 1)), h('div', {}, h('h3', { 'data-part': 'player-name' }, name), h('p', { class: 'hint' }, text(p, 'kit.profile.ready-for-an-adventure')))), h('dl', { 'data-part': 'system-profile' }, ...SYSTEM_FIELDS.filter(([key]) => !p.public || (key !== 'xp' && key !== 'coins')).map(([key, label]) => h('div', { class: 'row' }, h('dt', {}, key === 'coins' ? p.currencyLabel ?? text(p, 'kit.shared.currency') : text(p, label)), h('dd', { 'data-field': key }, String(snapshot[key] ?? '—'))))), h('div', { class: 'row' }, button(text(p, 'kit.profile.refresh-profile'), 'profile.get', p, { disabled: off, ghost: true })), outcome(p, p.profile, 'data.profile')), p.public ? null : h('div', { class: 'card' }, h('h3', {}, text(p, 'kit.profile.cloud-progress')), h('p', { class: 'hint' }, text(p, 'kit.profile.save-this-level-or-continue-from-your-last-save')), h('div', { class: 'row' }, button(text(p, 'kit.profile.save-progress'), 'state.set', p, { disabled: off }), button(text(p, 'kit.profile.load-progress'), 'state.get', p, { disabled: off, ghost: true }), button(text(p, 'kit.profile.clear-save'), 'state.clear', p, { disabled: off, ghost: true })), p.state?.value ? h('p', { class: 'success', role: 'status' }, p.state.action === 'state.set' ? text(p, 'kit.profile.progress-saved')
        : p.state.action === 'state.clear' ? text(p, 'kit.profile.save-cleared')
            : text(p, 'kit.profile.save-loaded')) : null, outcome(p, p.state, 'data.state')), p.public ? null : kvView({ ...p,
        entries: (p.entries ?? {}),
        ...(p.kv?.error ? { error: p.kv.error } : {}) }, d, ctx), p.public ? h('details', { 'data-part': 'details' }, h('summary', {}, text(p, 'kit.profile.details')), button(text(p, 'kit.profile.summary'), 'profile.summary', p, { disabled: off, ghost: true, payload: () => ({ gid: d['gid'] }) }), button(text(p, 'kit.profile.public-query'), 'profile.query', p, { disabled: off, ghost: true, payload: () => ({ gid: d['gid'] }) }), h('pre', { 'data-testid': 'public-profile.details' }, JSON.stringify(p.profile, null, 2) ?? '—'))
        : details(p, { profile: p.profile, progress: p.state, journal: p.kv }, 'data.details'));
}
export const profile = component(profileView);
export const publicProfile = component((p, d, ctx) => profileView({ ...p, public: true }, d, ctx));
nameComponents({ profile, publicProfile });

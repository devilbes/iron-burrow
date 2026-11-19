import { icon as registryIcon } from '../icon.js';
import { nameComponents } from '../core.js';
import { component, h, text, titledDialog, assetImage } from '../features/shared.js';
import { publicName } from '../features/public-name.js';
const MAX_TABS = 4;
const FIT_STEPS = 5;
const MAX_TABLE_ROWS = 50;
const initial = (name) => [...name][0]?.toUpperCase() ?? '';
const avatar = (p, key, name, size) => h('span', { class: 'lbw-avatar', 'aria-hidden': 'true' }, assetImage(p, key, { width: size, height: size }) ?? initial(name));
const label = (row, lang) => publicName(row.gid, row.name, row.nickname, lang);
const num = (p, value) => new Intl.NumberFormat(p.lang).format(value);
const medal = (_p, place) => registryIcon(`medal-${place}`, 24, { attributes: { class: 'mp-art-icon lbw-medal' } });
function tabLabel(p, tab, index) {
    const own = typeof tab.label === 'string' ? tab.label.trim() : '';
    return own || text(p, 'kit.leaderboard-window.leaderboard', { index1: index + 1 });
}
function tabsOf(p) {
    const tabs = [];
    for (const tab of p.tabs ?? []) {
        if (tabs.length === MAX_TABS)
            break;
        if (typeof tab?.id !== 'string' || !tab.id || tabs.some((seen) => seen.id === tab.id))
            continue;
        tabs.push({ id: tab.id, label: tabLabel(p, tab, tabs.length) });
    }
    return tabs;
}
function timeLeft(p, seconds) {
    const d = Math.floor(seconds / 86400);
    const hrs = Math.floor((seconds % 86400) / 3600);
    const min = Math.max(Math.floor((seconds % 3600) / 60), 1);
    if (d > 0)
        return text(p, 'kit.leaderboard-window.d-h', { d: d, hrs: hrs });
    if (hrs > 0)
        return text(p, 'kit.leaderboard-window.h-m', { hrs: hrs, min: min });
    return text(p, 'kit.leaderboard-window.min', { min: min });
}
function subtitleOf(p) {
    if (p.subtitle)
        return p.subtitle;
    const left = p.endsInSec;
    if (typeof left !== 'number' || !Number.isFinite(left) || left < 0)
        return undefined;
    return left === 0 ? text(p, 'kit.leaderboard-window.period-ended')
        : `${text(p, 'kit.leaderboard-window.ends-in')} ${timeLeft(p, left)}`;
}
function spills(label) {
    const tab = label.parentElement;
    if (!tab)
        return false;
    const box = tab.getBoundingClientRect();
    const range = label.ownerDocument.createRange();
    range.selectNodeContents(label);
    const textBox = range.getBoundingClientRect();
    return label.scrollWidth > label.clientWidth + 1 || label.scrollHeight > label.clientHeight + 1
        || textBox.left < box.left - 0.5 || textBox.right > box.right + 0.5
        || textBox.top < box.top - 0.5 || textBox.bottom > box.bottom + 0.5;
}
function fitTabs(root) {
    for (const label of root.querySelectorAll('.lbw-tab-text')) {
        let fit = 0;
        label.removeAttribute('data-fit');
        while (fit < FIT_STEPS && spills(label))
            label.setAttribute('data-fit', String(++fit));
    }
}
const observed = new WeakSet();
function fitRendered(_p, ctx) {
    const { root, signal } = ctx;
    fitTabs(root);
    const view = root.ownerDocument.defaultView;
    if (observed.has(root) || !view)
        return;
    observed.add(root);
    const refit = () => { if (!signal.aborted)
        fitTabs(root); };
    const sizes = view.ResizeObserver ? new view.ResizeObserver(refit) : undefined;
    const watch = () => { sizes?.disconnect(); for (const tab of root.querySelectorAll('.lbw-tabs'))
        sizes?.observe(tab); };
    watch();
    void root.ownerDocument.fonts?.ready.then(refit, () => undefined);
    const tabs = new view.MutationObserver(watch);
    tabs.observe(root, { childList: true, subtree: true });
    signal.addEventListener('abort', () => { sizes?.disconnect(); tabs.disconnect(); observed.delete(root); }, { once: true });
}
export function leaderboardWindowView(p) {
    const top = p.entries.filter((row) => row.rank >= 1 && row.rank <= 3).slice(0, 3);
    const rest = p.entries.filter((row) => row.rank > 3).slice(0, MAX_TABLE_ROWS);
    const tabs = tabsOf(p);
    const current = tabs.find((tab) => tab.id === p.tab);
    const own = p.entries.find((row) => row.gid === p.meGid);
    const me = own ?? p.me;
    const rank = me?.rank ?? null;
    return titledDialog(p, text(p, 'kit.leaderboard-window.leaderboard-2'), subtitleOf(p), () => p.emitIntent('close'), tabs.length > 1 ? h('div', { class: 'lbw-tabs', role: 'tablist',
        'aria-label': text(p, 'kit.leaderboard-window.leaderboards') }, ...tabs.map(({ id, label: name }) => h('button', { type: 'button', role: 'tab', title: name,
        'aria-selected': String(p.tab === id), 'data-testid': `${p.elementId}.tab.${id}`,
        disabled: !p.ready || p.busy,
        onClick: () => { if (p.ready && !p.busy && p.tab !== id)
            p.emitIntent('tab', { tab: id }); },
    }, h('span', { class: 'lbw-tab-text', lang: p.lang }, name)))) : null, h('div', { class: 'lbw-body', role: 'tabpanel', 'aria-label': current?.label ?? text(p, 'kit.leaderboard-window.leaderboard-2'),
        'aria-busy': String(p.busy) }, h('div', { class: 'lbw-left' }, top.length ? h('ol', { class: 'lbw-podium', 'aria-label': text(p, 'kit.leaderboard-window.top-three') }, ...top.map((row) => h('li', { class: 'lbw-pod', 'data-rank': row.rank,
        'data-testid': `${p.elementId}.podium.${row.rank}` }, h('span', { class: 'lbw-avatar', 'aria-hidden': 'true' }, assetImage(p, row.avatar, { width: 56, height: 56 }) ?? initial(label(row, p.lang)), medal(p, row.rank)), h('span', { class: 'lbw-name' }, row.gid === p.meGid ? text(p, 'kit.leaderboard-window.you') : label(row, p.lang)), h('span', { class: 'lbw-score' }, num(p, row.score)), h('span', { class: 'lbw-step', 'aria-hidden': 'true' }, String(row.rank)))))
        : h('p', { class: 'lbw-empty', role: 'status',
            'data-testid': `${p.elementId}.${p.busy ? 'loading' : 'empty'}` }, p.busy ? text(p, 'kit.leaderboard-window.loading')
            : text(p, 'kit.leaderboard-window.the-first-heroes-will-appear-here-soon')), me ? h('div', { class: 'lbw-mine', 'data-testid': `${p.elementId}.me`,
        'aria-label': text(p, 'kit.leaderboard-window.your-place') }, h('span', { class: 'lbw-rank' }, rank === null ? '—' : String(rank)), avatar(p, me.avatar, text(p, 'kit.leaderboard-window.you'), 34), h('span', { class: 'lbw-who' }, rank === null ? text(p, 'kit.leaderboard-window.you-unranked')
        : text(p, 'kit.leaderboard-window.you-rank', { rank: rank })), h('span', { class: 'lbw-score' }, me.score === null ? '—' : num(p, me.score))) : null), h('div', { class: 'lbw-right' }, rest.length ? h('ol', { class: 'lbw-table', 'aria-label': text(p, 'kit.leaderboard-window.table') }, ...rest.map((row) => h('li', { class: 'lbw-row', 'data-me': String(row.gid === p.meGid),
        'data-tone': row.gid % 4, 'data-testid': `${p.elementId}.row.${row.rank}` }, h('span', { class: 'lbw-rank' }, String(row.rank)), avatar(p, row.avatar, label(row, p.lang), 32), h('span', { class: 'lbw-who' }, row.gid === p.meGid ? text(p, 'kit.leaderboard-window.you') : label(row, p.lang)), h('span', { class: 'lbw-score' }, num(p, row.score))))) : null)));
}
export const leaderboardWindow = component(leaderboardWindowView, { presentation: 'fullscreen', popupKind: 'content', rendered: fitRendered });
nameComponents({ leaderboardWindow });

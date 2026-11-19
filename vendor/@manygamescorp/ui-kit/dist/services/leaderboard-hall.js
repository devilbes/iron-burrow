import { icon } from '../icon.js';
import { nameComponents } from '../core.js';
import { assetImage } from '../features/shared.js';
import { publicName } from '../features/public-name.js';
import { component, h, text, heading, button, details, outcome } from '../features/shared.js';
const MEDALS = [icon('medal-1'), icon('medal-2'), icon('medal-3')];
function label(row, lang) {
    return publicName(row.gid, row.profile?.name, row.profile?.nickname, lang);
}
function span(seconds, p) {
    const d = Math.floor(seconds / 86400);
    const hrs = Math.floor((seconds % 86400) / 3600);
    const min = Math.floor((seconds % 3600) / 60);
    if (d > 0)
        return text(p, 'kit.leaderboard-hall.d-h', { d: d, hrs: hrs });
    if (hrs > 0)
        return text(p, 'kit.leaderboard-hall.h-m', { hrs: hrs, min: min });
    return text(p, 'kit.leaderboard-hall.min', { maxmin1: Math.max(min, 1) });
}
function podium(p, rows) {
    return h('ol', { class: 'podium', 'data-testid': 'lb.podium' }, ...rows.slice(0, 3).map((row) => h('li', { 'data-rank': row.rank,
        'data-me': row.gid === p.meGid, 'data-testid': `lb.podium.${row.rank}` }, h('div', { class: 'medal', 'aria-hidden': 'true' }, MEDALS[row.rank - 1] ?? row.rank), h('div', { class: 'name' }, row.gid === p.meGid ? text(p, 'kit.leaderboard-hall.you') : label(row, p.lang)), h('div', { class: 'hint' }, `#${row.rank}`), h('div', { class: 'balance' }, row.score))));
}
function table(p, rows, caption, testid) {
    return h('table', { 'data-testid': testid }, h('caption', {}, caption), h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, '#'), h('th', { scope: 'col' }, text(p, 'kit.leaderboard-hall.player')), h('th', { scope: 'col' }, text(p, 'kit.leaderboard-hall.score')))), h('tbody', {}, ...rows.map((row) => h('tr', { 'data-rank': row.rank,
        'data-me': row.gid === p.meGid }, h('td', {}, row.rank <= 3 ? MEDALS[row.rank - 1] : row.rank), h('td', {}, row.gid === p.meGid ? text(p, 'kit.leaderboard-hall.you') : h('button', { type: 'button',
        'data-variant': 'ghost', disabled: !p.ready || p.busy,
        'data-testid': `lb.player.${row.gid}`,
        onClick: () => { if (p.ready && !p.busy)
            p.emitIntent('player', { gid: row.gid }); },
    }, label(row, p.lang))), h('td', {}, row.score)))));
}
function playerCard(p, player) {
    const { row } = player;
    const avatar = row.profile?.avatar;
    return h('div', { class: 'card player-card', 'data-testid': 'lb.player-card' }, h('div', { class: 'row' }, h('div', { class: 'avatar', 'aria-hidden': 'true' }, assetImage(p, avatar)
        ?? label(row, p.lang).slice(0, 1).toUpperCase()), h('div', {}, h('h3', {}, label(row, p.lang)), row.profile?.level === undefined ? null : h('span', { class: 'badge' }, `${text(p, 'kit.leaderboard-hall.level')} ${row.profile.level}`))), h('p', {}, `${text(p, 'kit.leaderboard-hall.rank')}: ${player.rank ?? '—'} · ${text(p, 'kit.leaderboard-hall.score-2')}: ${player.score ?? '—'}`), player.neighbours.length ? table(p, player.neighbours, text(p, 'kit.leaderboard-hall.nearby'), 'lb.neighbours') : null, button(text(p, 'kit.leaderboard-hall.close'), 'close-player', p, { ghost: true, testid: 'lb.close-player' }));
}
function finals(p, items) {
    return h('div', { class: 'card', 'data-testid': 'lb.finals' }, h('h3', {}, text(p, 'kit.leaderboard-hall.final-tops')), items.length ? h('div', {}, ...items.map((item) => h('div', {}, h('h4', {}, item.title), table(p, item.top.slice(0, 3), item.title, `lb.final.${item.boardId}`))))
        : h('p', { class: 'hint', 'data-testid': 'lb.finals.empty' }, text(p, 'kit.leaderboard-hall.no-finished-periods-yet-final-tops-appear-after-the-first-ro')));
}
export const leaderboardHallView = (p) => {
    const periodic = p.mode === 'periodic';
    const mine = p.entries.find((row) => row.gid === p.meGid);
    return h('section', { 'data-testid': periodic ? 'lb.periodic' : 'lb.alltime' }, heading(p, periodic ? text(p, 'kit.leaderboard-hall.periodic-leaderboards')
        : text(p, 'kit.leaderboard-hall.demo-challenge-hall-of-fame'), periodic ? text(p, 'kit.leaderboard-hall.daily-and-weekly-rankings-compete-for-the-top-of-the-period')
        : text(p, 'kit.leaderboard-hall.all-time-ranking-speed-points-from-verified-levels-never-res')), p.catalog.length > 1 || periodic ? h('div', { class: 'row', role: 'group',
        'aria-label': text(p, 'kit.leaderboard-hall.boards') }, ...p.catalog.slice(0, 100).map((board) => h('button', { type: 'button',
        'aria-pressed': board.boardId === p.selected, 'data-variant': 'ghost',
        disabled: !p.ready || p.busy, 'data-testid': `lb.board.${board.boardId}`,
        onClick: () => { if (!p.busy && p.ready)
            p.emitIntent('select-board', { boardId: board.boardId }); },
    }, board.title ?? board.leaderboardKey))) : null, periodic && !p.catalog.length ? h('p', { class: 'hint', 'data-testid': 'lb.no-periodic' }, text(p, 'kit.leaderboard-hall.no-periodic-boards-create-a-type-with-a-daily-weekly-period')) : null, p.period && (p.period.key || p.period.endsInSec !== null) ? h('p', { class: 'row',
        'data-testid': 'lb.period' }, p.period.key ? h('span', { class: 'badge' }, p.period.key) : null, h('span', { class: 'badge' }, p.period.ended ? text(p, 'kit.leaderboard-hall.period-ended')
        : `${text(p, 'kit.leaderboard-hall.ends-in')}: ${span(p.period.endsInSec ?? 0, p)}`)) : null, p.entries.length ? podium(p, p.entries) : null, h('div', { class: 'card' }, p.entries.length ? table(p, p.entries, text(p, 'kit.leaderboard-hall.top-players'), 'lb.table')
        : h('p', { class: 'empty', 'data-testid': 'lb.empty' }, text(p, 'kit.leaderboard-hall.the-first-heroes-will-appear-here-soon')), h('p', { class: 'badge', 'data-part': 'my-rank', 'data-testid': 'lb.me' }, `${text(p, 'kit.leaderboard-hall.you')}: ${p.me?.rank ?? '—'} · ${p.me?.score ?? 0}`
        + (p.total === undefined ? '' : ` · ${text(p, 'kit.leaderboard-hall.total')} ${p.total}`)), mine || p.me?.rank == null ? null : h('p', { class: 'hint', 'data-testid': 'lb.me-outside' }, text(p, 'kit.leaderboard-hall.you-are-ranked-below-the-shown-rows', { rank: p.me.rank }))), p.player ? playerCard(p, p.player) : null, periodic ? finals(p, p.finals ?? []) : null, h('div', { class: 'row' }, button(text(p, 'kit.leaderboard-hall.refresh-ranking'), 'top', p, { disabled: !p.ready || p.busy || !p.selected }), periodic ? null : button(text(p, 'kit.leaderboard-hall.play-a-level'), 'play-level', p, { ghost: true })), outcome(p, p.result, 'lb.result'), details(p, p.result, 'lb.details'));
};
export const leaderboardHall = component(leaderboardHallView, {});
nameComponents({ leaderboardHall });

import { icon } from '../icon.js';
import { nameComponents } from '../core.js';
import { publicName } from '../features/public-name.js';
import { component, h, text, heading, button, details, outcome } from '../features/shared.js';
export const leaderboard = component((p) => h('section', { 'data-testid': 'leaders' }, heading(p, text(p, 'kit.leaderboard.hall-of-fame'), text(p, 'kit.leaderboard.complete-levels-and-climb-the-ranking')), h('div', { class: 'row', role: 'group', 'aria-label': text(p, 'kit.leaderboard.boards') }, ...p.catalog.slice(0, 100).map((board) => h('button', { type: 'button',
    'aria-pressed': board.boardId === p.selected, 'data-variant': 'ghost',
    disabled: !p.ready || p.busy, 'data-testid': `leaders.board.${board.boardId}`,
    onClick: () => { if (!p.busy && p.ready)
        p.emitIntent('select-board', { boardId: board.boardId }); },
}, board.title ?? board.leaderboardKey))), h('div', { class: 'card' }, h('table', {}, h('caption', {}, text(p, 'kit.leaderboard.top-players')), h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, '#'), h('th', { scope: 'col' }, text(p, 'kit.leaderboard.player')), h('th', { scope: 'col' }, text(p, 'kit.leaderboard.score')))), h('tbody', {}, ...p.entries.slice(0, 100).map((entry) => h('tr', {}, h('td', {}, entry.rank <= 3 ? [icon('medal-1'), icon('medal-2'), icon('medal-3')][entry.rank - 1] : entry.rank), h('td', {}, p.canOpenProfile ? button(publicName(entry.gid, entry.profile?.name, entry.profile?.nickname, p.lang), 'player-profile', p, { ghost: true,
    disabled: !p.ready || p.busy, testid: `leaders.player.${entry.gid}`,
    payload: () => ({ gid: entry.gid }) })
    : publicName(entry.gid, entry.profile?.name, entry.profile?.nickname, p.lang)), h('td', {}, entry.score))))), p.entries.length ? null : h('p', { class: 'empty' }, text(p, 'kit.leaderboard.the-first-heroes-will-appear-here-soon')), h('p', { class: 'badge', 'data-part': 'my-rank' }, `${text(p, 'kit.leaderboard.your-rank')}: ${p.me?.rank ?? '—'} · ${p.me?.score ?? 0}`)), h('div', { class: 'row' }, button(text(p, 'kit.leaderboard.refresh-ranking'), 'top', p, { disabled: !p.ready || p.busy || !p.selected }), button(text(p, 'kit.leaderboard.play-a-level'), 'play-level', p, { ghost: true }), button(text(p, 'kit.leaderboard.add-a-d7-point'), 'submit', p, { disabled: !p.ready || p.busy || !p.canSubmit })), !p.canSubmit ? h('p', { class: 'hint', 'data-testid': 'leaders.score-source' }, text(p, 'kit.leaderboard.scores-arrive-from-the-server')) : null, outcome(p, p.result, 'leaders.result'), details(p, p.result, 'leaders.details')));
nameComponents({ leaderboard });

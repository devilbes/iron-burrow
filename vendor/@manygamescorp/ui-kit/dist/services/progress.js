import { icon } from '../icon.js';
import { nameComponents } from '../core.js';
import { component, h, text, heading, button, details, outcome, record } from '../features/shared.js';
import { dailyRewardView } from '../features/daily-reward-window.js';
export { dailyReward, dailyRewardView, DAILY_STRINGS } from '../features/daily-reward-window.js';
export function progressView(p) {
    const game = p.puzzle;
    const ended = game?.won !== undefined;
    const objective = record(game?.objective);
    const goal = objective['type'] === 'lines' ? `${objective['lines']} / ${objective['target']} ${text(p, 'kit.progress.lines')}`
        : objective['type'] === 'scoreTarget'
            ? `${objective['score']} / ${objective['target']} ${text(p, 'kit.progress.points')}`
            : objective['type'] === 'gemCollect'
                ? `${text(p, 'kit.progress.remaining')}: ${objective['remaining']}`
                : Array.isArray(objective['pairs']) ? objective['pairs'].map((pair) => {
                    const target = record(pair);
                    return `${target['kind']}: ${target['remaining']}`;
                }).join(' · ') : '';
    const blocked = p.busy || !p.ready || ended || !!game?.pendingSpend || !!game?.pendingReward;
    return h('section', { 'data-testid': 'progress' }, heading(p, text(p, 'kit.progress.demo-challenge'), text(p, 'kit.progress.place-pieces-clear-lines-and-beat-the-timer')), game ? h('article', { class: 'card hero' }, h('p', { role: 'timer', 'data-testid': 'progress.timer' }, `${Math.ceil(game.remainingMs / 1000)} s · ${game.moves} ${text(p, 'kit.progress.moves')}`, game.frozenMs ? h('span', {}, icon('freeze'), ` ${Math.ceil(game.frozenMs / 1000)} s`) : null), h('svg', { viewBox: '0 0 320 320', width: 320, height: 320,
        role: 'group', 'aria-label': text(p, 'kit.progress.demo-challenge-board') }, ...game.cells.slice(0, 64).map((cell, i) => {
        const row = Math.floor(i / 8);
        const col = i % 8;
        const mark = game.special[i] ?? 0;
        const symbol = mark === 1 ? 'S' : mark > 1 ? 'ABCDE'[mark - 2] : '';
        const choose = () => { if (!blocked)
            p.emitIntent('place', { row, col }); };
        return h('g', {}, h('rect', { x: col * 40 + 2, y: row * 40 + 2, width: 36, height: 36, rx: 6,
            fill: 'currentColor', opacity: cell ? 1 : 0.18, role: 'button',
            tabindex: blocked ? -1 : 0, 'aria-disabled': blocked,
            'aria-label': `${row + 1}, ${col + 1}: ${symbol || (cell ? 'filled' : 'empty')}`,
            'data-testid': `progress.cell.${row}.${col}`, onClick: choose,
            onKeydown: (e) => {
                if (e.key === 'Enter'
                    || e.key === ' ') {
                    e.preventDefault();
                    choose();
                }
            } }), symbol ? h('text', { x: col * 40 + 20, y: row * 40 + 25,
            'text-anchor': 'middle', fill: 'var(--mp-night)', 'pointer-events': 'none' }, symbol) : null);
    })), h('p', { class: 'hint', 'data-testid': 'progress.objective' }, goal), h('div', { class: 'row' }, ...game.hand.slice(0, 3).map((piece, slot) => {
        const mask = piece ? Array.from({ length: piece.h }, (_, r) => Array.from({ length: piece.w }, (_, c) => piece.cells.some((xy) => xy[0] === r && xy[1] === c) ? '#' : '.').join('')).join(' / ') : '—';
        return button(`${slot + 1}: ${mask}`, 'select', p, { payload: () => ({ slot }),
            ghost: game.selectedSlot !== slot, disabled: blocked || !piece });
    })), game.hint ? h('p', { role: 'status' }, `${text(p, 'kit.progress.hint')}: ${game.hint.slot + 1} → `
        + `${game.hint.r + 1}, ${game.hint.c + 1}`) : null, h('div', { class: 'row' }, ...[
        ['time', text(p, 'kit.progress.time')], ['hint', text(p, 'kit.progress.hint')],
        ['freeze', text(p, 'kit.progress.freeze')], ['shuffle', text(p, 'kit.progress.shuffle')],
    ].map(([kind, label]) => button(`${label} (${game.quantities[kind] ?? 0})`, 'boost', p, { payload: () => ({ kind }), disabled: p.busy || !!game.pendingReward
            || (ended && game.pendingSpend !== kind)
            || (!!game.pendingSpend && game.pendingSpend !== kind)
            || (!game.pendingSpend && !game.quantities[kind]) }))), button(text(p, 'kit.progress.video-time'), 'reward-time', p, { disabled: p.busy || ended || !!game.pendingSpend
            || (!!game.pendingReward && game.pendingReward !== 'time')
            || game.rewarded.includes('time') }), ended ? h('p', { role: 'status', class: 'badge' }, game.won
        ? text(p, 'kit.progress.level-cleared') : text(p, 'kit.progress.attempt-ended'))
        : null, ended ? button(text(p, 'kit.progress.retry-result'), 'submit', p, { disabled: p.busy || game.verified !== undefined }) : null, game.won === false ? button(text(p, 'kit.progress.video-second-chance'), 'reward-retry', p, { disabled: p.busy || game.verified === undefined
            || game.rewarded.includes('retry') }) : null, game.won === true ? button(text(p, 'kit.progress.video-double-reward'), 'reward-double', p, { disabled: p.busy || !game.verified
            || game.rewarded.includes('double') }) : null, game.pendingReward ? h('p', { role: 'status' }, text(p, 'kit.progress.waiting-for-reward-confirmation')) : null) : null, h('div', { class: 'grid' }, ...p.levels.slice(0, 100).map((level) => h('article', { class: 'card' }, h('h3', {}, level.title), h('p', { class: 'stars' }, ...Array.from({ length: level.stars ?? 0 }, () => icon('star'))), button(text(p, 'kit.progress.start-level'), 'play', p, { disabled: !p.ready || p.busy || level.locked,
        payload: () => ({ key: level.key, n: level.n }),
        testid: `progress.play.${level.n}` })))), button(text(p, 'kit.progress.refresh-map'), 'levels', p, { ghost: true, disabled: !p.ready || p.busy }), button(text(p, 'kit.progress.all-time-leaderboard'), 'board', p, { ghost: true, disabled: !p.ready || p.busy }), outcome(p, p.result, 'progress.result'), details(p, p.result, 'progress.details'));
}
export const progress = component(progressView);
export function retentionView(p) {
    const stateText = (status) => status === 'completed' ? text(p, 'kit.progress.completed')
        : status === 'available' || status === 'active' ? text(p, 'kit.progress.available')
            : text(p, 'kit.progress.not-available-yet');
    return h('section', { 'data-testid': 'progress.retention', 'aria-busy': p.busy ?? false }, heading(p, text(p, 'kit.progress.tasks-and-rewards'), text(p, 'kit.progress.log-in-daily-and-complete-adventures')), h('div', { class: 'row' }, button(text(p, 'kit.progress.check-in'), 'login', p, { disabled: !p.ready || p.busy || p.loginSent }), button(text(p, 'kit.progress.level-map'), 'levels', p, { ghost: true }), button(text(p, 'kit.progress.refresh'), 'refresh', p, { ghost: true, disabled: !p.ready || p.busy })), p.retryClaim ? button(text(p, 'kit.progress.retry-claim'), 'retry-claim', p, { disabled: !p.ready || p.busy }) : null, p.pending ? h('p', { class: 'badge', role: 'status' }, text(p, 'kit.progress.action-accepted-waiting-for-reward-confirmation')) : null, h('div', { class: 'grid' }, ...p.tracks.slice(0, 20).map(track => h('article', {
        class: 'card', 'data-testid': `progress.track.${track.key}`
    }, track.dailyDays ? dailyRewardView({ ...p, trackKey: track.key, title: track.title,
        days: track.dailyDays, ready: p.ready === true && track.status !== 'unavailable' })
        : h('h3', {}, track.title), h('p', { class: 'badge' }, stateText(track.status)), track.endsAt ? h('p', { class: 'hint' }, text(p, 'kit.progress.ends'), h('time', { datetime: track.endsAt }, track.endsAt)) : null, ...(track.dailyDays ? [] : track.steps).slice(0, 100).map(step => h('div', { class: 'row' }, h('span', { 'aria-hidden': 'true' }, step.status === 'completed' ? icon('check') : step.status === 'locked' ? icon('lock') : icon('sparkle')), h('span', {}, step.title), h('span', { class: 'hint' }, stateText(step.status)), step.availableAt ? h('time', { datetime: step.availableAt }, step.availableAt) : null, ...step.conditions.slice(0, 16).map(condition => h('span', { class: 'badge' }, `${condition.value}/${condition.target}`)))), ...track.groups.slice(0, 100).map(group => h('p', { class: 'hint' }, icon(group.completed ? 'check' : 'sparkle'), group.title)), ...(track.dailyDays ? [] : track.rewards).slice(0, 100).map(reward => h('div', { class: 'row',
        'data-state': reward.status }, ...reward.items.slice(0, 50).map(item => h('span', { class: 'badge' }, `${item.name} ×${item.quantity}`)), reward.status === 'available' && reward.claimMode === 'manual'
        ? button(text(p, 'kit.progress.claim'), 'claim', p, {
            disabled: !p.ready || p.busy || p.retryClaim || track.status === 'unavailable',
            testid: `progress.claim.${reward.operationId}`,
            payload: () => ({ key: track.key, operationId: reward.operationId })
        })
        : h('span', { class: 'hint' }, reward.status === 'issued'
            ? text(p, 'kit.progress.submitted-for-grant')
            : reward.status === 'failed' ? text(p, 'kit.progress.grant-failed')
                : text(p, 'kit.progress.automatic-reward')))), button(text(p, 'kit.progress.claim-all'), 'claim-all', p, { ghost: true,
        disabled: !p.ready || p.busy || p.retryClaim || track.status === 'unavailable'
            || !track.rewards.some(r => r.status === 'available' && r.claimMode === 'manual'),
        payload: () => ({ key: track.key }), testid: `progress.claim-all.${track.key}` })))), outcome(p, p.result, 'progress.retention.result'), details(p, p.result, 'progress.retention.details'));
}
export const retention = component(retentionView, {});
nameComponents({ progress, retention });

import { readNotice } from '../features/progress-status.js';
import { icon as registryIcon } from '../icon.js';
import { component, h, text, button, dialog, windowDialog, assetImage } from '../features/shared.js';
import { kitMeter } from './game-widgets.js';
import { skinIcon } from '../icon.js';
import { nameComponents } from '../core.js';
const def = (render, options = {}) => Object.freeze({ ...component(render, options), view: render });
const num = (p, n) => n.toLocaleString(p.lang);
const starsCount = (p, n) => text(p, 'kit.progress.starsCount', { count: n, unit: text(p, 'kit.units.stars', { count: n }) });
const starsOf = (p, n, max) => text(p, 'kit.progress.starsOf', { count: n, stars: starsCount(p, n), max });
const star = (on, size) => registryIcon(on ? 'star-on' : 'star-off', size, { attributes: { 'data-on': on } });
const stars = (label, n, max = 3) => h('div', { class: 'level-stars', role: 'img',
    'aria-label': label }, ...Array.from({ length: max }, (_, i) => star(i < n, i === 1 ? 56 : 48)));
const bar = (value, target, label) => {
    const max = target > 0 ? target : 1;
    const now = Math.min(Math.max(value, 0), max);
    return h('progress', { max, value: now, 'aria-valuemin': 0, 'aria-valuemax': max, 'aria-valuenow': now,
        'aria-label': label || undefined });
};
const sr = (value) => h('span', { class: 'mp-sr-only' }, value);
const icon = (p, game) => h('span', { class: 'badge', role: 'img',
    'aria-label': text(p, 'kit.progress-windows.game-icon', { game: game }) }, game.charAt(0));
const rewards = (p, title, rows) => h('div', { class: 'card', 'data-part': 'rewards' }, h('p', { class: 'hint' }, title), ...rows.map((r) => h('div', { class: 'row' }, h('span', {}, r.label), h('span', { class: 'balance' }, typeof r.value === 'number' ? num(p, r.value) : r.value))));
const actions = (...children) => h('div', { class: 'window-actions' }, ...children);
const win = (p, part, title, ...children) => dialog(p, title, () => p.emitIntent('close'), h('div', { class: 'stack', 'data-part': part,
    'aria-busy': p.busy ?? false }, ...children));
const games = (p, names = []) => h('div', { class: 'row',
    'data-part': 'games' }, button(text(p, 'kit.progress-windows.manyplay-games'), 'games', p, { ghost: true }), ...names.slice(0, 6).map((n) => icon(p, n)));
const cross = (p, c, intent, ...extra) => c ? h('div', { class: 'card', 'data-part': 'cross-promo' }, icon(p, c.name), h('span', { class: 'badge' }, text(p, 'kit.progress-windows.manyplay-game')), h('b', {}, c.title), h('span', { class: 'hint' }, c.text), ...extra, button(c.cta, intent, p, { ghost: true, payload: () => ({ game: c.game }) })) : null;
const taskState = (t) => t.state ?? (t.value >= t.target ? 'claimable' : 'progress');
const taskRow = (p, t, o) => {
    const state = taskState(t);
    if (state === 'locked')
        return h('li', { class: 'row', 'data-part': 'task', 'data-state': state }, h('span', {}, t.title), h('span', { class: 'hint' }, `${num(p, t.value)} / ${num(p, t.target)}`), t.lock ? sr(t.lock.label) : null, t.lock ? h('span', { class: 'badge' }, t.lock.badge) : null);
    const claimable = state === 'claimable';
    const count = o.empty && t.value === 0 ? o.empty : `${num(p, t.value)} / ${num(p, t.target)}`;
    return h('li', { class: 'row', 'data-part': 'task', 'data-state': state }, h('span', {}, t.title), t.reward !== undefined ? h('span', { class: 'hint', 'aria-label': t.rewardLabel }, `${typeof t.reward === 'number' ? num(p, t.reward) : t.reward}`) : null, bar(t.value, t.target, o.bar), h('span', { class: 'hint' }, claimable && o.note && !o.claim ? `${count} · ${o.note}` : count), claimable && o.claim ? button(text(p, 'kit.progress-windows.claim'), 'claim', p, { payload: () => ({ id: t.id }),
        testid: `progress.claim.${t.id}` })
        : state === 'claimed' ? h('span', { class: 'hint' }, text(p, 'kit.progress-windows.claimed'))
            : state === 'done' ? h('span', { class: 'hint' }, text(p, 'kit.progress-windows.done'))
                : state === 'progress' && o.status ? h('span', { class: 'hint' }, text(p, 'kit.progress-windows.in-progress')) : null);
};
const list = (p, tasks, o = { claim: true }) => h('ul', { class: 'kv-list', 'data-part': 'tasks' }, ...tasks.slice(0, 50).map((t) => taskRow(p, t, o)));
const mapGlyph = (name, size, _width = 2) => registryIcon(`map-${name}`, size, { attributes: { 'data-glyph': name } });
const playGlyph = (size) => registryIcon('play', size);
const starRow = (n, label) => h('span', { class: 'map-stars',
    role: label ? 'img' : undefined, 'aria-label': label }, ...Array.from({ length: 3 }, (_, i) => star(i < n, 16)));
export const levelMap = def((p) => {
    const done = p.levels.filter((l) => l.state === 'done').length;
    const current = p.levels.find((l) => l.state === 'current');
    const firstLocked = p.levels.find((l) => l.state === 'locked');
    const off = !p.ready || p.busy === true;
    const start = (l) => () => {
        if (!off)
            p.emitIntent('play', { key: l.key, n: l.n });
    };
    const tile = (l) => {
        const name = text(p, 'kit.progress-windows.level', { n: l.n });
        if (l.state === 'done')
            return h('li', { 'data-state': l.state }, h('button', { type: 'button',
                class: 'map-tile', 'data-testid': `progress.play.${l.n}`, disabled: off,
                'aria-label': `${name}, ${starsOf(p, l.stars ?? 0, 3)}. ${text(p, 'kit.progress-windows.play-again')}`,
                onClick: start(l) }, h('span', { class: 'map-done' }, mapGlyph('check', 12, 3)), h('b', {}, num(p, l.n)), starRow(l.stars ?? 0)));
        if (l.state === 'current') {
            const goal = l.goal ? text(p, 'kit.progress-windows.goal', { goal: l.goal }) : null;
            return h('li', { 'data-state': l.state }, h('div', { class: 'map-current', 'data-orientation': 'portrait' }, h('div', { class: 'map-current-head' }, h('span', { class: 'map-num' }, num(p, l.n)), h('span', { class: 'stack' }, h('b', {}, name), goal ? h('span', { class: 'hint' }, goal) : null, starRow(0, starsOf(p, 0, 3))), h('span', { class: 'badge' }, text(p, 'kit.progress-windows.current'))), h('button', { type: 'button', 'data-testid': `progress.play.${l.n}`, disabled: off,
                onClick: start(l) }, playGlyph(20), text(p, 'kit.progress-windows.start-level'))), h('button', { type: 'button', class: 'map-tile map-tile-current', 'data-orientation': 'landscape',
                'data-testid': `progress.tile.${l.n}`, disabled: off,
                'aria-label': text(p, 'kit.progress-windows.level-current-start-level', { n: l.n }),
                onClick: start(l) }, h('span', { class: 'map-num' }, num(p, l.n)), h('span', { class: 'badge' }, playGlyph(10), text(p, 'kit.progress-windows.current'))));
        }
        const after = current && l === firstLocked ? current.n : undefined;
        return h('li', { 'data-state': l.state }, h('button', { type: 'button', class: 'map-tile',
            disabled: true, 'aria-label': after !== undefined
                ? text(p, 'kit.progress-windows.level-is-locked-clear-level', { n: l.n, after: after })
                : text(p, 'kit.progress-windows.level-is-locked', { n: l.n }) }, mapGlyph('lock', 24), h('b', {}, num(p, l.n)), after !== undefined ? h('span', { class: 'map-after' }, text(p, 'kit.progress-windows.after', { after: after })) : null));
    };
    const total = p.levels.length;
    return win(p, 'level-map', p.title ?? text(p, 'kit.progress-windows.levels'), h('div', { class: 'map-side' }, h('div', { class: 'card', 'data-part': 'map-summary' }, p.subtitle || p.description ? h('div', { class: 'stack map-mode' }, p.subtitle ? h('b', {}, p.subtitle) : null, p.description ? h('span', { class: 'hint' }, p.description) : null) : null, current?.goal ? h('span', { class: 'map-goal', 'data-orientation': 'landscape' }, text(p, 'kit.progress-windows.lv', { n: current.n, goal: current.goal })) : null, h('div', { class: 'row map-count', 'data-part': 'stars-total' }, star(true, 16), h('b', {}, num(p, p.starsTotal), ' ', h('span', { class: 'map-max' }, `/ ${num(p, p.starsMax)}`)), h('span', { class: 'hint', 'data-orientation': 'portrait' }, text(p, 'kit.progress-windows.cleared-of', { done: done, total: total })), h('span', { class: 'hint', 'data-orientation': 'landscape' }, text(p, 'kit.progress-windows.of', { done: done, total: total }))), bar(done, total, text(p, 'kit.progress-windows.levels-cleared'))), current ? h('button', { type: 'button', class: 'map-start', 'data-orientation': 'landscape',
        'data-testid': `progress.start.${current.n}`, disabled: off, onClick: start(current) }, playGlyph(20), text(p, 'kit.progress-windows.start-level-2', { n: current.n })) : null), h('ul', { class: 'grid tiles', 'data-part': 'levels', role: 'list', tabindex: 0,
        'aria-label': text(p, 'kit.progress-windows.level-list') }, ...p.levels.slice(0, 100).map(tile)));
}, { presentation: 'fullscreen', popupKind: 'content' });
const glyph = (name, size) => registryIcon(`win-${name}`, size, { attributes: { 'data-glyph': name } });
const winReward = (p, r) => {
    const picture = assetImage(p, r.art, { width: 32, height: 32 })
        ?? (r.icon && r.icon !== 'score' ? skinIcon(r.icon, 32) : null);
    return h('li', { class: 'row', 'data-part': 'reward' }, picture ? h('span', { 'data-part': 'reward-art' }, picture)
        : r.icon === 'score' ? h('span', { 'data-part': 'reward-icon' }, glyph('score', 20)) : null, h('span', { class: 'hint' }, r.label), h('b', { class: r.accent ? 'balance gold' : 'balance' }, typeof r.value === 'number' ? num(p, r.value) : r.value));
};
export const levelWin = def((p) => {
    const got = text(p, 'kit.progress.got', { stars: starsOf(p, p.stars, 3) });
    return win(p, 'level-win', text(p, 'kit.progress-windows.level-cleared', { level: p.level }), h('div', { class: 'card', 'data-part': 'win-stars' }, stars(got, p.stars), h('p', { class: 'hint', 'aria-hidden': 'true' }, text(p, 'kit.progress-windows.of-3-stars', { stars: p.stars }))), p.rewards.length ? h('div', { class: 'card', 'data-part': 'rewards' }, h('p', { class: 'hint' }, text(p, 'kit.progress-windows.level-reward')), h('ul', { class: 'kv-list' }, ...p.rewards.slice(0, 8).map((r) => winReward(p, r)))) : null, p.rank !== undefined ? h('button', { type: 'button', 'data-part': 'win-rank', disabled: p.busy,
        'data-testid': `${p.elementId}.leaderboard`,
        onClick: () => { if (!p.busy)
            p.emitIntent('leaderboard', { level: p.level }); } }, h('span', { 'data-part': 'reward-icon' }, glyph('leaderboard', 24)), h('span', { class: 'stack' }, h('b', {}, text(p, 'kit.progress-windows.you-are', { rank: p.rank })), h('span', { class: 'hint', 'data-orientation': 'portrait' }, text(p, 'kit.progress-windows.level-leaderboard')), h('span', { class: 'hint', 'data-orientation': 'landscape' }, text(p, 'kit.progress-windows.leaderboard'))), glyph('chevron', 20)) : null, actions(button(text(p, 'kit.progress-windows.next'), 'next', p), p.canDouble ? h('button', { type: 'button', 'data-variant': 'ghost', disabled: p.busy,
        'data-testid': `${p.elementId}.double`, onClick: () => { if (!p.busy)
            p.emitIntent('double'); } }, glyph('video', 20), text(p, 'kit.progress-windows.double-with-ad')) : null));
});
export const levelLose = def((p) => {
    const short = Math.max(0, p.target - p.score);
    const moves = Math.max(0, Math.trunc(p.stats?.moves ?? 0));
    const summary = p.summary ?? (p.stats ? text(p, 'kit.progress-windows.s', { seconds: Math.max(0, Math.trunc(p.stats.seconds)), moves: moves, pluralmoves: text(p, 'kit.units.moves', { count: moves }), moves1movemoves: moves === 1 ? 'move' : 'moves' }) : undefined);
    const lines = p.goalUnit === 'lines';
    const unit = lines
        ? text(p, 'kit.units.lines', { count: short })
        : text(p, 'kit.units.shortfallPoints', { count: short });
    const reason = p.reason === 'blocked' ? text(p, 'kit.progress-windows.no-room-for-pieces')
        : p.reason === 'time' ? text(p, 'kit.progress-windows.time-is-up') : text(p, 'kit.progress-windows.out-of-moves');
    return win(p, 'level-lose', text(p, 'kit.progress-windows.attempt-ended'), h('div', { class: 'stack', 'data-part': 'lose-main' }, h('p', { class: 'hint' }, text(p, 'kit.progress.goalNotReached', { reason, level: p.level })), h('div', { class: 'card', 'data-part': 'lose-result' }, h('div', { class: 'lose-values' }, h('div', {}, h('span', { class: 'hint' }, lines ? text(p, 'kit.progress-windows.lines') : text(p, 'kit.progress-windows.score')), h('b', { class: 'lose-score' }, num(p, p.score))), h('div', { class: 'lose-goal' }, h('span', { class: 'hint' }, text(p, 'kit.progress-windows.goal-2')), h('b', {}, h('span', { width: 16, height: 16, viewBox: '0 0 24 24', 'aria-hidden': 'true' }, registryIcon('progress-windows-level-lose-1', 16)), `${num(p, p.score)} / ${num(p, p.target)}`))), bar(p.score, p.target, text(p, 'kit.progress-windows.goal-progress')), h('div', { class: 'lose-notes' }, h('span', { class: 'lose-short' }, text(p, 'kit.progress-windows.short', { numpshort: num(p, short), unit: unit })), summary ? h('span', { class: 'hint' }, summary) : null))), actions(button(text(p, 'kit.progress-windows.play-again'), 'retry', p), p.canExtend ? h('button', { type: 'button', 'data-variant': 'ghost', disabled: p.busy,
        'data-testid': `${p.elementId}.extend`, onClick: () => { if (!p.busy)
            p.emitIntent('extend'); } }, glyph('video', 20), text(p, 'kit.progress-windows.30-seconds-with-ad')) : null, h('button', { type: 'button', 'data-variant': 'link', disabled: p.busy,
        'data-testid': `${p.elementId}.menu`, onClick: () => { if (!p.busy)
            p.emitIntent('menu'); } }, text(p, 'kit.progress-windows.main-menu'))));
});
const ORDINAL_RU = ['', 'Первая', 'Вторая', 'Третья', 'Четвёртая', 'Пятая', 'Шестая', 'Седьмая', 'Восьмая',
    'Девятая', 'Десятая'];
export const levelFail = def((p) => win(p, 'level-fail', text(p, 'kit.progress-windows.level-failed', { level: p.level }), h('p', { class: 'hint' }, text(p, 'kit.progress-windows.attempt-in-a-row', { attempts: ORDINAL_RU[p.attempts] ?? `${p.attempts}-я`, attempts2: p.attempts })), h('div', { class: 'split' }, actions(button(text(p, 'kit.progress-windows.try-again'), 'retry', p), button(text(p, 'kit.progress-windows.5-moves'), 'extra-moves', p, { ghost: true })), p.promo ? h('div', { class: 'stack' }, h('p', { class: 'hint' }, text(p, 'kit.progress-windows.or-take-a-break')), cross(p, p.promo, 'promo')) : null), actions(button(text(p, 'kit.progress-windows.menu'), 'menu', p, { ghost: true })), games(p, p.games)));
export const points = def((p) => win(p, 'points', text(p, 'kit.progress-windows.level-cleared', { level: p.level }), stars(starsOf(p, p.stars, 3), p.stars), h('div', { class: 'split' }, h('div', { class: 'stack center' }, h('p', { class: 'hint' }, text(p, 'kit.progress-windows.level-reward')), h('div', { class: 'balance gold' }, `+${num(p, p.reward)}`), p.bonus ? h('span', { class: 'badge' }, text(p, 'kit.progress-windows.points', { bonus: num(p, p.bonus) })) : null), h('div', { class: 'stack center' }, h('div', { class: 'balance' }, num(p, p.balance)), h('p', { class: 'hint' }, text(p, 'kit.progress-windows.manyplay-points')), h('p', { class: 'hint' }, text(p, 'kit.progress-windows.trade-for-rewards-in-other-games')), games(p, p.games))), actions(button(text(p, 'kit.progress-windows.next'), 'next', p), button(text(p, 'kit.progress-windows.what-points-buy'), 'rewards', p, { ghost: true }))));
const lineIcon = (name, size) => registryIcon(`quest-${name}`, size);
const taskIcon = (name, size) => (name ? skinIcon(`task-${name}`, size) ?? skinIcon(name, size) : null) ?? registryIcon('task-flag', size);
const pointStar = (size) => registryIcon('point-star', size, { attributes: { class: 'quest-star' } });
const count = (p, value, target, sep = ' / ') => `${num(p, Math.min(Math.max(value, 0), target))}${sep}${num(p, target)}`;
const rewardArt = (p, t, size) => (t.rewardIcon ? skinIcon(t.rewardIcon, size) : null)
    ?? assetImage(p, t.rewardIconUrl, { width: size, height: size });
const wordReward = (t) => typeof t.reward === 'string' && !t.rewardIcon && !t.rewardIconUrl;
const rewardContent = (p, t, size, star) => {
    if (t.reward === undefined)
        return [];
    const art = typeof t.reward === 'number' ? star ? pointStar(size) : null : rewardArt(p, t, size);
    return art ? [art, typeof t.reward === 'number' ? num(p, t.reward) : t.reward]
        : [typeof t.reward === 'number' ? num(p, t.reward) : t.reward];
};
const questRow = (p, t, barLabel) => {
    const state = taskState(t);
    const action = state === 'claimable' ? button(text(p, 'kit.progress-windows.claim'), 'claim', p, {
        payload: () => ({ id: t.id }), testid: `progress.claim.${t.id}`, className: 'quest-claim'
    })
        : state === 'claimed' || state === 'done' ? h('span', { class: 'quest-status' }, lineIcon('check', 16), state === 'claimed' ? text(p, 'kit.progress-windows.claimed') : text(p, 'kit.progress-windows.done'))
            : state === 'locked' ? h('span', { class: 'quest-pill', 'data-kind': 'lock',
                'aria-label': t.lock?.label }, lineIcon('lock', 16), t.lock?.badge ?? text(p, 'kit.progress-windows.locked'))
                : h('span', { class: 'quest-pill' }, text(p, 'kit.progress-windows.in-progress'));
    return h('li', { class: 'quest-row', 'data-part': 'task', 'data-state': state, 'data-icon': t.icon ?? 'flag' }, h('span', { class: 'quest-icon' }, taskIcon(t.icon, 24)), h('span', { class: 'quest-body' }, h('span', { class: 'quest-head' }, h('span', { class: 'quest-title' }, t.title), t.reward !== undefined ? h('span', { class: 'quest-reward', 'data-part': 'reward',
        role: t.rewardLabel ? 'img' : undefined, 'aria-label': t.rewardLabel }, ...rewardContent(p, t, 16, false)) : null), h('span', { class: 'quest-line' }, h('span', { class: 'quest-meter' }, kitMeter(t.value, t.target, { label: barLabel, valueText: `${num(p, t.value)} / ${num(p, t.target)}` }), h('span', { class: 'quest-count' }, count(p, t.value, t.target))), h('span', { class: 'quest-action' }, action))));
};
const boardRow = (p, t, barLabel) => {
    const state = taskState(t);
    const has = t.reward !== undefined;
    const action = state === 'claimable' ? button(text(p, 'kit.progress-windows.claim'), 'claim', p, {
        payload: () => ({ id: t.id }), testid: `progress.claim.${t.id}`, className: 'quest-claim',
        suffix: has ? h('span', { class: 'quest-claim-reward', 'aria-label': t.rewardLabel }, ...rewardContent(p, t, 12, true)) : undefined
    })
        : state === 'claimed' || state === 'done' ? h('span', { class: 'quest-status', role: 'img',
            'aria-label': state === 'claimed' ? text(p, 'kit.progress-windows.claimed') : text(p, 'kit.progress-windows.done') }, lineIcon('check', 22))
            : state === 'locked' ? h('span', { class: 'quest-pill', 'data-kind': 'lock', 'aria-label': t.lock?.label }, lineIcon('lock', 14), t.lock?.badge ?? text(p, 'kit.progress-windows.locked'))
                : has ? h('span', { class: 'quest-pill', 'data-kind': 'reward', role: t.rewardLabel ? 'img' : undefined,
                    'aria-label': t.rewardLabel }, ...rewardContent(p, t, 16, true))
                    : h('span', { class: 'quest-pill' }, text(p, 'kit.progress-windows.in-progress'));
    return h('li', { class: 'quest-row', 'data-part': 'task', 'data-state': state, 'data-icon': t.icon ?? 'flag' }, h('span', { class: 'quest-icon' }, taskIcon(t.icon, 22)), h('span', { class: 'quest-body' }, h('span', { class: 'quest-title' }, t.title), h('span', { class: 'quest-meter' }, kitMeter(t.value, t.target, { label: barLabel, valueText: `${num(p, t.value)} / ${num(p, t.target)}` }), h('span', { class: 'quest-count' }, count(p, t.value, t.target)))), h('span', { class: 'quest-action' }, action));
};
const track = (p, t) => {
    const label = t.label ?? text(p, 'kit.progress-windows.weekly-points');
    const stones = (t.milestones ?? []).slice(0, 6);
    return h('div', { class: 'quest-track', 'data-part': 'track' }, stones.length ? h('ul', { class: 'quest-chests' }, ...stones.map((m, i) => h('li', { 'data-open': m.open,
        'data-size': i === stones.length - 1 ? 'l' : i === 0 && stones.length > 2 ? 's' : 'm' }, h('span', { class: 'quest-chest' }, registryIcon('gift', 48), m.open ? h('span', { class: 'quest-chest-open', role: 'img', 'aria-label': text(p, 'kit.progress-windows.open') }, lineIcon('check', 10)) : null), h('span', { class: 'quest-chest-at' }, pointStar(12), num(p, m.at))))) : null, h('p', { class: 'quest-track-head' }, h('span', {}, label), h('b', {}, pointStar(14), `${num(p, t.value)} / ${num(p, t.target)}`)), kitMeter(t.value, t.target, { label, valueText: `${num(p, t.value)} / ${num(p, t.target)}` }));
};
const claimAll = (p, claimable) => claimable > 1
    ? h('div', { class: 'window-actions quest-footer' }, button(text(p, 'kit.progress-windows.claim-all'), 'claim-all', p, { suffix: h('span', { class: 'quest-count-badge' }, claimable) })) : null;
export const quests = def((p) => {
    const claimable = p.tasks.filter((t) => taskState(t) === 'claimable').length;
    const barLabel = p.taskBarLabel ?? text(p, 'kit.progress-windows.task-progress');
    const board = p.variant === 'board';
    const tasks = p.tasks.slice(0, 50);
    const timer = p.resets ? h('p', { class: 'quest-timer', role: 'timer', 'data-part': 'reset',
        'aria-label': p.resets.aria }, ...(board ? [p.resets.lead ? h('span', { class: 'quest-timer-lead' }, p.resets.lead) : null,
        h('b', { class: 'quest-timer-chip' }, lineIcon('clock', 14), p.resets.value)]
        : [lineIcon('clock', 16), p.resets.lead ? h('span', { class: 'quest-timer-lead' }, p.resets.lead) : null,
            h('b', {}, p.resets.value)])) : null;
    const help = p.help ? h('button', { type: 'button', class: 'quest-help', disabled: p.busy,
        'aria-label': text(p, 'kit.progress-windows.how-it-works'), 'data-testid': `${p.elementId}.help`,
        onClick: () => { if (!p.busy)
            p.emitIntent('help'); } }, lineIcon('info', 20)) : null;
    return windowDialog(p, { title: p.title ?? text(p, 'kit.progress-windows.tasks-and-rewards'), actions: help }, () => p.emitIntent('close'), h('div', { class: 'stack', 'data-part': 'quests', 'aria-busy': p.busy ?? false }, h('div', { class: 'quest-bar' }, p.periods.length > 1 ? h('div', { class: 'quest-tabs', role: 'tablist', 'aria-label': p.periodsLabel
            ?? text(p, 'kit.progress-windows.task-period') }, ...p.periods.slice(0, 4).map((x) => {
        const open = x.id === p.period;
        return h('button', { type: 'button', role: 'tab', class: 'quest-tab', 'aria-selected': String(open),
            'data-testid': `progress.period.${x.id}`, disabled: p.busy,
            onClick: () => { if (!p.busy && !open)
                p.emitIntent('period', { period: x.id }); } }, x.label, open || p.loading || p.error ? null : x.badge ? h('span', { class: 'quest-tab-badge' }, x.badge) : x.reward
            ? h('span', { class: 'quest-tab-dot', role: 'img', 'aria-label': text(p, 'kit.progress-windows.reward-waiting') })
            : null);
    })) : null, board || p.loading || p.error ? null : timer), p.loading || p.error ? null : board ? h('div', { class: 'quest-side' }, p.track ? track(p, p.track) : null, timer)
        : p.track ? track(p, p.track) : null, p.section ? h('h3', {}, p.section) : null, readNotice(p) ?? (tasks.length ? h('ul', { class: 'quest-list', 'data-part': 'tasks', 'data-variant': board ? 'board' : undefined,
        'data-reward': board && tasks.some(wordReward) ? 'text' : undefined,
        tabindex: 0, 'aria-label': p.section ?? text(p, 'kit.progress-windows.tasks') }, ...tasks.map((t) => (board ? boardRow : questRow)(p, t, barLabel)))
        : h('p', { class: 'empty', 'data-part': 'tasks-empty' }, text(p, 'kit.progress-windows.no-tasks-yet'))), p.loading || p.error ? null : claimAll(p, claimable)));
}, { presentation: 'fullscreen', popupKind: 'content' });
const achievementTile = (p, a) => {
    const target = a.target ?? 1;
    const value = a.value ?? 0;
    const body = [h('span', { class: 'ach-icon', 'data-icon': a.icon }, a.icon ? taskIcon(a.icon, 32)
            : lineIcon(a.state === 'claimed' ? 'trophy' : a.state === 'claimable' ? 'star' : 'chest', 32)),
        h('span', { class: 'ach-title' }, a.title)];
    if (a.state === 'claimable')
        return h('li', { class: 'ach-tile', 'data-part': 'achievement',
            'data-state': a.state }, h('button', { type: 'button', class: 'ach-claim', disabled: p.busy,
            'data-testid': `progress.claim.${a.id}`, 'aria-label': text(p, 'kit.progress-windows.claim-the-reward', { title: a.title }), onClick: () => { if (!p.busy)
                p.emitIntent('claim', { id: a.id }); } }, ...body, h('span', { class: 'ach-cta' }, text(p, 'kit.progress-windows.claim'))));
    const reached = a.state === 'progress' && a.target !== undefined && value >= target;
    return h('li', { class: 'ach-tile', 'data-part': 'achievement', 'data-state': reached ? 'done' : a.state }, ...body, a.state === 'claimed' ? h('span', { class: 'quest-status' }, lineIcon('check', 12), text(p, 'kit.progress-windows.claimed'))
        : reached ? h('span', { class: 'quest-status' }, lineIcon('check', 12), text(p, 'kit.progress-windows.done'))
            : h('span', { class: 'ach-meter' }, bar(value, target, text(p, 'kit.progress-windows.achievement-progress')), h('span', { class: 'ach-count' }, ...count(p, value, target, '/').split('/')
                .flatMap((part, i) => (i ? [h('wbr', {}), part] : [`${part}/`])))));
};
export const achievements = def((p) => {
    const claimable = p.items.filter((a) => a.state === 'claimable').length;
    return win(p, 'achievements', p.title ?? text(p, 'kit.progress-windows.achievements'), p.loading || p.error ? null : h('p', { class: 'ach-total', 'data-part': 'achievements-count', 'aria-label': text(p, 'kit.progress-windows.of-earned', { done: p.done, total: p.total }) }, h('span', { 'aria-hidden': 'true' }, text(p, 'kit.progress-windows.earned')), h('b', { 'aria-hidden': 'true' }, `${p.done} / ${p.total}`)), readNotice(p) ?? (p.items.length ? h('ul', { class: 'ach-grid', 'data-part': 'achievements-list', tabindex: 0,
        'aria-label': text(p, 'kit.progress-windows.all-achievements') }, ...p.items.slice(0, 60).map((a) => achievementTile(p, a)))
        : h('div', { class: 'empty', role: 'status', 'data-part': 'achievements-empty' }, registryIcon('task-trophy', 64), h('p', {}, text(p, 'kit.progress-windows.no-achievements-yet-keep-playing-and-they-will-show-up-here')))), p.loading || p.error ? null : claimAll(p, claimable));
}, { presentation: 'fullscreen', popupKind: 'content' });
export const crossQuest = def((p) => {
    const style = { bar: text(p, 'kit.progress-windows.progress'), note: text(p, 'kit.progress-windows.done-2') };
    const f = p.foreign;
    return win(p, 'cross-quest', text(p, 'kit.progress-windows.tasks'), h('div', { class: 'split' }, h('div', { class: 'stack' }, h('p', { class: 'hint' }, text(p, 'kit.progress-windows.today')), list(p, p.tasks, style)), h('div', { class: 'stack', 'data-part': 'foreign-task' }, h('p', { class: 'hint' }, text(p, 'kit.progress-windows.quest-from-another-game')), icon(p, f.name), h('b', {}, f.title), h('span', { class: 'hint' }, text(p, 'kit.progress-windows.the-reward-is-here-in', { game: p.game })), bar(f.value, f.target, text(p, 'kit.progress-windows.progress-in', { name: f.name })), h('span', { class: 'hint' }, `${num(p, f.value)} / ${num(p, f.target)}`), button(f.cta, 'play-game', p, { payload: () => ({ game: f.game }) }), list(p, p.after ?? [], style))));
}, { presentation: 'fullscreen', popupKind: 'content' });
export const season = def((p) => win(p, 'season', p.name, p.description ? h('p', { class: 'hint' }, p.description) : null, h('p', { class: 'hint' }, text(p, 'kit.progress-windows.days-left-in-the-season', { daysLeft: p.daysLeft, daysLeft2: text(p, 'kit.units.days', { count: p.daysLeft }) })), h('div', { class: 'split' }, h('div', { class: 'stack', 'data-part': 'track' }, h('p', { class: 'balance' }, text(p, 'kit.progress-windows.reward-track')), h('span', { class: 'hint' }, `${p.step} / ${p.steps}`), bar(p.step, p.steps, text(p, 'kit.progress-windows.season-reward-track')), h('ul', { class: 'row' }, ...Array.from({ length: Math.min(p.steps, 12) }, (_, i) => h('li', { 'aria-label': text(p, 'kit.progress-windows.reward', { i1: i + 1, step: i < p.step ? 'получена' : 'закрыта', stepclaimedlocked: i < p.step ? 'claimed' : 'locked' }) }, i + 1)))), h('div', { class: 'stack' }, h('p', { class: 'hint' }, text(p, 'kit.progress-windows.weekly-tasks')), h('ul', { class: 'kv-list', 'data-part': 'tasks' }, ...p.tasks.slice(0, 20).map((t) => h('li', { class: 'row', 'data-part': 'task' }, h('b', {}, t.game), icon(p, t.game), h('span', {}, t.title), h('span', { class: 'hint' }, t.value === 0 ? text(p, 'kit.progress-windows.not-started')
    : `${num(p, t.value)} / ${num(p, t.target)}`), t.reward !== undefined ? h('span', { class: 'hint' }, `${t.reward}`) : null))))), p.cta ? button(p.cta.label, 'play-game', p, { payload: () => ({ game: p.cta.game }) }) : null), { presentation: 'fullscreen', popupKind: 'content' });
export const contentEnd = def((p) => win(p, 'content-end', text(p, 'kit.progress-windows.all-levels-cleared', { total: p.total }), stars(starsCount(p, 3), 3), h('p', { class: 'hint' }, text(p, 'kit.progress.newLevels', { daysLeft: p.daysLeft, days: text(p, 'kit.units.days', { count: p.daysLeft }) })), h('div', { class: 'split' }, h('div', { class: 'stack center' }, h('p', { class: 'hint' }, text(p, 'kit.progress-windows.until-new-levels')), h('div', { class: 'balance' }, text(p, 'kit.progress-windows.d', { daysLeft: p.daysLeft }))), p.promo ? h('div', { class: 'stack' }, h('p', { class: 'hint' }, text(p, 'kit.progress-windows.while-you-wait')), cross(p, p.promo, 'promo', button(text(p, 'kit.progress-windows.progress-gift'), 'gift', p, { ghost: true }))) : null), actions(button(text(p, 'kit.progress-windows.close'), 'close', p, { ghost: true })), games(p, p.games)));
export const continueAs = def((p) => win(p, 'continue', text(p, 'kit.progress-windows.continue-as', { account: p.account }), h('div', { class: 'stack' }, h('div', { class: 'row' }, h('span', { class: 'badge' }, p.account.charAt(0).toUpperCase()), h('b', {}, p.account)), p.playing ? h('span', { class: 'badge' }, text(p, 'kit.progress-windows.already-playing', { playing: p.playing })) : null, h('span', { class: 'badge' }, text(p, 'kit.progress-windows.account-found')), h('p', { class: 'hint' }, text(p, 'kit.progress-windows.account-found-on-this-device-progress-will-be-saved-in-it-no', { game: p.game }))), actions(button(text(p, 'kit.progress-windows.continue'), 'continue', p), button(text(p, 'kit.progress-windows.other-account'), 'other', p, { ghost: true }), button(text(p, 'kit.progress-windows.play-as-guest'), 'guest', p, { ghost: true }))));
const milestoneTile = (p, m) => h('li', { class: 'card', 'data-state': m.state }, h('span', { class: 'balance' }, m.reward), h('span', { class: 'hint' }, m.label), m.state === 'claimed' ? h('span', { class: 'badge', role: 'img', 'aria-label': text(p, 'kit.progress-windows.claimed') })
    : m.state === 'locked' ? h('span', { class: 'badge', role: 'img', 'aria-label': text(p, 'kit.progress-windows.locked') })
        : h('button', { type: 'button', 'data-testid': `progress.claim.${m.id}`, disabled: p.busy,
            'aria-label': text(p, 'kit.progress-windows.claim-the-chest-for', { label: m.label }),
            onClick: () => p.emitIntent('claim', { id: m.id }) }, text(p, 'kit.progress-windows.claim'), h('span', { class: 'badge', 'aria-hidden': 'true' }, 1)));
export const endlessEntry = def((p) => win(p, 'endless-entry', text(p, 'kit.progress-windows.endless-run'), button(text(p, 'kit.progress-windows.back'), 'close', p, { ghost: true }), h('div', { class: 'split' }, h('div', { class: 'stack' }, h('span', { class: 'badge gold', 'aria-label': text(p, 'kit.progress-windows.trophies', { record: num(p, p.record) }) }, num(p, p.record)), h('b', {}, text(p, 'kit.progress-windows.endless-run-2')), h('p', { class: 'hint' }, text(p, 'kit.progress-windows.speed-grows-every-500-m')), h('div', { class: 'row' }, ...(p.perks ?? []).slice(0, 4).map((perk) => h('span', { class: 'badge' }, perk))), p.bestToday !== undefined ? h('p', { class: 'hint' }, `${text(p, 'kit.progress-windows.best-today')}: ${num(p, p.bestToday)}`) : null, p.nextAt !== undefined ? h('p', { class: 'hint' }, `${text(p, 'kit.progress-windows.next-2')}: ${num(p, p.nextAt)}`) : null, p.bestToday !== undefined && p.nextAt !== undefined
    ? bar(p.bestToday, p.nextAt, text(p, 'kit.progress-windows.progress-to-the-next-milestone')) : null, p.weekRank !== undefined ? h('p', { class: 'hint' }, `${text(p, 'kit.progress-windows.weekly-rank')}: #${p.weekRank}`) : null, p.rankHint ? h('p', { class: 'hint' }, p.rankHint) : null), h('div', { class: 'stack', 'data-part': 'milestones' }, h('b', {}, text(p, 'kit.progress-windows.milestones')), p.resetsIn ? h('span', { class: 'hint' }, text(p, 'kit.progress-windows.daily-reset', { resetsIn: p.resetsIn })) : null, h('ul', { class: 'grid tiles' }, ...p.milestones.slice(0, 8).map((m) => milestoneTile(p, m))))), h('p', { class: 'hint', 'aria-label': text(p, 'kit.progress-windows.runs-of', { runsLeft: p.runsLeft, runsMax: p.runsMax }) }, `${p.runsLeft} / ${p.runsMax} ${text(p, 'kit.units.runs', { count: p.runsMax })}`
    + `${p.nextRunIn ? text(p, 'kit.progress-windows.1-in', { nextRunIn: p.nextRunIn }) : ''}`), actions(button(text(p, 'kit.progress-windows.run'), 'run', p, { disabled: !p.ready || p.busy || p.runsLeft <= 0 }), p.canWatchAd ? button(text(p, 'kit.progress-windows.1-run-with-ad'), 'ad-run', p, { ghost: true }) : null)), { presentation: 'fullscreen' });
export const endlessHud = def((p) => h('section', { class: 'row',
    'data-part': 'endless-hud', 'aria-label': 'Endless' }, h('span', { class: 'badge' }, `${text(p, 'kit.progress-windows.record')} ${num(p, p.record)}`), button(text(p, 'kit.progress-windows.pause'), 'pause', p, { ghost: true }), h('b', { class: 'balance', role: 'status' }, num(p, p.score)), h('span', { class: 'badge', 'aria-label': text(p, 'kit.progress-windows.multiplier', { multiplier: p.multiplier }) }, `×${p.multiplier}`), p.fever ? h('span', { class: 'badge', 'aria-label': text(p, 'kit.progress-windows.fever') }, text(p, 'kit.progress-windows.fever')) : null, h('span', { class: 'badge' }, `+${num(p, p.coins)}`), h('span', { class: 'badge' }, `${p.revives} ${text(p, 'kit.progress-windows.revive')}`), p.shield !== undefined ? h('span', { class: 'badge', 'aria-label': text(p, 'kit.progress-windows.shield-active-left', { shield: p.shield }) }, text(p, 'kit.progress-windows.shield')) : null, p.waiting ? h('p', { class: 'hint' }, text(p, 'kit.progress-windows.tap-to-start')) : null, h('div', { class: 'stack' }, h('span', { class: 'hint' }, text(p, 'kit.progress-windows.next-chest')), h('span', { class: 'hint' }, num(p, p.chest.value)), h('span', { class: 'hint' }, `/ ${num(p, p.chest.target)}`), bar(p.chest.value, p.chest.target), h('ul', { class: 'row' }, ...(p.chest.stages ?? []).slice(0, 8).map((s, i) => h('li', { 'data-state': s,
    'aria-label': s === 'done' ? text(p, 'kit.progress-windows.stage-cleared', { i1: i + 1 })
        : s === 'next' ? text(p, 'kit.progress-windows.chest-next') : text(p, 'kit.progress-windows.chest-locked') }))))));
export const endlessRevive = def((p) => win(p, 'endless-revive', text(p, 'kit.progress-windows.continue-2'), p.countdown !== undefined ? h('div', { class: 'balance center', role: 'timer' }, p.countdown) : null, h('p', { class: 'hint' }, text(p, 'kit.progress-windows.keep-your-score-and-multiplier')), rewards(p, text(p, 'kit.progress-windows.run-2'), [{ label: text(p, 'kit.progress-windows.score-2'), value: p.score },
    { label: text(p, 'kit.progress-windows.multiplier-2'), value: `×${p.multiplier}` },
    { label: p.currencyLabel ?? text(p, 'kit.shared.currency'), value: `+${p.coins}` }]), actions(button(text(p, 'kit.progress-windows.revive-for-free'), 'revive-free', p, { disabled: !p.ready || p.busy || p.freeLeft <= 0,
    suffix: h('span', { class: 'hint' }, text(p, 'kit.progress-windows.left', { freeLeft: p.freeLeft })) }), button(text(p, 'kit.progress-windows.revive-for', { price: p.price }), 'revive-paid', p, { ghost: true }), button(text(p, 'kit.progress-windows.give-up'), 'give-up', p, { ghost: true }))));
export const endlessResult = def((p) => win(p, 'endless-result', text(p, 'kit.progress-windows.run-over'), h('div', { class: 'split' }, h('div', { class: 'stack center' }, p.newRecord ? h('span', { class: 'badge gold' }, text(p, 'kit.progress-windows.new-record')) : null, h('div', { class: 'balance' }, num(p, p.score)), p.previousRecord !== undefined ? h('p', { class: 'hint' }, `${text(p, 'kit.progress-windows.previous-record')} ${num(p, p.previousRecord)} ·`) : null, p.newRecord && p.previousRecord !== undefined ? h('span', { class: 'badge' }, `+${num(p, p.score - p.previousRecord)}`) : null), h('div', { class: 'stack' }, rewards(p, text(p, 'kit.progress-windows.summary'), [
    { label: p.currencyLabel ?? text(p, 'kit.shared.currency'), value: num(p, p.coins) },
    { label: text(p, 'kit.progress-windows.max-fever'), value: `×${p.maxFever}` },
    { label: text(p, 'kit.progress-windows.distance'), value: p.distance }
]), h('div', { class: 'card', 'data-part': 'milestones' }, h('b', {}, text(p, 'kit.progress-windows.milestones-reached')), h('span', { class: 'badge' }, text(p, 'kit.progress-windows.new', { newMilestones: p.newMilestones, newMilestones2: text(p, 'kit.units.new', { count: p.newMilestones }) })), h('ul', { class: 'row' }, ...(p.milestones ?? []).slice(0, 8).map((m) => h('li', { 'data-state': m.state,
    'aria-label': m.state === 'done' ? text(p, 'kit.progress-windows.cleared', { at: m.at })
        : m.state === 'reward' ? text(p, 'kit.progress-windows.reward-2', { at: m.at, reward: m.reward ?? '' })
            : text(p, 'kit.progress-windows.locked-2', { at: m.at }) }, m.at)))), p.rankBefore !== undefined && p.rankAfter !== undefined ? h('p', { class: 'hint' }, `${text(p, 'kit.progress-windows.weekly-rank-2')} #${p.rankBefore} → #${p.rankAfter}`) : null)), actions(button(p.canDouble ? text(p, 'kit.progress-windows.claim-2', { coins2: num(p, p.coins * 2) })
    : text(p, 'kit.progress-windows.claim'), p.canDouble ? 'claim-double' : 'claim', p), p.canDouble ? button(text(p, 'kit.progress-windows.claim'), 'claim', p, { ghost: true,
    suffix: h('span', { class: 'hint' }, num(p, p.coins)) }) : null, button(text(p, 'kit.progress-windows.again'), 'again', p, { ghost: true, disabled: p.runsLeft <= 0 })), h('p', { class: 'hint' }, text(p, 'kit.progress-windows.runs-left-today-of', { runsLeft: p.runsLeft, runsMax: p.runsMax }))));
export const PROGRESS_WINDOWS = Object.freeze({
    'level-map': levelMap, win: levelWin, lose: levelLose, 'level-fail': levelFail,
    points, quests, achievements, 'cross-quest': crossQuest, season, 'content-end': contentEnd, continue: continueAs,
    endless: endlessHud, 'endless-entry': endlessEntry, 'endless-revive': endlessRevive,
    'endless-result': endlessResult,
});
nameComponents({
    levelMap, levelWin, levelLose, levelFail, points, quests, achievements, crossQuest, season,
    contentEnd, continueAs, endlessEntry, endlessHud, endlessRevive, endlessResult,
});

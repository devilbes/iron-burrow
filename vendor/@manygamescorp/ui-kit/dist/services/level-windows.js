import { icon as registryIcon } from '../icon.js';
import { component, h, text, button, assetImage, windowDialog } from '../features/shared.js';
import { nameComponents } from '../core.js';
const defView = (render, options = {}) => Object.freeze({ ...component(render, options), view: render });
const num = (p, n) => n.toLocaleString(p.lang);
const actions = (...children) => h('div', { class: 'window-actions' }, ...children);
const toggle = (p, key, label, on) => h('div', { class: 'row', 'data-part': 'toggle' }, h('span', {}, label), h('button', { type: 'button', role: 'switch', 'aria-checked': String(on), 'aria-label': label,
    'data-testid': `${p.elementId}.${key}`, disabled: p.busy, 'data-variant': on ? undefined : 'ghost',
    onClick: () => { if (!p.busy)
        p.emitIntent('set', { key, value: !on }); } }, on ? text(p, 'kit.level-windows.on') : text(p, 'kit.level-windows.off')));
export const pause = defView((p) => {
    const title = p.title ?? text(p, 'kit.level-windows.pause');
    return windowDialog(p, { title }, () => p.emitIntent('close'), h('div', { class: 'stack', 'data-part': 'pause', 'aria-busy': p.busy ?? false }, h('div', { class: 'pause-art', 'data-part': 'pause-art', 'aria-hidden': 'true' }, registryIcon('level-pause', 64)), h('p', { class: 'hint' }, p.subtitle ?? text(p, 'kit.level-windows.game-paused')), p.sound !== undefined ? toggle(p, 'sound', text(p, 'kit.level-windows.sound'), p.sound) : null, p.music !== undefined ? toggle(p, 'music', text(p, 'kit.level-windows.music'), p.music) : null, actions(button(text(p, 'kit.level-windows.continue'), 'close', p), button(text(p, 'kit.level-windows.restart-level'), 'restart', p, { ghost: true }), button(text(p, 'kit.level-windows.main-menu'), 'menu', p, { ghost: true }))));
}, { presentation: 'fullscreen' });
const targetRow = (p, t) => {
    const max = t.target !== undefined && t.target > 0 ? t.target : undefined;
    const now = max === undefined ? 0 : Math.min(Math.max(t.value ?? 0, 0), max);
    return h('li', { class: 'row', 'data-part': 'goal-target' }, h('span', {}, t.label), max === undefined ? null : h('span', { class: 'stack' }, h('progress', { max, value: now, 'aria-valuemin': 0, 'aria-valuemax': max, 'aria-valuenow': now,
        'aria-label': t.label }), h('span', { class: 'hint' }, `${num(p, now)} / ${num(p, max)}`)));
};
const whole = (n) => n !== undefined && Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
const points = (p, n) => text(p, 'kit.level.points', { value: num(p, n), unit: text(p, 'kit.units.points', { count: n }) });
const secondsText = (p, n) => text(p, 'kit.level.seconds', { value: num(p, n), unit: text(p, 'kit.units.seconds', { count: n }) });
const clock = (n) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
const starGlyph = () => registryIcon('level-star', 16);
const clockGlyph = () => registryIcon('level-clock', 16);
const pauseGlyph = () => registryIcon('level-pause', 16);
const targetGlyph = () => registryIcon('level-target', 56);
const HOW_TO_GLYPHS = {
    move: () => registryIcon('level-windows--h-o-w_-t-o_-g-l-y-p-h-s-1', 24),
    lines: () => registryIcon('level-windows--h-o-w_-t-o_-g-l-y-p-h-s-2', 24),
    booster: () => registryIcon('level-windows--h-o-w_-t-o_-g-l-y-p-h-s-3', 24),
};
const chip = (part, glyph, value, label) => h('span', { class: 'goal-chip', 'data-part': part, role: 'img', 'aria-label': label }, glyph, h('span', { 'aria-hidden': 'true' }, value));
export const levelGoal = defView((p) => {
    const score = whole(p.score);
    const seconds = whole(p.seconds);
    const art = assetImage(p, p.art) ?? targetGlyph();
    const sentence = score !== undefined
        ? h('p', { 'data-part': 'goal' }, text(p, 'kit.level-windows.score'), h('b', { class: 'gold' }, points(p, score)), seconds !== undefined ? text(p, 'kit.level-windows.in') : null, seconds !== undefined ? h('b', {}, secondsText(p, seconds)) : null)
        : p.goal ? h('p', { 'data-part': 'goal' }, p.goal) : null;
    const chips = [score !== undefined ? chip('goal-score', starGlyph(), num(p, score), text(p, 'kit.level-windows.goal', { pointspscore: points(p, score) })) : null,
        seconds !== undefined ? chip('goal-time', clockGlyph(), clock(seconds), text(p, 'kit.level-windows.time', { secondsTextpseconds: secondsText(p, seconds) })) : null]
        .filter((c) => c !== null);
    const howTo = (p.howTo ?? []).filter((row) => row.text && HOW_TO_GLYPHS[row.icon]).slice(0, 4);
    return windowDialog(p, { title: p.title ?? text(p, 'kit.level-windows.level-objective') }, () => p.emitIntent('close'), h('div', { class: 'stack', 'data-part': 'level-goal', 'aria-busy': p.busy ?? false }, h('div', { 'data-part': 'goal-main' }, h('span', { class: 'goal-art', 'data-part': 'art' }, art), sentence, chips.length ? h('div', { class: 'goal-chips', 'data-part': 'goal-chips' }, ...chips) : null, p.targets?.length ? h('ul', { class: 'kv-list', 'data-part': 'targets',
        'aria-label': text(p, 'kit.level-windows.targets') }, ...p.targets.slice(0, 8).map((t) => targetRow(p, t)))
        : null), h('div', { 'data-part': 'goal-side' }, howTo.length ? h('div', { class: 'card', 'data-part': 'how-to' }, h('p', { class: 'hint' }, text(p, 'kit.level-windows.how-to-play')), h('ul', { role: 'list' }, ...howTo.map((row) => h('li', { 'data-part': 'how-to-row',
        'data-icon': row.icon }, h('span', { class: 'how-to-icon' }, HOW_TO_GLYPHS[row.icon]()), h('span', {}, row.text))))) : null, p.timerPaused ? h('p', { class: 'hint', 'data-part': 'goal-paused' }, pauseGlyph(), text(p, 'kit.level-windows.the-timer-is-paused-while-this-window-is-open'))
        : null, actions(button(text(p, 'kit.level-windows.got-it'), 'close', p)))));
}, { presentation: 'fullscreen' });
export const LEVEL_WINDOWS = Object.freeze({ pause, help: levelGoal });
nameComponents({ pause, levelGoal });

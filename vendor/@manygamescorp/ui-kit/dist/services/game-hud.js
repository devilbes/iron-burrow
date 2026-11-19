import { icon as registryIcon } from '../icon.js';
import { nameComponents } from '../core.js';
import { component, h, text } from '../features/shared.js';
function icon(name, size = 24) { return registryIcon(`hud-${name}`, size); }
const adBadge = () => registryIcon('hud-ad', 12);
const pct = (v) => Math.round(Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0)) * 100);
const fmt = (v) => typeof v === 'number' ? String(Math.trunc(v))
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : v;
const BOOSTER_MAX = 4;
function button(p, cls, label, intent, body, payload, disabled = false) {
    const off = disabled || p.busy === true;
    return h('button', { type: 'button', class: cls, disabled: off, 'aria-label': label,
        'data-testid': `${p.elementId}.${payload ? `${intent}.${String(payload['id'])}` : intent}`,
        onClick: () => { if (!off)
            p.emitIntent(intent, payload); } }, ...body);
}
function coinsView(p, label) {
    if (p.coins === undefined)
        return null;
    return h('div', { class: 'gh-coins', 'data-testid': `${p.elementId}.coins` }, registryIcon('coins', 24), h('span', { 'aria-label': label ? p.currencyLabel ?? text(p, 'kit.shared.currency') : undefined }, fmt(p.coins)));
}
function progressBar(p, extra = []) {
    return h('div', { class: 'gh-bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100,
        'aria-valuenow': pct(p.progress), 'aria-label': text(p, 'kit.game-hud.level-progress'),
        'data-testid': `${p.elementId}.progress` }, h('span', { class: 'gh-fill', 'data-pct': pct(p.progress) }), ...extra);
}
function boosterView(p, b) {
    const state = b.ad ? text(p, 'kit.game-hud.for-a-video')
        : text(p, 'kit.game-hud.left', { count0: b.count ?? 0 });
    return button(p, 'gh-btn gh-booster', `${text(p, 'kit.game-hud.booster')}: ${b.label}, ${state}`, 'booster', [icon(b.icon),
        b.ad ? adBadge() : h('span', { class: 'gh-badge gh-count', 'aria-hidden': 'true' }, String(Math.max(0, Math.min(99, b.count ?? 0))))], { id: b.id }, b.disabled === true);
}
export function gameHudView(p) {
    const variant = p.variant ?? 'level';
    const filled = variant !== 'level';
    const pause = button(p, 'gh-btn', text(p, 'kit.game-hud.pause'), 'pause', [icon(filled ? 'pause-fill' : 'pause')]);
    const settings = button(p, 'gh-btn', text(p, 'kit.game-hud.settings'), 'settings', [icon('settings')]);
    const skip = p.skip ? button(p, 'gh-btn gh-skip', text(p, 'kit.game-hud.skip-the-level-for-a-video'), 'skip', [icon(filled ? 'skip-fill' : 'skip'), variant === 'score' ? null : adBadge()], undefined, p.skip.disabled === true) : null;
    const boosters = (p.boosters ?? []).slice(0, BOOSTER_MAX).map((b) => boosterView(p, b));
    const levelLabel = text(p, 'kit.game-hud.level', { level: p.level });
    let top;
    if (variant === 'strip') {
        top = h('div', { class: 'gh-top', 'data-part': 'top' }, h('div', { class: 'gh-level-chip', role: 'img', 'aria-label': levelLabel }, h('span', { class: 'gh-level-num' }, String(p.level)), h('span', { class: 'gh-level-word' }, text(p, 'kit.game-hud.level-2'))), progressBar(p), h('span', { class: 'gh-pct' }, `${pct(p.progress)}%`), coinsView(p, true), settings);
    }
    else if (variant === 'score') {
        top = h('div', { class: 'gh-top', 'data-part': 'top' }, pause, h('div', { class: 'gh-score', 'data-testid': `${p.elementId}.score` }, h('span', { class: 'gh-score-label' }, text(p, 'kit.game-hud.score')), h('span', { class: 'gh-score-value' }, fmt(p.score ?? 0))), coinsView(p, false), settings);
    }
    else {
        top = h('div', { class: 'gh-top gh-panel', 'data-part': 'top' }, h('span', { class: 'gh-level-tag', role: 'img', 'aria-label': levelLabel }, text(p, 'kit.game-hud.lv', { level: p.level })), progressBar(p), h('span', { class: 'gh-pct' }, `${pct(p.progress)}%`), coinsView(p, false));
    }
    const panel = variant === 'score' ? h('div', { class: 'gh-top gh-panel gh-progress-panel',
        'data-part': 'progress' }, h('span', { class: 'gh-level-box', role: 'img', 'aria-label': levelLabel }, String(p.level)), progressBar(p, (p.checkpoints ?? []).slice(0, 8).map((c) => h('span', { role: 'img',
        class: `gh-cp gh-cp-${c.kind}`, 'data-at': pct(c.at),
        'aria-label': c.kind === 'passed' ? text(p, 'kit.game-hud.checkpoint-passed')
            : text(p, 'kit.game-hud.star-checkpoint') }, icon(c.kind === 'passed' ? 'check' : 'star', 16)))), h('span', { class: 'gh-pct' }, `${pct(p.progress)}%`), p.reward ? h('span', { class: 'gh-reward', role: 'img',
        'aria-label': text(p, 'kit.game-hud.level-reward') }, icon('reward')) : null) : null;
    const left = h('div', { class: 'gh-col gh-left', 'data-part': 'left' }, variant === 'score' ? null : pause, ...boosters);
    const right = h('div', { class: 'gh-col gh-right', 'data-part': 'right' }, variant === 'level' ? settings : null, skip, variant === 'strip' && skip ? h('span', { class: 'gh-caption' }, text(p, 'kit.game-hud.skip')) : null);
    const combo = (p.combo ?? 0) >= 2 ? h('div', { class: 'gh-combo', role: 'status',
        'data-testid': `${p.elementId}.combo` }, icon('combo', 16), h('span', {}, text(p, 'kit.game-hud.combo', { combo: p.combo ?? 0 }))) : null;
    const start = p.startHint ? h('button', { type: 'button', class: 'gh-start', disabled: p.busy,
        'data-testid': `${p.elementId}.start`, onClick: () => { if (!p.busy)
            p.emitIntent('start'); } }, h('span', { class: 'gh-start-icon', 'aria-hidden': 'true' }, icon('hand', 32)), h('span', { class: 'gh-start-title' }, variant === 'strip' ? text(p, 'kit.game-hud.touch-to-start') : text(p, 'kit.game-hud.tap-to-start')), h('span', { class: 'gh-start-hint' }, text(p, 'kit.game-hud.tap-anywhere-on-the-screen'))) : null;
    return h('section', { class: 'gh', 'data-variant': variant, 'data-testid': p.elementId,
        'aria-label': text(p, 'kit.game-hud.gameplay-hud') }, top, panel, left, right, combo, start);
}
function headPart(p) {
    const goal = p.goal;
    return h('header', { class: 'gs-head', 'data-part': 'head' }, h('div', { class: 'gs-chip', role: 'img', 'data-testid': `${p.elementId}.level`,
        'aria-label': text(p, 'kit.game-hud.level', { level: p.level }) }, icon('rocket', 24), h('b', {}, String(p.level))), goal ? h('div', { class: 'gs-chip gs-goal', 'data-testid': `${p.elementId}.goal` }, icon('star', 24), h('span', { class: 'gs-goal-label' }, goal.label ?? text(p, 'kit.game-hud.goal')), h('div', { class: 'gs-goal-body' }, h('b', {}, goal.text ?? `${goal.value} / ${goal.target}`), h('div', { class: 'gh-bar gs-goal-bar', role: 'progressbar', 'aria-valuemin': 0,
        'aria-valuemax': goal.target, 'aria-valuenow': goal.value,
        'aria-label': goal.label ?? text(p, 'kit.game-hud.level-goal-stars') }, h('span', { class: 'gh-fill',
        'data-pct': pct(goal.target > 0 ? goal.value / goal.target : 0) })))) : null, h('span', { class: 'gs-spacer' }), button(p, 'gs-round', text(p, 'kit.game-hud.level-goal-and-rules'), 'help', [icon('help')]), button(p, 'gs-round', text(p, 'kit.game-hud.pause'), 'pause', [icon('pause-fill')]));
}
function boostersPart(p, boosters) {
    return boosters.length ? h('div', { class: 'gs-boosters', role: 'group',
        'aria-label': text(p, 'kit.game-hud.boosters') }, ...boosters.slice(0, BOOSTER_MAX).map((b) => button(p, 'gs-booster', `${text(p, 'kit.game-hud.booster')} ${b.label}, ${text(p, 'kit.game-hud.left', { count0: b.count ?? 0 })}`, 'booster', [icon(b.icon), h('span', { class: 'gs-booster-name' }, b.caption ?? b.label),
        h('span', { class: 'gh-badge gs-count', 'aria-hidden': 'true' }, String(Math.max(0, Math.min(99, b.count ?? 0))))], { id: b.id }, b.disabled === true))) : null;
}
function videoPart(p, video) {
    return video ? button(p, 'gs-video', text(p, 'kit.game-hud.video-time'), 'reward-time', [
        icon('video'), h('span', {}, text(p, 'kit.game-hud.video-time'))
    ], undefined, !video.available) : null;
}
const movesWord = (p, n) => text(p, 'kit.units.moves', { count: n });
function scorePart(p, score, stats) {
    const seconds = stats?.seconds;
    const moves = stats?.moves;
    const chip = stats && (seconds !== undefined || moves !== undefined) ? h('div', { class: 'gs-stats',
        'data-part': 'stats', role: seconds === undefined ? undefined : 'timer' }, icon('clock', 16), h('span', {}, ...(seconds === undefined ? []
        : [h('b', { 'data-part': 'seconds' }, `${Math.max(0, Math.trunc(seconds))} ${text(p, 'kit.game-hud.s')}`)]), ...(seconds !== undefined && moves !== undefined ? [' · '] : []), ...(moves === undefined ? []
        : [h('b', { 'data-part': 'moves' }, String(Math.max(0, Math.trunc(moves)))),
            ` ${movesWord(p, Math.max(0, Math.trunc(moves)))}`]))) : null;
    return h('div', { class: 'gs-score', 'data-part': 'score' }, h('span', { class: 'gh-score-label' }, text(p, 'kit.game-hud.score')), h('span', { class: 'gs-score-value', 'data-testid': `${p.elementId}.score` }, fmt(score)), chip);
}
export function gameScreenView(p) {
    const size = Math.max(1, Math.min(12, Math.floor(p.board?.size ?? 8)));
    const cells = Array.from({ length: size * size }, (_, i) => h('span', { class: 'gs-cell',
        'data-tone': p.board?.tones?.[i] }));
    const tiles = (n) => Array.from({ length: Math.max(1, Math.min(5, n)) }, () => h('span', { class: 'gs-tile' }));
    return h('section', { class: 'gs', 'data-testid': p.elementId,
        'aria-label': text(p, 'kit.game-hud.gameplay-screen') }, headPart(p), scorePart(p, p.score, p.stats), h('div', { class: 'gs-board', role: 'img', 'data-size': size,
        'aria-label': text(p, 'kit.game-hud.game-board-by', { size: size }) }, ...cells), p.pieces?.length ? h('div', { class: 'gs-pieces', role: 'group',
        'aria-label': text(p, 'kit.game-hud.pieces-to-place') }, ...p.pieces.slice(0, 5).map((piece) => button(p, 'gs-piece', piece.label, 'piece', [
        h('span', { class: 'gs-shape', 'data-direction': piece.direction }, ...tiles(piece.cells))
    ], { id: piece.id }))) : null, boostersPart(p, p.boosters ?? []), videoPart(p, p.video));
}
export const GAME_FRAME_BOARD_SLOT = 'board';
export function gameFrameView(p) {
    return h('section', { class: 'gs gs-frame', 'data-testid': p.elementId,
        'aria-label': text(p, 'kit.game-hud.gameplay-screen') }, headPart(p), scorePart(p, p.score, p.stats), h('div', { class: 'gs-slot', 'data-part': 'board' }, h('slot', { name: GAME_FRAME_BOARD_SLOT })), boostersPart(p, p.boosters ?? []), videoPart(p, p.video));
}
export function gameScoreView(p) {
    return h('div', { class: 'gs-part', 'data-testid': p.elementId }, scorePart(p, p.score, p.stats));
}
export function gameHeadView(p) {
    return h('div', { class: 'gs-part', 'data-testid': p.elementId,
        'aria-label': text(p, 'kit.game-hud.level-state'), role: 'group' }, headPart(p));
}
export function gameBoostersView(p) {
    return h('div', { class: 'gs-part gs-controls', 'data-testid': p.elementId }, boostersPart(p, p.boosters), videoPart(p, p.video));
}
export const GAME_HUD_CONTEXT = 'game';
export const GAME_HUD_BOOSTER_PREFIX = 'booster.';
export const GAME_HUD_ITEMS = Object.freeze(['level', 'coins', 'score', 'combo', 'skip']);
export function gameHudFromRegistry(registry, label = (key) => key) {
    const items = registry.items().filter((i) => i.visible);
    const by = (id) => items.find((i) => i.id === id);
    const num = (v) => typeof v === 'number' && Number.isFinite(v)
        ? v : undefined;
    const level = by('level');
    const coins = by('coins')?.value;
    const score = by('score')?.value;
    const combo = num(by('combo')?.value);
    const skip = by('skip');
    return {
        level: num(level?.value) ?? 1, progress: level?.progress ?? 0,
        ...(coins === undefined ? {} : { coins }), ...(score === undefined ? {} : { score }),
        ...(combo === undefined ? {} : { combo }),
        boosters: items.filter((i) => i.id.startsWith(GAME_HUD_BOOSTER_PREFIX)).slice(0, BOOSTER_MAX)
            .map((i) => ({ id: i.id.slice(GAME_HUD_BOOSTER_PREFIX.length), icon: i.icon,
            label: label(i.label), ...(i.value === 'ad' ? { ad: true } : { count: num(i.value) ?? 0 }),
            ...(i.state === 'locked' ? { disabled: true } : {}) })),
        ...(skip ? { skip: { disabled: skip.state === 'locked' } } : {}),
    };
}
export function gameHudIntent(registry, rest) {
    return (intent, payload) => {
        const id = payload?.['id'];
        if (intent === 'booster' && typeof id === 'string') {
            registry.open(`${GAME_HUD_BOOSTER_PREFIX}${id}`);
        }
        else if (intent === 'skip')
            registry.open('skip');
        else
            rest(intent, payload);
    };
}
export const gameHud = component(gameHudView, {});
export const gameScreen = component(gameScreenView, {});
export const gameHead = component(gameHeadView, {});
export const gameBoosters = component(gameBoostersView, {});
export const gameScore = component(gameScoreView, {});
export const gameFrame = component(gameFrameView, {});
nameComponents({ gameHud, gameScreen, gameHead, gameBoosters, gameScore, gameFrame });

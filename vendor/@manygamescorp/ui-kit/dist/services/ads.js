import { icon as registryIcon } from '../icon.js';
import { icon } from '../icon.js';
import { nameComponents } from '../core.js';
import { component, h, text, heading, button, details, outcome, record, dialog } from '../features/shared.js';
import { formatRemaining } from './hud.js';
export function noLivesView(p) {
    return dialog(p, text(p, 'kit.ads.no-lives'), () => p.emitIntent('close'), h('div', { class: 'no-lives-status' }, h('div', { class: 'no-lives-heart', role: 'img', 'aria-label': text(p, 'kit.ads.lives-0') }, registryIcon('heart', 72), h('strong', {}, '0')), h('p', { class: 'no-lives-timer hint', role: 'timer' }, h('span', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
        'stroke-width': 2, 'stroke-linecap': 'round', 'aria-hidden': 'true' }, registryIcon('ads-no-lives-view-1', 16)), text(p, 'kit.ads.next-life-in'), formatRemaining(p.remainingMs))), h('p', { class: 'hint' }, text(p, 'kit.ads.lives-recover-automatically-you-can-refill-now')), h('div', { class: 'window-actions' }, button(text(p, 'kit.ads.refill-for', { refillPrice: p.refillPrice }), 'refill', p, { disabled: !p.ready || p.busy || !p.refillAvailable,
        suffix: p.refillIcon ? registryIcon(p.refillIcon, 20) : null }), button(text(p, 'kit.ads.1-life-with-an-ad'), 'reward-life', p, { ghost: true, disabled: !p.ready || p.busy || !p.videoAvailable })));
}
export const noLives = component(noLivesView, { presentation: 'fullscreen' });
const REASONS = {
    not_initialized: 'kit.ads.reasons-ads-are-still-loading',
    disabled: 'kit.ads.reasons-ads-are-turned-off-here',
    locked: 'kit.ads.reasons-ads-unlock-later',
    limit_placement: 'kit.ads.reasons-placement-limit-reached',
    limit_format: 'kit.ads.reasons-ads-are-limited-right-now',
    no_offer: 'kit.ads.reasons-no-reward-is-offered-right-now',
    advance_exhausted: 'kit.ads.reasons-wait-for-the-previous-reward',
    no_fill: 'kit.ads.reasons-no-video-is-available-right-now',
};
const reasonText = (p, reason) => {
    const line = REASONS[reason ?? ''];
    return line ? text(p, line) : text(p, 'kit.ads.unavailable');
};
const POINTS = {
    boost: ['boost', 'kit.ads.points-booster'],
    time: ['time', 'kit.ads.points-time'],
    double: ['double', 'kit.ads.points-reward-x2'],
    retry: ['retry', 'kit.ads.points-second-chance'],
};
export const ads = component((p) => {
    const result = record(p.result?.value);
    return h('section', { 'data-testid': 'ads' }, heading(p, text(p, 'kit.ads.one-more-chance'), text(p, 'kit.ads.watch-a-video-when-you-choose')), h('div', { class: 'card hero' }, h('div', { class: 'icon', 'aria-hidden': 'true' }, icon('hint')), h('h3', {}, text(p, 'kit.ads.need-a-hint')), button((p.quantity ?? 0) > 0 ? text(p, 'kit.ads.use-a-hint')
        : text(p, 'kit.ads.1-hint-for-watching-a-video'), 'watch', p, { disabled: !p.ready || p.busy || !p.available }), result['status'] === 'unavailable' ? h('p', { class: 'hint', role: 'status' }, text(p, 'kit.ads.video-is-unavailable-try-again-later')) : null, result['reward'] === 'granted' ? h('p', { class: 'success reward', role: 'status',
        'data-part': 'reward' }, text(p, result['effect'] === 'hint' || result['effect'] === undefined
        ? 'kit.ads.hint-received' : 'kit.ads.reward-received')) : null, result['reward'] === 'pending' ? h('p', { role: 'status' }, text(p, 'kit.ads.waiting-for-reward-confirmation')) : null), ...(p.points ?? []).map((point) => h('div', { class: 'card', 'data-testid': `ads.point.${point.id}` }, h('div', { class: 'icon', 'aria-hidden': 'true' }, icon(POINTS[point.id]?.[0] ?? 'video')), h('h3', {}, text(p, POINTS[point.id]?.[1] ?? point.id)), point.quantity > 0 ? h('p', { class: 'hint' }, text(p, 'kit.ads.owned', { quantity: point.quantity })) : null, point.available ? null : h('p', { class: 'hint', role: 'status' }, reasonText(p, point.reason)), button(point.quantity > 0 ? text(p, 'kit.ads.apply')
        : text(p, 'kit.ads.watch-a-video'), 'watch', p, { payload: () => ({ point: point.id }), testid: `ads.watch.${point.id}`,
        disabled: !p.ready || p.busy || !point.available }))), h('div', { class: 'card', 'data-testid': 'ads.interstitial' }, h('h3', {}, text(p, 'kit.ads.between-levels')), h('p', { class: 'hint' }, text(p, 'kit.ads.finish-the-round-a-short-ad-may-follow')), p.interstitial && !p.interstitial.available ? h('p', { class: 'hint', role: 'status',
        'data-testid': 'ads.interstitial.reason' }, reasonText(p, p.interstitial.reason)) : null, button(text(p, 'kit.ads.finish-round'), 'finish-round', p, { disabled: !p.ready || p.busy })), p.bannerAvailable ? h('div', { class: 'card', 'data-testid': 'ads.banner' }, h('h3', {}, text(p, 'kit.ads.banner')), button(p.bannerVisible ? text(p, 'kit.ads.hide-banner')
        : text(p, 'kit.ads.show-banner'), p.bannerVisible ? 'banner-hide' : 'banner-show', p, { disabled: !p.ready, ghost: true })) : null, outcome(p, p.result, 'ads.result'), details(p, p.decisions === undefined ? p.result : { result: p.result,
        decisions: p.decisions }, 'ads.details'));
});
export const videoUnavailable = component((p) => h('section', { class: 'hero' }, h('div', { class: 'icon', 'aria-hidden': 'true' }, icon('ad')), h('h2', {}, text(p, 'kit.ads.video-unavailable')), h('p', { class: 'hint' }, text(p, 'kit.ads.keep-playing-try-again-later')), button(text(p, 'kit.ads.continue'), 'close', p), details(p, p.reason)));
nameComponents({ noLives, ads, videoUnavailable });

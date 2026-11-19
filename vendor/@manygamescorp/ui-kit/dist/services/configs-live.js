import { nameComponents } from '../core.js';
import { component, h, assetImage, text, heading, button, details, outcome } from '../features/shared.js';
export const configsLiveView = (p) => h('section', { 'data-testid': 'cfglive' }, heading(p, text(p, 'kit.configs-live.live-settings'), p.headline), h('div', { class: 'card', 'data-testid': 'cfglive.segments' }, h('h3', {}, text(p, 'kit.configs-live.my-segment')), ...(p.segments.length ? p.segments.slice(0, 20).map((s) => h('p', { class: 'badge' }, s))
    : [h('p', { class: 'hint' }, text(p, 'kit.configs-live.you-are-in-no-segment'))])), h('div', { class: 'card', 'data-testid': 'cfglive.ab' }, h('h3', {}, text(p, 'kit.configs-live.a-b-tests')), ...(p.experiments.length ? p.experiments.slice(0, 20).map((e) => h('p', { class: 'badge' }, `${e.name} · ${e.group}`))
    : [h('p', { class: 'hint' }, text(p, 'kit.configs-live.no-active-experiments'))])), h('div', { class: 'card', 'data-testid': 'cfglive.difficulty' }, h('h3', {}, text(p, 'kit.configs-live.adaptive-difficulty')), h('p', { class: 'badge' }, p.difficulty.variant), ...p.difficulty.rows.slice(0, 20).map(([label, value]) => h('p', {}, `${label}: ${value}`))), h('div', { class: 'card', 'data-testid': 'cfglive.updates' }, h('h3', {}, text(p, 'kit.configs-live.updates-from-studio')), ...(p.updates.length ? p.updates.slice(0, 10).map(([when, scopes]) => h('p', {}, `${when} · ${scopes}`))
    : [h('p', { class: 'hint' }, text(p, 'kit.configs-live.edit-a-config-in-studio-and-it-shows-up-here'))])), p.asset ? h('div', { class: 'card', 'data-testid': 'cfglive.asset' }, h('h3', {}, text(p, 'kit.configs-live.app-file')), p.asset.state === 'ok' ? assetImage(p, p.asset.key, { loading: 'lazy',
    'data-testid': 'cfglive.asset.image' })
    : h('p', { class: 'hint' }, p.asset.state === 'checking' ? text(p, 'kit.configs-live.checking-the-file')
        : text(p, 'kit.configs-live.file-not-found-upload-it-in-studio-section-files'))) : null, button(text(p, 'kit.configs-live.refresh-settings'), 'refresh', p), outcome(p, p.last, 'cfglive'), details(p, p.debug, 'cfglive.details'));
export const configsLive = component(configsLiveView);
nameComponents({ configsLive });

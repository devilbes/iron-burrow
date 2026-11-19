import { icon } from '../icon.js';
import { nameComponents } from '../core.js';
import { component, h, text, heading, button, details, outcome } from '../features/shared.js';
const HAPTICS = ['light', 'medium', 'heavy'];
export const deviceScreen = component((p) => h('section', { 'data-testid': 'device' }, heading(p, text(p, 'kit.device.device'), text(p, 'kit.device.what-the-sdk-knows-about-the-device')), h('div', { class: 'card', 'data-testid': 'device.info' }, h('h3', {}, text(p, 'kit.device.device')), ...p.info.slice(0, 40).map((row) => h('p', {}, h('b', {}, `${row.label}: `), row.value))), h('div', { class: 'card', 'data-testid': 'device.capabilities' }, h('h3', {}, text(p, 'kit.device.capabilities')), ...p.capabilities.slice(0, 40).map((row) => h('p', {}, icon(row.value === 'true' ? 'check' : 'close'), ` ${row.label}`))), h('div', { class: 'card', 'data-testid': 'device.permissions' }, h('h3', {}, text(p, 'kit.device.permissions')), ...p.permissions.slice(0, 10).map((row) => h('div', { class: 'row' }, h('span', {}, `${row.name}: ${row.status}`), button(text(p, 'kit.device.request'), 'permission', p, { ghost: true,
    disabled: p.busy || !p.ready, testid: `device.request.${row.name}`,
    payload: () => ({ name: row.name }) })))), h('div', { class: 'card', 'data-testid': 'device.haptics' }, h('h3', {}, text(p, 'kit.device.haptics')), h('p', { class: 'hint' }, p.haptics ? text(p, 'kit.device.haptics-available')
    : text(p, 'kit.device.no-haptics-here')), h('div', { class: 'row' }, ...HAPTICS.map((style) => button(style, 'haptic', p, { disabled: !p.haptics || p.busy, testid: `device.haptic.${style}`,
    payload: () => ({ style }) })))), button(text(p, 'kit.device.refresh'), 'refresh', p, { ghost: true }), outcome(p, p.result, 'device.result'), details(p, p.debug ?? { info: p.info, capabilities: p.capabilities }, 'device.details')));
nameComponents({ deviceScreen });

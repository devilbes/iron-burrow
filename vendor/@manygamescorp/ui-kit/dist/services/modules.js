import { nameComponents } from '../core.js';
import { component, h, text, heading, button, details, outcome } from '../features/shared.js';
export const modulesScreen = component((p) => h('section', { 'data-testid': 'modules' }, heading(p, text(p, 'kit.modules.remote-modules'), text(p, 'kit.modules.cdn-modules-are-attached-by-module-json-without-rebuilding-t')), h('div', { class: 'grid' }, ...p.modules.slice(0, 50).map((item) => h('article', { class: 'card',
    'data-testid': `modules.item.${item.id}` }, h('h3', {}, item.id), h('p', { class: 'hint' }, `${item.source} · ${item.state}`), item.loadable ? button(text(p, 'kit.modules.load'), 'load', p, { disabled: !p.ready || p.busy,
    testid: `modules.load.${item.id}`, payload: () => ({ id: item.id }) }) : null))), p.modules.length ? null : h('p', { class: 'hint', 'data-testid': 'modules.empty' }, text(p, 'kit.modules.no-remote-modules-add-one-in-studio-sdk')), outcome(p, p.result, 'modules.result'), details(p, p.debug ?? { modules: p.modules }, 'modules.details')));
nameComponents({ modulesScreen });

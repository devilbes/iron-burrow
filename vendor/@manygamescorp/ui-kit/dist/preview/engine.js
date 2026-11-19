import { createUiZones } from '../zones.js';
import { validateModuleSettings } from './vendor/contracts-client/module-settings.js';
import { component, h } from '../features/shared.js';
import { createUiShell } from '../shell.js';
import { createHudRegistry } from '../services/hud-registry.js';
import { createBottomMenuRegistry } from '../services/bottommenu.js';
import { createTopBarRegistry } from '../services/topbar.js';
import { isAllowedImage, langOf } from './protocol.js';
import { NOT_PREVIEWED, PREVIEW_MODULES } from './modules.js';
import { PREVIEW_SCHEMAS, PREVIEW_UI } from './schemas.js';
const NOT_MODULES = (id) => id === 'core' || id === 'ui-kit'
    || id.startsWith('platform-') || id.startsWith('build-kit-');
const BASE = 'preview';
const gameScreen = component((p) => h('section', { 'data-testid': 'preview.screen' }, h('p', { class: 'hint' }, p.label)));
const placeholder = component((p) => h('section', { 'data-testid': 'preview.placeholder' }, h('p', { class: 'hint' }, p.label)));
const elementOf = (moduleId, name) => `${moduleId}.${name}`;
export function createPreviewEngine(container, pageOrigin) {
    const started = 1_800_000_000_000;
    const now = () => started + performance.now();
    const registries = {
        hud: createHudRegistry({ now }),
        bottomMenu: createBottomMenuRegistry({ now }),
        topBar: createTopBarRegistry({ now, contexts: { main: true, core: true } }),
    };
    const modules = new Map();
    const zones = createUiZones({ now, registries, modules: () => [...modules.values()] });
    const handles = new Map();
    let lang = 'en';
    const context = () => ({ lang, now: started,
        t: (ru, en) => (lang === 'ru' ? ru : en) });
    const records = new Map();
    const noWindows = new Map();
    const baseModule = {
        manifest: { id: BASE, ui: { contributes: [
                    { id: `${BASE}.main`, kind: 'route', component: 'game', title: 'main' },
                    { id: `${BASE}.core`, kind: 'route', component: 'game', title: 'core' },
                    { id: `${BASE}.placeholder`, kind: 'popup', component: 'placeholder', title: '·' },
                ] } },
        components: { game: gameScreen,
            placeholder: placeholder },
        props: (id, extra) => {
            if (id === `${BASE}.placeholder`) {
                return { label: context().t(`Нет превью для модуля ${String(extra?.['moduleId'])}`, `No preview for module ${String(extra?.['moduleId'])}`) };
            }
            return { label: id === `${BASE}.core` ? context().t('Игровой экран', 'Core screen')
                    : context().t('Главный экран', 'Main screen') };
        },
    };
    const shell = createUiShell(container, { zones, title: 'Preview', lang, home: `${BASE}.main`,
        hud: registries.hud, bottomMenu: registries.bottomMenu, topBar: registries.topBar,
        topBarContext: (id) => (id === `${BASE}.core` ? 'core' : 'main') });
    shell.add(baseModule);
    const record = (id) => {
        let found = records.get(id);
        if (!found) {
            found = { windowsSig: '', windows: noWindows, items: new Map() };
            records.set(id, found);
        }
        return found;
    };
    const sync = (owner, kind, specs) => {
        const rec = record(owner);
        const wanted = new Map(specs.map((spec) => [`${kind}:${spec.id}`, spec]));
        for (const key of [...rec.items.keys()]) {
            if (!key.startsWith(`${kind}:`) || wanted.has(key))
                continue;
            handles.get(`${owner}:${key}`)?.dispose();
            handles.delete(`${owner}:${key}`);
            rec.items.delete(key);
        }
        for (const [key, spec] of wanted) {
            const serial = JSON.stringify(spec);
            if (rec.items.get(key) === serial)
                continue;
            handles.get(`${owner}:${key}`)?.dispose();
            const zone = kind === 'topBar' ? zones.topbar : zones[kind];
            handles.set(`${owner}:${key}`, zone.register({ ...spec, moduleId: owner }));
            rec.items.set(key, serial);
        }
    };
    const syncParts = (owner, parts) => {
        sync(owner, 'hud', parts?.hud ?? []);
        sync(owner, 'bottomMenu', parts?.bottomMenu ?? []);
        sync(owner, 'topBar', parts?.topBar ?? []);
    };
    const windowModule = (moduleId, windows) => ({
        manifest: { id: moduleId, ui: { contributes: [...windows].map(([name, window]) => ({ id: elementOf(moduleId, name), kind: 'popup', component: name,
                    title: window.title })) } },
        components: Object.fromEntries([...windows].map(([name, window]) => [name, window.component])),
        props: (id) => ({ ...records.get(moduleId)?.windows
                .get(id.slice(moduleId.length + 1))?.props }),
    });
    const mockPlayer = () => ({ topBar: [
            { id: 'player', slot: 'left', icon: 'user', label: context().t('Гость', 'Guest'),
                value: 'Guest 4821', contexts: ['main', 'core'], order: 0 },
            { id: 'coins', slot: 'right', icon: 'coins', label: context().t('Монеты', 'Coins'),
                value: 1250, contexts: ['main', 'core'], order: 1 },
            { id: 'gems', slot: 'right', icon: 'gems', label: context().t('Кристаллы', 'Gems'),
                value: 30, contexts: ['main', 'core'], order: 2 },
        ] });
    let open;
    const closeWindow = () => { open?.ticket.close(); open = undefined; };
    const apply = (message) => {
        const issues = [];
        const issue = (code, moduleId) => {
            issues.push(moduleId === undefined ? { code } : { code, moduleId });
        };
        const nextLang = langOf(message.locale);
        const langChanged = nextLang !== lang;
        lang = nextLang;
        const kitSettings = validateModuleSettings(PREVIEW_SCHEMAS['ui-kit'], message.settings);
        if (!kitSettings.valid)
            issue('settings_invalid');
        const normalized = kitSettings.valid ? kitSettings.value
            : validateModuleSettings(PREVIEW_SCHEMAS['ui-kit'], {}).value;
        zones.configure(normalized);
        container.ownerDocument.documentElement.dataset['theme'] =
            typeof normalized['skin'] === 'string' ? normalized['skin'] : 'manyplay';
        container.ownerDocument.documentElement.dataset['orientation'] = message.orientation;
        const wanted = new Map();
        for (const input of message.modules) {
            const { id } = input;
            if (NOT_PREVIEWED(id) || NOT_MODULES(id))
                continue;
            const schema = PREVIEW_SCHEMAS[id];
            if (id === BASE || !schema) {
                issue('unknown_module', id);
                continue;
            }
            let result = validateModuleSettings(schema, input.settings);
            if (!result.valid || schema.fields.some(field => field.type === 'image'
                && input.settings[field.key] != null
                && !isAllowedImage(input.settings[field.key], pageOrigin))) {
                issue('settings_invalid', id);
                result = validateModuleSettings(schema, {});
            }
            modules.set(id, { id, settings: result.value,
                ...(PREVIEW_UI[id] ? { ui: PREVIEW_UI[id] } : {}) });
            const def = PREVIEW_MODULES[id];
            let parts;
            if (def) {
                try {
                    parts = def.parts(result.value, context());
                }
                catch {
                    issue('render_failed', id);
                }
            }
            wanted.set(id, parts ? { parts } : {});
        }
        for (const id of modules.keys())
            if (!wanted.has(id))
                modules.delete(id);
        const nextSig = (id) => JSON.stringify(Object.entries(wanted.get(id)?.parts?.windows ?? {}).map(([name, window]) => [name, window.title]));
        const touched = new Set();
        for (const [id, rec] of records) {
            if (id === BASE)
                continue;
            if (!wanted.has(id))
                touched.add(id);
            else if (rec.module && rec.windowsSig !== nextSig(id))
                touched.add(id);
        }
        const target = message.screen.startsWith('window:') ? message.screen.slice(7) : undefined;
        const windowKey = target === undefined ? undefined : message.screen;
        if (open && (open.key !== windowKey || touched.has(open.moduleId) || langChanged)) {
            closeWindow();
        }
        for (const id of touched) {
            const rec = records.get(id);
            if (rec.module)
                shell.remove(id);
            syncParts(id, undefined);
            if (!wanted.has(id))
                records.delete(id);
            else {
                delete rec.module;
                rec.windowsSig = '';
                rec.windows = noWindows;
            }
        }
        syncParts(BASE, mockPlayer());
        for (const [id, { parts }] of wanted) {
            const rec = record(id);
            const windows = new Map(Object.entries(parts?.windows ?? {}));
            rec.windows = windows;
            syncParts(id, parts);
            if (windows.size > 0 && !rec.module) {
                rec.module = windowModule(id, windows);
                rec.windowsSig = nextSig(id);
                shell.add(rec.module);
            }
        }
        shell.navigate(`${BASE}.${message.screen === 'core' ? 'core' : 'main'}`);
        if (target !== undefined && !open) {
            const found = wanted.get(target);
            const first = [...(records.get(target)?.windows.keys() ?? [])][0];
            if (!found)
                issue('unknown_module', target);
            else if (first !== undefined) {
                open = { key: message.screen, moduleId: target,
                    ticket: shell.open(elementOf(target, first)) };
            }
            else {
                open = { key: message.screen, moduleId: target,
                    ticket: shell.open(`${BASE}.placeholder`, { moduleId: target }) };
            }
        }
        shell.refresh({ lang });
        return issues;
    };
    return {
        apply(message) {
            try {
                return apply(message);
            }
            catch {
                return [{ code: 'render_failed' }];
            }
        },
        dispose() { shell.dispose(); zones.dispose(); },
    };
}

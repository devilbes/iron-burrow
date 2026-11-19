import { validateUiSlots } from '@manygamescorp/contracts-client/ui-slots';
import { validateModuleMechanic } from '@manygamescorp/contracts-client/module-mechanic';
import { validModuleActions } from '@manygamescorp/contracts-client/actions';
import { MODULE_LOADS, validModuleLoading } from '@manygamescorp/contracts-client/module-composition';
import { validateModuleSettingsSchema } from '@manygamescorp/contracts-client/module-settings';
import { SDKError } from './error.js';
import { isCoreEvent } from './event-names.js';
import { checkModuleTargets } from '@manygamescorp/contracts-client/module-targets';
export const UI_SLOTS = Object.freeze([
    'topBar.left', 'topBar.center', 'topBar.right', 'leftHandle', 'rightHandle',
    'bottomBar.left', 'bottomBar.center', 'bottomBar.right', 'screen', 'overlay', 'system', 'reward',
    'settings',
]);
const defined = new WeakSet();
export function defineModule(definition) {
    if (isObject(definition) && defined.has(definition))
        return definition;
    const problems = [];
    let copy;
    const hooks = {};
    if (!isObject(definition)) {
        problems.push('definition must be an object');
    }
    else {
        try {
            copy = structuredClone(definition.manifest);
        }
        catch (_err) {
            problems.push('manifest must be plain JSON data');
        }
        if (problems.length === 0)
            checkManifest(copy, problems);
        for (const hook of HOOKS) {
            const fn = definition[hook];
            hooks[hook] = fn;
            if (typeof fn === 'function')
                continue;
            if (hook === 'init' || hook === 'api')
                problems.push(`${hook} must be a function`);
            else if (fn !== undefined)
                problems.push(`${hook} must be a function when set`);
        }
    }
    if (problems.length > 0) {
        const id = isObject(copy) && typeof copy.id === 'string' ? copy.id : undefined;
        const label = id === undefined ? '' : ` ${quote(id)}`;
        throw new SDKError('SDK_MODULE_MANIFEST_INVALID', {
            message: `module${label} is invalid: ${problems.join('; ')}`,
            details: { problems },
            ...(id === undefined ? {} : { module: id }),
        });
    }
    const result = { manifest: deepFreeze(copy) };
    for (const hook of HOOKS) {
        const fn = hooks[hook];
        if (typeof fn === 'function')
            result[hook] = fn.bind(definition);
    }
    Object.freeze(result);
    defined.add(result);
    return result;
}
const HOOKS = ['init', 'api', 'start', 'stop', 'save', 'dispose'];
export function trackWrites(http) {
    const writes = new Set();
    return Object.freeze({
        http: Object.freeze({
            service: http.service,
            baseUrl: http.baseUrl,
            request(spec) {
                const sent = http.request(spec);
                if (spec.method !== 'GET' && spec.method !== 'HEAD') {
                    writes.add(sent);
                    const done = () => { writes.delete(sent); };
                    sent.then(done, done);
                }
                return sent;
            },
        }),
        async settle(signal) {
            if (signal?.aborted || writes.size === 0)
                return;
            await new Promise((resolve) => {
                const done = () => { signal?.removeEventListener('abort', done); resolve(); };
                signal?.addEventListener('abort', done, { once: true });
                void Promise.allSettled([...writes]).then(done);
            });
        },
    });
}
const KINDS = ['service', 'ui', 'sink', 'adapter', 'game', 'skin'];
const LOADS = MODULE_LOADS;
const SOURCES = ['local', 'remote'];
const PERMISSIONS = [
    'modules', 'storage', 'windows', 'actions', 'screens', 'analytics', 'poller', 'platform', 'secure:none',
    'device:info', 'device:haptics', 'device:geo', 'device:permissions', 'device:tracking',
    'device:clipboard-read',
];
const MAX_TEXT = 256;
const SEGMENT = '[a-z][a-z0-9]*(?:-[a-z0-9]+)*';
const MODULE_ID = new RegExp(`^${SEGMENT}(?:\\.${SEGMENT})*$`);
const CAPABILITY = new RegExp(`^${SEGMENT}(?:\\.${SEGMENT})*@(?:0|[1-9][0-9]*)$`);
const PERMISSION_SCOPED = new RegExp(`^http:${SEGMENT}$`);
export const CORE_HTTP_SERVICES = Object.freeze(['auth', 'configs']);
const EVENT_EMIT = new RegExp(`^${SEGMENT}(?::${SEGMENT}){2}$`);
const EVENT_LISTEN = new RegExp(`^(?:${SEGMENT}|\\*)(?::(?:${SEGMENT}|\\*)){2}$`);
const SEMVER = /^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isText(value) {
    return typeof value === 'string' && value.trim() !== '' && value.length <= MAX_TEXT;
}
function quote(value) {
    return JSON.stringify(value.length > 64 ? `${value.slice(0, 64)}…` : value);
}
function checkManifest(manifest, problems) {
    if (!isObject(manifest)) {
        problems.push('manifest must be an object');
        return;
    }
    const m = manifest;
    problems.push(...validateModuleMechanic(m).map(key => `manifest.${key} is invalid`));
    if (m.actions !== undefined && !validModuleActions(m.actions))
        problems.push('manifest.actions.callable is invalid');
    if (m.settings !== undefined && validateModuleSettingsSchema(m.settings).length)
        problems.push('manifest.settings is invalid');
    if (m.selection !== undefined && !['required', 'optional'].includes(m.selection))
        problems.push('manifest.selection is invalid');
    if (m.status !== undefined && !['ready', 'beta', 'soon'].includes(m.status))
        problems.push('manifest.status is invalid');
    if (typeof m.id !== 'string' || m.id.length > 64 || !MODULE_ID.test(m.id)) {
        problems.push('manifest.id must be a module id like "inventory" or "ui.shop"');
    }
    else if (m.id === 'core' || m.id.startsWith('core.')) {
        problems.push('manifest.id must not use the reserved core namespace');
    }
    if (typeof m.version !== 'string' || m.version.length > 64 || !SEMVER.test(m.version)) {
        problems.push('manifest.version must be semver');
    }
    if (typeof m.kind !== 'string' || !KINDS.includes(m.kind)) {
        problems.push(`manifest.kind must be one of ${KINDS.join(', ')}`);
    }
    if (m.compat !== undefined || m.kind === 'skin') {
        if (!isObject(m.compat) || !isText(m.compat['ui-kit'])
            || Object.keys(m.compat).some((key) => key !== 'ui-kit')) {
            problems.push('manifest.compat must be { "ui-kit": <version range> }');
        }
    }
    if (!isObject(m.engines) || !isText(m.engines.core)) {
        problems.push('manifest.engines.core must be a version range');
    }
    else if (m.engines.adapter !== undefined && !isText(m.engines.adapter)) {
        problems.push('manifest.engines.adapter must be a version range');
    }
    const deps = new Set();
    for (const key of ['requires', 'optional']) {
        const value = m[key];
        if (value === undefined)
            continue;
        if (!isObject(value)) {
            problems.push(`manifest.${key} must be an object of module id → version range`);
            continue;
        }
        for (const [dep, range] of Object.entries(value)) {
            if (!MODULE_ID.test(dep) || !isText(range)) {
                problems.push(`manifest.${key}.${quote(dep)} must map a module id to a version range`);
            }
            else if (dep === m.id) {
                problems.push(`manifest.${key} must not list the module itself`);
            }
            else if (deps.has(dep)) {
                problems.push(`manifest.optional.${quote(dep)} is already in requires`);
            }
            deps.add(dep);
        }
    }
    checkList(m.provides, 'provides', CAPABILITY, problems);
    checkList(m.consumes, 'consumes', CAPABILITY, problems);
    if (m.sdk !== undefined) {
        if (!isObject(m.sdk) || !Array.isArray(m.sdk.uses)) {
            problems.push('manifest.sdk must contain a uses array');
        }
        else {
            checkList(m.sdk.uses, 'sdk.uses', MODULE_ID, problems);
            if (m.kind !== 'game')
                problems.push('manifest.sdk.uses requires kind game');
        }
    }
    if (!Array.isArray(m.permissions)) {
        problems.push('manifest.permissions must be an array');
    }
    else {
        m.permissions.forEach((p, i) => {
            if (typeof p !== 'string' || !(PERMISSIONS.includes(p) || PERMISSION_SCOPED.test(p))) {
                problems.push(`manifest.permissions[${i}] is not a known permission`);
            }
            else if (p.startsWith('http:') && CORE_HTTP_SERVICES.includes(p.slice(5))) {
                problems.push(`manifest.permissions[${i}] targets a service owned by core`);
            }
        });
    }
    if (!isObject(m.events)) {
        problems.push('manifest.events must be an object with emits');
    }
    else {
        if (m.events.emits === undefined)
            problems.push('manifest.events.emits is required');
        checkList(m.events.emits, 'events.emits', EVENT_EMIT, problems);
        checkList(m.events.listens, 'events.listens', new RegExp(`(?:${EVENT_LISTEN.source})|(?:^sdk:realtime:(?:status|transport):changed$)|(?:^realtime:[a-z][a-z0-9_]*(?:\\.[a-z0-9_:-]+)+$)`), problems);
        checkList(m.events.handles, 'events.handles', EVENT_EMIT, problems);
        for (const operation of ['emits', 'handles']) {
            const names = m.events[operation];
            if (Array.isArray(names) && names.some((name) => typeof name === 'string'
                && (isCoreEvent(name) || (name.startsWith('realtime:') && m.id !== 'realtime')))) {
                problems.push(`manifest.events.${operation} must not use reserved core event domains`);
            }
        }
    }
    if (m.realtime !== undefined) {
        if (!isObject(m.realtime) || !Array.isArray(m.realtime.handles)
            || m.realtime.handles.length > 32 || m.realtime.handles.some((type) => typeof type !== 'string' || type.length > 128
            || !/^[a-z][a-z0-9_]*(?:\.[a-z0-9_:-]+)+$/.test(type)
            || !isObject(m.events) || !Array.isArray(m.events.listens)
            || !m.events.listens.includes(`realtime:${type}`))) {
            problems.push('manifest.realtime.handles requires exact events.listens declarations');
        }
    }
    if (!validModuleLoading(m)) {
        problems.push(`manifest.load must be one of ${LOADS.join(', ')}`);
    }
    if (m.critical !== undefined && typeof m.critical !== 'boolean') {
        problems.push('manifest.critical must be a boolean');
    }
    if (m.filters !== undefined)
        problems.push('manifest.filters is not supported');
    if (m.source !== undefined && (typeof m.source !== 'string' || !SOURCES.includes(m.source))) {
        problems.push(`manifest.source must be one of ${SOURCES.join(', ')}`);
    }
    if (m.nativePlugins !== undefined) {
        if (!Array.isArray(m.nativePlugins) || !m.nativePlugins.every(isText)) {
            problems.push('manifest.nativePlugins must be an array of plugin names');
        }
    }
    problems.push(...checkModuleTargets(m.targets, m.stores).map((issue) => `manifest.${issue}`));
    if (m.ui !== undefined)
        checkUi(m.ui, typeof m.id === 'string' ? m.id : '', problems, m.settings);
    if (!isText(m.entry))
        problems.push('manifest.entry must be a path or URL');
}
const UI_KINDS = ['component', 'route', 'popup', 'window', 'hud'];
const UI_ICON = /^[a-z][a-z0-9-]{0,31}$/;
const MAX_CONTRIBUTIONS = 32;
function checkUi(ui, owner, problems, settings) {
    if (isObject(ui) && ui.slots !== undefined) {
        problems.push(...validateUiSlots({ slots: ui.slots }, settings));
    }
    if (!isObject(ui)
        || (ui.contributes === undefined && ui.slots === undefined && ui.windows === undefined)
        || (ui.contributes !== undefined && (!Array.isArray(ui.contributes)
            || ui.contributes.length > MAX_CONTRIBUTIONS))
        || Object.keys(ui).some((key) => !['contributes', 'slots', 'windows'].includes(key))) {
        problems.push(`manifest.ui must be an object containing contributes/slots/windows arrays with at most ${MAX_CONTRIBUTIONS} entries`);
        return;
    }
    if (ui.windows !== undefined) {
        if (!Array.isArray(ui.windows) || ui.windows.length > MAX_CONTRIBUTIONS) {
            problems.push(`manifest.ui.windows must be an array with at most ${MAX_CONTRIBUTIONS} entries`);
        }
        else {
            checkList(ui.windows, 'ui.windows', new RegExp(`^window:${SEGMENT}(?:\\.${SEGMENT})*:${SEGMENT}(?:\\.${SEGMENT})*$`), problems);
        }
    }
    const seen = new Set();
    ui.contributes?.forEach((item, i) => {
        const at = `manifest.ui.contributes[${i}]`;
        if (!isObject(item)) {
            problems.push(`${at} must be an object`);
            return;
        }
        const unknown = Object.keys(item).filter((key) => !['id', 'kind', 'slot', 'component', 'title',
            'icon', 'order', 'requiredServices', 'popupKind'].includes(key));
        if (unknown.length > 0)
            problems.push(`${at} has unknown fields`);
        if (typeof item.id !== 'string' || item.id.length > 64 || !MODULE_ID.test(item.id)
            || !item.id.startsWith(`${owner}.`)) {
            problems.push(`${at}.id must be "<module id>.<name>"`);
        }
        else if (seen.has(item.id)) {
            problems.push(`${at}.id is a duplicate`);
        }
        else
            seen.add(item.id);
        const kind = typeof item.kind === 'string' && UI_KINDS.includes(item.kind) ? item.kind : undefined;
        if (!kind)
            problems.push(`${at}.kind must be one of ${UI_KINDS.join(', ')}`);
        const slot = item.slot;
        if (slot !== undefined && (typeof slot !== 'string'
            || !UI_SLOTS.includes(slot))) {
            problems.push(`${at}.slot must be one of ${UI_SLOTS.join(', ')}`);
        }
        else if ((kind === 'hud' || kind === 'component') && slot === undefined) {
            problems.push(`${at}.slot is required for ${kind}`);
        }
        else if (kind === 'route' && slot !== undefined && slot !== 'screen') {
            problems.push(`${at}.slot of a route must be screen`);
        }
        else if ((kind === 'popup' || kind === 'window') && slot !== undefined
            && slot !== 'overlay' && slot !== 'system' && slot !== 'reward') {
            problems.push(`${at}.slot of a ${kind} must be overlay, system or reward`);
        }
        else if ((kind === 'hud' || kind === 'component')
            && (slot === 'screen' || slot === 'overlay' || slot === 'system' || slot === 'reward')) {
            problems.push(`${at}.slot of a ${kind} must be a bar, a handle or settings`);
        }
        if (typeof item.component !== 'string' || item.component.length > 64
            || !MODULE_ID.test(item.component)) {
            problems.push(`${at}.component must be a component id`);
        }
        if (item.title !== undefined && !isText(item.title))
            problems.push(`${at}.title must be text`);
        if (item.icon !== undefined && (typeof item.icon !== 'string' || !UI_ICON.test(item.icon))) {
            problems.push(`${at}.icon must be an icon name`);
        }
        if (item.order !== undefined && (!Number.isSafeInteger(item.order)
            || Math.abs(item.order) > 10_000)) {
            problems.push(`${at}.order must be an integer within ±10000`);
        }
        if (item.popupKind !== undefined && (typeof item.popupKind !== 'string'
            || !['info', 'content', 'fullscreen'].includes(item.popupKind))) {
            problems.push(`${at}.popupKind must be info, content or fullscreen`);
        }
        checkList(item.requiredServices, `ui.contributes[${i}].requiredServices`, MODULE_ID, problems);
    });
}
function checkList(value, name, format, problems) {
    if (value === undefined)
        return;
    if (!Array.isArray(value)) {
        problems.push(`manifest.${name} must be an array`);
        return;
    }
    const seen = new Set();
    value.forEach((item, i) => {
        if (typeof item !== 'string' || item.length > MAX_TEXT || !format.test(item)) {
            problems.push(`manifest.${name}[${i}] has an invalid format`);
        }
        else if (seen.has(item)) {
            problems.push(`manifest.${name}[${i}] is a duplicate`);
        }
        if (typeof item === 'string')
            seen.add(item);
    });
}
function deepFreeze(value) {
    if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
        Object.freeze(value);
        for (const child of Object.values(value))
            deepFreeze(child);
    }
    return value;
}

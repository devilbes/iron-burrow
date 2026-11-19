import { supportsBuild, checkModuleTargets } from './module-targets.js';
export const MAX_COMPOSITION_MODULES = 256;
const SEGMENT = '[a-z][a-z0-9]*(?:-[a-z0-9]+)*';
const MODULE_ID = new RegExp(`^${SEGMENT}(?:\\.${SEGMENT})*$`);
const PACKAGE = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
const NUMBER = '(?:0|[1-9][0-9]*)';
const IDENT = '(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)';
const VERSION = new RegExp(`^(${NUMBER})\\.(${NUMBER})\\.(${NUMBER})(?:-(${IDENT}(?:\\.${IDENT})*))?`
    + '(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$');
export const MODULE_LOADS = Object.freeze([
    'eager', 'on-demand', 'lazy', 'deferred', 'on-event', 'on-route',
]);
/** Validate an exact build trigger; unrelated trigger fields are rejected. */
export function validModuleLoading(value) {
    return typeof value.load === 'string' && MODULE_LOADS.includes(value.load)
        && (value.load === 'on-event'
            ? typeof value.onEvent === 'string' && value.onEvent.length <= 128
                && /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*:[a-z][a-z0-9]*(?:-[a-z0-9]+)*:[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value.onEvent)
            : value.onEvent === undefined)
        && (value.load === 'on-route'
            ? typeof value.onRoute === 'string' && value.onRoute.length > 0
                && value.onRoute.length <= 128 && !/\s/.test(value.onRoute)
                && [...value.onRoute].every(char => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127)
            : value.onRoute === undefined);
}
/** lazy is the explicit on-demand alias. */
export function normalizedModuleLoad(load) {
    return load === 'lazy' ? 'on-demand' : load;
}
const ENTRY_KEYS = ['id', 'package', 'version', 'source', 'load', 'settings', 'onEvent', 'onRoute'];
function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        && [Object.prototype, null].includes(Object.getPrototypeOf(value));
}
function moduleId(value) {
    return typeof value === 'string' && value.length <= 64 && MODULE_ID.test(value);
}
function packageName(value) {
    return typeof value === 'string' && value.length <= 214 && PACKAGE.test(value);
}
function exactVersion(value) {
    return typeof value === 'string' && value.length <= 64 && VERSION.test(value);
}
/** Parse untrusted config without interpreting legacy `add`/`disable`/`version` operations. */
export function parseModuleComposition(value) {
    if (value === undefined)
        return { modules: [], rejected: [], present: false };
    if (!Array.isArray(value) || value.length > MAX_COMPOSITION_MODULES) {
        return { modules: [], rejected: [null], present: true };
    }
    const modules = [];
    const rejected = [];
    const ids = new Set();
    for (const item of value) {
        let id = null;
        try {
            if (record(item) && moduleId(item.id))
                id = item.id;
            if (!record(item) || id === null || ids.has(id)
                || !Object.keys(item).every((key) => ENTRY_KEYS.includes(key))
                || !packageName(item.package) || !exactVersion(item.version)
                || (item.source !== 'local' && item.source !== 'remote')
                || (item.settings !== undefined && !record(item.settings))
                || !validModuleLoading(item)
                || item.filters !== undefined) {
                rejected.push(id);
                continue;
            }
            const entry = {
                id, package: item.package, version: item.version, source: item.source,
                load: item.load,
                ...(item.onEvent === undefined ? {} : { onEvent: item.onEvent }),
                ...(item.onRoute === undefined ? {} : { onRoute: item.onRoute }),
                ...(item.settings === undefined ? {} : {
                    settings: Object.freeze(structuredClone(item.settings))
                }),
            };
            ids.add(id);
            modules.push(Object.freeze(entry));
        }
        catch {
            rejected.push(id);
        }
    }
    return { modules: Object.freeze(modules), rejected: Object.freeze(rejected), present: true };
}
function parse(version) {
    const match = VERSION.exec(version);
    if (!match)
        return undefined;
    return [Number(match[1]), Number(match[2]), Number(match[3]), match[4]?.split('.') ?? []];
}
function compare(a, b) {
    for (let i = 0; i < 3; i++) {
        if (a[i] !== b[i])
            return a[i] - b[i];
    }
    const [x, y] = [a[3], b[3]];
    if (x.length === 0 || y.length === 0)
        return y.length - x.length;
    for (let i = 0; i < Math.max(x.length, y.length); i++) {
        const [p, q] = [x[i], y[i]];
        if (p === undefined)
            return -1;
        if (q === undefined)
            return 1;
        if (p === q)
            continue;
        const [m, n] = [/^[0-9]+$/.test(p), /^[0-9]+$/.test(q)];
        if (m && n)
            return Number(p) - Number(q);
        if (m !== n)
            return m ? -1 : 1;
        return p < q ? -1 : 1;
    }
    return 0;
}
/** A strict semver subset: exact, comparison, caret, tilde, conjunction and `||`. */
export function satisfies(version, range) {
    const tested = typeof version === 'string' ? parse(version) : undefined;
    if (!tested || typeof range !== 'string' || range.length > 256)
        return false;
    const release = [tested[0], tested[1], tested[2], []];
    const sets = range.split('||');
    if (sets.length > 8)
        return false;
    return sets.some((set) => {
        const comparators = set.trim().split(/\s+/);
        if (comparators.length > 8)
            return false;
        return comparators.every((comparator) => {
            if (comparator === '*' || comparator === 'x')
                return true;
            const match = /^(\^|~|>=|<=|>|<|=)?(.+)$/.exec(comparator);
            const bound = match?.[2] === undefined ? undefined : parse(match[2]);
            if (!match || !bound)
                return false;
            // A prerelease bound compares the full version (exact alpha pins); a release bound keeps the
            // SDK rule that SDK prereleases satisfy e.g. ^1.0.0.
            const subject = bound[3].length > 0 ? tested : release;
            const order = compare(subject, bound);
            const [major, minor, patch] = bound;
            switch (match[1]) {
                case '^': {
                    const upper = major > 0 ? [major + 1, 0, 0, []]
                        : minor > 0 ? [0, minor + 1, 0, []] : [0, 0, patch + 1, []];
                    return order >= 0 && compare(subject, upper) < 0;
                }
                case '~': return order >= 0 && compare(subject, [major, minor + 1, 0, []]) < 0;
                case '>=': return order >= 0;
                case '<=': return order <= 0;
                case '>': return order > 0;
                case '<': return order < 0;
                default: return order === 0;
            }
        });
    });
}
/** Check the entire selected graph, reporting each transitive failure against its root module. */
export function checkModuleComposition(entries, manifests, context) {
    if (context.targets) {
        const registry = new Map(manifests.map(m => [`${m.id}\u0000${m.package}\u0000${m.version}`, m]));
        const errors = [];
        if (!validSdkTargets(context.targets, context.targetAdapters))
            return [{ id: '', reason: 'invalid application targets', code: 'MODULE_TARGET_UNAVAILABLE' }];
        for (const entry of entries) {
            const manifest = registry.get(`${entry.id}\u0000${entry.package}\u0000${entry.version}`);
            if (manifest && !context.targets.some(t => supportsBuild(manifest, sdkTargetBuild(t, context.targetAdapters))))
                errors.push({ id: entry.id, reason: 'module does not support any selected target', code: 'MODULE_TARGET_UNAVAILABLE' });
        }
        for (const target of context.targets) {
            const build = sdkTargetBuild(target, context.targetAdapters);
            const selected = entries.filter(e => {
                const m = registry.get(`${e.id}\u0000${e.package}\u0000${e.version}`);
                return !m || supportsBuild(m, build);
            });
            const adapter = context.adapters?.[target] ?? context.adapter;
            errors.push(...checkModuleComposition(selected, manifests, {
                coreVersion: context.coreVersion, build, ...(adapter ? { adapter } : {})
            }));
        }
        return errors;
    }
    const selected = new Map(entries.map((entry) => [entry.id, entry]));
    const registry = new Map(manifests.map((manifest) => [`${manifest.id}\u0000${manifest.package}\u0000${manifest.version}`, manifest]));
    const errors = [];
    const reported = new Set();
    const report = (id, reason, code) => {
        const key = `${id}\u0000${reason}`;
        if (!reported.has(key)) {
            reported.add(key);
            errors.push({ id, reason, ...(code ? { code } : {}) });
        }
    };
    const seen = new Set();
    for (const entry of entries) {
        if (!validModuleLoading(entry))
            report(entry.id, 'invalid module loading trigger');
        if (seen.has(entry.id))
            report(entry.id, 'duplicate module id');
        seen.add(entry.id);
    }
    for (const root of entries) {
        const visited = new Set();
        const visit = (entry, path) => {
            if (visited.has(entry.id))
                return;
            visited.add(entry.id);
            const manifest = registry.get(`${entry.id}\u0000${entry.package}\u0000${entry.version}`);
            if (!manifest) {
                report(root.id, `${path.join(' -> ')}: registry manifest for ${entry.package}@${entry.version} is missing`);
                return;
            }
            if (manifest.selection === 'required' && (normalizedModuleLoad(entry.load) !== normalizedModuleLoad(manifest.load ?? 'eager')
                || entry.onEvent !== manifest.onEvent || entry.onRoute !== manifest.onRoute))
                report(root.id, `${path.join(' -> ')}: required module loading policy is fixed`);
            if (manifest.status === 'soon') {
                report(root.id, `${path.join(' -> ')}: module is not ready`, 'MODULE_NOT_READY');
                return;
            }
            if (!satisfies(context.coreVersion, manifest.engines.core)) {
                report(root.id, `${path.join(' -> ')}: requires core ${manifest.engines.core}`);
            }
            if (manifest.engines.adapter && (!context.adapter
                || !satisfies(context.adapter.version, manifest.engines.adapter))) {
                report(root.id, `${path.join(' -> ')}: requires adapter ${manifest.engines.adapter}`);
            }
            if (context.adapter?.targets && !supportsBuild({ targets: context.adapter.targets,
                ...(context.adapter.stores ? { stores: context.adapter.stores } : {}),
            }, context.build)) {
                report(root.id, `${path.join(' -> ')}: selected adapter does not support target/store`
                    + ` ${context.build.target}${context.build.store ? `/${context.build.store}` : ''}`);
            }
            if (!supportsBuild(manifest, context.build)) {
                report(root.id, `${path.join(' -> ')}: unsupported target/store ${context.build.target}`
                    + (context.build.store ? `/${context.build.store}` : ''));
            }
            if (entry.source === 'remote' && (manifest.selection === 'required' || manifest.nativePlugins?.length)) {
                report(root.id, `${path.join(' -> ')}: module requires source local`, 'MODULE_REMOTE_FORBIDDEN');
            }
            for (const [requiredId, range] of Object.entries(manifest.requires ?? {})) {
                const depPath = [...path, requiredId];
                const dep = selected.get(requiredId);
                if (!dep) {
                    report(root.id, `${depPath.join(' -> ')}: required module is missing`);
                    continue;
                }
                if (!satisfies(dep.version, range)) {
                    report(root.id, `${depPath.join(' -> ')}: version ${dep.version} does not satisfy ${range}`);
                }
                if (path.includes(requiredId)) {
                    report(root.id, `${depPath.join(' -> ')}: dependency cycle`);
                    continue;
                }
                visit(dep, depPath);
            }
        };
        visit(root, [root.id]);
    }
    return errors;
}
/** Availability of the immutable build selection. */
export function getModuleStatuses(composition, buildInfo) {
    return composition.map(entry => ({ id: entry.id, status: buildInfo.modules.some(module => module.id === entry.id && module.package === entry.package && module.version === entry.version)
            ? 'working' : 'failed' }));
}
function validTargetAdapter(value) {
    return record(value) && record(value.build)
        && checkModuleTargets([value.build.target], value.build.store === undefined
            ? undefined : [value.build.store]).length === 0
        && packageName(value.buildKit) && packageName(value.adapter)
        && (value.modules === undefined || (Array.isArray(value.modules) && value.modules.length <= 256
            && value.modules.every(packageName) && new Set(value.modules).size === value.modules.length));
}
export function validSdkTargets(targets, catalog) {
    return targets.length > 0 && targets.length <= 16 && new Set(targets).size === targets.length
        && targets.every(t => typeof t === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(t)
            && record(catalog) && Object.hasOwn(catalog, t) && validTargetAdapter(catalog[t]));
}
export function sdkTargetBuild(target, catalog) {
    if (!validSdkTargets([target], catalog))
        throw new Error('Unknown or invalid SDK target adapter');
    return { ...catalog[target].build };
}
/** Pure registry resolver: caller supplies the current published catalog, never network state. */
export function resolveSdk(coreVersion, targets, registry, targetAdapters) {
    const errors = [];
    if (!validSdkTargets(targets, targetAdapters))
        return { modules: [], skins: [],
            buildKit: {}, adapters: {}, errors: [{ code: 'SDK_RESOLVE_FAILED', package: 'targets' }] };
    const compatible = registry.filter(item => item.state === 'published'
        && satisfies(coreVersion, item.engines.core) && parse(item.version));
    const latest = new Map();
    for (const item of compatible) {
        if (!(item.kind === 'skin'
            ? targets.every(t => supportsBuild(item, sdkTargetBuild(t, targetAdapters)))
            : targets.some(t => supportsBuild(item, sdkTargetBuild(t, targetAdapters)))))
            continue;
        const previous = latest.get(item.package);
        const version = parse(item.version);
        if (version && (!previous || compare(version, parse(previous.version)) > 0)) {
            latest.set(item.package, item);
        }
    }
    const values = [...latest.values()];
    const choose = (name, build) => {
        const candidates = compatible.filter(v => v.package === name && (build ? supportsBuild(v, build)
            : targets.every(t => supportsBuild(v, sdkTargetBuild(t, targetAdapters)))));
        candidates.sort((a, b) => compare(parse(b.version), parse(a.version)));
        const item = candidates[0];
        if (!item) {
            errors.push({ code: 'SDK_RESOLVE_FAILED', package: name });
            return undefined;
        }
        return Object.freeze({ package: item.package, version: item.version });
    };
    const uiKit = choose('@manygamescorp/ui-kit');
    const buildKit = {};
    const adapters = {};
    for (const target of targets) {
        const build = sdkTargetBuild(target, targetAdapters);
        const selection = targetAdapters[target];
        const kit = choose(selection.buildKit, build);
        const adapter = choose(selection.adapter, build);
        if (kit)
            buildKit[target] = kit;
        if (adapter)
            adapters[target] = adapter;
        for (const name of selection.modules ?? [])
            choose(name, build);
    }
    return { modules: Object.freeze(values.filter(v => v.kind === 'module'
            && targets.some(t => supportsBuild(v, sdkTargetBuild(t, targetAdapters))))),
        ...(uiKit ? { uiKit } : {}),
        skins: Object.freeze(values.filter(v => v.kind === 'skin').map(v => Object.freeze({
            package: v.package, version: v.version
        }))),
        buildKit: Object.freeze(buildKit), adapters: Object.freeze(adapters),
        errors: Object.freeze(errors) };
}
//# sourceMappingURL=module-composition.js.map
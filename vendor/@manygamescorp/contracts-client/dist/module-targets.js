/**
 * Build target of a module (module.json `targets`/`stores`, client-sdk#239): which build
 * platform and which store a module implementation works under. Shared by the core manifest
 * check, the build-time lock resolver and the panel registry publication.
 */
export const BUILD_TARGETS = Object.freeze(['web', 'cordova']);
/** Known store ids; any id of this shape is accepted (platform.json `store`, E96). */
export const KNOWN_STORES = Object.freeze(['google_play', 'app_store']);
export const STORE_ID = /^[a-z][a-z0-9_]{0,31}$/;
export const MAX_STORES = 16;
/** Problems of a `targets`/`stores` pair; empty when valid. Messages carry no rejected values. */
export function checkModuleTargets(targets, stores) {
    const problems = [];
    const list = (value, name, accept, max) => {
        if (!Array.isArray(value) || value.length === 0 || value.length > max) {
            problems.push(`${name} must be a non-empty array of at most ${max} items`);
            return undefined;
        }
        const items = [];
        value.forEach((item, i) => {
            if (typeof item !== 'string' || !accept(item))
                problems.push(`${name}[${i}] is not allowed`);
            else if (items.includes(item))
                problems.push(`${name}[${i}] is a duplicate`);
            else
                items.push(item);
        });
        return items;
    };
    const known = list(targets, 'targets', (item) => BUILD_TARGETS.includes(item), BUILD_TARGETS.length);
    if (stores !== undefined) {
        list(stores, 'stores', (item) => STORE_ID.test(item), MAX_STORES);
        // A store exists only in a native shell.
        if (known && !known.includes('cordova'))
            problems.push('stores requires target cordova');
    }
    return problems;
}
/** The module fits the build: its target matches and, if store-bound, so does its store. */
export function supportsBuild(module, build) {
    if (!module.targets.includes(build.target))
        return false;
    if (module.stores === undefined)
        return true;
    return build.store !== undefined && module.stores.includes(build.store);
}
/** Build error: an enabled feature has no implementation for the build's target and store. */
export class ModuleTargetError extends Error {
    feature;
    target;
    store;
    constructor(feature, build) {
        super(`module "${feature}" has no implementation for target "${build.target}"`
            + (build.store === undefined ? '' : ` and store "${build.store}"`));
        this.name = 'ModuleTargetError';
        this.feature = feature;
        this.target = build.target;
        this.store = build.store;
    }
}
/** Keeps only implementations that fit the build; a feature left with none is an error. */
export function resolveForBuild(features, build) {
    const selected = new Map();
    const errors = [];
    for (const feature of features) {
        const ids = feature.implementations.filter((item) => supportsBuild(item, build))
            .map((item) => item.id);
        if (ids.length === 0)
            errors.push(new ModuleTargetError(feature.name, build));
        else
            selected.set(feature.name, Object.freeze(ids));
    }
    return { selected, errors };
}
//# sourceMappingURL=module-targets.js.map
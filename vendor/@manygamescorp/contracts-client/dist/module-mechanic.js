const plain = (v) => v !== null && typeof v === 'object'
    && [Object.prototype, null].includes(Object.getPrototypeOf(v));
const only = (v, keys) => Object.keys(v).every(k => keys.includes(k));
const number = '(?:0|[1-9][0-9]*)';
const ident = '(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)';
const semver = new RegExp(`^${number}\\.${number}\\.${number}(?:-${ident}(?:\\.${ident})*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$`);
/** Exact, bounded semver for independent layer versions. */
export const mechanicVersion = (v) => typeof v === 'string' && v.length <= 64 && semver.test(v);
/** Normalize the package-relative ./ notation used in E185 source descriptors. */
export const mechanicPath = (v) => v.startsWith('./') ? v.slice(2) : v;
/** Safe package path, optionally allowing whole-segment * and ** file patterns. */
export function validMechanicPath(v, pattern = false) {
    return typeof v === 'string' && v.length > 0 && v.length <= 256
        && mechanicPath(v).split('/').every(part => /^[A-Za-z0-9_][A-Za-z0-9._-]*$/.test(part)
            || part === '.mech-copy.json' || (pattern && (part === '*' || part === '**')));
}
const list = (v, max, item) => Array.isArray(v)
    && v.length <= max && new Set(v).size === v.length && v.every(item);
const token = (v) => typeof v === 'string' && /^[a-z0-9-]{1,24}$/.test(v);
const name = (v) => typeof v === 'string' && /^[a-z][a-z0-9.-]{0,63}$/.test(v);
/** Shared structural validation used by defineModule, publisher and loader. */
export function validateModuleMechanic(value) {
    if (!plain(value))
        return ['mechanic metadata must be an object'];
    const errors = [];
    if (value.modes !== undefined && (!list(value.modes, 2, v => v === 'core' || v === 'minigame')
        || value.modes.length === 0))
        errors.push('modes');
    if (value.genres !== undefined && !list(value.genres, 16, token))
        errors.push('genres');
    if (value.extensionPoints !== undefined && !list(value.extensionPoints, 64, name))
        errors.push('extensionPoints');
    if (value.layers === undefined)
        return errors;
    const layers = value.layers;
    if (!plain(layers) || !only(layers, ['engine', 'presentation', 'server']))
        return [...errors, 'layers'];
    const engine = layers.engine;
    if (!plain(engine) || !only(engine, ['entry', 'version']) || !validMechanicPath(engine.entry)
        || !/\.m?js$/.test(engine.entry) || !mechanicVersion(engine.version))
        errors.push('layers.engine');
    const presentation = layers.presentation;
    if (presentation !== undefined && (!plain(presentation) || !only(presentation, ['entry', 'version', 'files', 'copyable'])
        || !validMechanicPath(presentation.entry) || !/\.m?js$/.test(presentation.entry)
        || typeof presentation.copyable !== 'boolean'
        || !list(presentation.files, 500, v => validMechanicPath(v, true))
        || (presentation.version !== undefined && !mechanicVersion(presentation.version))))
        errors.push('layers.presentation');
    const server = layers.server;
    if (server !== undefined && (!plain(server) || !only(server, ['verifier', 'configScopes', 'version'])
        || typeof server.verifier !== 'string' || !/^[a-z][a-z0-9:./-]{0,127}$/.test(server.verifier)
        || !list(server.configScopes, 64, v => typeof v === 'string' && /^[a-z][a-z0-9.-]{0,126}(?:\.\*)?$/.test(v))
        || (server.version !== undefined && !mechanicVersion(server.version))))
        errors.push('layers.server');
    return errors;
}
function matches(pattern, file) {
    const parts = mechanicPath(pattern).split('/');
    const segments = file.split('/');
    // Bounded dynamic programming; ** matches zero or more complete path segments.
    let previous = segments.map(() => false).concat(false);
    previous[0] = true;
    for (const part of parts) {
        const next = previous.map(() => false);
        for (let i = 0; i <= segments.length; i++) {
            next[i] = part === '**' ? previous[i] || (i > 0 && next[i - 1])
                : i > 0 && previous[i - 1] && (part === '*' || part === segments[i - 1]);
        }
        previous = next;
    }
    return previous[segments.length];
}
/** Resolve copy patterns only against the signed file map, never the filesystem. */
export function mechanicCopyFiles(metadata, files) {
    return files.filter(file => metadata.layers?.presentation?.files
        .some(pattern => matches(pattern, file)));
}
/** Validate layer entries and copy patterns against the existing signed artifact file map. */
export function validateModuleMechanicFiles(value) {
    const errors = [...validateModuleMechanic(value)];
    if (errors.length || !plain(value) || value.layers === undefined)
        return errors;
    const metadata = value;
    const files = value.files;
    if (!plain(files) || !Array.isArray(files.scripts))
        return ['layers.files'];
    const declared = Object.values(files).flat();
    for (const layer of [metadata.layers.engine, metadata.layers.presentation]) {
        if (layer && !files.scripts.includes(mechanicPath(layer.entry)))
            errors.push('layers.entry');
    }
    for (const pattern of metadata.layers.presentation?.files ?? []) {
        if (!declared.some(file => typeof file === 'string' && matches(pattern, file)))
            errors.push('layers.presentation.files');
    }
    return errors;
}
/** Rebase layer paths along with the existing runtime -> npm dist/ file map. */
export function rebaseModuleMechanic(metadata, prefix) {
    const layers = metadata.layers;
    if (!layers)
        return {};
    return { layers: { ...layers,
            engine: { ...layers.engine, entry: prefix + mechanicPath(layers.engine.entry) },
            ...(layers.presentation ? { presentation: { ...layers.presentation,
                    entry: prefix + mechanicPath(layers.presentation.entry),
                    files: layers.presentation.files.map(path => prefix + mechanicPath(path)) } } : {}) } };
}
//# sourceMappingURL=module-mechanic.js.map
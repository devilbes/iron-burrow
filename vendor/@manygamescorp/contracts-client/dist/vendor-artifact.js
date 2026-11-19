/**
 * Vendor artifacts of an SDK release (client-sdk#772, consumer mcp#458 `sdk.modules_install`).
 * A Studio project pod has no npm token and no access to npm.pkg.github.com, so every SDK package
 * is published as a ready ESM build that the platform copies into the project:
 *
 *   sdk/catalog/<sdkVer>/vendor/@manygamescorp/<pkg>/<pkgVer>/
 *     package.json   — no devDependencies/scripts, no workspace or private (@manygamescorp) deps
 *     module.json    — mod-* and other registry modules only
 *     files.json     — {@link VendorFiles}: every file of the artifact with sha256 and size
 *     dist/**        — built ESM
 *
 * catalog.json describes each artifact with {@link CatalogVendor}; catalog.sig signs catalog.json
 * with the module key ({@link CatalogSignature}). Trust chain: catalog.sig → catalog.json →
 * vendor.sha256 (files.json) → files[].sha256. JSON Schema: `./vendor-artifact.schema.json`.
 */
export const VENDOR_SCOPE = '@manygamescorp/';
export const VENDOR_FILES_VERSION = 1;
export const CATALOG_SIGNATURE_VERSION = 1;
/**
 * Limits of one artifact: our own guard on files.json and vendor copies into game projects.
 * The panel publication contract limits declared module files separately (≤500 per type).
 */
export const VENDOR_LIMITS = Object.freeze({ files: 2000, bytes: 50 * 1024 * 1024, path: 256 });
const SHA256 = /^[0-9a-f]{64}$/;
const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[a-z]+\.(0|[1-9]\d*))?$/;
const PACKAGE = /^@manygamescorp\/[a-z][a-z0-9-]*$/;
const BASE = /^vendor\/@manygamescorp\/[a-z][a-z0-9-]*\/\d[0-9a-z.-]*\/$/;
const NPM_NAME = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
const SEGMENT = /^[A-Za-z0-9_-][A-Za-z0-9._-]*$/;
const plain = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
/** Relative `/` path without `.`/`..`/empty segments; the only safe form to join to a project. */
export function isVendorPath(value) {
    return typeof value === 'string' && value.length > 0 && value.length <= VENDOR_LIMITS.path
        && (value.split('/').every(part => SEGMENT.test(part))
            || value === 'dist/presentation/.mech-copy.json' || value === 'presentation/.mech-copy.json');
}
/** `vendor/@manygamescorp/<pkg>/<pkgVer>/` relative to `sdk/catalog/<sdkVer>/`. */
export function vendorBase(packageName, version) {
    if (!PACKAGE.test(packageName) || !VERSION.test(version))
        throw new Error('vendorBase: bad package or version');
    return `vendor/${packageName}/${version}/`;
}
/** Publication errors of files.json (empty → valid). */
export function validateVendorFiles(value) {
    if (!plain(value))
        return ['files.json must be an object'];
    const errors = [];
    if (value.v !== VENDOR_FILES_VERSION)
        errors.push('v');
    if (typeof value.package !== 'string' || !PACKAGE.test(value.package))
        errors.push('package');
    if (typeof value.version !== 'string' || !VERSION.test(value.version))
        errors.push('version');
    const files = value.files;
    if (!Array.isArray(files) || files.length === 0 || files.length > VENDOR_LIMITS.files)
        return [...errors, 'files'];
    let total = 0;
    let previous = '';
    for (const file of files) {
        if (!plain(file) || !isVendorPath(file.path) || file.path === 'files.json' || file.path <= previous
            || typeof file.sha256 !== 'string' || !SHA256.test(file.sha256)
            || !Number.isSafeInteger(file.size) || file.size < 0)
            return [...errors, 'files'];
        previous = file.path;
        total += file.size;
    }
    if (total > VENDOR_LIMITS.bytes)
        errors.push('files');
    if (!files.some(f => f.path === 'package.json'))
        errors.push('package.json');
    return errors;
}
/** Errors of a catalog `vendor` field (empty → valid). */
export function validateCatalogVendor(value) {
    if (!plain(value))
        return ['vendor must be an object'];
    const errors = [];
    const base = value.base;
    if (typeof base !== 'string' || !BASE.test(base))
        errors.push('base');
    if (value.files !== 'files.json')
        errors.push('files');
    if (typeof value.sha256 !== 'string' || !SHA256.test(value.sha256))
        errors.push('sha256');
    const deps = value.deps;
    if (!plain(deps) || !Object.entries(deps).every(([name, range]) => NPM_NAME.test(name)
        && !name.startsWith(VENDOR_SCOPE) && typeof range === 'string' && range.length > 0 && range.length <= 64
        && !/^(?:workspace|file|link|git|https?):/.test(range)))
        errors.push('deps');
    const requires = value.requires;
    if (!Array.isArray(requires) || !requires.every(r => typeof r === 'string' && PACKAGE.test(r))
        || new Set(requires).size !== requires.length)
        errors.push('requires');
    const map = value.importMap;
    if (!plain(map)
        || !Object.entries(map).every(([specifier, target]) => specifier.startsWith(VENDOR_SCOPE)
            && isVendorPath(target) && /\.m?js$/.test(target)))
        errors.push('importMap');
    return errors;
}
/** Structural/graph validation before downloading artifacts or writing any project files. */
export function validateArtifactPlan(value) {
    if (!plain(value) || value.v !== 2)
        return ['artifact plan version'];
    const keys = (v, allowed) => Object.keys(v).every(key => allowed.includes(key));
    if (!keys(value, ['v', 'source', 'target', 'selector', 'core', 'packages', 'docs'])) {
        return ['artifact plan fields'];
    }
    const identity = (v) => plain(v)
        && typeof v.package === 'string' && PACKAGE.test(v.package)
        && typeof v.version === 'string' && VERSION.test(v.version);
    if (!plain(value.source) || value.source.repository !== 'manygamescorp/client-sdk'
        || !keys(value.source, ['repository', 'commit'])
        || typeof value.source.commit !== 'string' || !/^[0-9a-f]{40}$/.test(value.source.commit)
        || !['web', 'cordova'].includes(value.target))
        return ['source/target'];
    if (!identity(value.selector) || !identity(value.core)
        || !keys(value.selector, ['package', 'version']) || !keys(value.core, ['package', 'version'])
        || value.core.package !== '@manygamescorp/core')
        return ['selector/core'];
    if (!Array.isArray(value.packages) || !value.packages.length || value.packages.length > 200)
        return ['packages'];
    const packages = new Map();
    for (const p of value.packages) {
        if (!identity(p) || !plain(p) || packages.has(p.package)
            || !keys(p, ['package', 'version', 'enginesCore', 'dependencies',
                'npmSha256', 'registrySha256', 'vendor'])
            || typeof p.npmSha256 !== 'string' || !SHA256.test(p.npmSha256)
            || (p.registrySha256 !== null
                && (typeof p.registrySha256 !== 'string' || !SHA256.test(p.registrySha256)))
            || validateCatalogVendor(p.vendor).length || !plain(p.vendor)
            || p.vendor.base !== vendorBase(p.package, p.version)
            || !Object.keys(p.vendor.importMap)
                .every(specifier => specifier === p.package || specifier.startsWith(`${p.package}/`))
            || (p.package === '@manygamescorp/core' ? p.enginesCore !== null
                : typeof p.enginesCore !== 'string' || !p.enginesCore.length || p.enginesCore.length > 256)
            || !Array.isArray(p.dependencies) || p.dependencies.length > 200
            || !p.dependencies.every(identity)
            || !p.dependencies.every(d => keys(d, ['package', 'version']))
            || new Set(p.dependencies.map((d) => d.package)).size
                !== p.dependencies.length
            || JSON.stringify([...p.vendor.requires].sort())
                !== JSON.stringify(p.dependencies.map((d) => d.package).sort()))
            return ['package identity/dependencies'];
        packages.set(p.package, p);
    }
    if (packages.get(value.core.package)?.version !== value.core.version
        || packages.get(value.selector.package)?.version !== value.selector.version)
        return ['selector/core version'];
    const visited = new Set(), visiting = new Set();
    const visit = (name) => {
        if (visiting.has(name))
            return false;
        if (visited.has(name))
            return true;
        const p = packages.get(name);
        if (!p)
            return false;
        visiting.add(name);
        for (const dep of p.dependencies) {
            if (packages.get(dep.package)?.version !== dep.version || !visit(dep.package))
                return false;
        }
        visiting.delete(name);
        visited.add(name);
        return true;
    };
    if (!visit(value.core.package) || !visit(value.selector.package)
        || visited.size !== packages.size)
        return ['exact dependency graph'];
    if (!identity(value.docs) || !plain(value.docs) || value.docs.package !== '@manygamescorp/docs'
        || !keys(value.docs, ['package', 'version', 'vendor'])
        || value.docs.version !== value.selector.version
        || validateCatalogVendor(value.docs.vendor).length
        || !plain(value.docs.vendor)
        || value.docs.vendor.base !== vendorBase(value.docs.package, value.docs.version)
        || Object.keys(value.docs.vendor.importMap).length
        || value.docs.vendor.requires.length)
        return ['docs'];
    return [];
}
export const CONFIG_SCHEMAS_LIMITS = Object.freeze({ bytes: 192 * 1024, schemas: 200,
    scopes: 50, depth: 32, nodes: 20_000 });
/** Publication validation; `inline` validates the resolved vendor representation. */
export function validateModuleConfigSchemas(moduleId, value, inline = false) {
    if (value === undefined)
        return [];
    const bad = (field) => [`configSchemas: ${field}`];
    if (typeof moduleId !== 'string' || !/^mech-[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(moduleId)) {
        return bad('module id must start with mech-');
    }
    if (!plain(value) || value.version !== 1)
        return bad('version');
    const namespace = `mech.${moduleId.slice(5)}`;
    const owned = (v) => typeof v === 'string'
        && (v === namespace || v.startsWith(`${namespace}.`))
        && /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)*$/.test(v);
    const { scopes, schemas } = value;
    if (!Array.isArray(scopes) || !scopes.length || scopes.length > CONFIG_SCHEMAS_LIMITS.scopes) {
        return bad('scopes');
    }
    if (!Array.isArray(schemas) || !schemas.length
        || schemas.length > CONFIG_SCHEMAS_LIMITS.schemas)
        return bad('schemas');
    const seen = new Set();
    const ids = new Set();
    for (const item of schemas) {
        if (!plain(item) || !owned(item.schemaId) || !Number.isSafeInteger(item.version)
            || item.version < 1)
            return bad('schema identity');
        const identity = `${item.schemaId}:${item.version}`;
        if (seen.has(identity))
            return bad('duplicate schemaId/version');
        seen.add(identity);
        ids.add(item.schemaId);
        if (inline) {
            if (item.path !== undefined || !plain(item.schema)
                || typeof item.hash !== 'string' || !SHA256.test(item.hash))
                return bad('inline schema');
            if (item.schema.$schema !== 'https://json-schema.org/draft/2020-12/schema'
                || item.schema.$id !== `urn:manyplay:schema:${item.schemaId}:v${item.version}`) {
                return bad('$schema/$id');
            }
        }
        else if (item.schema !== undefined || item.hash !== undefined
            || typeof item.path !== 'string'
            || !isVendorPath(item.path.replace(/^\.\//, '')))
            return bad('schema path');
    }
    const sections = new Set();
    for (const scope of scopes) {
        if (!plain(scope) || !owned(scope.section) || sections.has(scope.section)
            || typeof scope.label !== 'string' || !scope.label.trim() || scope.label.length > 256
            || !Array.isArray(scope.patterns) || !scope.patterns.length || scope.patterns.length > 200
            || new Set(scope.patterns).size !== scope.patterns.length
            || !scope.patterns.every(p => typeof p === 'string'
                && owned(p.endsWith('.*') ? p.slice(0, -2) : p))
            || !plain(scope.schemas) || Object.keys(scope.schemas).length > 200
            || !Object.entries(scope.schemas).every(([key, id]) => owned(key) && typeof id === 'string'
                && ids.has(id) && scope.patterns.some((p) => p.endsWith('.*')
                ? key.startsWith(p.slice(0, -1)) : key === p)))
            return bad('scope namespace/mapping');
        sections.add(scope.section);
    }
    // Bound arbitrary JSON before serializing it; iterative traversal also handles hostile depth.
    let nodes = 0;
    const stack = [{ value, depth: 0 }];
    const objects = new Set();
    while (stack.length) {
        const current = stack.pop();
        if (++nodes > CONFIG_SCHEMAS_LIMITS.nodes
            || current.depth > CONFIG_SCHEMAS_LIMITS.depth)
            return bad('depth/nodes');
        const v = current.value;
        if (typeof v === 'object' && v !== null) {
            if (objects.has(v))
                return bad('repeated object');
            objects.add(v);
            if (!Array.isArray(v) && !plain(v))
                return bad('JSON');
            for (const [key, child] of Object.entries(v)) {
                if (!validUnicode(key))
                    return bad('JCS Unicode');
                stack.push({ value: child, depth: current.depth + 1 });
            }
        }
        else if (typeof v === 'string' && !validUnicode(v))
            return bad('JCS Unicode');
        else if (!(v === null || typeof v === 'string' || typeof v === 'boolean'
            || (typeof v === 'number' && Number.isFinite(v))))
            return bad('JSON');
    }
    if (inline && schemas.some(item => !validSchemaReferences(item.schema))) {
        return bad('external $ref');
    }
    if (new TextEncoder().encode(JSON.stringify(value)).length > CONFIG_SCHEMAS_LIMITS.bytes) {
        return bad('bytes');
    }
    return [];
}
// RFC 8785 requires rejection of lone UTF-16 surrogates.
function validUnicode(value) {
    return !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(value);
}
/** Inspect schema keywords, not instance data in enum/default/examples or property names. */
function validSchemaReferences(root) {
    const pending = [root];
    const maps = new Set(['$defs', 'definitions', 'properties', 'patternProperties', 'dependentSchemas']);
    const lists = new Set(['allOf', 'anyOf', 'oneOf', 'prefixItems']);
    const singles = new Set(['items', 'contains', 'additionalProperties', 'unevaluatedProperties',
        'unevaluatedItems', 'propertyNames', 'not', 'if', 'then', 'else', 'contentSchema']);
    while (pending.length) {
        const schema = pending.pop();
        if (!plain(schema))
            continue;
        for (const [key, child] of Object.entries(schema)) {
            if (key === '$ref' || key === '$dynamicRef') {
                if (typeof child !== 'string'
                    || !/^(?:#\/|urn:manyplay:schema:[a-z][a-z0-9.-]*:v[1-9][0-9]*(?:#\/.*)?$)/.test(child)) {
                    return false;
                }
            }
            else if (maps.has(key) && plain(child))
                pending.push(...Object.values(child));
            else if (lists.has(key) && Array.isArray(child))
                pending.push(...child);
            else if (singles.has(key))
                pending.push(child);
        }
    }
    return true;
}
//# sourceMappingURL=vendor-artifact.js.map
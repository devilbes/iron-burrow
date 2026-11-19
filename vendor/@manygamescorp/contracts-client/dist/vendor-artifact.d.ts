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
export declare const VENDOR_SCOPE = "@manygamescorp/";
export declare const VENDOR_FILES_VERSION = 1;
export declare const CATALOG_SIGNATURE_VERSION = 1;
/**
 * Limits of one artifact: our own guard on files.json and vendor copies into game projects.
 * The panel publication contract limits declared module files separately (≤500 per type).
 */
export declare const VENDOR_LIMITS: Readonly<{
    files: 2000;
    bytes: number;
    path: 256;
}>;
export interface VendorFile {
    /** Relative `/` path inside the artifact directory; never `files.json`. */
    readonly path: string;
    /** Lowercase hex SHA-256 of the file bytes. */
    readonly sha256: string;
    /** Size in bytes. */
    readonly size: number;
}
/** `files.json` of an artifact, sorted by path. */
export interface VendorFiles {
    readonly v: typeof VENDOR_FILES_VERSION;
    readonly package: string;
    readonly version: string;
    readonly files: readonly VendorFile[];
}
/** `vendor` field of a package in catalog.json. */
export interface CatalogVendor {
    /** Artifact directory relative to the catalog.json directory, ends with `/`. */
    readonly base: string;
    /** files.json relative to `base` (always `files.json`). */
    readonly files: string;
    /** SHA-256 of the files.json bytes. */
    readonly sha256: string;
    /** Public npm dependencies (registry.npmjs.org) the project installs itself: name → range. */
    readonly deps: Readonly<Record<string, string>>;
    /** Internal SDK packages this artifact imports (exact versions of the same catalog). */
    readonly requires: readonly string[];
    /** Bare specifier → path relative to `base`; empty for documentation with no runtime imports. */
    readonly importMap: Readonly<Record<string, string>>;
}
/** Non-module package of the catalog: same artifact, no module.json. */
export interface CatalogLibrary {
    readonly package: string;
    readonly version: string;
    readonly vendor: CatalogVendor;
    /** Public documentation; consumers use metadata rather than a reserved package name. */
    readonly kind?: 'docs';
    /** Include this library when vendoring any selection from this release. */
    readonly selection?: 'required';
}
/** `catalog.sig` next to catalog.json: Ed25519 over the exact catalog.json bytes. */
export interface CatalogSignature {
    readonly v: typeof CATALOG_SIGNATURE_VERSION;
    readonly alg: 'Ed25519';
    /** SHA-256 (hex) of the raw 32-byte public key, as in module.sig. */
    readonly keyId: string;
    /** Base64 signature. */
    readonly value: string;
    /** SHA-256 of the signed catalog.json bytes. */
    readonly sha256: string;
}
/** Relative `/` path without `.`/`..`/empty segments; the only safe form to join to a project. */
export declare function isVendorPath(value: unknown): value is string;
/** `vendor/@manygamescorp/<pkg>/<pkgVer>/` relative to `sdk/catalog/<sdkVer>/`. */
export declare function vendorBase(packageName: string, version: string): string;
/** Publication errors of files.json (empty → valid). */
export declare function validateVendorFiles(value: unknown): readonly string[];
/** Errors of a catalog `vendor` field (empty → valid). */
export declare function validateCatalogVendor(value: unknown): readonly string[];
/** Offline LTS producer plan; a receiver must opt in to v2, independently of catalog v1. */
export interface ArtifactPlan {
    readonly v: 2;
    readonly source: {
        readonly repository: string;
        readonly commit: string;
    };
    readonly target: 'web' | 'cordova';
    readonly selector: {
        readonly package: string;
        readonly version: string;
    };
    readonly core: {
        readonly package: '@manygamescorp/core';
        readonly version: string;
    };
    readonly packages: readonly {
        readonly package: string;
        readonly version: string;
        readonly enginesCore: string | null;
        readonly dependencies: readonly {
            readonly package: string;
            readonly version: string;
        }[];
        readonly npmSha256: string;
        readonly registrySha256: string | null;
        readonly vendor: CatalogVendor;
    }[];
    readonly docs: {
        readonly package: '@manygamescorp/docs';
        readonly version: string;
        readonly vendor: CatalogVendor;
    };
}
/** Structural/graph validation before downloading artifacts or writing any project files. */
export declare function validateArtifactPlan(value: unknown): readonly string[];
/** E175: author declaration in module.json; distinct from editor/settings `schemas`. */
export interface ModuleConfigScope {
    readonly section: string;
    readonly label: string;
    readonly patterns: readonly string[];
    readonly schemas: Readonly<Record<string, string>>;
}
export interface ModuleConfigSchemaSource {
    readonly schemaId: string;
    readonly version: number;
    /** Relative to module.json, with an optional leading `./`. */
    readonly path: string;
}
export interface ModuleConfigSchemaInline {
    readonly schemaId: string;
    readonly version: number;
    readonly schema: Readonly<Record<string, unknown>>;
    /** Lowercase hex SHA-256 of RFC 8785 canonical JSON (JCS). */
    readonly hash: string;
}
export interface ModuleConfigSchemas<T = ModuleConfigSchemaSource> {
    readonly version: 1;
    readonly scopes: readonly ModuleConfigScope[];
    readonly schemas: readonly T[];
}
export declare const CONFIG_SCHEMAS_LIMITS: Readonly<{
    bytes: number;
    schemas: 200;
    scopes: 50;
    depth: 32;
    nodes: 20000;
}>;
/** Publication validation; `inline` validates the resolved vendor representation. */
export declare function validateModuleConfigSchemas(moduleId: unknown, value: unknown, inline?: boolean): readonly string[];
//# sourceMappingURL=vendor-artifact.d.ts.map
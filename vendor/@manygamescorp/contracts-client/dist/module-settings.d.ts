import { type Facts, type FilterParameters } from './filters.js';
/** E152 portable settings contract. Used by Studio, ManyPlay MCP, builds and SDK. */
export interface LocalizedText {
    /** Plain editor text indexed by locale; one to 32 locales, none mandatory. */
    readonly [locale: string]: string;
}
/** Resolve exact/parent locale, then explicit fallback/parents; missing text stays absent. */
export declare function resolveLocalizedText(text: LocalizedText | undefined, locale: string, fallbackLocale: string): string | undefined;
export type ModuleSettingType = 'boolean' | 'enum' | 'integer' | 'string' | 'color' | 'image' | 'number' | 'duration' | 'schedule' | 'entityRef' | 'text' | 'reward' | 'list' | 'object' | 'filter';
/** Value of a `text` field: a localization key or inline values per project locale. */
export type SettingText = {
    /** Localization key resolved by the host. */
    readonly key: string;
} | {
    /** Inline translations indexed by locale. */
    readonly values: Readonly<Record<string, string>>;
};
/** Entry of a `reward` value; `id` is an entity of the inventory catalog. */
export interface SettingReward {
    /** Inventory catalog entity identifier. */
    readonly id: string;
    /** Positive quantity of the inventory entity. */
    readonly amount: number;
}
/** Element spec of a `list`: a field without key, label, default and flags. */
export type ModuleSettingItem = Omit<ModuleSettingField, 'key' | 'label' | 'help' | 'default' | 'overridable' | 'visibleIf'>;
export interface ModuleSettingField {
    /** Unique setting key. */
    readonly key: string;
    /** Supported E152 field type. */
    readonly type: ModuleSettingType;
    /** Localized field label. */
    readonly label: LocalizedText;
    /** Localized hint. */
    readonly help?: LocalizedText;
    /** Default scalar value; image fields have no default. */
    readonly default?: unknown;
    /** Enum choices, two to sixteen. */
    readonly options?: readonly {
        /** Enum machine value. */
        readonly value: string;
        /** Localized choice label. */
        readonly label: LocalizedText;
    }[];
    /** Inclusive lower bound: integer; finite for `number`; whole seconds for `duration`. */
    readonly min?: number;
    /** Inclusive upper bound, same kinds as `min`. */
    readonly max?: number;
    /** Integer increment from min. */
    readonly step?: number;
    /** Maximum string length, up to 256; `text`: per locale, up to 1024 (default 256). */
    readonly maxLength?: number;
    /** `reward`: at most 32 entries (default 16); `list`: required, 1..32. */
    readonly maxItems?: number;
    /** `list`: minimum entries, default 0. */
    readonly minItems?: number;
    /** `reward`: inclusive amount upper bound (default 1e9). */
    readonly maxAmount?: number;
    /** `reward`/`entityRef`: editor hint for the catalog entity type; not checked here. */
    readonly entityType?: string;
    /** `list`: element spec. */
    readonly item?: ModuleSettingItem;
    /** `object`: one to sixteen nested fields (no defaults, flags or conditions). */
    readonly fields?: readonly Omit<ModuleSettingField, 'default' | 'overridable' | 'visibleIf'>[];
    /** Bounded portable regular expression subset. */
    readonly pattern?: string;
    /** Permitted raster image MIME types. */
    readonly accept?: readonly string[];
    /** Inclusive integer upper bound. */
    /** Maximum encoded image size. */
    readonly maxBytes?: number;
    /** Pixel limits and optional square requirement. */
    readonly size?: Readonly<{
        /** Minimum image dimension in pixels. */
        min: number;
        /** Maximum image dimension in pixels. */
        max: number;
        /** Require equal width and height. */
        square?: boolean;
    }>;
    /**
     * Defaults to true for the flat types (boolean, enum, integer, string, color, duration,
     * schedule, entityRef). image, number, text, reward, list and object are never overridable
     * (sdk.overrides patches are flat boolean/integer/string/null): `true` is a schema error.
     */
    readonly overridable?: boolean;
    /** Single condition on an earlier boolean or enum field. */
    readonly visibleIf?: Readonly<Record<string, unknown>>;
}
/**
 * Reference to a shared registry block instead of a copy of its fields. `availability` stands for
 * `enabled` (boolean, default true) and `availability` (`filter`, default `{}`): the standard
 * platform filter of segments and A/B (`$`-facts and `filters.params`).
 */
export interface ModuleSettingsRef {
    /** Id of the shared block to expand in place; `availability` is the only one. */
    readonly ref: SharedBlockId;
}
export type SharedBlockId = 'availability';
export interface ModuleSettingsSchema {
    /** E152 schema format version, always 1. */
    readonly schemaVersion: 1;
    /** Ordered fields and shared-block references, at most 24 fields after expansion. */
    readonly fields: readonly (ModuleSettingField | ModuleSettingsRef)[];
}
/** A schema whose references are expanded into plain fields. */
export interface ResolvedModuleSettingsSchema {
    readonly schemaVersion: 1;
    readonly fields: readonly ModuleSettingField[];
}
/** The one reference every module schema uses to get the shared availability block. */
export declare const AVAILABILITY_REF: ModuleSettingsRef;
/** Schema with the shared availability block followed by the module's own fields. */
export declare function withAvailability(fields?: readonly ModuleSettingField[]): ModuleSettingsSchema;
/**
 * Replaces each `{ ref }` by the fields of the shared block. Anything else (an unknown id, a
 * reference with further keys) stays in place and fails the schema validation.
 */
export declare function expandModuleSettingsSchema(schema: unknown): unknown;
/** Whether the schema carries the shared availability block (after expansion). */
export declare function hasAvailability(schema: unknown): boolean;
/**
 * Decision made before a module is activated: `enabled` is not false and the filter matches the
 * facts of the session. Schemas without the block always pass. `settings` are resolved values.
 */
export declare function moduleAvailable(schema: unknown, settings: Readonly<Record<string, unknown>>, facts: Facts, parameters?: FilterParameters): boolean;
export type SettingsIssueCode = 'UNKNOWN_KEY' | 'TYPE' | 'RANGE' | 'PATTERN' | 'OPTION' | 'TOO_LARGE' | 'ASSET_INVALID' | 'NOT_OVERRIDABLE';
export interface SettingsIssue {
    readonly path: string;
    readonly code: SettingsIssueCode;
}
export interface SettingsResult {
    readonly valid: boolean;
    readonly errors: readonly SettingsIssue[];
    /** Defaults applied; invisible fields removed. Never contains input object references. */
    readonly value: Readonly<Record<string, unknown>>;
}
/** Shared editor dictionary validation for settings and catalog metadata. */
export declare const validateLocalizedText: (v: unknown, max: number) => v is LocalizedText;
/** Schema failures block publication, including unknown attributes and forward conditions. */
export declare function validateModuleSettingsSchema(source: unknown): readonly SettingsIssue[];
/**
 * `parameters`: the registered `filters.params`; with them `filter` values may name only known
 * facts and parameters.
 */
export interface SettingsOptions {
    readonly parameters?: FilterParameters;
}
export declare function validateModuleSettings(source: unknown, value: unknown, options?: SettingsOptions): SettingsResult;
/** Validate a partial override without defaults or visibility pruning. */
export declare function validateModuleOverride(source: unknown, data: unknown): SettingsResult;
/** Config record version bounds (configs CFG-R-08). */
export interface VersionBounds {
    readonly minVersion?: string | null;
    readonly maxVersion?: string | null;
}
/**
 * Inclusive strict-semver bounds against `facts.v` (CFG-R-08); an unreadable bound or version
 * never matches.
 */
export declare function versionMatches(bounds: VersionBounds, facts: Facts): boolean;
export interface ModuleOverride extends VersionBounds {
    /** configs record id, a positive integer. */
    readonly configId: number;
    readonly priority?: number;
    readonly data: unknown;
    readonly filters?: unknown;
    readonly conditionals?: readonly unknown[];
    readonly conditionalsMode?: 'merge';
}
export interface ModuleOverridesContext {
    readonly facts: Facts;
    readonly parameters?: FilterParameters;
}
export interface ModuleOverridesResult extends SettingsResult {
    readonly ignored: readonly (SettingsIssue & {
        readonly configId: number;
    })[];
    readonly overrides: readonly number[];
}
/** Defaults, build settings, then matching records ordered by priority and configId. */
export declare function applyModuleOverrides(source: unknown, base: unknown, overrides: readonly ModuleOverride[], ctx: ModuleOverridesContext): ModuleOverridesResult;
//# sourceMappingURL=module-settings.d.ts.map
/** Catalog generated from core event payload types and module manifest events.emits. */
export interface EventPayloadSchema {
    readonly properties?: Readonly<Record<string, EventPayloadSchema>>;
    readonly items?: EventPayloadSchema;
    readonly anyOf?: readonly EventPayloadSchema[];
    /** Core payloads only: values of a dynamic-key record. */
    readonly additionalProperties?: EventPayloadSchema;
}
export interface EventCatalogEntry {
    readonly name: string;
    /** Module ids, or `core` for core events. */
    readonly emitters: readonly string[];
    readonly payloads: readonly EventPayloadSchema[];
}
export interface EventCatalog {
    readonly schemaVersion: 1;
    readonly events: readonly EventCatalogEntry[];
}
/**
 * Event domains published only by the trusted core: no module (local or remote) may emit or
 * handle `<domain>:*`. One list for the runtime (core isCoreEvent) and the gates
 * (core-events.json).
 */
export declare const CORE_EVENT_DOMAINS: readonly string[];
//# sourceMappingURL=events.d.ts.map
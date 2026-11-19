/** E152 placement shared by UI Kit, Studio, builds and MCP. No DOM or SDK dependency. */
export declare const UI_ZONES: readonly ["topbar", "hud", "bottomMenu", "window"];
export type UiZone = (typeof UI_ZONES)[number];
export declare const UI_CONTEXT: RegExp;
export interface UiKitSettings {
    readonly skin?: string;
    readonly topbarMain?: boolean;
    readonly topbarCore?: boolean;
    readonly hud?: boolean;
    readonly bottomMenu?: boolean;
    /** Controls automatic windows only; player actions remain available. */
    readonly windowQueue?: boolean;
}
/** A module setting reference, resolved against its validated settings snapshot. */
export interface UiSettingRef {
    /** Key of the enum/boolean setting used for this value. */
    readonly fromSetting: string;
}
export interface UiSlot {
    /** Unique entry id within a module (up to 32 characters). */
    readonly id: string;
    /** Primary UI Kit zone, or the name of its enum setting. */
    readonly zone: UiZone | UiSettingRef;
    /** Screen contexts; main by default. */
    readonly contexts?: readonly string[];
    /** Ascending placement order, followed by module id and slot id. */
    readonly order?: number;
    /** Alternative zones in order when the primary zone is disabled. */
    readonly fallback?: readonly UiZone[];
    /** Values the skin renders for this entry. */
    readonly features?: readonly ('badge' | 'timer' | 'value')[];
    /** Automatic opening flag, or the key of its boolean setting (windows only). */
    readonly autoOpen?: boolean | UiSettingRef;
    /** Human-readable purpose for Studio and MCP. */
    readonly does: {
        /** Russian description. */
        readonly ru: string;
        /** English description. */
        readonly en: string;
    };
}
export interface UiSlots {
    readonly slots: readonly UiSlot[];
}
export interface UiSlotModule {
    readonly id: string;
    readonly settings?: Readonly<Record<string, unknown>>;
    readonly ui?: UiSlots;
}
export interface PlannedUiSlot {
    readonly moduleId: string;
    readonly slot: string;
    readonly zone: UiZone | null;
    readonly via: 'primary' | 'fallback' | 'none';
}
/** A window is always available explicitly, even when automatic presentation is off. */
export declare function uiZoneEnabled(settings: UiKitSettings, zone: UiZone, contexts?: readonly string[]): boolean;
/** Sorted by declared order, then module id, then slot id, independently of input order. */
export declare function planUiSlots(settings: UiKitSettings, modules: readonly UiSlotModule[]): readonly PlannedUiSlot[];
/** Strict manifest validation, including setting references, before publication or
 * runtime import. */
export declare function validateUiSlots(value: unknown, schema?: unknown): readonly string[];
//# sourceMappingURL=ui-slots.d.ts.map
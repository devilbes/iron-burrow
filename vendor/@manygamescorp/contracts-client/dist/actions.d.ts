/** JSON contracts for callable module actions (client-sdk#956). */
export type JSONSchema = boolean | Readonly<Record<string, unknown>>;
/** Inline argument and result schemas of one action. */
export interface CallableAction {
    /** Validated before the target runs. */
    readonly params?: JSONSchema;
    /** Validated before a result reaches the caller or then branch. */
    readonly result?: JSONSchema | 'mechanic-outcome@1';
}
/** Explicit opt-in to direct action calls. */
export interface ModuleActions {
    /** At most 32 action names, each matching the trigger action id syntax. */
    readonly callable: Readonly<Record<string, CallableAction>>;
}
/** Resolved gameplay outcome; reward has already been issued by the mechanic. */
export interface MechanicOutcome {
    readonly status: 'won' | 'lost' | 'quit' | 'cooldown' | 'error';
    readonly attemptId: string | null;
    /** Reward already issued by the mechanic, for display only. */
    readonly reward?: number;
    readonly availableAt?: number;
    readonly data?: unknown;
}
export declare const outcomeStatuses: readonly ["won", "lost", "quit", "cooldown", "error"];
/** Strict JSON, including finite numbers and UTF-8 size; no lossy JSON.stringify coercions. */
export declare function isActionJson(value: unknown, maxBytes?: number): boolean;
/** Check the mechanic-outcome@1 contract and its JSON size limits. */
export declare function isMechanicOutcome(value: unknown): value is MechanicOutcome;
/** Bounded inline JSON Schema subset; unsupported keywords fail at manifest validation. */
export declare function validActionSchema(s: unknown, depth?: number): s is JSONSchema;
/** First failing path, or undefined. Values must first pass strict JSON validation. */
export declare function actionSchemaError(s: JSONSchema, v: unknown, path: string): string | undefined;
export declare function validModuleActions(v: unknown): v is ModuleActions;
//# sourceMappingURL=actions.d.ts.map
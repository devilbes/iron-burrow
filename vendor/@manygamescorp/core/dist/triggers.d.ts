import { type ModuleActions, type MechanicOutcome } from '@manygamescorp/contracts-client/actions';
import type { WindowRequest, WindowTicket } from './window-triggers.js';
export declare const UI_ELEMENT_ACTION = "ui:element:action";
export interface UiElementAction {
    readonly element: string;
    readonly payload?: Readonly<Record<string, unknown>>;
}
export type TriggerSource = {
    readonly event: string;
} | {
    readonly element: string;
};
export interface TriggerActionRef {
    readonly module: string;
    readonly action: string;
    readonly params?: Readonly<Record<string, unknown>>;
    readonly then?: Partial<Record<MechanicOutcome['status'], readonly TriggerActionRef[]>>;
}
export interface TriggerRule {
    readonly id: string;
    readonly on: TriggerSource;
    readonly payload?: unknown;
    readonly when?: unknown;
    readonly priority?: number;
    readonly cooldownSec?: number;
    readonly maxPerSession?: number;
    readonly group?: string;
    readonly do: readonly TriggerActionRef[];
}
export interface TriggerActionContext {
    readonly rule: string;
    readonly source: TriggerSource;
    readonly payload: unknown;
    readonly signal: AbortSignal;
}
export interface EffectAction<R = unknown> {
    readonly kind: 'effect';
    run(params: Readonly<Record<string, unknown>>, context: TriggerActionContext): R | Promise<R>;
}
export interface WindowAction {
    readonly kind: 'window';
    readonly window: string;
}
export type ModuleAction = EffectAction | WindowAction;
export interface ActionCallOptions {
    readonly signal?: AbortSignal;
    readonly timeoutMs?: number;
}
export interface ActionClient {
    call<R = unknown>(module: string, action: string, params?: Readonly<Record<string, unknown>>, options?: ActionCallOptions): Promise<R>;
    publish(actions: Readonly<Record<string, ModuleAction>>): () => void;
}
export declare const PLACEMENT_MODULE = "ui";
export declare const PLACEMENT_ACTION = "placement";
export interface TriggerWindowQueue {
    has(module: string, window: string): boolean;
    enqueue(request: WindowRequest, signal: AbortSignal): Promise<WindowTicket | undefined>;
}
export interface TriggerEngineDeps {
    readonly activate?: (module: string) => Promise<void>;
    readonly target?: (module: string) => {
        readonly actions?: ModuleActions;
        readonly signal: AbortSignal;
    } | undefined;
    readonly now: () => number;
    readonly matches: (filter: unknown) => boolean;
    readonly rules: () => readonly TriggerRule[];
    readonly windows: TriggerWindowQueue;
    readonly automaticWindowsEnabled?: () => boolean;
    readonly cooldowns?: {
        get(rule: string): number | undefined;
        set(rule: string, at: number): void;
    };
    readonly unknownAction?: (rule: string, ref: TriggerActionRef) => void;
}
export interface TriggerEngine {
    publish(module: string, actions: Readonly<Record<string, ModuleAction>>): () => void;
    events(): readonly string[];
    handle(event: string, payload: unknown): Promise<void>;
    call<R = unknown>(module: string, action: string, params?: Readonly<Record<string, unknown>>, options?: ActionCallOptions): Promise<R>;
    resetSession(): void;
}
export declare function validRule(rule: unknown): rule is TriggerRule;
export declare function createTriggerEngine(deps: TriggerEngineDeps): TriggerEngine;
//# sourceMappingURL=triggers.d.ts.map
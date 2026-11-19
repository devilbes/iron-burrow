import type { EventBus } from './bus-types.js';
import { SDKError } from './error.js';
import type { ModuleContext, ModuleDefinition, ModuleState, ModuleStopReason } from './module.js';
export declare const MODULE_STATE_CHANGED = "module:state:changed";
export type ModuleLifecycleStep = 'init' | 'start' | 'stop' | 'dispose';
export interface ModuleStateChanged {
    readonly id: string;
    readonly from: ModuleState;
    readonly to: ModuleState;
    readonly reason?: SDKError | ModuleStopReason;
}
export interface ModuleLifecycleOptions {
    readonly timeoutMs?: number;
    readonly timeouts?: Partial<Readonly<Record<ModuleLifecycleStep, number>>>;
}
export declare class ModuleLifecycle {
    #private;
    readonly id: string;
    constructor(definition: ModuleDefinition, context: ModuleContext, bus: EventBus, options?: ModuleLifecycleOptions);
    get state(): ModuleState;
    get reason(): SDKError | undefined;
    get context(): ModuleContext;
    resolve(): void;
    init(): Promise<void>;
    start(): Promise<void>;
    stop(reason: ModuleStopReason): Promise<void>;
    dispose(): Promise<void>;
}
//# sourceMappingURL=lifecycle.d.ts.map
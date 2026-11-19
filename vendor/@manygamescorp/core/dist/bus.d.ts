import { isEventName } from './event-names.js';
import type { SdkModuleManifest } from './module.js';
import type { DebugEventBus, BusOptions, EventBus, ScopedBus, ScopedBusOptions } from './bus-types.js';
export type { BusDebugRecord, DebugEventBus, SdkDebug, BusOptions, BusTrace, EventBus, Listener, ListenerErrorPayload, OnOptions, HandleOptions, RequestContext, RequestHandler, RequestOptions, ScopedBus, ScopedBusOptions, StickyRecord, Unsubscribe, } from './bus-types.js';
export { isEventName };
export declare const EVENT_NAME_INVALID = "SDK_EVENT_NAME_INVALID";
export declare const LISTENER_ERROR_EVENT = "sdk:core:listener-error";
export declare const DEFAULT_STICKY_EVENTS: readonly string[];
export declare class EventNameError extends Error {
    readonly value: string;
    readonly code = "SDK_EVENT_NAME_INVALID";
    constructor(value: string);
}
export declare function isEventPattern(value: unknown): value is string;
export declare function createBus(options?: BusOptions): DebugEventBus;
export declare function createScopedBus(bus: EventBus, manifest: Pick<SdkModuleManifest, 'id' | 'events'>, options?: ScopedBusOptions): ScopedBus;
//# sourceMappingURL=bus.d.ts.map
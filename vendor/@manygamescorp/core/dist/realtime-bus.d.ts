import { type RealtimeEnvelope } from '@manygamescorp/contracts-client/realtime';
import type { EventBus } from './bus.js';
import type { RealtimeHandler, RealtimeView } from './realtime-port.js';
import type { SdkModuleManifest } from './module.js';
export declare function createRealtimeBus(bus: EventBus, manifest: (id: string) => SdkModuleManifest | undefined, activate: (id: string, signal: AbortSignal) => Promise<void>, connected?: () => boolean): {
    register: (module: string, type: string, handler: RealtimeHandler, signal: AbortSignal) => () => void;
    view(module: string, signal: AbortSignal): RealtimeView;
    critical(message: RealtimeEnvelope, signal: AbortSignal, recipients: readonly string[]): Promise<void>;
};
//# sourceMappingURL=realtime-bus.d.ts.map
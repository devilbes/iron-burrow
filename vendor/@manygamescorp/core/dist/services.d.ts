import type { ModuleContainer } from './container.js';
import type { ModuleServices, ModuleState, SdkModuleManifest } from './module.js';
export type { CapabilityService, ServiceCallContext } from './module.js';
export interface ModuleServicesOptions {
    readonly signal: AbortSignal;
    readonly state: (moduleId: string) => ModuleState | undefined;
    readonly current: (moduleId: string) => boolean;
    readonly generation: () => number;
    readonly starting?: (moduleId: string) => boolean;
    readonly available?: (moduleId: string) => boolean;
}
export declare function createModuleServices(manifest: SdkModuleManifest, container: ModuleContainer, options: ModuleServicesOptions): ModuleServices;
//# sourceMappingURL=services.d.ts.map
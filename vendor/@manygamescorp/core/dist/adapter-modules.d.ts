import type { BuildSelection } from '@manygamescorp/contracts-client/module-targets';
import { type PackageVersion, type createModuleLoader } from './loader.js';
import { type ModuleLifecycleOptions } from './lifecycle.js';
import { type AdapterModules, type ModuleContext, type SdkModuleManifest } from './module.js';
import type { EventBus } from './bus-types.js';
export declare function createAdapterModules(options: {
    readonly owner: SdkModuleManifest;
    readonly signal: AbortSignal;
    readonly loader: ReturnType<typeof createModuleLoader> | undefined;
    readonly coreVersion: string;
    readonly adapter: PackageVersion | undefined;
    readonly build?: BuildSelection;
    readonly bus: EventBus;
    readonly lifecycle: ModuleLifecycleOptions;
    readonly context: (manifest: SdkModuleManifest, signal: AbortSignal) => ModuleContext;
}): AdapterModules;
//# sourceMappingURL=adapter-modules.d.ts.map
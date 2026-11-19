import { type Diagnostics } from './diagnostics.js';
import type { ModuleContext, SdkModuleManifest } from './module.js';
export type ModuleContextPorts = Omit<ModuleContext, 'sdk' | 'settings'> & {
    readonly diagnostics?: Diagnostics;
    readonly settings?: Readonly<Record<string, unknown>>;
};
export declare function createModuleContext(manifest: SdkModuleManifest, ports: ModuleContextPorts, getModule: (id: string) => unknown): ModuleContext;
//# sourceMappingURL=module-context.d.ts.map
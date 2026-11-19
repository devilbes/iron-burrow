import type { ModuleDefinition, ModuleId, ModuleServices } from './module.js';
import type { ModuleRegistry } from './registry.js';
export declare class ModuleContainer implements Pick<ModuleServices, 'get' | 'require'> {
    #private;
    constructor(registry: ModuleRegistry);
    order(): readonly ModuleDefinition[];
    add(module: ModuleDefinition): void;
    remove(id: ModuleId): void;
    provider(capability: string): ModuleDefinition | undefined;
    provide<T>(moduleId: ModuleId, capability: string, service: T): void;
    get<T>(capability: string): T | undefined;
    require<T>(capability: string): T;
}
//# sourceMappingURL=container.d.ts.map
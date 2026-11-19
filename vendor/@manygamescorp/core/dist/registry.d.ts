import { type ModuleDefinition, type ModuleId } from './module.js';
export declare class ModuleRegistry {
    #private;
    register<Api>(definition: ModuleDefinition<Api>): ModuleDefinition<Api>;
    unregister(id: ModuleId): void;
    has(id: ModuleId): boolean;
    get<Api = unknown>(id: ModuleId): ModuleDefinition<Api>;
    list(): readonly ModuleDefinition[];
}
//# sourceMappingURL=registry.d.ts.map
import { type LocalizedText } from './module-settings.js';
export interface ModuleGroup {
    readonly id: string;
    readonly title: LocalizedText;
    readonly order: number;
}
export declare const MODULE_GROUPS: readonly ModuleGroup[];
/** Returns publication errors without relying on a server dependency. */
export declare function validateModuleCatalog(value: unknown): readonly string[];
//# sourceMappingURL=module-catalog.d.ts.map
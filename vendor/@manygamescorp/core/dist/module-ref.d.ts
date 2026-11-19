import type { ModuleLoad } from '@manygamescorp/contracts-client/module-composition';
export type { ModuleLoad } from '@manygamescorp/contracts-client/module-composition';
export interface ModuleRef {
    readonly id: string;
    readonly package: string;
    readonly version: string;
    readonly load: ModuleLoad;
    readonly onEvent?: string | undefined;
    readonly onRoute?: string | undefined;
    readonly source: 'local' | 'remote';
    readonly settings?: unknown;
}
//# sourceMappingURL=module-ref.d.ts.map
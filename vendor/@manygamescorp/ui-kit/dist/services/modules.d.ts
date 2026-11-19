import { type FeatureProps, type Outcome } from '../features/shared.js';
export interface ModuleRowView {
    readonly id: string;
    readonly source: string;
    readonly state: string;
    readonly loadable: boolean;
}
export interface ModulesProps extends FeatureProps {
    readonly modules: readonly ModuleRowView[];
    readonly result?: Outcome;
    readonly debug?: unknown;
}
export declare const modulesScreen: import("../core.js").KitComponent<ModulesProps>;
//# sourceMappingURL=modules.d.ts.map
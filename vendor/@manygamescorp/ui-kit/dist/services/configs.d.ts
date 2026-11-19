import { type FeatureProps, type Outcome } from '../features/shared.js';
export interface ConfigsProps extends FeatureProps {
    readonly locale: string;
    readonly locales: readonly {
        readonly tag: string;
        readonly name: string;
    }[];
    readonly snapshot?: unknown;
    readonly versions?: readonly (readonly [string, string])[];
    readonly hello: string;
    readonly items: (count: number) => string;
    readonly last?: Outcome;
    readonly experiments?: readonly {
        readonly name: string;
        readonly group: string;
    }[];
}
export declare const configs: import("../core.js").KitComponent<ConfigsProps>;
export declare const languageSettings: import("../core.js").KitComponent<ConfigsProps>;
//# sourceMappingURL=configs.d.ts.map
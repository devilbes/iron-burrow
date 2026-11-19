import { type FeatureProps, type Outcome } from '../features/shared.js';
export type LiveRow = readonly [label: string, value: string];
export interface ConfigsLiveProps extends FeatureProps {
    readonly headline: string;
    readonly segments: readonly string[];
    readonly experiments: readonly {
        readonly name: string;
        readonly group: string;
    }[];
    readonly difficulty: {
        readonly variant: string;
        readonly rows: readonly LiveRow[];
    };
    readonly updates: readonly LiveRow[];
    readonly asset?: {
        readonly key: string;
        readonly state: 'checking' | 'ok' | 'missing';
    };
    readonly last?: Outcome;
    readonly debug?: unknown;
}
export declare const configsLiveView: (p: ConfigsLiveProps) => import("../view-types.js").ViewNode;
export declare const configsLive: import("../core.js").KitComponent<ConfigsLiveProps>;
//# sourceMappingURL=configs-live.d.ts.map
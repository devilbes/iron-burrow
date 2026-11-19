import { type FeatureProps, type Outcome } from '../features/shared.js';
export type { Outcome } from '../features/shared.js';
export interface InspectorProps extends FeatureProps {
    readonly title: string;
    readonly hint: string;
    readonly fields: Readonly<Record<string, string>>;
    readonly drafts: Record<string, string>;
    readonly calls: readonly string[];
    readonly result?: Outcome;
}
export declare const inspector: import("../core.js").KitComponent<InspectorProps>;
export interface DiagnosticsProps extends FeatureProps {
    readonly facts: Readonly<Record<string, unknown>>;
    readonly context?: Outcome;
    readonly platformJson: unknown;
    readonly source: string;
    readonly modules: readonly (readonly [string, string])[];
    readonly events: readonly {
        readonly timestamp: number;
        readonly name: string;
        readonly type: string;
        readonly from?: string;
        readonly code?: string;
    }[];
}
export declare const diagnostics: import("../core.js").KitComponent<DiagnosticsProps>;
//# sourceMappingURL=inspector.d.ts.map
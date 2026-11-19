import { type FeatureProps, type Outcome } from '../features/shared.js';
export interface GameEventField {
    readonly name: string;
    readonly kind: 'integer' | 'string' | 'boolean';
    readonly min: number;
    readonly max: number;
}
export interface GameEventView {
    readonly key: string;
    readonly type: string;
    readonly title: string;
    readonly description: string;
    readonly trust: 'client' | 'server' | 'verified';
    readonly fields: readonly GameEventField[];
}
export interface GameEventRecord {
    readonly at: number;
    readonly type: string;
    readonly status: 'sent' | 'duplicate' | 'failed';
    readonly code?: string;
}
export interface GameEventsProps extends FeatureProps {
    readonly events: readonly GameEventView[];
    readonly journal: readonly GameEventRecord[];
    readonly invalid?: string;
    readonly result?: Outcome;
    readonly debug?: unknown;
}
export declare const gameEvents: import("../core.js").KitComponent<GameEventsProps>;
//# sourceMappingURL=events.d.ts.map
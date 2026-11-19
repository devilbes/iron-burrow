import { type FeatureProps } from '../features/shared.js';
export interface RealtimeProps extends FeatureProps {
    readonly status: unknown;
    readonly metrics?: unknown;
    readonly messages: readonly {
        readonly type: string;
        readonly id: string;
    }[];
    readonly error: string;
}
export declare const realtime: import("../core.js").KitComponent<RealtimeProps>;
//# sourceMappingURL=realtime.d.ts.map
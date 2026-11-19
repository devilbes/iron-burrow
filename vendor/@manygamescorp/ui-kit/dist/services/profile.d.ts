import type { ViewContext } from '../core.js';
import { type KvProps } from './kv.js';
import { type FeatureProps, type Outcome } from '../features/shared.js';
export interface ProfileProps extends FeatureProps {
    readonly gid?: number;
    readonly entries?: KvProps['entries'];
    readonly profile?: Outcome;
    readonly kv?: Outcome;
    readonly state?: Outcome;
    readonly public?: boolean;
}
export declare function profileView(p: ProfileProps, d: Record<string, string>, ctx: ViewContext<Record<string, string>>): import("../view-types.js").ViewNode;
export declare const profile: import("../core.js").KitComponent<ProfileProps>;
export declare const publicProfile: import("../core.js").KitComponent<ProfileProps>;
//# sourceMappingURL=profile.d.ts.map
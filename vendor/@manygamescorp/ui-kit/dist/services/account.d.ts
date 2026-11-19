import { type FeatureProps, type Outcome } from '../features/shared.js';
export interface AccountProps extends FeatureProps {
    readonly signedIn: boolean;
    readonly anonymous: boolean;
    readonly gid?: number;
    readonly session?: readonly (readonly [string, string])[];
    readonly last?: Outcome;
    readonly publicProfiles?: boolean;
}
export declare const account: import("../core.js").KitComponent<AccountProps>;
export declare const accountChip: import("../core.js").KitComponent<AccountProps>;
export declare const accountSettings: import("../core.js").KitComponent<AccountProps>;
//# sourceMappingURL=account.d.ts.map
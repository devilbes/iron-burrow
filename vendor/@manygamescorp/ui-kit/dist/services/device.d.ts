import { type FeatureProps, type Outcome } from '../features/shared.js';
export interface DeviceRow {
    readonly label: string;
    readonly value: string;
}
export interface DevicePermissionRow {
    readonly name: string;
    readonly status: string;
}
export interface DeviceProps extends FeatureProps {
    readonly info: readonly DeviceRow[];
    readonly capabilities: readonly DeviceRow[];
    readonly permissions: readonly DevicePermissionRow[];
    readonly haptics: boolean;
    readonly result?: Outcome;
    readonly debug?: unknown;
}
export declare const deviceScreen: import("../core.js").KitComponent<DeviceProps>;
//# sourceMappingURL=device.d.ts.map
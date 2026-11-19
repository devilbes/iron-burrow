import { type FeatureProps } from '../features/shared.js';
import type { ViewNode } from '../core.js';
export type SettingsToggle = 'sound' | 'music' | 'vibration' | 'notifications';
export interface SettingsLink {
    readonly id: string;
    readonly label: string;
}
export interface SettingsProps extends FeatureProps {
    readonly values?: Readonly<Partial<Record<SettingsToggle, boolean>>>;
    readonly languages?: readonly {
        readonly id: string;
        readonly label: string;
    }[];
    readonly account?: {
        readonly name?: string;
    };
    readonly links?: readonly SettingsLink[];
    readonly version?: string;
}
export declare function settingsView(p: SettingsProps): ViewNode;
export declare const settings: import("../core.js").KitComponent<SettingsProps>;
//# sourceMappingURL=settings.d.ts.map
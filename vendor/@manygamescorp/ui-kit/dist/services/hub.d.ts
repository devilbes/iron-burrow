import { type FeatureProps } from '../features/shared.js';
export interface HubItem {
    readonly id: string;
    readonly title: string;
    readonly hint: string;
    readonly available: boolean;
}
export interface HubSection {
    readonly id: string;
    readonly title: string;
    readonly items: readonly HubItem[];
}
export interface HubProps extends FeatureProps {
    readonly sections: readonly HubSection[];
    readonly debug?: unknown;
}
export declare const hub: import("../core.js").KitComponent<HubProps>;
//# sourceMappingURL=hub.d.ts.map
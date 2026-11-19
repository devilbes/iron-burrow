import { type FeatureProps, type Outcome } from '../features/shared.js';
export interface AboutScreen {
    readonly title: string;
    readonly controls: string;
    readonly href?: string;
}
export interface AboutIntegration {
    readonly name: string;
    readonly state: 'on' | 'off';
}
export interface PlatformAboutProps extends FeatureProps {
    readonly build: {
        readonly state: 'checking' | 'ok' | 'missing';
        readonly version?: string;
        readonly source?: string;
    };
    readonly screens: readonly AboutScreen[];
    readonly integrations: readonly AboutIntegration[];
    readonly webhooks: {
        readonly note: string;
        readonly href?: string;
    };
    readonly mcp: {
        readonly summary: string;
        readonly tools: readonly string[];
        readonly href?: string;
    };
    readonly publish: readonly string[];
    readonly last?: Outcome;
    readonly debug?: unknown;
}
export declare const platformAbout: import("../core.js").KitComponent<PlatformAboutProps>;
//# sourceMappingURL=platform-about.d.ts.map
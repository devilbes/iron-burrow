import { type FeatureProps } from '../features/shared.js';
import type { ViewNode } from '../core.js';
export type WebLoginProvider = 'google' | 'apple' | 'facebook';
export interface WebLoginGame {
    readonly id: string;
    readonly name: string;
    readonly connected: boolean;
    readonly current?: boolean;
    readonly icon?: string;
}
export type WebLoginSection = 'rewards' | 'games' | 'help';
export interface WebLoginProps extends FeatureProps {
    readonly providers: readonly WebLoginProvider[];
    readonly games: readonly WebLoginGame[];
    readonly account?: {
        readonly nickname: string;
        readonly points: number;
    };
    readonly signedIn?: boolean;
    readonly mobile?: boolean;
    readonly section?: WebLoginSection;
    readonly closable?: boolean;
    readonly privacyUrl?: string;
    readonly termsUrl?: string;
    readonly error?: boolean;
    readonly text?: WebText;
}
export declare const WEB_LOGIN_STRINGS: Readonly<Record<'ru' | 'en', Readonly<Record<string, string>>>>;
type WebText = (key: string, params?: Readonly<Record<string, string | number>>) => string;
export declare function webLoginText(lang?: string): WebText;
export declare function webLoginView(p: WebLoginProps, draft?: Record<string, string>): ViewNode;
export declare const webLogin: import("../core.js").KitComponent<WebLoginProps>;
export {};
//# sourceMappingURL=web-login.d.ts.map
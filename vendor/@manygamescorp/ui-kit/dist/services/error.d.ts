import { type FeatureProps } from '../features/shared.js';
import type { ViewChild, ViewNode } from '../core.js';
export interface StandardAction {
    readonly id: string;
    readonly label: string;
    readonly variant?: 'primary' | 'secondary' | 'text';
    readonly disabled?: boolean;
}
export type ErrorL10n = (key: string) => string;
export interface ErrorProps extends FeatureProps {
    readonly title?: string;
    readonly text?: string;
    readonly icon?: string;
    readonly actions?: readonly StandardAction[];
    readonly retry?: boolean;
    readonly code?: string;
    readonly kind?: ErrorKind;
    readonly l10n?: ErrorL10n;
    readonly rid?: string;
}
export declare const ERROR_STRINGS: Readonly<Record<'ru' | 'en', Readonly<Record<string, string>>>>;
export type ErrorKind = 'iap' | 'ads' | 'network' | 'generic';
export declare function errorKind(code: string | undefined, area?: ErrorKind): ErrorKind;
export declare const ERROR_ALIASES: Readonly<Record<string, string>>;
export declare function errorRetry(code: string | undefined): boolean;
export interface ErrorTexts {
    readonly title: string;
    readonly text: string;
    readonly window: string;
    readonly retry: string;
    readonly ok: string;
    readonly continue: string;
    readonly rid: string;
}
export declare function errorTexts(lang: string, code?: string, l10n?: ErrorL10n, area?: ErrorKind): ErrorTexts;
type KitAction = StandardAction & {
    readonly glyph?: ViewChild;
};
export declare function standardActions(p: FeatureProps, actions: readonly KitAction[], fallbackClose: string): ViewNode;
export interface ErrorAlert {
    readonly code?: string | undefined;
    readonly title?: string | undefined;
    readonly text?: string | undefined;
    readonly icon?: string | undefined;
    readonly kind?: ErrorKind | undefined;
    readonly l10n?: ErrorL10n | undefined;
    readonly retry?: {
        readonly intent: string;
        readonly payload: Readonly<Record<string, unknown>>;
    } | undefined;
    readonly head?: string | undefined;
    readonly rid?: string | undefined;
}
export declare function errorAlert(p: FeatureProps, alert: ErrorAlert): ViewNode;
export declare function errorView(p: ErrorProps): ViewNode;
export declare const error: import("../core.js").KitComponent<ErrorProps>;
export {};
//# sourceMappingURL=error.d.ts.map
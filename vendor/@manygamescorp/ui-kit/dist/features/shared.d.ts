import { type KitText } from '../services/login-strings.js';
import { view as h, type ViewNode, type ViewChild, type ViewContext, type EmitIntent, type PopupKind } from '../core.js';
import { type SkinLayer } from '../skin-layer.js';
import type { WindowOrientationOption } from '../window-layout.js';
export { h };
export interface FeatureProps {
    readonly orientation?: WindowOrientationOption;
    readonly elementId: string;
    readonly skinScope?: string;
    readonly lang: string;
    readonly currencyLabel?: string;
    readonly emitIntent: EmitIntent;
    readonly l10n?: KitText;
    readonly ready?: boolean;
    readonly busy?: boolean;
    readonly playerKey?: string;
    readonly assetUrl?: (key: string) => string;
}
export declare function assetImage(p: Pick<FeatureProps, 'assetUrl' | 'skinScope'> & {
    readonly lang?: string;
}, key: unknown, attrs?: Record<string, string | number>): ViewNode | null;
export declare function windowTitle(p: Pick<FeatureProps, 'elementId' | 'skinScope'>, title: string): ViewNode;
export declare function moduleImage(value: string, attrs?: Record<string, string | number>): ViewNode | null;
export interface Outcome {
    readonly action?: string;
    readonly value?: unknown;
    readonly error?: string;
}
export type Drafts = Record<string, string>;
export declare function component<P extends FeatureProps>(render: (p: P, d: Drafts, ctx: ViewContext<Drafts>) => ViewNode, options?: {
    readonly presentation?: 'fullscreen';
    readonly popupKind?: PopupKind;
    readonly styles?: string;
    readonly skin?: SkinLayer | false;
    readonly rendered?: (p: P, ctx: ViewContext<Drafts>) => void;
}): import("../core.js").KitComponent<P>;
export declare function text(p: Pick<FeatureProps, 'lang' | 'l10n'>, key: string, params?: Readonly<Record<string, string | number>>): string;
export declare function button(label: string, intent: string, p: FeatureProps, options?: {
    payload?: () => Readonly<Record<string, unknown>>;
    disabled?: boolean | undefined;
    ghost?: boolean;
    testid?: string;
    click?: () => void;
    prefix?: ViewChild;
    suffix?: ViewChild;
    className?: string;
    ariaLabel?: string;
    part?: string;
}): ViewNode;
export declare function heading(p: FeatureProps, title: string, subtitle: string): ViewNode;
export declare function details(p: FeatureProps, value: unknown, testid?: string): ViewNode;
export declare function outcome(p: FeatureProps, value: Outcome | undefined, testid: string): ViewChild;
export declare function field(d: Drafts, name: string, initial: string, testid: string): ViewNode;
export declare function record(value: unknown): Record<string, unknown>;
export declare function dialog(p: FeatureProps, title: string, close: () => void, ...children: ViewChild[]): ViewNode;
export declare function titledDialog(p: FeatureProps, title: string, eyebrow: string | undefined, close: () => void, ...children: ViewChild[]): ViewNode;
export interface WindowHead {
    readonly template?: string;
    readonly title: string;
    readonly closable?: boolean;
    readonly subtitle?: string | undefined;
    readonly eyebrow?: ViewChild;
    readonly art?: ViewChild;
    readonly artLarge?: boolean;
    readonly actions?: ViewChild;
}
export declare function windowDialog(p: FeatureProps, head: WindowHead, close: () => void, ...children: ViewChild[]): ViewNode;
export declare function windowSlots(p: FeatureProps, target: string, slots: Readonly<Record<string, ViewChild>>): ViewChild[];
export declare function headTitle(p: FeatureProps, head: Pick<WindowHead, 'title' | 'subtitle' | 'eyebrow'>): ViewNode;
export declare function closeButton(p: FeatureProps, close: () => void): ViewNode;
export declare function closeIcon(): ViewNode;
//# sourceMappingURL=shared.d.ts.map
import { type SkinLayer } from './skin-layer.js';
export type EmitIntent = (intent: string, payload?: Readonly<Record<string, unknown>>) => void;
export type PopupKind = 'content' | 'info' | 'alert' | 'fullscreen';
export interface KitComponent<P> {
    readonly presentation?: 'fullscreen';
    readonly popupKind?: PopupKind;
    mount(container: HTMLElement, props: P): void;
    update(container: HTMLElement, props: P): void;
    unmount(container: HTMLElement): void;
}
import type { ViewNode, ViewChild, ViewAttrs } from './view-types.js';
export type { ViewNode, ViewChild, ViewAttrs } from './view-types.js';
export declare function view(tag: string, attrs?: ViewAttrs, ...children: ViewChild[]): ViewNode;
export declare function sync(parent: Node, children: readonly ViewChild[], signal: AbortSignal): void;
export interface ViewContext<L> {
    readonly local: L;
    refresh(): void;
    readonly signal: AbortSignal;
    readonly root: ShadowRoot;
}
export interface ViewComponentOptions<P, L> {
    readonly responsive?: boolean;
    readonly presentation?: 'fullscreen';
    readonly popupKind?: PopupKind;
    readonly styles: string;
    readonly local: () => L;
    readonly render: (props: P, ctx: ViewContext<L>) => ViewNode;
    readonly rendered?: (props: P, ctx: ViewContext<L>) => void;
    readonly skin?: false | SkinLayer;
}
export declare function nameComponents(components: Readonly<Record<string, object>>): void;
export declare function componentName(component: object): string | undefined;
export declare function createViewComponent<P, L>(options: ViewComponentOptions<P, L>): KitComponent<P>;
//# sourceMappingURL=core.d.ts.map
import type { WindowOrientation } from './window-layout.js';
interface WindowContext {
    readonly component: string | undefined;
    readonly orientation: WindowOrientation | undefined;
}
export declare function withWindowContext<T>(context: WindowContext, render: () => T): T;
export declare function renderingWindow(): WindowContext | undefined;
export {};
//# sourceMappingURL=window-context.d.ts.map
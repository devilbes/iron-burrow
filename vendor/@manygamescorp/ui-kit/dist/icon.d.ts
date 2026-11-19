import { type ViewNode } from './core.js';
export interface IconOptions {
    readonly scope?: string | undefined;
    readonly attributes?: Readonly<Record<string, string | number | boolean | undefined>>;
    readonly itemId?: string;
    readonly assetUrl?: (itemId: string) => string;
}
export declare function iconUrl(key: string, options?: IconOptions): string | undefined;
export declare function skinIcon(key: string, size?: number, options?: IconOptions): ViewNode | null;
export declare function icon(key: string, size?: number, options?: IconOptions): ViewNode;
//# sourceMappingURL=icon.d.ts.map
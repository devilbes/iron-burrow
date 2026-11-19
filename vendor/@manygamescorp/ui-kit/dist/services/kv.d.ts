import { type FeatureProps, type Drafts } from '../features/shared.js';
import type { ViewContext, ViewNode } from '../core.js';
export type KvValue = string | number | boolean | null | {
    readonly [key: string]: KvValue;
} | readonly KvValue[];
export type KvType = 'string' | 'number' | 'boolean' | 'object';
export interface KvProps extends FeatureProps {
    readonly entries?: Readonly<Record<string, KvValue>>;
    readonly error?: string;
}
export declare function parseKvValue(type: string, value: string): KvValue;
export declare function kvView(p: KvProps, d: Drafts, ctx: ViewContext<Drafts>): ViewNode;
export declare const kv: import("../core.js").KitComponent<KvProps>;
//# sourceMappingURL=kv.d.ts.map
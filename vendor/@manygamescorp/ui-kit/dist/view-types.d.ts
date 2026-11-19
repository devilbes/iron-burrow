export type AttrValue = string | number | boolean | undefined;
export interface ViewNode {
    readonly tag: string;
    readonly attrs: Readonly<Record<string, AttrValue>>;
    readonly on: Readonly<Record<string, (event: Event) => void>>;
    readonly children: readonly ViewChild[];
}
export type ViewChild = ViewNode | string | number | null | undefined | false;
export interface ViewAttrs {
    readonly [name: string]: AttrValue | ((event: Event) => void);
}
//# sourceMappingURL=view-types.d.ts.map
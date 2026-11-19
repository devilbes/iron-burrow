export type WindowOrientation = 'portrait' | 'landscape';
export type WindowOrientationOption = WindowOrientation | 'auto';
export declare function windowOrientation(requested: WindowOrientationOption | undefined, viewport: {
    readonly width: number;
    readonly height: number;
}): WindowOrientation;
//# sourceMappingURL=window-layout.d.ts.map
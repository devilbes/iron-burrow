export interface CurveParam {
    readonly min: number;
    readonly max: number;
}
export type CurveSpec<P extends string> = Readonly<Record<P, CurveParam>>;
export type CurvePoint<P extends string> = {
    readonly level: number;
} & Readonly<Record<P, number>>;
export interface Curve<P extends string> {
    readonly spec: CurveSpec<P>;
    readonly jsonSchema: Readonly<Record<string, unknown>>;
    validate(points: unknown): readonly CurvePoint<P>[];
    evaluate(level: number, points: readonly CurvePoint<P>[]): Readonly<Record<P, number>>;
}
export interface MechanicSettingsRecord<P extends string> {
    curve: readonly CurvePoint<P>[];
    [own: string]: unknown;
}
export interface LoadedCurve<P extends string> {
    readonly points: readonly CurvePoint<P>[];
    readonly record: Readonly<Record<string, unknown>>;
}
export declare function createCurve<P extends string>(spec: CurveSpec<P>, refine?: (params: Record<P, number>) => Record<P, number>): Curve<P>;
//# sourceMappingURL=mechanic-curve.d.ts.map
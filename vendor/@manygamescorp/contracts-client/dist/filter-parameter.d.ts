/** Portable filter parameter descriptor, shared without runtime import cycles. */
export interface FilterParameter {
    readonly type: 'string' | 'number' | 'boolean' | 'enum' | 'version' | 'date';
    readonly values?: readonly string[];
    readonly open?: boolean;
    readonly allowEmpty?: boolean;
}
//# sourceMappingURL=filter-parameter.d.ts.map
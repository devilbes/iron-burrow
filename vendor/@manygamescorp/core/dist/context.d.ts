export interface CallContext {
    readonly rid: string;
    readonly moduleId: string;
    readonly operation: string;
    readonly parentRid?: string;
}
export interface CallContextInit {
    readonly moduleId: string;
    readonly operation: string;
    readonly parent?: CallContext;
    readonly rid?: string;
}
export declare function createCallContext(init: CallContextInit): CallContext;
export declare function randomUuid(): string;
export declare function randomUuidV7(now: number): string;
//# sourceMappingURL=context.d.ts.map
export type PortalKind = 'request' | 'response' | 'event' | 'subscribe' | 'unsubscribe';
export interface PortalErrorData {
    code: string;
    message: string;
    retryable: boolean;
}
export interface PortalEnvelope {
    mpg: 'bus';
    v: 1;
    id: string;
    kind: PortalKind;
    ns: string;
    type: string;
    correlationId: string | null;
    payload: unknown;
    error?: PortalErrorData;
    ts: number;
}
export interface PortalSchema {
    safeParse(value: unknown): {
        success: boolean;
        data?: unknown;
    };
}
export interface PortalHandlerContext {
    version: number;
    signal: AbortSignal;
}
export interface BusDomain {
    ns: string;
    versions: readonly number[];
    schemas: Readonly<Record<string, PortalSchema>>;
    responseSchemas?: Readonly<Record<string, PortalSchema>>;
    handlers?: Readonly<Record<string, (payload: unknown, context: PortalHandlerContext) => unknown | Promise<unknown>>>;
    topics?: readonly string[];
    timeouts?: Readonly<Record<string, number>>;
}
export declare class PortalBusError extends Error implements PortalErrorData {
    readonly code: string;
    readonly retryable: boolean;
    constructor(code: string, retryable?: boolean);
}
export declare const PORTAL_MAX_BYTES: number;
export declare const PORTAL_RATE = 20;
export declare const portalUuid: (value: unknown) => value is string;
export declare const portalName: (value: unknown) => value is string;
export declare function portalRecord(value: unknown): value is Record<string, unknown>;
export declare function portalJson(value: unknown): boolean;
export declare function parsePortalEnvelope(value: unknown): PortalEnvelope | undefined;
//# sourceMappingURL=portal-protocol.d.ts.map
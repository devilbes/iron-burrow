import { SDKError } from './error.js';
export declare function requestError(error: unknown, module: string, rid: string): SDKError;
export declare function snapshotError(source: SDKError): SDKError;
export declare function cloneBusPayload<T>(value: T): T;
//# sourceMappingURL=bus-payload.d.ts.map
import type { ScopedHttp, ScopedRequestSpec } from './scoped-http.js';
export type DataHttp = Pick<ScopedHttp, 'request'>;
export interface DataClient {
    request<T>(spec: ScopedRequestSpec, caller?: AbortSignal): Promise<T>;
    dispose(): void;
}
export declare function dataClient(module: string, http: DataHttp, signal?: AbortSignal): DataClient;
//# sourceMappingURL=data-client.d.ts.map
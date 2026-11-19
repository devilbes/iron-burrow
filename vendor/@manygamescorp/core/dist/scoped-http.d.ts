import { type Endpoints } from './endpoints.js';
import { type SdkModuleManifest } from './module.js';
import { type HttpTransportOptions, type HttpTransport } from './transport.js';
import type { ScopedHttp } from './scoped-http-types.js';
export type { ScopedHttp, ScopedRequestSpec } from './scoped-http-types.js';
export declare function createHttpContext(platformConfig: unknown, options?: Omit<HttpTransportOptions, 'endpoints'>): (manifest: SdkModuleManifest) => {
    readonly http?: ScopedHttp;
};
export declare function createScopedHttp(transport: HttpTransport, endpoints: Endpoints, manifest: Pick<SdkModuleManifest, 'id' | 'permissions'> & Partial<Pick<SdkModuleManifest, 'kind'>>, service?: string): ScopedHttp | undefined;
//# sourceMappingURL=scoped-http.d.ts.map
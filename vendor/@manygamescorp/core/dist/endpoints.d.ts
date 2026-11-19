import type { PlatformConfig } from '@manygamescorp/contracts-client/platform-config';
import type { PublicProviderConfig } from './provider-config-types.js';
export type { PlatformConfig } from '@manygamescorp/contracts-client/platform-config';
export interface Endpoints {
    readonly appId: number;
    readonly api: string;
    readonly cdn: string;
    service(service: string): string;
}
export declare function parsePlatformConfig(input: unknown): PlatformConfig;
export declare function createEndpoints(platformConfig: unknown): Endpoints;
export declare function servicePrefix(service: string): `/v1/${string}`;
export declare function parseProviderConfig(value: unknown): PublicProviderConfig;
export declare function parseOAuthConfigResponse(value: unknown): PublicProviderConfig;
//# sourceMappingURL=endpoints.d.ts.map
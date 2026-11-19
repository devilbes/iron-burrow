import type { PublicLoginProviders } from '@manygamescorp/contracts-client/platform-config';
export interface PublicProviderConfig extends Partial<PublicLoginProviders> {
    readonly supportedPlatforms?: {
        readonly google?: readonly ('web' | 'android')[];
        readonly facebook?: readonly 'web'[];
    };
}
//# sourceMappingURL=provider-config-types.d.ts.map
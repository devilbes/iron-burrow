import type { PublicProviderConfig } from './provider-config-types.js';
export type { PublicProviderConfig } from './provider-config-types.js';
export { parseOAuthConfigResponse, parseProviderConfig } from './endpoints.js';
import type { HttpTransport } from './transport.js';
export type ConfiguredProvider = 'google' | 'facebook';
export type ProviderPlatform = 'web' | 'android' | 'ios';
export interface GoogleProviderAttempt {
    readonly provider: 'google';
    readonly attemptId: string;
    readonly expiresAt: string;
    readonly nonce: string;
    readonly clientId: string;
    readonly androidClientId?: string;
}
export interface FacebookProviderAttempt {
    readonly provider: 'facebook';
    readonly attemptId: string;
    readonly expiresAt: string;
    readonly authorizationUrl: string;
    readonly redirectUri: string;
}
export type ProviderAttempt = GoogleProviderAttempt | FacebookProviderAttempt;
export type ProviderAttemptRequest = {
    readonly provider: 'google';
    readonly mode: 'signin' | 'link';
} | {
    readonly provider: 'facebook';
    readonly mode: 'signin' | 'link';
    readonly redirectUri?: string;
};
export type ProviderCompleteRequest = {
    readonly attemptId: string;
    readonly idToken: string;
} | {
    readonly attemptId: string;
};
export interface ProviderEmailRequired {
    readonly emailRequired: true;
    readonly linkTicket: string;
    readonly provider: ConfiguredProvider;
}
export interface ProviderAuthAdapters {
    readonly google?: {
        readonly platforms: readonly ('web' | 'android')[];
        requestIdToken(request: {
            readonly nonce: string;
            readonly clientId: string;
            readonly androidClientId?: string;
            readonly platform: 'web' | 'android';
            readonly signal: AbortSignal;
        }): Promise<string>;
    };
    readonly facebook?: {
        open(authorizationUrl: string): ProviderPopup;
    };
}
export interface ProviderPopup {
    readonly closed: boolean;
    close(): void;
}
export interface ReservedProviderPopup extends ProviderPopup {
    navigate(url: string): void;
}
export declare function reserveFacebookPopup(): ReservedProviderPopup | undefined;
export interface ProviderFlowOptions {
    readonly signal?: AbortSignal;
    readonly redirectUri?: string;
}
export declare function availableProviders(config: PublicProviderConfig, platform: ProviderPlatform, adapters: ProviderAuthAdapters): readonly ConfiguredProvider[];
export declare function completeProvider(options: {
    readonly transport: HttpTransport;
    readonly config: PublicProviderConfig;
    readonly provider: ConfiguredProvider;
    readonly mode: 'signin' | 'link';
    readonly platform: ProviderPlatform;
    readonly adapters: ProviderAuthAdapters;
    readonly signal: AbortSignal;
    readonly redirectUri?: string;
    readonly now: () => number;
    readonly live: () => void;
    readonly popup?: ReservedProviderPopup;
    readonly api: string;
}): Promise<unknown>;
export declare function abortable<T>(signal: AbortSignal, run: () => Promise<T>): Promise<T>;
//# sourceMappingURL=provider-auth.d.ts.map
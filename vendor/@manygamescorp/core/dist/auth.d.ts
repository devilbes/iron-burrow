import { type PortalAuthSession } from './portal-session.js';
export type { PortalAuthSession } from './portal-session.js';
import type { PortalCore } from './portal-core.js';
import { type AccountApi } from './account-api.js';
export type { ManyPlayAccount, ManyPlayGame, ManyPlayGames } from './account-api.js';
import { type ConfiguredProvider, type ProviderAuthAdapters, type ProviderEmailRequired, type ProviderFlowOptions, type PublicProviderConfig } from './provider-auth.js';
export type { ConfiguredProvider, ProviderAuthAdapters, ProviderEmailRequired, ProviderFlowOptions, ProviderPlatform, PublicProviderConfig, ProviderAttempt, ProviderAttemptRequest, ProviderCompleteRequest, GoogleProviderAttempt, FacebookProviderAttempt } from './provider-auth.js';
export type ProviderAuthResult = AuthCodeResult | ProviderEmailRequired;
export type ProviderLinkResult = AuthLinks;
import type { PlatformAdapter } from './platform.js';
import { type StorageBackend } from './storage/scoped.js';
import type { HttpTransport } from './transport.js';
export declare const AUTH_IDENTITY_CHANGED = "auth:identity:changed";
export type RestoredBy = 'storage' | 'keystore' | 'token' | 'grace' | 'device_key' | 'device_id' | 'legacy_did' | 'new_guest' | 'social' | 'code' | 'portal';
export interface AuthSession {
    readonly clientAuthoritative?: boolean;
    readonly uid: number;
    readonly gid: number;
    readonly anonymous: boolean;
    readonly geo: string;
    readonly expiresAt: string;
    readonly restoredBy: RestoredBy;
    readonly account?: AuthAccount;
}
export interface AuthAccount {
    readonly registeredAt: number;
    readonly lastLoginAt: number;
}
export interface AuthIdentityChanged {
    readonly previousGid: number | null;
    readonly gid: number | null;
    readonly reason: 'init' | 'refresh' | 'logout' | 'signin';
}
export declare const AUTH_PLAYER_CHANGED = "auth:playerChanged";
export type AuthPlayerChanged = AuthIdentityChanged;
export declare const AUTH_ACCOUNT_CHANGING = "auth:account:changing";
export declare const AUTH_ACCOUNT_CHANGED = "auth:account:changed";
export declare const AUTH_SWITCH_SAVE_MS = 5000;
export interface AuthAccountChange {
    readonly previousGid: number;
    readonly gid: number;
}
export declare const AUTH_SIGNIN_STARTED = "auth:signin:started";
export declare const AUTH_CODE_SENT = "auth:code:sent";
export declare const AUTH_SIGNIN_SUCCEEDED = "auth:signin:succeeded";
export declare const AUTH_SIGNIN_FAILED = "auth:signin:failed";
export declare const AUTH_LINKS_CHANGED = "auth:links:changed";
export declare const AUTH_RESEND_MS = 60000;
export type AuthProvider = 'google' | 'apple' | 'facebook';
export declare const AUTH_PROVIDERS: readonly AuthProvider[];
export interface AuthSigninRequest {
    readonly email: string;
    readonly child?: boolean;
    readonly linkTicket?: string;
}
export interface AuthSigninResult {
    readonly rid: string;
    readonly expiresAt: string;
    readonly resendAt: number;
}
export interface AuthCodeRequest {
    readonly rid: string;
    readonly code: string;
}
export interface PortalAuthCodeRequest extends AuthCodeRequest {
    readonly audience: 'portal';
}
export interface AuthCodeResult {
    readonly upgradeType: 'upgrade' | 'migrate' | 'switch' | 'login';
    readonly conflict: boolean;
    readonly pending: boolean;
    readonly uid: number;
    readonly gid: number;
    readonly linked?: readonly AuthProvider[];
}
export interface AuthLinks {
    readonly providers: readonly AuthProvider[];
    readonly anonymous: boolean;
}
export interface AuthLinkRequest {
    readonly pr: 'apple';
    readonly et: string;
    readonly nonce?: string;
}
export interface Auth extends AccountApi {
    readonly session: AuthSession | undefined;
    readonly portalSession: PortalAuthSession | undefined;
    restorePortal(): Promise<PortalAuthSession | undefined>;
    refreshPortal(): Promise<PortalAuthSession | undefined>;
    readonly pending: AuthCodeResult | undefined;
    init(): Promise<AuthSession>;
    refresh(): Promise<AuthSession>;
    logout(): Promise<void>;
    resume(uid: number): Promise<AuthSession>;
    savedEmail(uid: number): Promise<string | undefined>;
    forgetSaved(): Promise<void>;
    signin(request: AuthSigninRequest): Promise<AuthSigninResult>;
    code(request: PortalAuthCodeRequest): Promise<PortalAuthSession>;
    code(request: AuthCodeRequest): Promise<AuthCodeResult>;
    confirm(): Promise<AuthSession>;
    onAccountChanging(listener: (change: AuthAccountChange) => Promise<void> | void): () => void;
    discard(): void;
    links(): AuthLinks | undefined;
    getProviderConfig(): Promise<PublicProviderConfig>;
    availableProviders(): Promise<readonly ConfiguredProvider[]>;
    signinWithProvider(provider: ConfiguredProvider, options?: ProviderFlowOptions): Promise<ProviderAuthResult>;
    linkProvider(provider: ConfiguredProvider, options?: ProviderFlowOptions): Promise<ProviderLinkResult>;
    cancelProvider(): void;
    link(request: AuthLinkRequest): Promise<AuthLinks>;
    unlink(provider: AuthProvider): Promise<AuthLinks>;
}
export declare function refusedById(error: unknown): boolean;
export interface AuthController {
    readonly api: Auth;
    token(): string | undefined;
    storageCurrent(): boolean;
    unauthorized(token: string): void;
    deviceId(): Promise<string>;
    idle(): Promise<void>;
    dispose(): void;
}
export interface AuthOptions {
    readonly clientAuthoritative?: boolean;
    readonly portal?: PortalCore;
    readonly appId: number;
    readonly api: string;
    readonly local?: StorageBackend;
    readonly transport: HttpTransport;
    readonly platform: Pick<PlatformAdapter, 'id' | 'device' | 'secureStore'>;
    readonly providerAdapters?: ProviderAuthAdapters;
    readonly emit?: (event: string, payload: unknown) => void;
    readonly now?: () => number;
    readonly refreshBeforeMs?: number;
    readonly onSession?: (session: AuthSession | undefined) => void;
    readonly beforeSwitch?: (signal: AbortSignal) => Promise<void>;
    readonly switchSaveMs?: number;
}
export declare function createAuth(options: AuthOptions): AuthController;
export declare function normalizeEmail(value: unknown): string | undefined;
//# sourceMappingURL=auth.d.ts.map
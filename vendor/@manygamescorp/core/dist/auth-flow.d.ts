import { type NicknameAvailability, type ManyPlayAccount, type ManyPlayGame } from './account-api.js';
import { type Auth, type AuthCodeResult, type AuthProvider } from './auth.js';
export type AuthFlowStep = 'start' | 'email' | 'code' | 'confirm' | 'email-required' | 'profile' | 'loading-player' | 'switch-account' | 'signed-out' | 'done' | 'closed';
export type AuthFlowPlatform = string;
export declare const AUTH_EMAIL_REQUIRED = "auth:email:required";
export declare const AUTH_FLOW_INTENTS: readonly string[];
export interface AuthFlowError {
    readonly code: string;
    readonly retryAfterMs?: number;
    readonly attemptsLeft?: number;
}
export interface AuthFlowAccount {
    readonly uid: number;
    readonly gid: number;
    readonly anonymous: boolean;
    readonly upgradeType?: AuthCodeResult['upgradeType'];
}
export type AccountScreen = 'home' | 'games' | 'catalog' | 'currency' | 'friends' | 'settings' | 'nickname' | 'nickname-success' | 'logout';
export interface AuthFlowState {
    readonly accountScreen?: AccountScreen;
    readonly accountCopied?: boolean;
    readonly accountDetails?: ManyPlayAccount | undefined;
    readonly games?: readonly ManyPlayGame[] | undefined;
    readonly gamesCursor?: string | null | undefined;
    readonly nicknameDraft?: string | undefined;
    readonly nicknameAvailability?: NicknameAvailability | undefined;
    readonly nicknameChecking?: boolean | undefined;
    readonly step: AuthFlowStep;
    readonly providers: readonly string[];
    readonly busy: boolean;
    readonly maskedEmail?: string | undefined;
    readonly emailHint?: string | undefined;
    readonly error?: AuthFlowError | undefined;
    readonly resendAt?: number | undefined;
    readonly code?: string | undefined;
    readonly codeSource?: 'paste' | 'link' | undefined;
    readonly account?: AuthFlowAccount | undefined;
    readonly conflict: boolean;
    readonly created: boolean;
    readonly emailRequired?: string | undefined;
    readonly linked: readonly AuthProvider[];
    readonly linkable: readonly string[];
    readonly child: boolean;
}
export interface AuthFlowProviderAdapter {
    readonly id: string;
    readonly platforms: readonly string[];
    signin(): Promise<AuthCodeResult | {
        readonly emailRequired: true;
    }>;
    link?(auth: Auth): Promise<void>;
}
export interface AuthFlowProviders {
    readonly adapters: readonly AuthFlowProviderAdapter[];
    enabled(): Promise<readonly string[]>;
}
export interface AuthFlowOptions {
    readonly auth: Auth;
    readonly subscribePlayerChanged?: (listener: () => void) => () => void;
    readonly subscribeSessionEnded?: (listener: () => void) => () => void;
    readonly waitForPlayerReady?: (gid: number) => Promise<void>;
    readonly playerReadyTimeoutMs?: number;
    readonly platform: AuthFlowPlatform;
    readonly providers?: AuthFlowProviders;
    readonly readClipboard?: () => Promise<string | undefined>;
    readonly writeClipboard?: (value: string) => Promise<void>;
    readonly emit?: (event: string, payload: unknown) => void;
    readonly now?: () => number;
    readonly child?: boolean;
}
export interface AuthFlowController {
    readonly state: AuthFlowState;
    subscribe(listener: (state: AuthFlowState) => void): () => void;
    open(step?: 'start' | 'profile'): Promise<void>;
    intent(name: string, payload?: Readonly<Record<string, unknown>>): Promise<void>;
    openUrl(url: string): boolean;
    dispose(): void;
}
export declare function maskEmail(email: string): string;
export declare function createAuthFlow(options: AuthFlowOptions): AuthFlowController;
//# sourceMappingURL=auth-flow.d.ts.map
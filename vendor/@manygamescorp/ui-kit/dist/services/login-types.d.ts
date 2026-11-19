import type { EmitIntent } from '../core.js';
export type LoginProvider = string;
export type LoginStep = 'start' | 'email' | 'code' | 'confirm' | 'email-required' | 'profile' | 'loading-player' | 'done' | 'closed' | 'accounts' | 'switch-account' | 'signed-out';
export interface LoginState {
    readonly accountScreen?: 'home' | 'games' | 'catalog' | 'currency' | 'friends' | 'settings' | 'nickname' | 'nickname-success' | 'logout';
    readonly accountCopied?: boolean;
    readonly accountDetails?: {
        readonly nickname: string;
        readonly email: string | null;
        readonly nicknameChangesRemaining: number;
        readonly signInMethods: readonly string[];
        readonly crossFeatures?: boolean;
    } | undefined;
    readonly games?: readonly {
        readonly appId: number;
        readonly name: string;
        readonly iconUrl: string | null;
        readonly playing: boolean;
        readonly gid: number | null;
        readonly lastLoginAt: string | null;
        readonly links: {
            readonly web: string | null;
            readonly googlePlay: string | null;
            readonly appStore: string | null;
        };
    }[] | undefined;
    readonly gamesCursor?: string | null | undefined;
    readonly nicknameDraft?: string | undefined;
    readonly nicknameChecking?: boolean | undefined;
    readonly nicknameAvailability?: {
        readonly nickname: string;
        readonly available: boolean;
        readonly suggestions: readonly string[];
    } | undefined;
    readonly step: LoginStep;
    readonly providers: readonly LoginProvider[];
    readonly busy: boolean;
    readonly maskedEmail?: string | undefined;
    readonly emailHint?: string | undefined;
    readonly error?: {
        readonly code: string;
        readonly retryAfterMs?: number;
        readonly attemptsLeft?: number;
    } | undefined;
    readonly resendAt?: number | undefined;
    readonly code?: string | undefined;
    readonly codeSource?: 'paste' | 'link' | undefined;
    readonly account?: {
        readonly uid: number;
        readonly gid: number;
        readonly anonymous: boolean;
        readonly nickname?: string;
        readonly upgradeType?: string;
    } | undefined;
    readonly conflict: boolean;
    readonly created: boolean;
    readonly emailRequired?: LoginProvider | undefined;
    readonly linked: readonly LoginProvider[];
    readonly linkable: readonly LoginProvider[];
    readonly child: boolean;
}
export interface GameMetric {
    readonly label: string;
    readonly value: string | number;
    readonly unit?: string;
}
export interface RememberedAccount {
    readonly uid: number;
    readonly gid: number;
    readonly name: string;
    readonly maskedEmail: string;
    readonly avatar?: string;
}
export interface LoginProps {
    readonly assetUrl?: (key: string) => string;
    readonly cookieDetails?: boolean;
    readonly accounts?: readonly RememberedAccount[];
    readonly appIcon?: string;
    readonly avatar?: string;
    readonly currentAppId?: number;
    readonly platform?: string;
    readonly gameLink?: {
        readonly key: 'web' | 'googlePlay' | 'appStore';
        readonly label: string;
    } | undefined;
    readonly gameMetric?: GameMetric;
    readonly gameMetrics?: Readonly<Record<number, GameMetric>>;
    readonly crossCurrency?: {
        readonly label: string;
        readonly value: string | number;
        readonly unit?: string;
        readonly iconUrl?: string;
    };
    readonly crossEarned?: Readonly<Record<number, string | number>>;
    readonly loadingPlayer?: boolean;
    readonly loadingProgress?: number;
    readonly privacyUrl?: string;
    readonly termsUrl?: string;
    readonly helpUrl?: string;
    readonly faqUrl?: string;
    readonly state: LoginState;
    readonly emitIntent: EmitIntent;
    readonly game: string;
    readonly lang?: string;
    readonly languages?: readonly {
        readonly id: string;
        readonly label: string;
    }[];
    readonly text?: (key: string, params?: Readonly<Record<string, string | number>>) => string;
    readonly orientation?: 'portrait' | 'landscape' | 'auto';
    readonly now: () => number;
}
//# sourceMappingURL=login-types.d.ts.map
import type { RequestSpec } from './transport.js';
export interface ManyPlayAccount {
    readonly nickname: string;
    readonly nicknameChangesRemaining: number;
    readonly email: string | null;
    readonly signInMethods: readonly string[];
    readonly crossFeatures: boolean;
}
export interface ManyPlayGame {
    readonly appId: number;
    readonly name: string;
    readonly iconUrl: string | null;
    readonly links: {
        readonly web: string | null;
        readonly googlePlay: string | null;
        readonly appStore: string | null;
    };
    readonly status: 'active';
    readonly playing: boolean;
    readonly gid: number | null;
    readonly firstLoginAt: string | null;
    readonly lastLoginAt: string | null;
}
export interface ManyPlayGames {
    readonly items: readonly ManyPlayGame[];
    readonly nextCursor: string | null;
}
export interface NicknameAvailability {
    readonly nickname: string;
    readonly available: boolean;
    readonly suggestions: readonly string[];
}
export interface AccountApi {
    checkMyNicknameAvailability(nickname: string, signal?: AbortSignal): Promise<NicknameAvailability>;
    getAccount(signal?: AbortSignal): Promise<ManyPlayAccount>;
    changeNickname(nickname: string, signal?: AbortSignal): Promise<{
        readonly nickname: string;
        readonly nicknameChangesRemaining: number;
    }>;
    suggestNickname(signal?: AbortSignal): Promise<{
        readonly nickname: string;
    }>;
    getGames(options?: {
        readonly cursor?: string;
        readonly limit?: number;
        readonly signal?: AbortSignal;
    }): Promise<ManyPlayGames>;
}
export declare const validNickname: (v: unknown) => v is string;
export declare function createAccountApi(request: (spec: RequestSpec) => Promise<unknown>): AccountApi;
//# sourceMappingURL=account-api.d.ts.map
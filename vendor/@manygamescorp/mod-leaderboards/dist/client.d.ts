import { SDKError } from '@manygamescorp/core/error';
import type { ScopedHttp } from '@manygamescorp/core/scoped-http';
export type LeaderboardsErrorCode = 'LEADERBOARD_NOT_STARTED' | 'LEADERBOARDS_BOARD_EXPIRED' | 'INVALID_LEADERBOARD_KEY';
export declare class LeaderboardsError extends SDKError {
    readonly code: LeaderboardsErrorCode;
    constructor(code: LeaderboardsErrorCode, error: SDKError);
}
export interface LeaderboardEntry {
    readonly gid: number;
    readonly rank: number;
    readonly score: number;
    readonly profile?: PublicProfile;
}
export interface PublicProfile {
    readonly gid: number;
    readonly name: string;
    readonly avatar: string | null;
    readonly level: number;
}
export interface BoardMe {
    readonly rank: number | null;
    readonly score: number | null;
}
export interface BoardPage {
    readonly boardId: string;
    readonly leaderboardKey: string;
    readonly scope: 'regional' | 'clan';
    readonly value: string;
    readonly expiresAt: string | null;
    readonly total: number;
    readonly order: 'desc' | 'asc';
    readonly items: readonly LeaderboardEntry[];
    readonly nextCursor: string | null;
    readonly me: BoardMe;
    readonly serverTime: string;
}
export interface RankResponse {
    readonly boardId: string;
    readonly gid: number;
    readonly rank: number | null;
    readonly score: number | null;
}
export interface AroundResponse extends RankResponse {
    readonly entries: readonly LeaderboardEntry[];
}
export interface PageOptions {
    readonly limit?: number;
    readonly cursor?: string;
    readonly order?: 'desc' | 'asc';
}
export interface AroundOptions {
    readonly above?: number;
    readonly below?: number;
    readonly radius?: number;
}
export interface SubmitScoreInput {
    readonly scoreDelta?: number;
    readonly scoreValue?: number;
    readonly eventId: string;
    readonly occurredAt: string;
    readonly idempotencyKey: string;
}
export interface SubmitBoardResult {
    readonly boardId: string;
    readonly scope: 'regional' | 'clan';
    readonly value: string;
    readonly updated: boolean;
    readonly deduplicated: boolean;
    readonly score?: number;
    readonly rank?: number | null;
    readonly error?: SubmitBoardError;
}
export interface SubmitBoardError {
    readonly code: string;
}
export interface SubmitScoreResult {
    readonly leaderboardKey: string;
    readonly gid: number;
    readonly boards: readonly SubmitBoardResult[];
}
export interface ProfilePort {
    query(request: {
        readonly gids: readonly number[];
    }, options?: {
        readonly signal?: AbortSignal;
    }): Promise<{
        readonly items: readonly PublicProfile[];
    }>;
}
export interface BoardFetchedPayload {
    readonly boardId: string;
    readonly leaderboardKey: string;
}
export interface RankChangedPayload {
    readonly boardId: string;
    readonly rank: number | null;
    readonly previousRank: number | null;
}
export type LeaderboardsEvent = {
    readonly name: 'leaderboards:board:fetched';
    readonly payload: BoardFetchedPayload;
} | {
    readonly name: 'leaderboards:rank:changed';
    readonly payload: RankChangedPayload;
};
export interface Leaderboards {
    readonly canSubmit: boolean;
    get(leaderboardKey: string, options?: PageOptions): Promise<BoardPage>;
    around(leaderboardKey: string, options?: AroundOptions): Promise<AroundResponse>;
    aroundOf(leaderboardKey: string, gid: number, options?: AroundOptions): Promise<AroundResponse>;
    rank(leaderboardKey: string): Promise<RankResponse>;
    rankOf(leaderboardKey: string, gid: number): Promise<RankResponse>;
    submit(leaderboardKey: string, input: SubmitScoreInput): Promise<SubmitScoreResult>;
    submitScore(leaderboardKey: string, input: SubmitScoreInput): Promise<SubmitScoreResult>;
    dispose(): void;
}
export interface LeaderboardsDeps {
    readonly http: Pick<ScopedHttp, 'request'>;
    readonly clientAuthoritative?: boolean | (() => boolean);
    readonly profile?: ProfilePort;
    readonly publish?: (event: LeaderboardsEvent) => void;
    readonly signal?: AbortSignal;
}
export declare function createLeaderboards(deps: LeaderboardsDeps): Leaderboards;
//# sourceMappingURL=client.d.ts.map
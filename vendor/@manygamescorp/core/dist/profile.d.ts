import { type DataHttp } from './data-client.js';
import { type Json } from './data-validation.js';
export interface ProfileData extends PublicProfile {
    readonly version: number;
    readonly createdAt: string;
    readonly nameModeration: string;
    readonly xp: number;
    readonly coins: number;
}
export interface ProfileSummary {
    readonly gid: number;
    readonly name: string;
    readonly avatar: string | null;
    readonly level: number;
    readonly score: number;
}
export interface PublicProfile extends ProfileSummary {
    readonly [field: string]: unknown;
    readonly locale: string;
    readonly country: string | null;
    readonly friendsCount: number;
    readonly referralCode: string;
    readonly gamesPlayed: number;
    readonly gamesWon: number;
    readonly totalScore: number;
    readonly highestScore: number;
    readonly winRate: number;
    readonly updatedAt: string;
}
export interface ProfileField {
    readonly path: string;
    readonly value: Json;
    readonly version: number;
}
export interface ProfileFieldWrite extends ProfileField {
    readonly updatedAt: string;
}
export interface ProfilePatch {
    readonly [field: string]: Json | undefined;
    readonly name?: string;
    readonly avatar?: string | null;
    readonly locale?: string;
    readonly country?: string | null;
}
export interface ProfileReadOptions {
    readonly signal?: AbortSignal;
}
export interface ProfileQueryRequest {
    readonly gids: readonly number[];
}
export interface ProfileQueryResult {
    readonly items: readonly PublicProfile[];
}
export interface ProfileWriteOptions extends ProfileReadOptions {
    readonly version?: number;
}
export interface PublicReadOptions extends ProfileReadOptions {
    readonly force?: boolean;
}
export interface Profile {
    get(options?: ProfileReadOptions): Promise<ProfileData>;
    update(patch: ProfilePatch, options?: ProfileWriteOptions): Promise<ProfileData>;
    field(path: string, options?: ProfileReadOptions): Promise<ProfileField>;
    setField(path: string, value: Json, options?: ProfileWriteOptions): Promise<ProfileFieldWrite>;
    replace(value: ProfilePatch, options: ProfileWriteOptions & {
        readonly version: number;
    }): Promise<ProfileData>;
    summary(gid?: number, options?: ProfileReadOptions): Promise<ProfileSummary>;
    byGid(gid: number, options?: PublicReadOptions): Promise<PublicProfile>;
    query(request: ProfileQueryRequest, options?: PublicReadOptions): Promise<ProfileQueryResult>;
    dispose(): void;
}
export declare const PUBLIC_PROFILE_TTL_MS = 300000;
export declare function createProfile(http: DataHttp, now: () => number, signal?: AbortSignal, onOwn?: (value: ProfileData) => void): Profile;
export interface ProfileLevelChangedEvent {
    readonly level: number;
    readonly previous: number;
}
export interface ProfileReader {
    get(): Promise<ProfileData>;
}
//# sourceMappingURL=profile.d.ts.map
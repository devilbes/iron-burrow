import { type ManyPlayGame } from '../account-api.js';
import type { AuthProvider } from '../auth.js';
export interface FakeIdOptions {
    readonly appId: number;
    readonly now?: () => number;
    readonly codeTtlMs?: number;
    readonly webLink?: string;
    readonly games?: readonly ManyPlayGame[];
    readonly crossFeatures?: boolean;
}
export interface FakeIdMail {
    readonly rid: string;
    readonly email: string;
    readonly code: string;
    readonly child: boolean;
}
export interface FakeIdAccount {
    readonly uid: number;
    readonly gid: number | undefined;
}
export declare class FakeId {
    readonly mails: FakeIdMail[];
    readonly calls: {
        readonly method: string;
        readonly path: string;
    }[];
    private readonly appId;
    private readonly now;
    private readonly ttl;
    private readonly users;
    private readonly profiles;
    private readonly tokens;
    private readonly otps;
    private readonly cooldown;
    private readonly signins;
    private readonly failures;
    private readonly webLink;
    private readonly games;
    private readonly crossFeatures;
    private nextUid;
    private nextGid;
    private serial;
    constructor(options: FakeIdOptions);
    account(email: string, options?: {
        profile?: boolean;
        providers?: readonly AuthProvider[];
    }): FakeIdAccount;
    fail(path: string, code: string, status: number, retryAfterSec?: number): void;
    lastMail(email?: string): FakeIdMail | undefined;
    readonly fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
    private init;
    private signin;
    private code;
    private session;
    private links;
    private json;
    private error;
}
//# sourceMappingURL=fake-id.d.ts.map
import type { L10nIndex, L10nLoadRequest, L10nLoadResult, L10nSource, StringTree } from './l10n.js';
import type { ConfigRecord } from './configs.js';
import type { HttpTransport, RequestSpec } from './transport.js';
export { createFakeSecureStore, secureStoreContract } from './testing/secure-store.js';
export type { FakeSecureStoreOptions, SecureStoreContractCase, } from './testing/secure-store.js';
export declare function configRecord(data: unknown, extra?: Partial<ConfigRecord>): ConfigRecord;
export declare function configRecords(configs: Readonly<Record<string, Readonly<Record<string, unknown>>>>): Record<string, Record<string, ConfigRecord>>;
export interface TestingClock {
    now(): number;
    setTimeout(callback: () => void, delayMs: number): number;
    clearTimeout(id: number): void;
}
export declare class FakeClock implements TestingClock {
    private time;
    private nextId;
    private advancing;
    private readonly timers;
    constructor(startMs?: number);
    readonly now: () => number;
    get pendingTimers(): number;
    readonly setTimeout: (callback: () => void, delayMs: number) => number;
    readonly clearTimeout: (id: number) => void;
    advanceBy(ms: number): void;
    sleep(ms: number, signal?: AbortSignal): Promise<void>;
}
export interface FakeTransportResponse {
    readonly body?: unknown;
    readonly error?: unknown;
    readonly delayMs?: number;
    readonly status?: number;
    readonly etag?: string | null;
}
export type FakeTransportScenario = FakeTransportResponse | ((spec: RequestSpec) => FakeTransportResponse | Promise<FakeTransportResponse>);
export interface FakeTransportOptions {
    readonly scenarios?: readonly FakeTransportScenario[];
    readonly clock?: TestingClock;
}
export declare class FakeTransport implements HttpTransport {
    readonly requests: RequestSpec[];
    private readonly scenarios;
    private readonly clock;
    constructor(options?: FakeTransportOptions);
    get pendingScenarios(): number;
    enqueue(...scenarios: FakeTransportScenario[]): void;
    request<TRes, TBody = unknown>(spec: RequestSpec<TBody>): Promise<TRes>;
}
export interface FakeCdnFile {
    readonly json?: unknown;
    readonly module?: Readonly<Record<string, unknown>>;
    readonly status?: number;
    readonly redirect?: string;
}
export declare class FakeCdn {
    readonly requests: {
        readonly url: string;
        readonly init?: RequestInit;
    }[];
    readonly imports: string[];
    readonly files: Map<string, FakeCdnFile>;
    offline: boolean;
    put(url: string, file: FakeCdnFile): this;
    readonly fetch: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
    readonly import: (url: string) => Promise<unknown>;
}
export interface TestJwtPublicJwk extends JsonWebKey {
    readonly kid: string;
    readonly alg: 'EdDSA';
    readonly use: 'sig';
}
export interface TestJwtSigner {
    readonly publicJwk: TestJwtPublicJwk;
    sign(claims: Readonly<Record<string, unknown>>): Promise<string>;
}
export declare function createTestJwtSigner(kid?: string): Promise<TestJwtSigner>;
export interface FakeL10nSourceOptions {
    readonly bundles?: Readonly<Record<string, StringTree>>;
    readonly index?: L10nIndex;
    readonly origin?: 'cache' | 'network';
    readonly delayMs?: number;
}
export declare class FakeL10nSource implements L10nSource {
    readonly origin: 'cache' | 'network';
    readonly requests: L10nLoadRequest[];
    bundles: Record<string, StringTree>;
    index: L10nIndex | undefined;
    delayMs: number;
    fail: boolean;
    notModified: boolean;
    constructor(options?: FakeL10nSourceOptions);
    load(request: L10nLoadRequest): Promise<L10nLoadResult>;
}
//# sourceMappingURL=testing.d.ts.map
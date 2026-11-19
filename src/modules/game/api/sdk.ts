// Structural types of the SDK services the game module uses (ModuleContext.sdk.<id> through
// `manifest.sdk.uses`). No SDK imports: src/modules/game type-checks without the SDK too; the
// shapes follow vendor/@manygamescorp/*/dist/*.d.ts of SDK 1.0.0-rc.30 (only the members called).

export interface InventoryApi {
  get(options?: { readonly force?: boolean }): Promise<unknown>;
  quantity(itemId: string): number | undefined;
  refresh(): Promise<unknown>;
  consume(itemId: string, qty: number, options: { readonly idempotencyKey: string; readonly reason?: string }): Promise<unknown>;
}

export interface IapOfferEntity { readonly id: string; readonly amount: number }
export interface IapOffer {
  readonly key: string;
  readonly kind: 'paid' | 'free' | 'ad';
  readonly placement: string;
  readonly variant: { readonly key: string; readonly entities: readonly IapOfferEntity[] };
  readonly product?: { readonly entities: readonly IapOfferEntity[]; readonly priceText?: string };
  readonly available: boolean;
  readonly reason?: string;
}
export interface IapPurchaseOutcome {
  readonly orderId: string | null;
  readonly status: 'purchased' | 'pending' | 'canceled' | 'failed' | 'already_owned' | 'not_available';
  readonly order?: { readonly test?: boolean; readonly status?: string; readonly price?: number | null; readonly currency?: string | null };
}
export interface IapApi {
  load(options?: { readonly force?: boolean }): Promise<unknown>;
  state(): unknown;
  offers(input: { readonly placement: string }): readonly IapOffer[];
  offer(input: { readonly offerKey: string; readonly placement?: string }): IapOffer | undefined;
  products(options?: { readonly force?: boolean }): Promise<readonly { readonly productKey: string; readonly priceText: string }[]>;
  purchase(input: { readonly offerKey?: string; readonly placement?: string }): Promise<IapPurchaseOutcome>;
  waitOrder(orderId: string, options?: { readonly timeoutMs?: number }): Promise<{ readonly status: string; readonly test?: boolean }>;
}

export interface BoardEntry {
  readonly gid: number; readonly rank: number; readonly score: number;
  readonly profile?: { readonly name: string };
}
export interface LeaderboardsApi {
  readonly canSubmit: boolean;
  get(key: string, options?: { readonly limit?: number }): Promise<{
    readonly items: readonly BoardEntry[]; readonly expiresAt: string | null;
    readonly me: { readonly rank: number | null; readonly score: number | null };
  }>;
  around(key: string, options?: { readonly radius?: number }): Promise<{
    readonly gid: number; readonly rank: number | null; readonly score: number | null; readonly entries: readonly BoardEntry[];
  }>;
  rank(key: string): Promise<{ readonly rank: number | null; readonly score: number | null }>;
}

export type Json = null | boolean | number | string | readonly Json[] | { readonly [key: string]: Json };
export interface KvApi {
  query(keys: readonly string[]): Promise<{ readonly data: Readonly<Record<string, Json>> }>;
  set(key: string, value: Json, options?: { readonly idempotencyKey?: string }): Promise<unknown>;
}

export interface ProgressStateLike {
  readonly key: string;
  readonly steps: Readonly<Record<string, {
    readonly status: string;
    readonly conditions: Readonly<Record<string, { readonly value: number; readonly completed: boolean }>>;
  }>>;
}
export interface ProgressApi {
  init(keys: readonly string[]): Promise<readonly ProgressStateLike[]>;
  beginAttempt(input: {
    readonly mechanic: string; readonly eventId: string; readonly mode: 'core';
    readonly level: { readonly set: string; readonly n: number; readonly key: string; readonly levelId?: string;
      readonly configVersion: number; readonly contentHash: string };
  }): Promise<{ readonly seed: string }>;
}

export interface AppliedLevelLike {
  readonly set: string; readonly n: number; readonly key: string; readonly levelId?: string;
  readonly configVersion: number; readonly contentHash: string; readonly entry: unknown;
}
export interface LevelHandleLike {
  get(n: number): Promise<AppliedLevelLike>;
  levelEnd(level: AppliedLevelLike, result: {
    readonly moves: number; readonly won: boolean; readonly score: number; readonly durationMs: number; readonly seed?: string;
  }, options: { readonly eventId: string }): Promise<{ readonly level: { readonly verified: boolean; readonly stars: number } }>;
}
export interface LevelsApi { open(set: string): Promise<LevelHandleLike> }

export interface RealtimeApi {
  notice(): { readonly text?: string; readonly title?: string; readonly message?: string } | undefined;
  status(): { readonly state: 'connecting' | 'open' | 'offline' | 'stopped' };
}

export interface ConfigsApi {
  get<T = unknown>(scope: string, key: string): T | undefined;
  refresh(): Promise<unknown>;
}

export interface HapticsApi {
  isSupported(): boolean;
  impact(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
  notification(kind: 'success' | 'warning' | 'error'): void;
  vibrate(pattern: number | readonly number[]): void;
}

/** What the game module reads of its ModuleContext. */
export interface ModuleCtx {
  readonly sdk: Readonly<Record<string, unknown>>;
  readonly bus: { on(pattern: string, listener: (payload: unknown) => void): () => void };
  readonly configs: unknown;
  readonly time: { now(): number };
  readonly device?: { readonly haptics?: HapticsApi };
  readonly appVersion?: string;
  readonly environment?: 'local' | 'dev' | 'test' | 'prod';
}

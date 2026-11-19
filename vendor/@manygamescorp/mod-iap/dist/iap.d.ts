import type { PlatformView } from '@manygamescorp/core/platform';
import { type RedirectPortalBus } from './redirect-store.js';
import { type Iap } from './public-iap.js';
export type { Iap, PurchaseOutcome, Product, GameOrder as OrderView, PurchaseOutcome as PurchaseResult, GameState as IapState } from './public-iap.js';
import type { RealtimeView } from '@manygamescorp/core/realtime-port';
import type { Configs } from '@manygamescorp/core/configs';
import type { ModuleFacts } from '@manygamescorp/core/facts';
import { type ModuleDefinition } from '@manygamescorp/core/module';
import type { ScopedHttp } from '@manygamescorp/core/scoped-http';
import type { ScopedStorage } from '@manygamescorp/core/storage/scoped';
import { type StoreAdapter } from './store.js';
export type { OfferState, OfferVariant, UnavailableReason } from './catalog.js';
export type { GameOffer as Offer } from './public-iap.js';
export type * from './contract.js';
import type { IapEvent } from './contract.js';
export type IapHttp = Pick<ScopedHttp, 'request'>;
export interface IapTimingSettings {
    readonly confirmTimeoutMs?: number;
    readonly offlinePollMs?: number;
}
export interface IapDeps {
    readonly settings?: IapTimingSettings;
    readonly http: IapHttp;
    readonly realtime?: RealtimeView;
    readonly configs?: Pick<Configs, 'getScope' | 'snapshot'>;
    readonly facts?: Pick<ModuleFacts, 'set' | 'hold' | 'purchase'>;
    readonly storage?: Pick<ScopedStorage, 'get' | 'set'>;
    readonly store?: StoreAdapter;
    readonly platform?: Pick<PlatformView, 'openUrl'>;
    readonly publish?: (event: IapEvent) => void;
    readonly signal?: AbortSignal;
    readonly now: () => number;
    readonly sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
}
export declare function createIap(deps: IapDeps): Iap;
export interface IapOptions {
    readonly storeId?: string;
    readonly portal?: RedirectPortalBus;
    readonly store?: StoreAdapter;
    readonly adapters?: readonly StoreAdapter[];
}
export declare function iapModule(options?: IapOptions): ModuleDefinition<Iap>;
//# sourceMappingURL=iap.d.ts.map
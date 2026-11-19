// STUB (worker C implements). S10 Shop, S10′ offer, S11 purchase result.
import type { OfferKey, Placement, PurchaseResult } from '../modules/game/index.js';
import type { ScreenContext } from './index.js';

/** S10: offers of `shop` in `iap.shop_order`; resolves when closed. */
export function openShop(_ctx: ScreenContext): Promise<void> { return Promise.resolve(); }
/** S10′: one card — the first offer of the placement (`starter_auto` also records `starterShown`). */
export function openOffer(_ctx: ScreenContext, _placement: Placement): Promise<void> { return Promise.resolve(); }
/** Buy + S11 (pending → success|failed|cancelled); resolves after `purchase-ok`. */
export function buyOffer(_ctx: ScreenContext, key: OfferKey, _placement: Placement): Promise<PurchaseResult> {
  return Promise.resolve({ status: 'failed', key, items: [] });
}

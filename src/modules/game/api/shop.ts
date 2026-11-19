// Offers and purchases of the game (CONTRACT §8.3, D-GC-19): the offers of a placement from the
// store loaded once, in `shop_order`, with their prices; Starter Crate in the shop only after its
// trigger (first defeat or the first clear of stage 3) and until it is bought; the free start grant;
// the Starter Crate auto window (24 h cooldown, ≤ 3 shows). A purchase waits for its order; the
// grant itself comes to the inventory by the server and the kit reward window shows it.
import { OFFERS, PLACEMENTS } from '../../../boot/ids.js';
import type { OfferKey, OfferView, Placement, PurchaseResult, Reward } from '../index.js';
import { flat } from './analytics.js';
import { KV, type Host } from './host.js';
import { oneTime, packItems } from './records.js';
import type { IapOffer, IapPurchaseOutcome } from './sdk.js';

const KEYS: readonly OfferKey[] = Object.values(OFFERS);
const STARTER: OfferKey = 'starter_crate';
const STARTER_TRIGGER_STAGE = 3;
const HOUR_MS = 3_600_000;
const ORDER_TIMEOUT_MS = 60_000;

const isKey = (key: string): key is OfferKey => (KEYS as readonly string[]).includes(key);

/** Published placement name of a logical placement. */
export function placementId(placement: Placement): string {
  switch (placement) {
    case 'shop': return PLACEMENTS.shop;
    case 'defeat': return PLACEMENTS.defeat;
    case 'prestage': return PLACEMENTS.prestage;
    case 'starter_auto': return PLACEMENTS.starterAuto;
    default: return PLACEMENTS.startGrant;
  }
}

export class Shop {
  constructor(private readonly host: Host) {}

  /** Starter Crate was triggered: the first defeat, or stage 3 cleared. */
  private starterTriggered(): boolean {
    return this.host.flag(KV.firstDefeat) || this.host.current > STARTER_TRIGGER_STAGE || (this.host.stars.get(STARTER_TRIGGER_STAGE) ?? 0) > 0;
  }

  private raw(placement: Placement): IapOffer[] {
    try { return [...(this.host.iap?.offers({ placement: placementId(placement) }) ?? [])]; } catch { return []; }
  }

  private view(offer: IapOffer, placement: Placement): OfferView | null {
    if (!isKey(offer.key)) return null;
    const meta = this.host.records().meta;
    const ui = offer as unknown as { ui?: { highlight?: boolean } };
    const once = oneTime(meta, offer.key);
    const items = packItems(meta, offer.key);
    const fromStore = (offer.product?.entities ?? offer.variant.entities).map((e) => ({ item: e.id, amount: e.amount }))
      .filter((line): line is Reward => line.item.startsWith('bst_'));
    return { key: offer.key, placement, price: offer.kind === 'free' ? null : offer.product?.priceText ?? null,
      items: fromStore.length > 0 ? fromStore : items,
      badge: once ? 'one_time' : ui.ui?.highlight === true && offer.kind === 'paid' ? 'best_value' : null,
      test: this.host.qa };
  }

  async offers(placement: Placement): Promise<readonly OfferView[]> {
    await this.host.ready();
    const list = this.raw(placement).filter((offer) => offer.available);
    const order = (this.host.records().meta.shopOrder.order as readonly string[]);
    const rank = (key: string): number => { const i = order.indexOf(key); return i < 0 ? order.length : i; };
    const shown = list
      .filter((offer) => placement !== 'shop' || offer.key !== STARTER || this.starterTriggered())
      .sort((a, b) => rank(a.key) - rank(b.key));
    const views = shown.map((offer) => this.view(offer, placement)).filter((v): v is OfferView => v !== null);
    if (placement === 'defeat') return views.filter((v) => v.key !== STARTER || this.starterTriggered());
    return views;
  }

  /** Sync view of the defeat offers (S08 shows only a Spare Hull pack). */
  defeatOffers(): readonly OfferKey[] {
    return this.raw('defeat').filter((offer) => offer.available && isKey(offer.key) && packItems(this.host.records().meta, offer.key as OfferKey)
      .some((r) => r.item === 'bst_hull')).map((offer) => offer.key as OfferKey);
  }

  async buy(key: OfferKey, placement: Placement): Promise<PurchaseResult> {
    const iap = this.host.iap;
    const items = packItems(this.host.records().meta, key);
    const free = key === 'start_grant';
    this.host.ports.track('purchase_start', flat({ offer_id: key, placement, is_free: free }));
    if (!iap) return this.result(key, placement, items, 'failed', false);
    let outcome: IapPurchaseOutcome;
    try { outcome = await iap.purchase({ offerKey: key, placement: placementId(placement) }); }
    catch { return this.result(key, placement, items, 'failed', false); }
    let status: PurchaseResult['status'] = outcome.status === 'purchased' || outcome.status === 'already_owned' ? 'success'
      : outcome.status === 'canceled' ? 'cancelled' : outcome.status === 'pending' ? 'pending' : 'failed';
    let test = outcome.order?.test === true;
    if (status === 'pending' && outcome.orderId) {
      try {
        const order = await iap.waitOrder(outcome.orderId, { timeoutMs: ORDER_TIMEOUT_MS });
        test = order.test === true || test;
        status = ['granted', 'confirmed', 'validated', 'granted_advance'].includes(order.status) ? 'success'
          : order.status === 'canceled' ? 'cancelled' : order.status === 'failed' || order.status === 'expired' ? 'failed' : 'pending';
      } catch { status = 'failed'; }
    }
    if (status === 'success') {
      // The grant reaches the inventory by the server's push (realtime), never by a re-read here.
      this.host.ports.track('offer_purchase', { offer_id: key, placement, product_id: free ? '' : key });
      for (const line of items) this.host.ports.track('item_earned', { item: line.item, amount: line.amount, source_id: key, source_type: free ? 'grant' : 'purchase' });
    }
    return this.result(key, placement, items, status, test);
  }

  private result(key: OfferKey, placement: Placement, items: readonly Reward[], status: PurchaseResult['status'], test: boolean): PurchaseResult {
    this.host.ports.track('purchase_result', flat({ offer_id: key, placement, product_id: key, result: status, is_test: test }));
    return { status, key, items };
  }

  /** The start grant (Lobby, first visit) or null when it was claimed or is not offered. */
  async startGrant(): Promise<readonly Reward[] | null> {
    await this.host.ready();
    if (this.host.flag(KV.grantDone)) return null;
    const offer = this.raw('start_grant').find((one) => one.key === OFFERS.startGrant);
    if (!offer?.available) return null;
    return packItems(this.host.records().meta, 'start_grant');
  }

  async claimStartGrant(): Promise<PurchaseResult> {
    const result = await this.buy('start_grant', 'start_grant');
    if (result.status === 'success') await this.host.setKv(KV.grantDone, true).catch(() => undefined);
    return result;
  }

  /** The Starter Crate auto window may show now (triggered, available, cooldown and show limit). */
  async starterDue(): Promise<boolean> {
    await this.host.ready();
    if (!this.starterTriggered()) return false;
    const rules = this.host.records().meta.placements.starter_crate;
    const shows = Number(this.host.value(KV.starterShows) ?? 0);
    const last = Number(this.host.value(KV.starterAt) ?? 0);
    if (shows >= rules.max_auto_shows || this.host.now() - last < rules.cooldown_h * HOUR_MS) return false;
    return this.raw('starter_auto').some((offer) => offer.key === STARTER && offer.available);
  }

  async starterShown(): Promise<void> {
    const shows = Number(this.host.value(KV.starterShows) ?? 0) + 1;
    await Promise.all([this.host.setKv(KV.starterShows, shows), this.host.setKv(KV.starterAt, this.host.now())]).catch(() => undefined);
  }
}

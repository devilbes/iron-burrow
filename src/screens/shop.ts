// S10 Shop, S10′ offer and S11 purchase result — game windows (CONTRACT §4, §6, D-GC-19). The
// offers come from the game API already filtered and in `iap.shop_order`; a purchase opens S11 at
// once (`pending`) and turns it into success / failed / cancelled when the order settles. The
// reward itself is the kit reward window's, after the game window closes (D-GC-09): S11 draws no
// reward rows. The window specs are exported for the skin gallery (tests/skin-gallery/gallery.js),
// which shows them with test offers.
import { gameOf, type IronBurrow, type Layout, type OfferKey, type OfferView, type Placement,
  type PurchaseResult } from '../modules/game/index.js';
import { sound } from './audio.js';
import type { GameWindowSpec, ScreenContext } from './index.js';
import { offerBody, offerName, priceLabel, purchaseBody, SHOP_CSS, shopBody } from './shop-view.js';
import { attempt, WINDOW_CSS } from './stage-ui.js';
import { currentLayout, mountLive, watchLayout } from './ui.js';

type Status = PurchaseResult['status'];

function sfx(game: IronBurrow, id: string): void {
  try { sound(game).sfx(id); } catch { /* sound is optional */ }
}

export interface ShopState {
  offers: readonly OfferView[] | null;
  owned: Set<OfferKey>;
  busy: boolean;
  layout: Layout;
}

export const shopState = (): ShopState => ({ offers: null, owned: new Set(), busy: false, layout: currentLayout() });

/**
 * S10 window: the cards of `state`, drawn again on a layout change and on `refresh` (what `bind`
 * gets when the body is mounted; it returns what to stop when the body goes). Closing is the kit's
 * close button; the one kit button (`shop-close`) stands under the list, never over it.
 */
export function shopWindowSpec(ctx: ScreenContext, state: ShopState, buy: (key: OfferKey) => void,
  bind: (refresh: () => void) => () => void = () => () => undefined): GameWindowSpec {
  return {
    title: ctx.t('screen.shop.title'),
    body: (root) => {
      const live = mountLive(root, 'shop', () => shopBody(ctx, state, buy), { styles: WINDOW_CSS + SHOP_CSS });
      const stopLayout = watchLayout((layout) => { state.layout = layout; live.refresh(); });
      const unbind = bind(() => live.refresh());
      return () => { stopLayout(); unbind(); live.off(); };
    },
    actions: [{ id: 'shop-close', label: ctx.t('screen.common.close'), variant: 'secondary' }],
  };
}

/** S10: offers of `shop` in `iap.shop_order`; resolves when closed. */
export async function openShop(ctx: ScreenContext): Promise<void> {
  const game = gameOf(ctx.game);
  const state = shopState();
  let refresh = (): void => undefined;
  const shown = new Set<OfferKey>();

  const load = async (): Promise<void> => {
    state.offers = await attempt<readonly OfferView[]>(() => game.offers('shop'), []);
    for (const offer of state.offers) {
      if (shown.has(offer.key)) continue;
      shown.add(offer.key);
      game.event('offer_shown', { offer_id: offer.key, placement: 'shop' });
    }
    refresh();
  };
  const buy = async (key: OfferKey): Promise<void> => {
    if (state.busy) return;
    state.busy = true;
    refresh();
    sfx(game, 'sfx_ui_click');
    game.event('offer_click', { offer_id: key, placement: 'shop' });
    const result = await buyOffer(ctx, key, 'shop');
    const bought = state.offers?.find((offer) => offer.key === key);
    if (result.status === 'success' && bought?.badge === 'one_time') state.owned.add(key);
    state.busy = false;
    await load();
  };

  const ticket = ctx.window.open(shopWindowSpec(ctx, state, (key) => { void buy(key); }, (again) => {
    refresh = again;
    let stopBalances: () => void = () => undefined;
    try { stopBalances = game.onBalances(() => { if (!state.busy) void load(); }); } catch { /* stub */ }
    return () => { stopBalances(); refresh = () => undefined; };
  }));
  void load();
  await ticket.result.catch(() => 'close');
}

/**
 * S10′ window: one card and one button — its price (`offer-buy`); closing is the kit's close
 * button only (Н-23: no second «Close»).
 */
export function offerWindowSpec(ctx: ScreenContext, offer: OfferView): GameWindowSpec {
  return {
    title: offerName(ctx, offer.key),
    body: (root) => mountLive(root, 'offer', () => offerBody(ctx, offer, false), { styles: WINDOW_CSS + SHOP_CSS }).off,
    actions: [{ id: 'offer-buy', label: priceLabel(ctx, offer), variant: 'primary' }],
  };
}

/** S10′: one card — the first offer of the placement (`starter_auto` also records `starterShown`). */
export async function openOffer(ctx: ScreenContext, placement: Placement): Promise<void> {
  const game = gameOf(ctx.game);
  const offers = await attempt<readonly OfferView[]>(() => game.offers(placement), []);
  const offer = offers[0];
  if (!offer) return;
  game.event('offer_shown', { offer_id: offer.key, placement });
  if (placement === 'starter_auto') void attempt(() => game.starterShown(), undefined);
  const ticket = ctx.window.open(offerWindowSpec(ctx, offer));
  const picked = await ticket.result.catch(() => 'close');
  if (picked !== 'offer-buy') return;
  sfx(game, 'sfx_ui_click');
  game.event('offer_click', { offer_id: offer.key, placement });
  await buyOffer(ctx, offer.key, placement);
}

/** S11 window of the purchase of `key`: its state is `status()`, drawn again on `refresh`. */
export function purchaseWindowSpec(ctx: ScreenContext, key: OfferKey, status: () => Status,
  bind: (refresh: () => void) => () => void = () => () => undefined): GameWindowSpec {
  return {
    title: offerName(ctx, key),
    body: (root) => {
      const live = mountLive(root, 'purchase-result', () => purchaseBody(ctx, status()), { styles: WINDOW_CSS + SHOP_CSS });
      const unbind = bind(() => live.refresh());
      return () => { unbind(); live.off(); };
    },
    actions: [{ id: 'purchase-ok', label: ctx.t('screen.common.ok'), variant: 'primary' }],
  };
}

/** Buy + S11 (pending → success|failed|cancelled); resolves after `purchase-ok`. */
export async function buyOffer(ctx: ScreenContext, key: OfferKey, placement: Placement): Promise<PurchaseResult> {
  const game = gameOf(ctx.game);
  let status: Status = 'pending';
  let refresh = (): void => undefined;
  const ticket = ctx.window.open(purchaseWindowSpec(ctx, key, () => status, (again) => {
    refresh = again;
    return () => { refresh = () => undefined; };
  }));
  const failed: PurchaseResult = { status: 'failed', key, items: [] };
  const buying = attempt<PurchaseResult>(() => game.buy(key, placement), failed).then((result) => {
    status = result.status;
    if (status === 'success') sfx(game, 'sfx_purchase_ok');
    else if (status === 'failed') sfx(game, 'sfx_purchase_fail');
    refresh();
    return result;
  });
  await ticket.result.catch(() => 'close');
  // Closed while the order is still open: the caller re-reads later (balances come by realtime).
  if (status === 'pending') return { status: 'pending', key, items: [] };
  return buying;
}

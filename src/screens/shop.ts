// S10 Shop, S10′ offer and S11 purchase result — game windows (CONTRACT §4, §6, D-GC-19). The
// offers come from the game API already filtered and in `iap.shop_order`; a purchase opens S11 at
// once (`pending`) and turns it into success / failed / cancelled when the order settles. The
// reward itself is the kit reward window's, after the game window closes (D-GC-09): S11 draws no
// reward rows.
import { gameOf, type IronBurrow, type Layout, type OfferKey, type OfferView, type Placement,
  type PurchaseResult } from '../modules/game/index.js';
import { sound } from './audio.js';
import type { ScreenContext } from './index.js';
import { offerBody, offerName, priceLabel, SHOP_CSS, shopBody } from './shop-view.js';
import { attempt, WINDOW_CSS } from './stage-ui.js';
import { currentLayout, mountLive, view, watchLayout, type ViewNode } from './ui.js';

type Status = PurchaseResult['status'];

function sfx(game: IronBurrow, id: string): void {
  try { sound(game).sfx(id); } catch { /* sound is optional */ }
}

interface ShopState {
  offers: readonly OfferView[] | null;
  owned: Set<OfferKey>;
  busy: boolean;
  layout: Layout;
}

/** S10: offers of `shop` in `iap.shop_order`; resolves when closed. */
export async function openShop(ctx: ScreenContext): Promise<void> {
  const game = gameOf(ctx.game);
  const state: ShopState = { offers: null, owned: new Set(), busy: false, layout: currentLayout() };
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

  const ticket = ctx.window.open({
    title: ctx.t('screen.shop.title'),
    body: (root) => {
      const live = mountLive(root, 'shop', () => shopBody(ctx, state, (key) => { void buy(key); }),
        { styles: WINDOW_CSS + SHOP_CSS });
      refresh = () => live.refresh();
      const stopLayout = watchLayout((layout) => { state.layout = layout; live.refresh(); });
      let stopBalances: () => void = () => undefined;
      try { stopBalances = game.onBalances(() => { if (!state.busy) void load(); }); } catch { /* stub */ }
      return () => { stopLayout(); stopBalances(); refresh = () => undefined; live.off(); };
    },
    actions: [{ id: 'shop-close', label: ctx.t('screen.common.close'), variant: 'secondary' }],
  });
  void load();
  await ticket.result.catch(() => 'close');
}

/** S10′: one card — the first offer of the placement (`starter_auto` also records `starterShown`). */
export async function openOffer(ctx: ScreenContext, placement: Placement): Promise<void> {
  const game = gameOf(ctx.game);
  const offers = await attempt<readonly OfferView[]>(() => game.offers(placement), []);
  const offer = offers[0];
  if (!offer) return;
  game.event('offer_shown', { offer_id: offer.key, placement });
  if (placement === 'starter_auto') void attempt(() => game.starterShown(), undefined);
  const ticket = ctx.window.open({
    title: offerName(ctx, offer.key),
    body: (root) => mountLive(root, 'offer', () => offerBody(ctx, offer, false), { styles: WINDOW_CSS + SHOP_CSS }).off,
    actions: [
      { id: 'offer-buy', label: priceLabel(ctx, offer) ?? ctx.t('screen.common.ok'), variant: 'primary' },
      { id: 'offer-close', label: ctx.t('screen.common.close'), variant: 'secondary' },
    ],
  });
  const picked = await ticket.result.catch(() => 'close');
  if (picked !== 'offer-buy') return;
  sfx(game, 'sfx_ui_click');
  game.event('offer_click', { offer_id: offer.key, placement });
  await buyOffer(ctx, offer.key, placement);
}

/** Buy + S11 (pending → success|failed|cancelled); resolves after `purchase-ok`. */
export async function buyOffer(ctx: ScreenContext, key: OfferKey, placement: Placement): Promise<PurchaseResult> {
  const game = gameOf(ctx.game);
  let status: Status = 'pending';
  let refresh = (): void => undefined;
  const ticket = ctx.window.open({
    title: offerName(ctx, key),
    body: (root) => {
      const live = mountLive(root, 'purchase-result', () => purchaseBody(ctx, status), { styles: WINDOW_CSS });
      refresh = () => live.refresh();
      return () => { refresh = () => undefined; live.off(); };
    },
    actions: [{ id: 'purchase-ok', label: ctx.t('screen.common.ok'), variant: 'primary' }],
  });
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

function purchaseBody(ctx: ScreenContext, status: Status): ViewNode {
  let text: string;
  let detail: string | null = null;
  if (status === 'success') text = ctx.t('screen.purchase.success');
  else if (status === 'cancelled') text = ctx.t('screen.purchase.cancelled');
  else if (status === 'failed') { text = ctx.t('screen.purchase.failed'); detail = ctx.t('screen.purchase.failed_body'); }
  else text = ctx.t('screen.shop.pending');
  return view('div', { class: 'win', 'data-window': 'purchase-result', 'data-state': status },
    view('p', { class: 'plate accent', 'data-testid': 'purchase-status', 'data-state': status, 'data-dynamic': '',
      role: 'status', 'aria-live': 'polite' }, text),
    detail === null ? null : view('p', { class: 'hint' }, detail));
}

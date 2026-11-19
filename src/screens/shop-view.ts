// Cards of S10 Shop and S10′ offer, and the S11 purchase result. One card anatomy in every size:
// the pack picture (OFFERS, else the first item's) · the name `offer.<key>.title` with its badge ·
// the contents as small item pictures with ×N · the test label — and, in the shop, the price button
// of the card on the right (a button of the body: the window stays open). The shop list by
// `data-layout`: portrait — one column, landscape — two columns, desktop — a grid of up to three;
// the list scrolls inside the window when it is taller than the room (no visible scrollbar), the
// kit window around it never does. A card is a forged plate with cut corners; «Best value» has
// the orange edge. Theme tokens only.
import type { Layout, OfferKey, OfferView, PurchaseResult, Reward } from '../modules/game/index.js';
import type { ScreenContext } from './index.js';
import { itemArt, offerArt, picture } from './media.js';
import { itemName } from './rewards.js';
import { button, icon, view, type ViewNode } from './ui.js';

/** Plate with 45° cut corners of `--cut` (UI art bible · Shape). */
const CUT = `clip-path:polygon(var(--cut) 0,calc(100% - var(--cut)) 0,100% var(--cut),100% calc(100% - var(--cut)),
 calc(100% - var(--cut)) 100%,var(--cut) 100%,0 calc(100% - var(--cut)),0 var(--cut))`;

export const SHOP_CSS = `
.shop{--cut:var(--game-cut,8px);--art:64px;--chip:36px;display:grid;width:100%;min-width:0}
.shop[data-layout=landscape]{--art:48px;--chip:32px;min-width:min(29.5rem,calc(100vw - 23rem))}
.shop[data-layout=desktop]{--art:72px;--chip:40px}
.packs{display:grid;grid-template-columns:minmax(0,1fr);gap:.5em;margin:0;padding:0;list-style:none;min-width:0;
 align-items:stretch;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none}
.packs::-webkit-scrollbar{display:none}
.packs[data-layout=portrait]{max-height:min(62vh,34rem)}
.packs[data-layout=landscape]{gap:.4em;max-height:max(7rem,calc(100vh - 11.5rem))}
.packs[data-layout=desktop]{grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr));gap:.75em;
 max-height:calc(100vh - 16rem)}
.packs[data-layout=desktop] .pack:last-child:nth-child(odd){grid-column:1/-1}
.pack{display:grid;min-width:0;padding:1px;background:var(--mp-card-line);${CUT}}
.pack[data-badge=best_value]{padding:2px;background:var(--mp-card-accent)}
.pack-face{display:grid;grid-template-columns:var(--art) minmax(0,1fr) auto;align-items:center;
 gap:.4em .75em;min-width:0;height:100%;padding:.5em .75em;--cut:calc(var(--game-cut,8px) - 1px);
 background:linear-gradient(180deg,var(--mp-card-surface),var(--mp-card-background));${CUT}}
.pack[data-badge=best_value] .pack-face{background:linear-gradient(180deg,
 color-mix(in srgb,var(--mp-card-accent) 14%,var(--mp-card-surface)),var(--mp-card-background))}
.pack[data-state=owned] .pack-face{filter:saturate(.4) brightness(.8)}
.pack-art{width:var(--art);height:var(--art);object-fit:contain}
.pack-info{display:grid;gap:.3em;justify-items:start;align-content:center;min-width:0}
.pack-head{display:flex;flex-wrap:wrap;align-items:center;gap:.2em .5em;min-width:0}
.pack-name{margin:0;font-family:var(--mp-font-ui);font-weight:700;line-height:1.15;color:var(--mp-card-fg);
 overflow-wrap:anywhere}
.pack-sub{margin:0;font-size:.875rem;color:var(--mp-card-subtle);text-align:center;overflow-wrap:anywhere}
.badge{--cut:var(--game-cut-badge,4px);padding:.1em .5em;background:var(--mp-card-accent);
 color:var(--mp-card-on-accent);font-family:var(--mp-font-ui);font-size:.75rem;font-weight:700;line-height:1.3;
 white-space:nowrap;${CUT}}
.badge[data-badge=one_time]{background:var(--mp-card-gold)}
.test{font-size:.75rem;line-height:1.2;color:var(--mp-card-warning)}
.chips{display:flex;flex-wrap:wrap;gap:.25em .7em;margin:0;padding:0 .5em 0 0;list-style:none;min-width:0}
.chip{position:relative;flex:none;width:var(--chip);height:var(--chip)}
.chip img{width:var(--chip);height:var(--chip);object-fit:contain}
.chip-count{position:absolute;right:-.55em;bottom:-.2em;padding:0 .25em;border-radius:var(--mp-radius-field,4px);
 background:var(--mp-card-background);color:var(--mp-card-fg);font-family:var(--mp-font-ui);font-size:.75rem;
 font-weight:700;line-height:1.25;font-variant-numeric:tabular-nums}
.pack-buy{--cut:var(--game-cut,8px);justify-self:end;min-width:5.5rem;min-height:48px;white-space:nowrap;border:0;
 font-family:var(--mp-font-ui);font-weight:700;font-variant-numeric:tabular-nums;color:var(--mp-card-fg);
 text-shadow:0 2px 0 var(--mp-window-background);box-shadow:var(--game-shadow-raised),inset 0 -3px 0 var(--game-plate-dark);
 background:linear-gradient(180deg,color-mix(in srgb,var(--game-steel-teal) 78%,var(--mp-card-fg)),
 var(--game-steel-teal) 55%,color-mix(in srgb,var(--game-steel-teal) 80%,var(--mp-window-background)));${CUT}}
.pack-buy:disabled{color:var(--mp-card-subtle);text-shadow:none;background:var(--mp-card-raised);opacity:1}
.packs[data-layout=landscape] .pack-face{padding:.35em .5em;gap:.25em .5em}
.packs[data-layout=landscape] .pack-name{font-size:.9rem}
.packs[data-layout=landscape] .pack-buy{min-width:4.75rem;padding-inline:.6em}
.offer-card{--cut:var(--game-cut,8px);--chip:48px;display:grid;gap:.5em;justify-items:center;text-align:center;min-width:0;
 width:min(26rem,calc(100vw - 4rem));margin-inline:auto}
.offer-card .offer-big{width:144px;height:144px;object-fit:contain}
.offer-card .offer-info{display:grid;gap:.5em;justify-items:center;min-width:0}
.offer-card .chips{justify-content:center;gap:.4em 1em}
@media (max-height: 480px), (min-width: 1024px) and (min-height: 481px){
 .offer-card{grid-template-columns:auto minmax(0,1fr);align-items:center;justify-items:start;text-align:start;
  width:min(30rem,calc(100vw - 6rem));--chip:40px;gap:.5em 1.25em}
 .offer-card .offer-big{width:96px;height:96px}
 .offer-card .offer-info{justify-items:start}
 .offer-card .chips{justify-content:flex-start}
 .offer-card .pack-sub{text-align:start}
}
@media (min-width: 1024px) and (min-height: 481px){.offer-card{width:min(36rem,100%);--chip:48px}
 .offer-card .offer-big{width:160px;height:160px}}
.result{display:grid;gap:.5em;justify-items:center;text-align:center;min-width:min(20rem,calc(100vw - 6rem));
 max-width:26rem;margin:0 auto}
.result-mark{display:grid;place-items:center;width:56px;height:56px;border-radius:50%;
 background:var(--mp-card-raised);box-shadow:inset 0 0 0 2px var(--mp-card-line)}
.result[data-state=failed] .result-mark{background:var(--mp-card-error-soft);box-shadow:inset 0 0 0 2px var(--mp-card-error)}
.result[data-state=success] .result-mark{background:var(--mp-card-success-soft);box-shadow:inset 0 0 0 2px var(--mp-card-success)}
.result-title{margin:0;font-family:var(--mp-font-display);font-weight:400;font-size:1.25rem;line-height:1.15;
 color:var(--mp-card-fg)}
.result[data-state=failed] .result-title{color:var(--mp-card-error)}
.result-text{margin:0;color:var(--mp-card-subtle);overflow-wrap:anywhere}
`;

/** Picture of an offer: its own art, else the first item's. */
export function offerPicture(ctx: ScreenContext, offer: OfferView, cls: string): ViewNode | null {
  const first = offer.items[0];
  const src = offerArt(offer.key) ?? (first ? itemArt(first.item) : null);
  return src === null ? null : picture(src, offerName(ctx, offer.key), { class: cls });
}

export function offerName(ctx: ScreenContext, key: OfferKey): string {
  return ctx.t(`offer.${key}.title`);
}

export function offerBadge(ctx: ScreenContext, offer: OfferView): ViewNode | null {
  if (offer.badge === 'one_time') return view('span', { class: 'badge', 'data-badge': 'one_time' }, ctx.t('screen.shop.one_time'));
  if (offer.badge === 'best_value') return view('span', { class: 'badge', 'data-badge': 'best_value' }, ctx.t('screen.shop.best_value'));
  return null;
}

export function testLabel(ctx: ScreenContext, offer: OfferView): ViewNode | null {
  return offer.test ? view('span', { class: 'test', 'data-testid': 'shop-test' }, ctx.t('screen.shop.test')) : null;
}

/** «{count} boosters»: everything the offer holds. */
export function contentsText(ctx: ScreenContext, offer: OfferView): string {
  return ctx.t('screen.shop.contents', { count: offer.items.reduce((sum, item) => sum + item.amount, 0) });
}

/** The store's price; «—» while the store has none (the owner's rule: never a word in its place). */
export const NO_PRICE = '—';

/** Label of a buy button: the store price, else «—». */
export function priceLabel(ctx: ScreenContext, offer: OfferView): string {
  const price = offer.price?.trim();
  return price ? ctx.t('screen.shop.buy', { price }) : NO_PRICE;
}

/** The contents of a pack: small item pictures, ×N on each (`reward-item`, `reward-item-count`). */
export function contentsRow(ctx: ScreenContext, items: readonly Reward[]): ViewNode {
  return view('ul', { class: 'chips', 'data-dynamic': '' }, ...items.map((reward) => {
    const name = itemName(ctx, reward.item);
    const count = ctx.t('screen.common.count', { count: reward.amount });
    return view('li', { class: 'chip', 'data-testid': 'reward-item', 'data-item': reward.item, title: `${name} ${count}` },
      picture(itemArt(reward.item), name),
      view('span', { class: 'chip-count', 'data-testid': 'reward-item-count' }, count));
  }));
}

/** One card of the shop (`shop-pack`) with its price button (`shop-buy`). */
export function shopCard(ctx: ScreenContext, offer: OfferView, owned: boolean, busy: boolean,
  buy: (key: OfferKey) => void): ViewNode {
  return view('li', { class: 'pack', 'data-testid': 'shop-pack', 'data-pack': offer.key,
    'data-badge': offer.badge ?? undefined, 'data-state': owned ? 'owned' : 'available' },
  view('div', { class: 'pack-face' },
    offerPicture(ctx, offer, 'pack-art') ?? view('span', { class: 'pack-art' }),
    view('div', { class: 'pack-info' },
      view('div', { class: 'pack-head' },
        view('p', { class: 'pack-name' }, offerName(ctx, offer.key)),
        offerBadge(ctx, offer)),
      contentsRow(ctx, offer.items),
      testLabel(ctx, offer)),
    view('div', { class: 'pack-buy-cell' },
      button(priceLabel(ctx, offer), () => buy(offer.key), {
        testid: 'shop-buy', small: true, disabled: owned || busy,
        attrs: { class: 'mp-button mp-button--small pack-buy', 'data-pack': offer.key, 'data-dynamic': '',
          'aria-label': `${offerName(ctx, offer.key)}: ${priceLabel(ctx, offer)}` } }))));
}

/** The shop body: the cards in the layout of the viewport, or «Shop is unavailable». */
export function shopBody(ctx: ScreenContext, state: {
  readonly offers: readonly OfferView[] | null; readonly owned: ReadonlySet<OfferKey>;
  readonly busy: boolean; readonly layout: Layout; }, buy: (key: OfferKey) => void): ViewNode {
  const offers = state.offers;
  if (offers !== null && offers.length === 0) {
    return view('div', { class: 'shop', 'data-window': 'shop', 'data-state': 'unavailable', 'data-layout': state.layout },
      view('p', { class: 'window-text', 'data-testid': 'shop-unavailable' }, ctx.t('screen.shop.unavailable')));
  }
  return view('div', { class: 'shop', 'data-window': 'shop', 'data-state': offers === null ? 'loading' : 'ready',
    'data-layout': state.layout },
  view('ul', { class: 'packs', 'data-layout': state.layout, 'data-dynamic': '', 'aria-busy': offers === null ? 'true' : undefined },
    ...(offers ?? []).map((offer) => shopCard(ctx, offer, state.owned.has(offer.key), state.busy, buy))));
}

/** S10′ body: one big card (`offer-card`); its price is the window's one button. */
export function offerBody(ctx: ScreenContext, offer: OfferView, owned: boolean): ViewNode {
  return view('div', { class: 'win', 'data-window': 'offer', 'data-state': owned ? 'owned' : 'available' },
    view('div', { class: 'offer-card', 'data-testid': 'offer-card', 'data-pack': offer.key,
      'data-state': owned ? 'owned' : 'available' },
    offerPicture(ctx, offer, 'offer-big'),
    view('div', { class: 'offer-info' },
      offerBadge(ctx, offer),
      view('p', { class: 'pack-sub' }, ctx.t(`offer.${offer.key}.subtitle`)),
      contentsRow(ctx, offer.items),
      testLabel(ctx, offer))));
}

/** S11 body: what happened, as window text; a failure under the alarm-red mark. */
export function purchaseBody(ctx: ScreenContext, status: PurchaseResult['status']): ViewNode {
  let text: string;
  let detail: string | null = null;
  let mark: string | null = null;
  if (status === 'success') { text = ctx.t('screen.purchase.success'); mark = 'check'; }
  else if (status === 'cancelled') text = ctx.t('screen.purchase.cancelled');
  else if (status === 'failed') { text = ctx.t('screen.purchase.failed'); detail = ctx.t('screen.purchase.failed_body'); mark = 'warning'; }
  else text = ctx.t('screen.shop.pending');
  return view('div', { class: 'win result', 'data-window': 'purchase-result', 'data-state': status },
    mark === null ? null : view('span', { class: 'result-mark', 'aria-hidden': 'true' }, icon(mark, 32)),
    view('p', { class: 'result-title', 'data-testid': 'purchase-status', 'data-state': status, 'data-dynamic': '',
      role: 'status', 'aria-live': 'polite' }, text),
    detail === null ? null : view('p', { class: 'result-text' }, detail));
}

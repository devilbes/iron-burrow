// Cards of S10 Shop and S10′ offer: the offer picture (OFFERS, else the first item's picture), the
// name `offer.<key>.title`, the badge, the contents (reward cards), the test label and, in the
// shop, the price button of the card (a button of the body: the window stays open). Layout of the
// shop list by `data-layout`: portrait — a list, landscape — a ribbon of three, desktop — a grid
// of five (CONTRACT §4 S10). Theme tokens only.
import type { Layout, OfferKey, OfferView } from '../modules/game/index.js';
import type { ScreenContext } from './index.js';
import { itemArt, offerArt, picture } from './media.js';
import { rewardRow } from './rewards.js';
import { button, view, type ViewNode } from './ui.js';

export const SHOP_CSS = `
.shop{display:grid;gap:var(--mp-gap);min-width:0}
.packs{display:grid;gap:.5em;margin:0;padding:0;list-style:none;min-width:0}
.pack{display:grid;gap:.35em;min-width:0;padding:.5em;border:1px solid var(--mp-line);
 border-radius:var(--mp-radius-card);background:var(--mp-night);justify-items:center;text-align:center}
.pack[data-state=owned]{opacity:.6}
.pack-art{width:72px;height:72px;object-fit:contain}
.pack-name{margin:0;font-family:var(--mp-font-ui);font-weight:700;overflow-wrap:anywhere}
.pack-sub{margin:0;font-size:.85rem;color:var(--mp-text-2);overflow-wrap:anywhere}
.badge{padding:.05em .5em;border-radius:var(--mp-radius-field);background:var(--mp-card-accent);
 color:var(--mp-card-on-accent);font-size:.75rem;font-weight:700}
.test{font-size:.75rem;color:var(--mp-card-warning)}
.pack .rewards{--reward-size:40px;gap:.35em}
.pack .reward-count{font-size:.75rem}
.pack .mp-button{min-height:40px;font-size:.95rem}
.packs[data-layout=portrait]{max-height:min(60vh,34rem);overflow-y:auto;overscroll-behavior:contain}
.packs[data-layout=portrait] .pack{grid-template-columns:72px minmax(0,1fr) auto;justify-items:start;
 align-items:center;text-align:start}
.packs[data-layout=portrait] .pack-info{display:grid;gap:.2em;justify-items:start;min-width:0}
.packs[data-layout=portrait] .rewards{justify-content:flex-start}
.packs[data-layout=landscape]{grid-auto-flow:column;grid-auto-columns:calc((100% - 1em) / 3);
 overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain}
.packs:not([data-layout=portrait]) .pack-contents{display:none}
.packs[data-layout=landscape] .pack-art{width:48px;height:48px}
.packs[data-layout=landscape] .rewards{--reward-size:28px}
.packs[data-layout=desktop]{grid-template-columns:repeat(5,minmax(0,1fr));gap:.35em}
.packs[data-layout=desktop] .pack{padding:.35em .25em}
.packs[data-layout=desktop] .pack-art{width:56px;height:56px}
.packs[data-layout=desktop] .rewards{--reward-size:28px;gap:.2em}
.packs[data-layout=desktop] .pack-name{font-size:.85rem}
.pack-info{display:grid;gap:.25em;justify-items:center;min-width:0}
.offer-card{display:grid;gap:.5em;justify-items:center;text-align:center;min-width:0}
.offer-card .offer-big{width:144px;height:144px;object-fit:contain}
@media (max-height: 480px){.offer-card .offer-big{width:88px;height:88px}.offer-card .rewards{--reward-size:56px}}
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

/** Price label of a buy button; null while the store has no price for it. */
export function priceLabel(ctx: ScreenContext, offer: OfferView): string | null {
  return offer.price === null ? null : ctx.t('screen.shop.buy', { price: offer.price });
}

/** One card of the shop (`shop-pack`) with its price button (`shop-buy`). */
export function shopCard(ctx: ScreenContext, offer: OfferView, owned: boolean, busy: boolean,
  buy: (key: OfferKey) => void): ViewNode {
  const price = priceLabel(ctx, offer);
  return view('li', { class: 'pack', 'data-testid': 'shop-pack', 'data-pack': offer.key,
    'data-state': owned ? 'owned' : 'available' },
  offerPicture(ctx, offer, 'pack-art'),
  view('div', { class: 'pack-info' },
    view('p', { class: 'pack-name' }, offerName(ctx, offer.key)),
    offerBadge(ctx, offer),
    view('p', { class: 'pack-sub pack-contents' }, contentsText(ctx, offer)),
    rewardRow(ctx, offer.items, { names: false }),
    testLabel(ctx, offer)),
  button(price ?? ctx.t('screen.shop.pending'), () => buy(offer.key), {
    testid: 'shop-buy', small: true, disabled: owned || busy || price === null,
    attrs: { 'data-pack': offer.key, 'data-dynamic': '' } }));
}

/** The shop body: the cards in the layout of the viewport, or «Shop is unavailable». */
export function shopBody(ctx: ScreenContext, state: {
  readonly offers: readonly OfferView[] | null; readonly owned: ReadonlySet<OfferKey>;
  readonly busy: boolean; readonly layout: Layout; }, buy: (key: OfferKey) => void): ViewNode {
  const offers = state.offers;
  if (offers !== null && offers.length === 0) {
    return view('div', { class: 'shop', 'data-window': 'shop', 'data-state': 'unavailable' },
      view('p', { class: 'plate window-text', 'data-testid': 'shop-unavailable' }, ctx.t('screen.shop.unavailable')));
  }
  return view('div', { class: 'shop', 'data-window': 'shop', 'data-state': offers === null ? 'loading' : 'ready',
    'data-layout': state.layout },
  view('ul', { class: 'packs', 'data-layout': state.layout, 'data-dynamic': '', 'aria-busy': offers === null ? 'true' : undefined },
    ...(offers ?? []).map((offer) => shopCard(ctx, offer, state.owned.has(offer.key), state.busy, buy))));
}

/** S10′ body: one big card (`offer-card`). */
export function offerBody(ctx: ScreenContext, offer: OfferView, owned: boolean): ViewNode {
  return view('div', { class: 'win', 'data-window': 'offer', 'data-state': owned ? 'owned' : 'available' },
    view('div', { class: 'offer-card', 'data-testid': 'offer-card', 'data-pack': offer.key,
      'data-state': owned ? 'owned' : 'available' },
    offerPicture(ctx, offer, 'offer-big'),
    offerBadge(ctx, offer),
    view('p', { class: 'pack-sub' }, ctx.t(`offer.${offer.key}.subtitle`)),
    view('p', { class: 'pack-sub' }, contentsText(ctx, offer)),
    rewardRow(ctx, offer.items),
    testLabel(ctx, offer)));
}

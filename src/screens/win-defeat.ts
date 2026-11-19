// S08 Defeat game window: the reason, Continue for a Spare Hull and the hull offer — buttons of the
// body, so the window stays open while they work (CONTRACT §3.3 «Переходы», §6). Continue closes
// the window itself (`ticket.close()`) and the result is `continued`.
import { gameOf, type DefeatInfo, type Match, type OfferKey, type OfferView } from '../modules/game/index.js';
import type { ScreenContext } from './index.js';
import { itemArt, offerArt, picture } from './media.js';
import { buyOffer } from './shop.js';
import { attempt, sectionTitle, WINDOW_CSS } from './stage-ui.js';
import { button, mountLive, view, type ViewNode } from './ui.js';

type ContinueState = DefeatInfo['continue'];

interface DefeatState {
  cont: ContinueState;
  offers: readonly OfferKey[];
  views: readonly OfferView[];
  busy: boolean;
}

/** S08; resolves `continued` after a confirmed Continue, else the action picked (close → map). */
export async function openDefeat(ctx: ScreenContext, match: Match, info: DefeatInfo): Promise<'continued' | 'retry' | 'map'> {
  const game = gameOf(ctx.game);
  const state: DefeatState = { cont: info.continue, offers: info.offers, views: [], busy: false };
  let refresh = (): void => undefined;
  let continued = false;
  let shown: OfferKey | null = null;

  const showOffer = (): void => {
    const key = state.cont !== 'used' ? state.offers[0] ?? null : null;
    if (key === null || key === shown) return;
    shown = key;
    game.event('offer_shown', { offer_id: key, placement: 'defeat' });
  };
  const reread = async (): Promise<void> => {
    const next = await attempt<DefeatInfo | null>(() => match.defeat(), null);
    if (next) { state.cont = next.continue; state.offers = next.offers; }
    showOffer();
    refresh();
  };
  const onContinue = async (): Promise<void> => {
    if (state.busy || state.cont !== 'available') return;
    state.busy = true;
    refresh();
    const outcome = await attempt(() => match.continueRun(), 'failed' as const);
    state.busy = false;
    if (outcome === 'continued') { continued = true; ticket.close(); return; }
    if (outcome === 'empty' || outcome === 'used') state.cont = outcome;
    refresh();
  };
  const onBuy = async (key: OfferKey): Promise<void> => {
    if (state.busy) return;
    state.busy = true;
    refresh();
    game.event('offer_click', { offer_id: key, placement: 'defeat' });
    const bought = await attempt(() => buyOffer(ctx, key, 'defeat'), null);
    state.busy = false;
    if (bought?.status === 'success') await reread();
    else refresh();
  };

  const ticket = ctx.window.open({
    title: ctx.t('screen.defeat.title'),
    body: (root) => {
      const live = mountLive(root, 'defeat', () => renderDefeat(ctx, match.mode, info, state,
        { cont: () => { void onContinue(); }, buy: (key) => { void onBuy(key); } }), { styles: WINDOW_CSS });
      refresh = () => live.refresh();
      return () => { refresh = () => undefined; live.off(); };
    },
    actions: [
      { id: 'defeat-retry', label: ctx.t('screen.defeat.retry'), variant: 'primary' },
      { id: 'defeat-map', label: match.mode === 'siege' ? ctx.t('screen.defeat.end_siege') : ctx.t('screen.defeat.map'),
        variant: 'secondary' },
    ],
    dismissible: false,
  });
  showOffer();
  if (state.offers.length > 0) {
    void attempt<readonly OfferView[]>(() => game.offers('defeat'), []).then((views) => { state.views = views; refresh(); });
  }
  const picked = await ticket.result;
  if (continued) return 'continued';
  return picked === 'defeat-retry' ? 'retry' : 'map';
}

function renderDefeat(ctx: ScreenContext, mode: Match['mode'], info: DefeatInfo, state: DefeatState,
  on: { cont: () => void; buy: (key: OfferKey) => void }): ViewNode {
  const reason = info.reason === 'core' ? ctx.t('screen.defeat.core') : ctx.t('screen.defeat.lives');
  const key = state.cont !== 'used' ? state.offers[0] ?? null : null;
  return view('div', { class: 'win', 'data-window': 'defeat', 'data-state': state.cont, 'data-mode': mode },
    view('p', { class: 'plate window-text', 'data-testid': 'defeat-reason', 'data-reason': info.reason }, reason),
    view('div', { class: 'cols' },
      continueBlock(ctx, state, on.cont),
      key !== null ? offerBlock(ctx, key, state, on.buy) : null));
}

function continueBlock(ctx: ScreenContext, state: DefeatState, onClick: () => void): ViewNode {
  const used = state.cont === 'used';
  return view('div', { class: 'col' },
    button(ctx.t('screen.defeat.continue'), onClick, {
      testid: 'defeat-continue', primary: state.cont === 'available',
      disabled: state.cont !== 'available' || state.busy, attrs: { 'data-state': state.cont },
    }),
    view('p', { class: 'hint', 'data-dynamic': '' },
      used ? ctx.t('screen.defeat.continue_used') : ctx.t('screen.defeat.continue_hint')));
}

function offerBlock(ctx: ScreenContext, key: OfferKey, state: DefeatState, onBuy: (key: OfferKey) => void): ViewNode {
  const offer = state.views.find((one) => one.key === key) ?? null;
  const first = offer?.items[0]?.item ?? null;
  const art = offerArt(key) ?? (first !== null ? itemArt(first) : null);
  const title = ctx.t(`offer.${key}.title`);
  const label = offer?.price ? ctx.t('screen.shop.buy', { price: offer.price }) : ctx.t('screen.booster.more');
  return view('div', { class: 'offer', 'data-testid': 'defeat-offer', 'data-pack': key },
    sectionTitle(ctx.t('screen.defeat.offer_title')),
    art !== null ? picture(art, title, { class: 'offer-art' }) : null,
    view('p', { class: 'accent' }, title),
    button(label, () => onBuy(key), { testid: 'defeat-offer-buy', small: true, disabled: state.busy }));
}

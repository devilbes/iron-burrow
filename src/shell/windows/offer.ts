import type { Iap } from '@manygamescorp/mod-iap/iap';
import type { ShopOffer } from '@manygamescorp/ui-kit/services/shop';
import { limitedOffer } from '@manygamescorp/ui-kit/services/shop';
import { MODULES } from '../../boot/ids.js';
import type { ItemCatalog } from '../item-catalog.js';
import { kitText, windowContribution, type PresenterPart, type PresenterRuntime } from './presenter.js';

const OFFER = 'starter.window.offer';

/**
 * Offer window: the stock `limitedOffer` for the `iap.offer` window of a `ui.windows/main`
 * trigger (`params.placement`, optional `params.offerKey`) — what an offer tile of the HUD opens
 * (shell/hud.ts). It shows the named offer, else the first available one of the placement; the
 * module does not open the window while the placement has none. Price from the store, purchase
 * through `iap.purchase`, the reward through the stock reward window, like the shop (shop.ts).
 * Its picture is the offer's of `OFFERS` (src/skin/art.ts), which the kit finds itself.
 */
export function offerPresenter(run: PresenterRuntime, items: ItemCatalog): PresenterPart {
  let shown: { placement: string; offerKey: string } | undefined;
  let buying = false;
  let outcome: { value: unknown } | undefined;
  let offs: (() => void)[] = [];
  const iap = (): Iap | undefined => run.module<Iap>(MODULES.iap);
  const offer = (): ShopOffer | undefined => {
    if (!shown) return undefined;
    try {
      const found = iap()?.offer({ offerKey: shown.offerKey, placement: shown.placement });
      if (!found) return undefined;
      const kit = found as unknown as ShopOffer;
      return { ...kit, variant: { ...kit.variant, entities: (kit.variant?.entities ?? []).map((entity) => {
        const name = entity.name ?? items.name(entity.id);
        return name ? { ...entity, name } : entity;
      }) } };
    } catch { return undefined; }
  };
  const buy = async (offerKey: string, variantKey: string | undefined): Promise<void> => {
    const api = iap();
    if (!api || buying || !shown) return;
    buying = true; outcome = undefined; run.refresh(OFFER);
    try {
      const result = await api.purchase({ offerKey, placement: shown.placement,
        ...(variantKey ? { variantKey } : {}), txId: crypto.randomUUID() });
      if (result.status === 'failed' || result.status === 'not_available') {
        run.fail({ code: result.code ?? 'SDK_IAP_FAILED' });
      } else outcome = { value: { orderId: result.orderId, status: result.status } };
    } catch (error) { run.fail(error); } finally {
      buying = false; run.refresh(OFFER);
    }
  };
  return {
    contributes: [windowContribution(OFFER, 'limitedOffer', MODULES.iap)],
    components: { limitedOffer },
    uses: [MODULES.iap],
    emits: ['iap:window:closed'],
    listens: ['iap:window:open', 'iap:window:close', 'iap:offers:updated'],
    props(elementId) {
      if (elementId !== OFFER) return undefined;
      const current = offer();
      return { ...run.common(), ...(current ? { offer: current } : {}), now: run.sdk().time.now(),
        purchasingOfferKeys: buying && current ? [current.key] : [], ...(outcome ? { purchase: outcome } : {}),
        l10n: kitText(run.sdk()) };
    },
    intent(_elementId, intent, payload) {
      if (intent !== 'purchase') return;
      const key = payload?.['offerKey'];
      const variant = payload?.['variantKey'];
      if (typeof key === 'string') void buy(key, typeof variant === 'string' ? variant : undefined);
    },
    start(ctx) {
      offs = [
        ctx.bus.on<{ target: string; placement: string; offerKey: string }>('iap:window:open', (event) => {
          if (event.target !== 'offer') return;
          const done = (): void => {
            shown = undefined;
            if (!ctx.signal.aborted) ctx.bus.emit('iap:window:closed', { target: 'offer' });
          };
          let offers: readonly { key: string; available: boolean }[] = [];
          try { offers = iap()?.offers({ placement: event.placement }) ?? []; } catch { offers = []; }
          const key = event.offerKey || offers.find((item) => item.available)?.key;
          if (!key) { done(); return; }
          shown = { placement: event.placement, offerKey: key };
          outcome = undefined;
          // Store prices are loaded before the window shows them.
          void Promise.resolve(iap()?.products()).catch(() => undefined).then(() => run.open(OFFER, done));
        }),
        ctx.bus.on<{ target: string }>('iap:window:close', ({ target }) => {
          if (target === 'offer') run.host()?.close(OFFER);
        }),
        ctx.bus.on('iap:offers:updated', () => run.refresh(OFFER)),
      ];
    },
    stop() { for (const off of offs) off(); offs = []; shown = undefined; buying = false; outcome = undefined; },
  };
}

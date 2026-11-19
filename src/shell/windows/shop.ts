import type { Iap } from '@manygamescorp/mod-iap/iap';
import type { InventoryNamespace } from '@manygamescorp/mod-inventory/inventory';
import { shopWindow } from '@manygamescorp/ui-kit/services/iap-windows';
import type { ShopOffer } from '@manygamescorp/ui-kit/services/shop';
import { CURRENCY, MODULES, SHOP_PLACEMENT, SHOP_SECTION } from '../../boot/ids.js';
import type { ItemCatalog } from '../item-catalog.js';
import { kitText, windowContribution, type PresenterPart, type PresenterRuntime } from './presenter.js';

const SHOP = 'starter.window.shop';

/**
 * Shop: the stock `shopWindow` with the offers of `iap.placements/placement_shop`. Prices come
 * only from the store (`iap.products()`); the purchase goes through `iap.purchase`, the coins
 * arrive as an inventory grant and the stock reward window shows them (ui.windows trigger).
 * Items of an offer are named from the inventory catalog (`ItemCatalog`); their pictures and the
 * offer's own are the skin assets of `ITEMS`/`OFFERS` (src/skin/art.ts), which the kit finds itself.
 */
export function shopPresenter(run: PresenterRuntime, items: ItemCatalog): PresenterPart {
  const buying = new Set<string>();
  let outcome: { value: unknown } | undefined;
  let offs: (() => void)[] = [];
  const iap = (): Iap | undefined => run.module<Iap>(MODULES.iap);
  const offers = (): ShopOffer[] => {
    try {
      return (iap()?.offers({ placement: SHOP_PLACEMENT }) ?? []).map((offer) => {
        const shop = offer as unknown as ShopOffer;
        return { ...shop, placement: SHOP_SECTION, variant: { ...shop.variant,
          entities: (shop.variant?.entities ?? []).map((entity) => {
            const name = entity.name ?? items.name(entity.id);
            return name ? { ...entity, name } : entity;
          }) } };
      });
    } catch {
      return [];
    }
  };
  const balance = (): number => {
    const inventory = run.module<InventoryNamespace>(MODULES.inventory);
    try { return inventory?.balance(CURRENCY) ?? 0; } catch { return 0; }
  };
  const buy = async (offerKey: string, variantKey: string | undefined): Promise<void> => {
    const api = iap();
    if (!api || buying.has(offerKey)) return;
    buying.add(offerKey); outcome = undefined; run.refresh(SHOP);
    try {
      const result = await api.purchase({ offerKey, placement: SHOP_PLACEMENT,
        ...(variantKey ? { variantKey } : {}), txId: crypto.randomUUID() });
      if (result.status === 'failed' || result.status === 'not_available') {
        run.fail({ code: result.code ?? 'SDK_IAP_FAILED' });
      } else outcome = { value: { orderId: result.orderId, status: result.status } };
    } catch (error) { run.fail(error); } finally {
      buying.delete(offerKey); run.refresh(SHOP);
    }
  };
  return {
    contributes: [windowContribution(SHOP, 'shop', MODULES.iap)],
    components: { shop: shopWindow },
    uses: [MODULES.iap, MODULES.inventory],
    emits: ['iap:window:closed'],
    listens: ['iap:window:open', 'iap:window:close', 'inventory:state:changed'],
    props(elementId) {
      if (elementId !== SHOP) return undefined;
      const sdk = run.sdk();
      return { ...run.common(), offers: offers(), now: sdk.time.now(),
        purchasingOfferKeys: [...buying], ...(outcome ? { purchase: outcome } : {}),
        l10n: kitText(sdk), currencies: [{ name: sdk.l10n.t('shell.currency.coins'),
          quantity: balance() }] };
    },
    intent(_elementId, intent, payload) {
      if (intent !== 'purchase') return;
      const key = payload?.['offerKey'];
      const variant = payload?.['variantKey'];
      if (typeof key === 'string') void buy(key, typeof variant === 'string' ? variant : undefined);
    },
    start(ctx) {
      offs = [
        ctx.bus.on<{ target: string }>('iap:window:open', ({ target }) => {
          const done = (): void => {
            if (!ctx.signal.aborted) ctx.bus.emit('iap:window:closed', { target });
          };
          // The offer window is offer.ts; other windows of the module are not used by this game.
          if (target === 'offer') return;
          if (target !== 'main') { done(); return; }
          outcome = undefined;
          // Offer state and store prices are loaded before the window shows them.
          const api = iap();
          void Promise.resolve(api?.load()).then(() => api?.products()).catch(() => undefined)
            .then(() => run.open(SHOP, done));
        }),
        ctx.bus.on('iap:window:close', () => run.host()?.close(SHOP)),
        ctx.bus.on('inventory:state:changed', () => run.refresh(SHOP)),
      ];
    },
    stop() { for (const off of offs) off(); offs = []; buying.clear(); outcome = undefined; },
  };
}

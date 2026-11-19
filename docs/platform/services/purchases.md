# Покупки (iap)

Монеты за реальные деньги. Товар (`product`) — что выдать; оффер (`offer`) — как показать;
плейсмент (`placement`) — какие офферы в окне. Выдачу делает сервер. На тестовом стенде
цены даёт `fake_prices`, оплата — тестовое окно UI Kit.

## Записи
| scope / key | Файл |
|---|---|
| `iap.settings.products` / `product_coins_small`, `_medium`, `_large` | `configs/remote/iap.settings.products/*.json` |
| `iap.offers` / `offer_coins_small`, `_medium`, `_large` | `configs/remote/iap.offers/*.json` |
| `iap.placements` / `placement_shop` | `configs/remote/iap.placements/placement_shop.json` |

## Где подключено
Модуль с тестовым магазином — `src/boot/modules.ts`, окно оплаты — `src/boot/start.ts`:
```ts
      pay: (sheet) => fakePaymentSheet(sheet, undefined, localization) });
```
Окно магазина открывает плитка HUD `shop` (триггер `hud-shop`); наполняет его `src/shell/windows/shop.ts`:
```ts
      return (iap()?.offers({ placement: SHOP_PLACEMENT }) ?? [])
```
```ts
      const result = await api.purchase({ offerKey, placement: SHOP_PLACEMENT,
```
Цены — только из магазина (`iap.products()`).

Оффер на HUD — своя плитка `offer: true` и свой плейсмент; окно оффера (`iap.offer`) наполняет
`src/shell/windows/offer.ts` ([рецепт](../recipes/add-a-hud-entry.md#оффер-на-hud)).

## Как проверить
Плитка магазина → три пакета с ценами; покупка малого пакета → +500 монет в топбаре.

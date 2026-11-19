# Добавить товар в магазин

1. Товар `configs/remote/iap.settings.products/product_coins_huge.json` по образцу
   `product_coins_large.json`: `type: "consumable"`, `priceUsd`, `entities: [{ "id": "item_coins", "amount": 15000 }]`,
   `bindings.google_play.productId`.
2. Оффер `configs/remote/iap.offers/offer_coins_huge.json` по образцу `offer_coins_large.json`:
   `variants: [{ "key": "default", "productKey": "product_coins_huge" }]`, тексты — ключами в `ui.texts`, порядок — `ui.order`.
3. `"offer_coins_huge"` — в `data.offers` записи `iap.placements/placement_shop`.
4. Ключи текстов оффера — в `localization/strings`.
5. Опубликовать записи. Код не меняется: окно показывает офферы плейсмента `SHOP_PLACEMENT`.

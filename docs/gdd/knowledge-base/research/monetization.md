# Монетизация — IAP у референсов и в жанре

Фрейм Iron Burrow: **только IAP за реальные деньги, рекламы нет, валюты в MVP нет**. Продаём наборы расходных бустеров (00_MASTER §6, §7, §12).

## 1. Модели у референсов

| Игра | Модель | Что продаётся | Источник |
|---|---|---|---|
| Tank Hero | премиум $0.99 (iOS), без IAP | вся игра | [App Store](https://apps.apple.com/us/app/tank-hero/id438314348) |
| Tank Hero: Laser Wars | бесплатно, без IAP | — | [Uptodown](https://tank-hero-laser-wars.en.uptodown.com/android) |
| Tank Trouble, Diep.io | бесплатно + реклама порталов | — | [GamePix](https://www.gamepix.com/play/tank-trouble), [Wikipedia](https://en.wikipedia.org/wiki/Diep.io) |
| Tanks a Lot | F2P: реклама + IAP + лутбоксы + game pass | бандлы 0.99–39.99 USD, гемы 5.99 / 11.99 | [App Store](https://apps.apple.com/ua/app/tanks-a-lot-war-of-machines/id1344713773), [Google Play](https://play.google.com/store/apps/details?id=com.idspe.tanks2&hl=en_US) |
| Brawl Stars (top-down арена, ориентир по ценам) | F2P: IAP + пасс | пасс $8.99 / $12.99, бандлы $12–25 | [LDShop](https://www.ldshop.gg/blog/brawl-stars-gp/brawl-stars-brawl-pass.html), [Sportskeeda](https://www.sportskeeda.com/esports/brawl-stars-kit-early-access-bundle-cost-daily-rewards) |
| Candy Crush Saga (ориентир «расходники-бустеры») | F2P: IAP | топ-покупки — Extra Moves, Extra Lives по $0.99 | [wappier](https://wappier.com/most-popular-in-app-purchases/) |

Наблюдение (оценка): в нише maze-tank прямых аналогов «наборы бустеров за деньги без рекламы» нет. Самая близкая модель — расходники в казуальных головоломках (Candy Crush): дешёвая спасательная покупка в момент поражения.

## 2. Ценовые точки

- Обычная лестница якорей: $0.99 / $4.99 / $9.99 / $19.99 / $49.99 ([audiencelab.ai](https://audiencelab.ai/blog/mobile-game-monetization-strategies)).
- $0.99 — самая частая цена **первой** покупки в мобильных играх США (вторичный источник со ссылкой на data.ai — [gitnux](https://gitnux.org/mobile-games-statistics/), относиться осторожно).
- Деньги приносят средние и дорогие паки. По старым данным W3i, 47 % выручки дают покупки $9.99–19.99, а $0.99–1.99 — только ~6 % ([Fierce Network](https://www.fierce-network.com/developer/report-mobile-gamers-will-spend-more-money-app-purchases)). Медиана самой дорогой покупки в топ-играх держится на $9.99 ([illuscaden](https://illuscaden.com/mobile-game-monetization-tracker/)).
- Самая популярная позиция бывает не самой дешёвой: в Clash of Clans это второй по цене пак $4.99 ([wappier](https://wappier.com/5-mobile-games-that-nailed-their-in-app-purchase-pricing/)).
- Чем больше пак, тем выше ценность за доллар. Игроки это ожидают и сравнивают: в Brawl Stars ценность пака гемов растёт с ~16,6 до ~20,9 гемов за $1 ([topuplist](https://topuplist.com/blogs/detail/brawl-stars-gems-price-best-value-packs-2026)).

## 3. Что раздражает игроков

1. **Сложность, подкрученная под продажу бустеров.** Это главная жалоба (21 %) в 1–3★ отзывах топовых казуальных игр с бустерами. Сюда же относится «не хватает одного хода» ([Unstar](https://unstar.app/hi/blog/candy-crush-royal-match-gardenscapes-homescapes-toon-blast-puzzle-games-ranked-2026)).
2. **Pay-to-win, особенно против других игроков.** Игроки считают несправедливым платное преимущество над другими ([Journal of Business Ethics](https://link.springer.com/article/10.1007/s10551-021-04970-6)). Бустеры в казуальных играх там упоминаются прямо. По одному опросу, к pay-to-win относятся негативно 75 % ([IJSRET](https://ijsret.com/wp-content/uploads/IJSRET_V11_issue3_930.pdf), журнал малоизвестный).
3. **Таймеры и сундуки**, которые нужно ждать или ускорять за деньги ([Tanks a Lot, отзывы](https://apps.apple.com/us/app/tanks-a-lot-3v3-brawls/id1344713773)).
4. **Слабая ценность маленьких предложений** («$1.99 за 30 гемов», «$10 за один апгрейд») ([zleague](https://www.zleague.gg/theportal/is-brawl-stars-overcharging-players-voice-concerns-over-expensive-in-game-purchases/)).
5. **Принудительная реклама и ощущение давления** ([AppFollow](https://appfollow.io/blog/what-mobile-game-players-want-monetization-insights-from-app-store-reviews)). У нас рекламы нет, это сильная сторона.

## 4. Разбор наших паков (цены приняты в 00_MASTER §12)

Расчёт цены за единицу — **оценка** (простая арифметика).

| Пак | Состав | Цена | $ за бустер | к Field Kit |
|---|---|---|---|---|
| Starter Crate (разово) | 3 каждого = 12 | 0.99 | 0.083 | −60 % |
| Hull Pack | 5 × Spare Hull | 1.99 | 0.398 | +91 % (но только самый ценный бустер) |
| Field Kit | 6 каждого = 24 | 4.99 | 0.208 | — |
| Heavy Arsenal | 15 каждого = 60 | 9.99 | 0.167 | −20 % |
| Commander Cache | 35 каждого = 140 | 19.99 | 0.143 | −31 % |

## 5. Вывод для паков 0.99 / 1.99 / 4.99 / 9.99 / 19.99

1. **Лестница цен соответствует рынку.** Якоря 0.99 / 4.99 / 9.99 / 19.99 совпадают с типичными ([audiencelab.ai](https://audiencelab.ai/blog/mobile-game-monetization-strategies)). Ценность за доллар монотонно растёт от Field Kit к Commander Cache. Пак $49.99 в MVP не нужен: у нас расходники без валюты, а лимиты на стадию (2/1/1/1) ограничивают потребление (оценка).
2. **Starter Crate за 0.99 — главный конвертер первой покупки.** Показ после первого поражения или clear стадии 3 — правильный момент, потому что ценность уже понятна. Разовость и −60 % видны прямо на карточке (оценка).
3. **Hull Pack — импульсная покупка на экране Defeat.** За единицу он дороже Field Kit. Чтобы это не выглядело обманом, на Defeat рядом с Hull Pack показываем Field Kit с пометкой «best value» (рекомендация для раздела 16, оценка). Цены не меняем.
4. **Честность важнее выжимания.** Кампания проходится без покупок: кривая сложности без «стен» (раздел 13), бустеры приходят из наград за стадии и календаря. Это прямой ответ на жалобу №1.
5. **Риск pay-to-win в Siege.** Siege разрешает бустеры (лимиты ×2), а результат идёт в лидерборд. Это зона жалоб №2. Митигация (рекомендация, оценка): жёсткие лимиты на забег уже есть; на экране результата и в строке лидерборда показывать иконку «использованы бустеры»; недельный период лидерборда снижает «вечный» отрыв. Решение — за разделами 13/16.
6. **Никаких таймеров, лутбоксов и рандома в платных паках.** Пак всегда содержит ровно то, что написано.

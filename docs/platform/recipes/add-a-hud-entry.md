# Добавить плитку HUD или счётчик топбара

Всё — в `src/screens/index.ts` (списки `HUD` и `TOP_BAR`) и в записях `configs/remote/`;
`src/shell/` не меняется. Свои плитки игры не рисуются на экранах: событие, задания, оффер —
плитки HUD. Правила зон — [windows-and-hud.md](../services/windows-and-hud.md).

## Плитка активности или денег
1. Строка доступного имени — ключ в записи
   `localization/strings` ([add-a-localized-string.md](add-a-localized-string.md)), например
   `screen.hud.event`. На плитке текста нет — имя читает экранный диктор и тесты.
2. Запись в `HUD`; `kind` — смысл: `activity` (слева: события, задания, рейтинги) или `money`
   (справа: магазин, офферы, акции). Место в списке — место в колонке и приоритет:
   ```ts
   export const HUD: readonly HudEntry[] = [
     { id: 'daily-rewards', kind: 'activity' },
     { id: 'leaderboards', kind: 'activity' },
     { id: 'event', kind: 'activity', icon: 'calendar', label: 'screen.hud.event' },
     { id: 'shop', kind: 'money' },
   ];
   ```
   `icon` — ключ иконки скина (`calendar`, `quest`, `star`, `trophy`, `flame`, `gems`… — список в
   галерее скина) или id предмета из `ITEMS` (`src/skin/art.ts`). Новая иконка, которую видит
   игрок, — в `tests/skin-gallery/visible-icons.json`.
3. Что открывает нажатие:
   - окно кита — триггер в `configs/remote/ui.windows/main.json` на элемент `hud:<id>`:
     ```json
     { "id": "hud-event", "on": { "element": "hud:event" }, "do": [{ "module": "progress", "action": "quests" }] }
     ```
     У окна модуля должен быть презентер в `src/shell/windows/` (есть: магазин `iap.main`, оффер
     `iap.offer`, награды, лидерборд, профиль); другого окна кит сам не покажет;
   - экран игры — `open: { route: 'event' }` (маршрут из `Route`);
   - свой код — `open: { run: (ctx) => … }`.
4. Значок, отсчёт, видимость — `status`: функция и события шины, на которые её читать заново.
   Опросов и таймеров нет: только события.
   ```ts
   { id: 'event', kind: 'activity', icon: 'calendar', label: 'screen.hud.event',
     status: { on: ['inventory:state:changed'], read: (ctx) => ({ visible: true, badge: 'dot', endsAt: … }) } },
   ```
   `visible: false` убирает плитку (за ней ничего нет); `badge` — `'dot'` или число; `endsAt` —
   конец отсчёта, мс по времени сервера. У плиток модулей действует только `visible`.

## Оффер на HUD
1. Оффер и плейсмент — записи `configs/remote/iap.offers/<offer>.json` (с `schedule`, если
   ограничен по времени) и `configs/remote/iap.placements/<placement>.json`
   ([add-a-shop-product.md](add-a-shop-product.md)); плейсмент — свой, не `placement_shop`.
2. Картинка оффера — `OFFERS` в `src/skin/art.ts` по ключу оффера (её же покажет окно оффера).
3. Плитка — в `HUD`, справа:
   ```ts
   { id: 'offer-starter', kind: 'money', icon: 'gift', label: 'screen.hud.starter', offer: true },
   ```
   `icon` — запасная картинка, пока у оффера нет своей в `OFFERS`.
4. Триггер плитки — окно оффера кита с этим плейсментом:
   ```json
   { "id": "hud-offer-starter", "on": { "element": "hud:offer-starter" },
     "do": [{ "module": "iap", "action": "offer", "params": { "placement": "placement_starter" } }] }
   ```
Плитка видна, только пока в плейсменте есть доступный оффер, с его картинкой и отсчётом до конца;
купил, кончился срок — плитки нет. Окно — `limitedOffer` кита (`src/shell/windows/offer.ts`).

## Счётчик топбара
Запись в `TOP_BAR`, по порядку за профилем:
```ts
export const TOP_BAR: readonly BarResource[] = [
  { kind: 'item', id: CURRENCY, label: 'shell.currency.coins' },
  { kind: 'item', id: 'item_gems', label: 'screen.bar.gems' },
  { kind: 'level' },
];
```
`id` — id предмета каталога (`configs/remote/inventory.catalog/`), картинка — его из `ITEMS`
(или `icon`). Id предметов, кроме `CURRENCY`, держать в `src/boot/ids.ts` рядом с ним.
Нажатие на счётчик и его «+» открывает магазин (плитка `shop` в `HUD`); другое — `open`:
`{ element: 'hud:offer-gems' }` и триггер этого элемента в `ui.windows/main`, `{ route }`, `{ run }`;
`open: false` — счётчик без «+» ([windows-and-hud.md](../services/windows-and-hud.md#топбар-список-top_bar)).

## Проверка
- `npm run test:unit` — `tests/hud.test.mjs` перечисляет плитки и счётчики без иконки скина или
  без строки, плитки не на своей стороне, плитки модулей с чужими полями.
- Галерея скина: вид `home-hud` (пример с событием, оффером и вторым ресурсом без «+», `open: false`)
  в трёх размерах; «+» есть ровно у счётчиков, которым есть что открыть;
  в ландшафте телефона колонка вмещает 4 плитки целиком, остальное — прокруткой; в портрете
  топбар — профиль и два счётчика.

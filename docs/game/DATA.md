# Iron Burrow — записи игры на тестовом стенде (app 360, env test)

Дата: 2026-11-19. Контракт: `docs/plan/SERVICES_CONTRACT.json` (platformData) и ГДД 15/16/31 —
файла `docs/game/CONTRACT.md` в проекте нет (D-DATA-01). Решения шага — `docs/gdd/DECISIONS.md`,
D-DATA-01…12. Подробные журналы вызовов (ключи идемпотентности, ревизии, rid) —
`docs/build/publish-services/*.md`, чтения обратно — `docs/build/publish-services/readback/`.

Порядок для каждой записи: схема сервиса с сервера в `schemas/` → `npm run records` →
`configs.write` с `dryRun:true` → запись → чтение обратно. Записи без принятого dryRun не было.
Схемы сервисов платформы не переписывались; `configs.schemas.put` — только для 9 своих разделов `game.*`.

## Экономика
Мягкой валюты нет (ГДД 15: задуманные траты Scrap — следующий этап). Расходуемые предметы — 4 бустера;
источники: награды уровней, ★★★, ежедневный календарь, бесплатный стартовый подарок, покупки.

## Что записано

| сервис | запись | итог | ревизия | чтение обратно |
|---|---|---|---|---|
| inventory | `bst_bubble`, `bst_shockwave`, `bst_fortify`, `bst_hull` (stackable, clientConsumable, без `enabled`) | созданы | entityVersion 1 | совпадает с `configs/remote/inventory.catalog/*` |
| levels | `levels.main/set` (30 стадий, 3 главы) | без изменений (опубликован шагом уровней) | 1 | совпадает |
| levels | `levels.main/r_0001_0010`, `r_0011_0020`, `r_0021_0030` | обновлены: убрано `server.win` (D-DATA-12), contentHash тот же | 2 | совпадает, хеш пересчитан из чтения |
| levels | `levels.endless/r_0001_0001` (Siege, `siege_pit`) | без изменений | 1 | совпадает |
| progress | `progress_main` — 30 шагов `level_N`: 1 бустер по ротации (N−1) mod 4; на 10/20/30 +1 каждого | обновлена (было 5 шагов без наград) | 2 | совпадает |
| progress | `stars_main` — 30 шагов `stars3_N`: первые ★★★ → +1 `bst_bubble` | создана | 1 | совпадает |
| progress | `reward_daily` — 7 дней (контракт), `reset {day, onMiss:false}` | создана | 1 | совпадает |
| sdk-modules | `daily-rewards`: `track reward_daily`, `cycleLength 7`, `onMiss false` (без `days`, см. отказы) | применено | ревизия модулей 2 → 3 | `sdk.modules.list` → revision 3 |
| iap | `iap.settings.products/`: starter_crate 0.99, hull_pack 1.99, field_kit 4.99, heavy_arsenal 9.99, commander_cache 19.99 | созданы | 1 | совпадает |
| iap | `iap.offers/`: 5 платных (starter_crate — `purchaseLimit {count:1}`; field_kit — бейдж Best value) + `start_grant` (`kind: free`, 2× каждого бустера, `purchaseLimit {count:1}`) | созданы | 1 | совпадает |
| ads | `ads.game.placements/`: shop, placement_shop, defeat, prestage, starter_auto, start_grant (domain iap) | созданы | 1 | совпадает |
| iap | `iap.placements/` с теми же ключами (placement_shop = окно магазина оболочки, D-DATA-06) | созданы | 1 | совпадает |
| leaderboards | `siege_best`: best_max, источник levelEnd set `endless`, maxValue/maxDelta 3 995 000 | создана | version 1 | совпадает |
| leaderboards | `campaign_score`: sum (increment), levelEnd set `main`, won, maxDelta 17 550 | создана | version 1 | совпадает |
| configs | схемы + записи `game.balance`, `game.enemies`, `game.powerups`, `game.boosters`, `game.siege`, `game.rewards`, `game.iap_packs`, `game.iap_shop_order`, `game.iap_placements` (ключ `main`, D-DATA-08) | созданы | схемы v1, записи rev 1 | совпадает; предпросмотр клиента отдаёт все 9 |
| localization | `en`: 133 ключа (`shell.title` = «Iron Burrow», item/offer/placement/levels/progress/reward/leaderboard из `strings/game.json`) | +87, изменено 8, удалено 7 (offer.coins_* шаблона) | версия локали 4 | 133/133 совпадает |

`ui.hud/layout` (rev 1) не менялась — состав HUD задаёт код (D-DATA-08).
id из ответов сервисов в конфигах (D-DATA-09): `game.boosters.items.*.item_id` = `bst_*`,
`game.iap_packs.*.offer_id` = ключ оффера, `game.siege.level_set_id` = `endless`,
`game.rewards.level_set_id` = `main`, `game.rewards.boards` = `siege_best` / `campaign_score`,
`game.rewards.progress` = `progress_main` / `stars_main` / `reward_daily`.

Для шагов кода: `levelEnd` уровня кампании — `set:"main"`, без `objectives`; Siege — `set:"endless"`.
Трек звёзд `stars_main` читается тем же `progress.init` (ключ) — оболочка читает только
`progress_main` и `reward_daily`, выдача за ★★★ от этого не зависит (сервер выдаёт сам).

## Проверка новым гостем (клиентский API)
`docs/build/publish-services/guest-step-data-{1,2,3}.json`, `guest-step-data-daily.json` (jwt скрыт).

1. Гость gid 32079: `levelEnd` уровня 1 в границах (moves 0, 61 с, счёт 5000) без `objectives` →
   `verified:false, reason:"win_mismatch"`, награды нет. Причина — `win.objectives` в границах.
2. Гость gid 32091: с `objectives:["destroy_all"]` → `verified:true, stars:3`.
3. После D-DATA-12 (rev 2) гость gid 32397, ровно как вызывает порт игры (без `objectives`, configVersion 2) →
   **`verified:true, stars:3`**; `progress_main.level_1` completed, награда `bst_bubble` ×1 `granted`;
   `stars_main.stars3_1` completed, `bst_bubble` ×1 `granted`; инвентарь: `bst_bubble` = 2.
4. Ежедневный вход, гость gid 32116: `login` → `day_1` completed, `bst_bubble` ×1 `granted`, инвентарь 1.

## Отказы платформы
| вызов | код | сообщение | rid | что сделано |
|---|---|---|---|---|
| `sdk.modules.set` dry-run, `settings.daily-rewards.days` (календарь 7 дней) | VALIDATION_FAILED | `sdk.modules.set: settings.daily-rewards.days — validation failed. Variant 1: Invalid input: expected boolean, received array` | d7f62e0a-3588-41da-9f5f-6a50ff0a7ad8 | не обходилось: настройки применены без `days`; выдача дней — документированный трек `progress/reward_daily` |
| `progress levelEnd` (гость, уровень 1) | — (202, `verified:false`) | `reason: win_mismatch` | ответ без rid; eventId da199811-6e1a-4339-a08f-323b09dc71c7 | исправлены свои границы уровня (D-DATA-12), не порт |

Остальные dryRun и записи приняты с первой попытки (успешные ответы rid не несут); NOT_FOUND при
чтении до создания — ожидаемые (rid в журналах).

## Чего не хватает у платформы
- **Недельный сброс лидерборда** (`siege_best`, понедельник 00:00 UTC): у `leaderboards.definitions.put`
  нет повторяющихся периодов; недельная ротация — задание планировщика, доступное только доверенному
  сервису. Доска создана как лучший результат за всё время; датой окончания не имитировалась.
- **«Сумма лучших счетов стадий»** (`campaign_score`): источника «каждая стадия один раз с лучшим
  счётом» в source_catalog нет; доска суммирует счёт каждой победы (повтор стадии добавляет снова).
  Фильтра `data.verified` в каталоге нет. По D-31-06 клиент может досылать сумму сам, если `canSubmit`.
- **Календарь дней в настройках `daily-rewards`**: значения настроек — только скаляры (см. отказ).
- Пресетные ограничения скорости (velocity) лидербордов ниже одного большого результата —
  такой счёт помечается (flag), но принимается.

## Известные провалы проверок проекта (не данные этого шага)
`npm run check:fast`: `tests/records.test.mjs` (3 ложных срабатывания схемы `localization` на
`strings.json` — схема описывает настройки локалей; тесты на удалённые ранее образцы
`offer_coins_small`; `item_coins` в `src/boot/ids.ts`) и `tests/skin-readiness.test.mjs`
(`ITEMS.item_coins` в `src/skin/art.ts`). Валюты в игре нет (контракт), а `ids.ts`/`art.ts` — код
обвязки и экранов, этот шаг его не меняет: исправляют шаги кода (`CURRENCY`, `ITEMS`, бустеры в `ITEMS`).

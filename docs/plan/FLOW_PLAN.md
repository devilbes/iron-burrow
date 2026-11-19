# План прогона — Iron Burrow (flow-plan)

Игра: 2D-аркада сверху (танк-бур защищает Ядро), web, покупки наборов бустеров, рекламы нет, базовый язык en. Источник — `docs/gdd/BUILD_BRIEF_MVP.md` «Факты для плана», `docs/gdd/services-matrix.md`, MCP `sdk.modules.list` / `sdk.kit.get`.

## Факты, переданные в план (threads.plan facts)

| факт | значение | откуда |
|---|---|---|
| render | 2d | BUILD_BRIEF |
| genre | arcade | BUILD_BRIEF |
| monetization / ads | iap / false | BUILD_BRIEF, рамки потока |
| online | true | BUILD_BRIEF |
| audio | true (11 музыкальных файлов, 50 SFX) | BUILD_BRIEF, ГДД 23 |
| localisation | [en] | BUILD_BRIEF |
| liveops | false | BUILD_BRIEF, ГДД 33 |
| remote_configs | true | BUILD_BRIEF |
| leaderboards | true — `siege_best`, `campaign_score` | BUILD_BRIEF |
| daily_rewards / inventory | true / true (`bst_bubble`, `bst_shockwave`, `bst_fortify`, `bst_hull`) | ГДД 15 |
| currency / upgrades | false / false | ГДД 15 `meta.next`, правило экономики |
| levels | true (campaign 30, siege 1) | ГДД 12 |
| story / characters | false / false | ГДД: экранов истории нет |
| orientation_fixed / orientations | false / portrait 390x844, landscape 844x390, desktop 1440x900 | BUILD_BRIEF |
| target | web | BUILD_BRIEF |
| sdk_modules / revision | ui-kit, hud, inventory, progress, daily-rewards, iap, leaderboards, profile-pack, realtime / 2 | `sdk.modules.set` этого шага |
| screens / game_images / skin_images / image_generation_budget | 16 / 92 / 24 / 260 | BUILD_BRIEF |

## Что сделано с SDK

- `sdk.modules.set` dry-run → apply (revision 1 → 2, idempotencyKey `37f4dd3e-…7dbf`, orientation any): включены 8 модулей матрицы сервисов. `sdk.modules.list` после apply: revision 2, все `servicesReady`, `problems` пусто. `platform.json` на git main проекта обновлён сервисом projects; рабочую копию синхронизирует шаг template-layout (его writeSet).
- `docs/platform/sdk-methods.lock.json` — 182 метода `<ns>.<method>` ядра и 8 модулей из `docs/api.json` комплекта `sdk.kit.get` (sha256 api.json `99cdc61d…` совпадает с записью комплекта), `later: []`.

## Изменения плана

| шаг | действие | почему |
|---|---|---|
| character-sheet | удалён | персонажей с позами нет: танк и жуки сверху, экранов истории и диалогов нет; единство спрайтов держат STYLE_REF и план ассетов; экономит бюджет генераций (260) |
| template-layout | уточнён | состав SDK уже применён (rev 2); взять platform.json с git main / `sdk.kit.get`, завендорить 8 пакетов модулей, не затирать лок методов и данные уровней; `check:services-contract` — PASS |
| game-contract | уточнён | контракт сервисов и сценарии обязательны; наборы уровней `campaign`/`siege` вместо `levels.main`; грант — бесплатный оффер; три ориентации равноправны (правило потока выше строки шаблона «портрет — адаптация») |
| game-logic | уточнён, writeSet + `tests/sim/**` | вызовы SDK по контракту, детерминированное ядро ГДД 10–12, симуляции баланса ГДД 13 §3 на seeds 1/7/42 с порогами `QUALITY_TARGETS.json` |
| game-screens | уточнён | сервисные экраны строго по контракту (магазин/офферы/грант, daily, лидерборды, настройки, HUD), награда крупной картинкой, три ориентации |
| game-records | уточнён, writeSet + `docs/plan/SERVICES_READBACK.json` | публикует ровно `platformData` контракта (в т.ч. календарь daily через настройки модуля daily-rewards, доски через `leaderboards.definitions.put`), пишет квитанцию readback для `check:contract-platform` |

Остальные шаги оставлены как есть: analytics-taxonomy (аналитика используется через `sdk.analytics.sendEvent`), дизайн/иконки/ассеты (2D, Codex), sound (ElevenLabs), сборка, проверка и публикация. Новых шагов не добавлено, зависимостей на служебные шаги (fix-/ret-/gate-/verify-) нет, обязательные шаги ни от чего необязательного не зависят.

## Решения (журнал)

Шаг пишет только свой writeSet; `docs/gdd/DECISIONS.md` ему не принадлежит, поэтому решения записаны здесь.

| ID | решение | обоснование |
|---|---|---|
| D-FP-01 | Состав SDK: ui-kit, hud, inventory, progress, daily-rewards, iap, leaderboards, profile-pack, realtime; без ads и scheduling | матрица сервисов; ads запрещены рамками, scheduling — beta и liveops = false |
| D-FP-02 | Валюты нет; currency и upgrades — excluded | правило экономики: Scrap с постоянными тратами описан как следующий этап, exchange/стартовый набор платформа не публикует |
| D-FP-03 | Стартовый грант 2× каждого бустера — бесплатный iap-оффер `start_grant` с лимитом 1 | отдельного метода гранта в SDK нет; `iap.purchase` умеет «claim a free one», выдача серверная и идемпотентная |
| D-FP-04 | Лучший результат Siege — `leaderboards.rank(siege_best)`; рекорды стадий — `progress.init` | без своих сохранений; `siege.best_local` в gamestate — только зеркало для «NEW BEST!» |
| D-FP-05 | Очки досок пишет сервер из `levelEnd`; `submitScore` только при `canSubmit` | `clientAuthoritative: false` |
| D-FP-06 | Календарь daily задаётся настройками модуля daily-rewards (`days`, `onMiss: false`), получение — серверная операция через `progress.send` | модуль сам наград не выдаёт; пропуск дня цикл не сбрасывает (ГДД 15) |
| D-FP-07 | liveops-функция = realtime (`status`, `notice`): push-обновления балансов/заказов/конфигов и баннер объявлений; событий и сезонов нет | realtime в составе по матрице; liveops = false |
| D-FP-08 | Аналитика — `sdk.analytics.sendEvent` (ядро), без своего транспорта | до регистрации провайдера платформой вызов — no-op; меняет NOT_RUN_LATER ГДД 32 на вызов SDK |
| D-FP-09 | Модули ядра в контракте записаны через объявленный модуль-носитель (configs → progress, analytics → ui-kit, profile → profile-pack) | гейт требует модуль из platform.json, ядро там не объявляется; нехватка записана в контракте |
| D-FP-10 | Удалён character-sheet | см. таблицу изменений |

## Проверки этого шага

- `npx studio-gates check:services-contract` на рабочей копии: FAIL SC-MODULE ×13 — только потому, что `platform.json` рабочей копии ещё ревизии 1 (только ui-kit). На копии с `platformJson` из `sdk.kit.get` (revision 2) — **PASS**. Синхронизацию делает template-layout.
- `npx studio-gates quality-targets`: QT-01 FAIL «параметр gates.quality-targets.sources не задан» — параметр gate-facts окружения, не файла; поля используют источники `gdd`/`platform` из списка гейта. QT-02/03 WARN — замеров ещё нет.
- Сценарии сервисов: 14 файлов `qa/scenarios/services/*.json` (все не-excluded функции). `status: "no-http"` у вызовов без сетевого следа (hud, realtime, portal, analytics).

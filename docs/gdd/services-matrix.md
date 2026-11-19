# Матрица сервисов платформы — Iron Burrow

Вход для ГДД (31 `plat.*`), плана (flow-plan включает модули через `sdk.modules.set` по этой матрице) и шага сервисов (services-publish). `platform.json` руками не правится.
Источник каталога — MCP `sdk.modules.list` (revision 1, SDK `1.0.0-rc.30`, 11 модулей) и docs платформы; подробности и ссылки — `docs/gdd/knowledge-base/PLATFORM_SERVICES.md`.

Рамки: только web, рекламы нет, монетизация — покупки наборов бустеров; игра — онлайн-игра платформы. Правило по умолчанию: подключается всё, что механика может использовать; исключение — только с конкретной причиной.

**Это решение выше `31 plat.services` и `BUILD_BRIEF_MVP.md`** там, где они расходятся (realtime, scheduling, форма подключения лидербордов) — см. D-SVC-01…05 в `DECISIONS.md`.

## 1. Модули каталога `sdk.modules.list` (11)

| сервис (id) | решение | обоснование | механика игры | раздел ГДД | методы SDK | конфиги / данные |
|---|---|---|---|---|---|---|
| `ui-kit` | **MVP** (required) | Обязательный модуль; все окна, HUD, магазин, награды, профиль/ManyPlay ID — только компоненты UI Kit со скином игры | все экраны S01–S16, очередь окон, крупная картинка награды в окнах | 20, 21, 30, 31 | `uiKitModule(zones)`, `createUiZones({now: () => sdk.time.now()})`, окна KitComponent, `kit:intent`, windowQueue, `defineSkin`/`useSkin` | `ui.*` |
| `hud` | **MVP** | Точки входа лобби (daily / shop / leaderboards) с бейджами — штатно через реестр HUD | иконки лобби, бейдж готовой daily-награды и Starter Crate | 20, 31 | `hud.register(spec)` → `setBadge`, `setTimer`, `setState`, `dispose`; `hud.open(id)` | `ui.hud` |
| `inventory` | **MVP** | 4 расходуемых бустера — центр экономики MVP; балансы и списание только сервером | Bubble Shield, Shockwave, Steel Fortress, Spare Hull: показ балансов, списание в бою / pre-stage / continue | 15, 10, 31 | `inventory.get`, `balance(id)`, `quantity(id)`, `refresh()`, `consume(itemId, qty, {reason, idempotencyKey})`, `entities()` | сущности `bst_bubble`, `bst_shockwave`, `bst_fortify`, `bst_hull` (stackable, `clientConsumable: true`); `inventory.exchange` — не в MVP (валюты нет) |
| `progress` (+ подмодуль `levels`) | **MVP** | Уровни только через progress: кампания и арена Siege, проверенный конец уровня, звёзды, награды уровней | 30 стадий `campaign`, арена `siege`; seed попытки; ★/★★/★★★; первое прохождение, ★★★, финалы 10/20/30 | 12, 13, 15, 31 | `levels.open(set)` → `get(n)`, `prefetch(n)`; `progress.beginAttempt({mechanic, eventId, mode:'core', level})` → `{attemptId, seed}`; `progress.levelEnd(data, {eventId})` → `level.stars/verified`; `progress.init(keys)`; `progress.send` (`tutorialDone`) | level-set `campaign`, `siege` (+ схемы `levels.entry`, `levels.set`); награды уровней |
| `daily-rewards` | **MVP** | Ежедневная награда за вход — источник бустеров, удержание | календарь 7 дней (13 бустеров за цикл), авто-окно при входе, бейдж | 15 `meta.daily`, 20 S12, 31 | `dailyRewardsModule()`; `daily-rewards.open()`, `plan()`, `setNextRewardAt(endsAt)`; события `daily-rewards:calendar:open`, `:reward:open`, `:window:close` | запись progress (track) с календарём; награды — сущности inventory |
| `iap` | **MVP** | Единственная монетизация потока — наборы бустеров за реальные деньги | 5 паков (Starter Crate … Commander Cache), плейсменты Shop / Defeat / Pre-stage / авто-окно Starter Crate | 16, 20 S10/S11, 31 | `iap.load({force})`, `iap.offers({placement})`, `iap.offer({offerKey, placement})`, `iap.purchase`, `iap.restore()`; события `iap:order:granted`, `iap:store:purchase-failed`, `iap:offers:updated` | `iap.*` (продукты, офферы, плейсменты); выдача в inventory |
| `leaderboards` | **MVP** | Счёт стадий и забегов Siege — естественное соревнование | `siege_best` (неделя), `campaign_score` (всё время), экран S13, место игрока в S09 | 11, 20 S13, 31 | `leaderboardsModule()` (без `{boards}` — в rc.25+ их нет); `leaderboards.get(key)` (уже содержит `me`), `around(key)`; `submit`/`submitScore` — только при `canSubmit === true` (у игры `clientAuthoritative: false` → очки пишет сервер из источника progress) | определения досок через `leaderboards.definitions.put` + source catalog (не configs); ключи досок — в `game.rewards.boards.*` |
| `profile-pack` | **MVP** | Все данные игрока — только сервисами платформы (обязательный минимум) | kv `settings {v, music, sfx, haptics, motion}`, флаги туториала и показов Starter Crate; облачное сохранение `gamestate`; окно профиля | 14, 15, 20 S14, 31 | `kv.get/set/query`, `gamestate.get`, `gamestate.set(data, {version, idempotencyKey})`, profile-ui | — |
| `realtime` | **MVP** | Механика использует push-обновления: бустеры выдаются сервером (покупка, daily, награда уровня) — баланс в HUD/pre-stage обновляется по событию без опроса; заказ IAP подтверждается по `iap.order.granted`; `configs.reload` применяет тюнинги без перезапуска; объявления/обслуживание панели | обновление счётчиков бустеров после покупки и наград, подтверждение покупки, горячая перезагрузка конфигов, баннер объявления | 15, 16, 31, 33 | `realtime({transports:['sse','ws','poll']})`; `realtime.status()`, `notice()`; события `realtime:inventory.balance.changed`, `realtime:iap.order.granted`, `sdk:realtime:status:changed` (подписки — у модулей SDK inventory/iap; игре — только реакция на шину) | `platform.json.endpoints.realtime` (ставит сервис projects) |
| `scheduling` | **Product** | Механике подходит (окна недельных событий Siege, периоды досок, инбокс компенсаций), но модуль `beta`: по MCP «Owner OpenAPI/readback and a corrected server clock are required before activation»; в MVP live-ops выключен (`liveops: false`), недельный сброс `siege_best` делает период доски | «Siege Weekend» — расписание ивентов Siege, инбокс игрока с наградами-бустерами | 33, 31 | `scheduling.calendar.list`, `scheduling.events.list`/ack, `scheduling.readiness` — вызов NOT RUN до активации | occurrences расписания (готовит live-ops этап) |
| `ads` | **не нужен — запрещено рамками** | Рамки потока: рекламы нет совсем; continue — за Spare Hull, не за просмотр | — | 16 | — | — |

## 2. Возможности ядра (не в каталоге, всегда MVP)

| сервис | решение | механика игры | раздел ГДД | методы SDK |
|---|---|---|---|---|
| SDK (core) | **MVP** | запуск, жизненный цикл модулей, деградация по `sdk:module:failed` | 30, 31 `plat.init` | `createSdk`, `sdk.boot`, `sdk.bus.on`, `sdk.getModule`, `sdk.destroy` |
| ManyPlay ID (auth, portal) | **MVP** | гостевой вход, привязка аккаунта из Settings S14 | 20 S14, 31 | `sdk.auth.init`, методы auth; portal — открыть ManyPlay ID |
| Профиль (`profile`, core-owned) | **MVP** | имя/аватар игрока в лобби и досках | 20, 31 | `sdk.profile.get`, `update` (id `profile` в `sdk.modules.set` не добавляется) |
| Удалённые конфиги (`configs`) | **MVP** | весь баланс, бустеры, награды, Siege, IAP-плейсменты — ключи ниже | 10–16, 31 `plat.configs` | `sdk.configs.fetch`, `get`, `getScope`, `refresh` |
| time | **MVP** | daily, кулдаун Starter Crate, таймеры HUD | 15, 16, 31 | `sdk.time.now()` |
| l10n / locale | **MVP** | строки UI en (defaultLocale en) | 20 | `sdk.l10n.t`, `sdk.l10n.locale` |
| device | **MVP** | ввод, размер поля, хаптика, офлайн | 10, 22, 31 | `sdk.device.info`, `screen`, `haptics`, `network` |
| analytics | **MVP** | события воронки (стадии, покупки, daily) | 32 | `sdk.analytics.sendEvent` |

## 3. Ключи remote config

| раздел ГДД | ключ | механика | сервис |
|---|---|---|---|
| 10 | `game.balance.field_cells`, `core_cell`, `player_spawn`, `enemy_spawns` | геометрия поля 13×13, Core, спавны | configs |
| 10 | `game.balance.player_speed`, `player_lives`, `spawn_shield_s`, `bullet_speed`, `gun_l1_bullet_speed`, `gun_l2_bullets`, `gun_carry_campaign`, `oil_slide_cells` | движение, жизни, стрельба | configs |
| 10 | `game.balance.stage_enemies`, `carrier_indices` | состав стадии, носители power-up | configs |
| 13 | `game.balance.max_alive_by_chapter`, `spawn_interval_s_by_chapter` | кривая сложности по главам | configs |
| 11 | `game.balance.score_clear_bonus`, `score_life_bonus`, `score_powerup` | очки | configs |
| 10 | `game.enemies.scout`, `grunt`, `gunner`, `brute` | параметры врагов | configs |
| 10 | `game.powerups.lifetime_s`, `weights`, `bubble_s`, `rebar_s`, `freeze_s`, `quake_scores` | power-up на поле | configs |
| 15 | `game.boosters.items.<bubble\|shockwave\|fortify\|hull>.item_id` | id сущностей inventory (пишет services-publish) | configs → inventory |
| 15 | `game.boosters.bubble`, `shockwave`, `fortify`, `hull`, `siege_limit_mult` | эффекты и лимиты бустеров | configs |
| 15 | `game.siege.unlock_after_stage` | открытие Siege | configs |
| 12 | `game.siege.level_set_id` | level-set `siege` | configs → progress |
| 13 | `game.siege.wave_size`, `max_alive`, `brute_share` | волны Siege | configs |
| 10 / 11 | `game.siege.lives`, `continue_max`, `kill_mult_per_wave`, `wave_clear_bonus_per_wave` | жизни и счёт Siege | configs |
| 15 | `game.rewards.first_clear_rotation`, `first_clear_qty`, `three_star`, `finale_stages`, `finale_bundle`, `start_grant`, `daily_preview` | показ наград (выдают сервисы, D-31-03) | configs (показ) / progress, daily-rewards, inventory (выдача) |
| 15 | `game.rewards.level_set_id` | level-set `campaign` | configs → progress |
| 15 / 11 | `game.rewards.boards.siege_best`, `game.rewards.boards.campaign_score` | ключи досок | configs → leaderboards |
| 16 | `iap.packs.<starter_crate\|hull_pack\|field_kit\|heavy_arsenal\|commander_cache>` | состав, цена, offer_id паков | configs → iap |
| 16 | `iap.shop_order` | порядок витрины S10 | configs → iap |
| 16 | `iap.placements.defeat`, `iap.placements.prestage`, `iap.placements.starter_crate` | плейсменты офферов | configs → iap |
| 20 | `ui.hud` | раскладка иконок лобби | configs → hud |
| 12 | level-set `campaign` (30), `siege` (1) — раздел «Уровни», не `game.*` | данные уровней | progress (levels) |

Все ключи — с дефолтом в клиенте (31 `plat.configs`), схемы — `configs/schemas/`; публикует services-publish.

## 4. Экономика (правило экономики потока)

- Награды игры — то, что механика реально расходует: 4 бустера, а также звёзды (progress) и место в рейтинге (leaderboards).
- Мягкая валюта Scrap выбрана геймдизайном вместе с постоянными тратами (Garage-апгрейды, коллекция скинов корпуса, бонусные главы), но платформа пока не публикует правила обмена и стартовый баланс → в первой версии валюты нет; описана в 15 `meta.next` как следующий этап. Твёрдой валюты нет.
- Инвентарь, ежедневные награды и магазин включены, потому что есть что выдавать: daily и награды уровней дают бустеры, магазин продаёт наборы бустеров за реальные деньги, игра расходует их сама. (Если бы расходуемых предметов не было — эти сервисы не включались бы.)

## Итог

| | число |
|---|---|
| модулей в `sdk.modules.list` | 11 |
| MVP | 9 (`ui-kit`, `hud`, `inventory`, `progress`, `daily-rewards`, `iap`, `leaderboards`, `profile-pack`, `realtime`) |
| Product | 1 (`scheduling`) |
| не нужен | 1 (`ads` — запрещено рамками потока) |
| возможности ядра (всегда MVP) | 8 строк |

Для flow-plan: `sdk.modules.set` — `ui-kit`, `hud`, `inventory`, `progress`, `daily-rewards`, `iap`, `leaderboards`, `profile-pack`, `realtime` (без `profile`, `ads`, `scheduling`).

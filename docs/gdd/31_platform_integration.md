# 31 — Интеграция с платформой (`plat.`)

Источник — `00_MASTER.md` §11–§15; `docs/sdk/README.md`, `core.md`, `modules.md`, `ui-kit.md`; `platform.json` (appId 360, среда `test`, SDK / адаптер / UI Kit 1.0.0-rc.30, `gameType: server`, `clientAuthoritative: false`, состав сейчас: `ui-kit`, `modulesRevision` 1).
**Итог по сервисам — `docs/gdd/services-matrix.md`.** Здесь — как игра их вызывает.

Правило: имя метода указано, только если оно есть в `docs/sdk/*`; сигнатуры и аргументы, которых там нет, — «уточняет интеграция».

## plat.init — порядок инициализации

1. Состав приложения: шаг интеграции добавляет модули через MCP `sdk.modules.set` (в составе сейчас только `ui-kit`) и ставит их `sdk.modules_install`; `platform.json` и `vendor/` руками не правятся. Id модулей состава (в частности, чем закрывается profile-pack и daily-rewards) — уточняет интеграция.
2. `src/main.ts`: загрузить `./platform.json` → `createSdk({ modules, platformConfig, http: { appVersion } })`, где `modules` — фабрики: `profileModule()`, `gameStateModule()` (`mod-profile`), `inventory()`, `progressModule()`, `leaderboardsModule({ boards })`, `iapModule({})`, `hudModule()`; фабрики UI Kit и daily-rewards — уточняет интеграция. Форма `boards` — уточняет интеграция; логические ключи `siege_best`, `campaign_score` (D-31-01).
3. **До `boot()`** — подписки `sdk.bus.on`: `sdk:module:failed` (`{ id, code }` → сервис помечается деградированным), `sdk:core:ready`, `kit:intent` (интенты окон UI Kit → модуль `screens`).
4. `await sdk.boot()`: платформа → вход игрока (`sdk.auth.init`) → конфиги и состав → `init`/`start` модулей → `ready`, `sdk:core:ready`. Сбой входа или некритичного модуля `boot()` не роняет. На экране S01 — загрузчик SDK.
5. После `boot()` (meta-bridge): конфиги `game.*`, `iap.*` через `sdk.configs` → валидация по схемам → при ошибке ключа встроенный дефолт (`plat.configs`).
6. Состояние игрока: `sdk.inventory.balance`, состояние level-set `campaign` (метод чтения — уточняет интеграция), `sdk.gamestate.get`, kv профиля (уточняет интеграция).
7. Стартовый грант (15 `meta.grant`), если ещё не получен (метод — уточняет интеграция).
8. `sdk.hud.register` иконок daily / shop / leaderboards, `sdk.hud.setBadge` по состоянию.
9. Если daily-награда доступна — окно S12 в очередь окон UI Kit; затем S02 Lobby. Окно Starter Crate — не при запуске.
10. Перезапуск SDK (фатальный сбой): `await sdk.destroy()` → новый `createSdk`.

## plat.services — сервисы

| сервис | зачем в игре | модуль игры | статус | итог |
|---|---|---|---|---|
| ui-kit | все окна, топ-бар, нижний бар, HUD-иконки, магазин, награды, лидерборды, профиль / ManyPlay ID, очередь окон | screens, hud-ui | обязателен | docs/gdd/services-matrix.md |
| inventory | 4 бустера: балансы, списание | boosters | используется | docs/gdd/services-matrix.md |
| progress | level-set `campaign` (30 стадий) и `siege` (арена), проверенный конец уровня, награды уровней, звёзды / лучший счёт | meta-bridge | используется | docs/gdd/services-matrix.md |
| daily-rewards | календарь 7 дней | meta-bridge, screens | используется | docs/gdd/services-matrix.md |
| iap | 5 паков, офферы, покупка | shop | используется | docs/gdd/services-matrix.md |
| leaderboards | `siege_best`, `campaign_score` | meta-bridge, screens | используется | docs/gdd/services-matrix.md |
| profile-pack | kv-настройки и флаги, gamestate, профиль в UI | meta-bridge, screens | используется | docs/gdd/services-matrix.md |
| hud | иконки daily / shop / leaderboards с бейджами | hud-ui | используется | docs/gdd/services-matrix.md |
| configs (ядро) | тюнинги `game.*`, `iap.*` | meta-bridge | используется | docs/gdd/services-matrix.md |
| ads | — | — | **исключён рамками потока** (рекламы нет вовсе) | docs/gdd/services-matrix.md |
| realtime | — | — | не используется: живого мультиплеера нет, пушить в MVP нечего | docs/gdd/services-matrix.md |
| scheduling | — | — | не используется: модуль beta; недельный сброс делает период доски `siege_best` | docs/gdd/services-matrix.md |

## plat.calls — вызовы SDK по модулям игры

| модуль | вызов | когда | есть в docs/sdk |
|---|---|---|---|
| main.ts | `createSdk`, `sdk.boot`, `sdk.bus.on`, `sdk.destroy`, `sdk.state` | запуск / перезапуск | да |
| meta-bridge | `sdk.configs.fetch` / `get` / `getScope` / `refresh` (аргументы — уточняет интеграция) | после boot; `refresh` — при возврате в Lobby | да (имена) |
| meta-bridge | `sdk.progress.send` (назначение и аргументы — уточняет интеграция; используется на старт стадии) | старт стадии | да (имя) |
| meta-bridge | `sdk.progress.levelEnd` (поля: стадия, результат, звёзды, счёт — форма уточняет интеграция) | S07 Stage Clear и поражение | да (имя) |
| meta-bridge | чтение level-set и наград уровня | Stage Map, Pre-stage | уточняет интеграция |
| meta-bridge | стартовый грант | после boot, 1 раз | уточняет интеграция |
| meta-bridge, screens | daily-rewards: статус, получение | после boot, S12 | уточняет интеграция |
| meta-bridge | `sdk.leaderboards.submitScore` | S09; после `levelEnd` с новым лучшим | да |
| screens | `sdk.leaderboards.get` | S13 | да |
| meta-bridge | `sdk.gamestate.get` / `set` | boot; конец стадии | да |
| meta-bridge, screens | `sdk.profile.get` / `update` | S14 Settings, профиль | да |
| meta-bridge | kv профиля (настройки, флаги туториала, оффера) | boot; изменение настроек | уточняет интеграция |
| boosters | `sdk.inventory.balance`, `sdk.inventory.consume` | boot, после покупки / награды; нажатие бустера, pre-stage, continue | да |
| shop | `sdk.iap.offers`, `sdk.iap.purchase` | открытие S10 / плейсмента; покупка | да |
| hud-ui | `sdk.hud.register`, `sdk.hud.setBadge` | после boot; смена состояния daily / Starter Crate | да |
| screens | окна UI Kit (магазин, награды, лидерборды, профиль), `kit:intent`, очередь окон; метод показа окна — уточняет интеграция (`ui-kit/recipe/show-shop`, `show-hud`) | все экраны S02–S16 | частично |
| все | `sdk.l10n.t`, `sdk.l10n.locale` | любой текст | да |
| input, field-render, feel, shop | `sdk.device.info`, `screen`, `haptics`, `network` | тип ввода, размер поля, вибрация, офлайн | да |
| meta-bridge, shop | `core.time.now()` | daily, кулдаун Starter Crate | да |

## plat.failures — сбои и отсутствие сети

| сервис | сбой / нет сети | поведение игры |
|---|---|---|
| ядро / ui-kit | `boot()` не дошёл до `ready` или UI Kit не загружен | S01 с текстом «Can't connect» и кнопкой Retry → `sdk.destroy` + новый `createSdk` |
| configs | ключ не получен или не прошёл схему | встроенный дефолт из `plat.configs`; игра работает |
| progress | нет сети перед стартом стадии | старт стадии недоступен: Pre-stage показывает «Connection needed» (сервер проверяет конец уровня, `clientAuthoritative: false`) (D-31-02) |
| progress | `levelEnd` не прошёл | повтор с паузами 2 / 4 / 8 / 16 / 32 с; затем в S07 кнопка «Retry saving»; результат хранится только в памяти до успеха; награды показываются после ответа сервиса |
| inventory | `balance` не получен | кнопки бустеров неактивны со счётчиком «—», стадия играется без бустеров |
| inventory | `consume` не прошёл | бустер в бою: эффект уже применён (оптимистично, 15 D-15-02), до 3 повторов 1/2/4 s, затем кнопка бустера неактивна до конца стадии; `bst_hull` (pre-stage / continue): эффект не применяется, ошибка на кнопке, continue доступен для повтора |
| daily-rewards | статус / получение не прошли | иконка без бейджа; в S12 — ошибка и Retry; награда не теряется (сервер) |
| iap | см. 16 `mon.errors` | покупки неактивны офлайн; выдача только сервером |
| leaderboards | `get` не прошёл | S13 «Leaderboards unavailable» + Retry |
| leaderboards | `submitScore` не прошёл | 1 повтор при следующем открытии Lobby / S13 в той же сессии; лучший счёт стадий не теряется (он в progress) |
| profile-pack | kv / gamestate не прочитаны | настройки по умолчанию; флаг туториала отсутствует → туториал показывается; `gamestate.set` повторяется при следующем сохранении |
| hud | `register` не прошёл | те же точки входа (daily, shop, leaderboards) есть кнопками в Lobby |
| любой | `sdk:module:failed` | модуль помечен деградированным, зависимые кнопки скрыты / неактивны, остальная игра работает |

## plat.configs — ключи удалённых конфигов

Дефолты = числа `00_MASTER.md`; они же встроены в клиент как запасные значения. Изменение `game.rewards` меняет только отображение — фактическую выдачу задают данные сервисов, их services-publish пересобирает из тех же чисел (D-31-03).

| key | type | default | owner section |
|---|---|---|---|
| `game.balance.field_cells` | int | 13 | 10 |
| `game.balance.core_cell` | [int,int] | [6,12] | 10 |
| `game.balance.player_spawn` | [int,int] | [4,12] | 10 |
| `game.balance.enemy_spawns` | [int,int][] | [[0,0],[6,0],[12,0]] | 10 |
| `game.balance.player_speed` | number, cells/s | 3.0 | 10 |
| `game.balance.player_lives` | int | 3 | 10 |
| `game.balance.spawn_shield_s` | number | 3 | 10 |
| `game.balance.bullet_speed` | number, cells/s | 9 | 10 |
| `game.balance.gun_l1_bullet_speed` | number, cells/s | 13.5 | 10 |
| `game.balance.gun_l2_bullets` | int | 2 | 10 |
| `game.balance.gun_carry_campaign` | bool | true | 10 |
| `game.balance.oil_slide_cells` | number | 0.5 | 10 |
| `game.balance.stage_enemies` | int | 20 | 10 |
| `game.balance.carrier_indices` | int[] | [4,11,18] | 10 |
| `game.balance.max_alive_by_chapter` | int[3] | [4,5,6] | 13 |
| `game.balance.spawn_interval_s_by_chapter` | number[3] | [3.0,2.5,2.0] | 13 |
| `game.balance.score_clear_bonus` | int | 1000 | 11 |
| `game.balance.score_life_bonus` | int | 500 | 11 |
| `game.balance.score_powerup` | int | 500 | 11 |
| `game.enemies.scout` | {speed,hp,points} | {3.6,1,200} | 10 |
| `game.enemies.grunt` | {speed,hp,points} | {1.8,1,100} | 10 |
| `game.enemies.gunner` | {speed,hp,points,fast_bullet} | {2.4,1,300,true} | 10 |
| `game.enemies.brute` | {speed,hp,points} | {1.8,4,400} | 10 |
| `game.powerups.lifetime_s` | number | 12 | 10 |
| `game.powerups.weights` | map | star 30 · bubble 15 · rebar 15 · quake 10 · freeze 20 · hull 10 | 10 |
| `game.powerups.bubble_s` / `rebar_s` / `freeze_s` | number | 10 / 15 / 8 | 10 |
| `game.powerups.quake_scores` | bool | false | 10 |
| `game.boosters.items.<bubble\|shockwave\|fortify\|hull>.item_id` | string | «—» (services-publish) | 15 |
| `game.boosters.bubble` | {duration_s,max_per_stage} | {10,2} | 15 |
| `game.boosters.shockwave` | {max_per_stage} | {1} | 15 |
| `game.boosters.fortify` | {duration_s,max_per_stage} | {20,1} | 15 |
| `game.boosters.hull` | {prestage_max,continue_max,continue_lives,continue_rebuild_core} | {1,1,2,true} | 15 |
| `game.boosters.siege_limit_mult` | int | 2 | 15 |
| `game.siege.unlock_after_stage` | int | 5 | 15 |
| `game.siege.level_set_id` | string | «—» (level-set `siege`, уровень `siege_pit`; создаёт services-publish) | 12 |
| `game.siege.wave_size` | int | 10 | 13 |
| `game.siege.max_alive` | {base,wave_div,cap} | {4,3,8} | 13 |
| `game.siege.brute_share` | {per_wave,cap} | {0.1,0.5} | 13 |
| `game.siege.lives` / `continue_max` | int | 3 / 1 | 10 |
| `game.siege.kill_mult_per_wave` | number | 0.1 | 11 |
| `game.siege.wave_clear_bonus_per_wave` | int | 300 | 11 |
| `game.rewards.first_clear_rotation` | string[] | [bst_bubble, bst_shockwave, bst_fortify, bst_hull] | 15 |
| `game.rewards.first_clear_qty` | int | 1 | 15 |
| `game.rewards.three_star` | map | {bst_bubble:1} | 15 |
| `game.rewards.finale_stages` | int[] | [10,20,30] | 15 |
| `game.rewards.finale_bundle` | map | по 1 каждого | 15 |
| `game.rewards.start_grant` | map | по 2 каждого | 15 |
| `game.rewards.daily_preview` | map[7] | календарь 15 `meta.daily` | 15 |
| `game.rewards.level_set_id` | string | «—» | 15 |
| `game.rewards.boards.siege_best` / `campaign_score` | string | «—» / «—» | 15 |
| `iap.packs.<starter_crate\|hull_pack\|field_kit\|heavy_arsenal\|commander_cache>` | {offer_id,items,price_usd,one_time} | состав и цены 16 `mon.catalog`; offer_id «—» | 16 |
| `iap.shop_order` | string[] | [starter_crate, hull_pack, field_kit, heavy_arsenal, commander_cache] | 16 |
| `iap.placements.defeat` | {packs} | [hull_pack, starter_crate] | 16 |
| `iap.placements.prestage` | {pack,when_hull_zero} | {hull_pack,true} | 16 |
| `iap.placements.starter_crate` | {triggers,cooldown_h,max_auto_shows} | {[first_defeat, stage3_first_clear],24,3} | 16 |

## plat.publish — данные сервисов (формирует services-publish)

| сервис | данные | id |
|---|---|---|
| inventory | 4 предмета: `bst_bubble`, `bst_shockwave`, `bst_fortify`, `bst_hull` (расходуемые) | — |
| inventory | награда «start grant»: по 2 каждого, 1 раз на игрока, отдельно | — |
| progress | level-set `campaign`: 30 уровней из `configs/levels/campaign/`; level-set `siege`: 1 уровень `siege_pit` из `configs/levels/siege/` | — |
| progress | награды уровней: первое прохождение (30, ротация), ★★★ (30 × `bst_bubble` 1), финалы 10/20/30 (по 1 каждого) | — |
| daily-rewards | календарь 7 дней (15 `meta.daily`), цикл с повтором | — |
| iap | 5 офферов (16 `mon.catalog`), Starter Crate с лимитом 1 покупка; выдача в inventory | — |
| leaderboards | `siege_best`: неделя, сброс понедельник 00:00 UTC (+ all-time, если пресет поддерживает) | — |
| leaderboards | `campaign_score`: всё время, сумма лучших счетов стадий | — |
| configs | ключи `game.*`, `iap.*` (таблица выше) + схемы `configs/schemas/` | — |

После публикации services-publish записывает id в `game.boosters.items.*`, `game.rewards.*`, `iap.packs.*.offer_id`.

## Решения

| ID | решение |
|---|---|
| D-31-01 | Доски в коде — по логическим ключам; платформенные id — из `game.rewards.boards.*` |
| D-31-02 | Старт стадии требует сети (сервер проверяет конец уровня); офлайн доступны меню и настройки |
| D-31-03 | Награды в `game.rewards` — только для показа; выдают сервисы по данным services-publish |
| D-31-04 | Повтор `levelEnd`: 2/4/8/16/32 с, затем ручной Retry; результат в памяти, не в браузерном хранилище |
| D-31-05 | При `sdk:module:failed` игра деградирует по сервису, не падает целиком |
| D-31-06 | `campaign_score`: если источник доски на платформе умеет считать сумму из progress — клиент не отправляет; иначе клиент шлёт `submitScore` с суммой после `levelEnd`, улучшившего лучший счёт |

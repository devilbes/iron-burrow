# Iron Burrow — контракт игры (game-contract)

Общий контракт параллельных частей: **логика** (`src/modules/game/**`, `tests/game/**`, `tests/sim/**`),
**экраны** (`src/screens/**`, строки `configs/remote/localization/strings/screens.json`), **записи**
(`configs/remote/**` кроме `screens.json`, строки `strings/game.json`) и **арт/звук** (`assets/**`,
`src/skin/**`). Части пишутся одновременно и сходятся по этому файлу и по подписям в коде:
`src/modules/game/index.ts` (API игры) и `src/screens/index.ts` (маршруты, HUD, топбар).

Приоритет источников: правила экрана и ограничения шага (задание) → `docs/plan/SERVICES_CONTRACT.md/.json`
и `qa/scenarios/services/*.json` (сервисы; этот контракт их не меняет и не дополняет) → журнал
`docs/gdd/DECISIONS.md` (в т.ч. D-LVL-01…05) → ГДД 10–40. Что в ГДД противоречит правилам —
приведено к правилам в §13 (решения D-GC-NN, они же в журнале).

## 1. Правила, победа и поражение

Числа — только из записей (§8.5); здесь — правила (ГДД 10–12, 15).

- **Поле** 13×13 клеток, клетка = 2×2 четверти; 1 клетка = 600 u, координаты целые. Тайлы: `.` пусто,
  `B` кирпич (рушится любой пулей по четвертям), `S` сталь (только пушка L3), `L` лава (непроходима,
  пули летят), `R` корни (проходимы, скрывают танк сверху), `O` масло (занос 0.5 клетки), `C` Ядро
  (Burrow Core, клетка (6,12), стена — 8 клеток кирпича вокруг).
- **Игрок** — танк Burrower, 4 направления, жизни 3 (+1 за Spare Hull перед стадией); смерть: −1 жизнь,
  пушка → L0, возрождение в (4,12) со щитом. Пушка L0→L3 растёт от power-up `star`; переносится
  только кнопкой «Next» (D-10-06).
- **Враги** Rustbugs: `scout`, `grunt`, `gunner`, `brute` (4 HP); состав и порядок — `enemies[]`
  уровня; появляются в точках (0,0)→(6,0)→(12,0) по таймеру `spawnInterval`, не больше `maxAlive`
  живых; носители #4, #11, #18 мигают и роняют power-up при первом попадании.
- **Power-up** (подбирает игрок, живёт 12 s, один на поле): `star`, `bubble`, `rebar`, `quake`, `freeze`, `hull`.
- **Бустеры** (предметы инвентаря): `bst_bubble` (щит), `bst_shockwave` (уничтожает врагов на поле, с
  очками), `bst_fortify` (стальная стена Ядра), `bst_hull` (S04: +1 жизнь; S08: продолжение). Лимиты
  на стадию / забег Siege — `game.boosters`; в бою эффект сразу, списание параллельно (до 3 повторов,
  потом кнопка неактивна до конца стадии); `bst_hull` — только после подтверждения сервера.
- **Победа (кампания)**: убит 20-й враг → `cleared` → через `core.clear_delay_s` окно S07.
- **Поражение**: Ядро разрушено любой пулей (в том числе своей) → причина `core`; жизни = 0 → `lives`.
  В одном тике поражение важнее победы (E1, E2). Через `core.defeat_delay_s` → S08.
- **Продолжение** (S08, 1 раз на стадию/забег, 1 Spare Hull): 2 жизни, Ядро восстановлено (стена — нет),
  пули удалены, враги с поля — в начало очереди; стадия с продолжением даёт не больше ★.
- **Siege** (`siege_pit`, открывается после стадии 5): бесконечные волны по 10 врагов, состав и
  `maxAlive`/`spawnInterval` — формулы ГДД 12 §5 (`game.siege`); счёт с множителем `(9+w)/10`, бонус
  волны; победы нет — забег кончается поражением; итог — счёт и место в `siege_best`.
- **Счёт** — ГДД 11 (целые, `floor` на событии). Клиент не шлёт счёт выше `server.score.max` уровня.
- **Звёзды считает сервер** по `moves` = потерянные жизни: ★ ≤ 9, ★★ ≤ 1, ★★★ = 0 (D-LVL-03);
  клиент звёзд не считает.
- **Пауза**: кнопка/Esc, скрытие вкладки, `ctx.onSuspend(true)`, смена раскладки (`data-layout`) во
  время стадии → `paused` + окно S06; авто-продолжения нет (D-10-01, D-20-06).

## 2. Состояние попытки и что сохраняется

- **Только в памяти (текущая попытка)**: поле, танки, пули, power-up, очередь спавна, счёт, жизни,
  использованные бустеры, ждущие списания, волна, сид, eventId, ввод, шаг обучения. Перезагрузка
  посреди стадии начинает её заново (сохранения посреди уровня нет).
- **Сид** — `beginAttempt` сервера (`progress.beginAttempt`); PRNG mulberry32 игры инициализируется им
  (потоки `rngAI`/`rngDrop`/`rngGen` ГДД 10 §2); `Math.random`/`Date.now` в симуляции запрещены.
- **Конец уровня** (`progress.levelEnd`, повторы 2/4/8/16/32 s с тем же eventId):

| исход | вызов | данные |
|---|---|---|
| кампания, `cleared` | `ports.endLevel(n, true, {moves, score})` (набор `main`) | `moves` = потерянные жизни; звёзды и `verified` — ответ |
| кампания, окончательное поражение (Retry / Map / второе поражение) | `endLevel(n, false, {moves, score})` | закрывает попытку; рекорда и награды нет (D-11-01) |
| кампания, Quit из паузы | не шлётся | попытка брошена; аналитика `level_fail` `reason=quit` |
| Siege, конец забега (поражение без continue, End Run, Quit) | levelEnd набора `endless`, уровень 1, `won: true` | `moves` = пройденные волны, `score` = `S_run`; источник доски `siege_best` |

- **На сервере** (источник правды): прогресс стадий и звёзды (`progress_main`), лучший счёт стадий,
  баланс бустеров (inventory), покупки, доски, ежедневный трек.
- **gamestate** (через `ports.loadSave`/`save`, пишется после ACK `levelEnd`): `campaign.gun_level` 0–3,
  `campaign.last_stage`, `campaign.selected_chapter` 1–3, `siege.best_local` (зеркало для «New Best!»).
- **kv профиля** (profile-pack, пишется сразу, читается один раз; копия в памяти, D-14-06):
  `settings {v, music, sfx, haptics, motion}`, `onb.start_grant_done`, `tut.stage1_step` 0–6,
  `tut.stage1_done`, `tut.booster_hint_shown`, `tut.prestage_hint_shown`, `offer.starter.last_auto_at`,
  `offer.starter.auto_shows`, `flag.first_defeat_seen`, `booster_info.seen`.
  Локальных хранилищ браузера нет.

## 3. API игры

### 3.1 Как экраны его получают
`gameOf(ctx.game)` → `IronBurrow` (`src/modules/game/index.ts`). `ctx.game` — API модуля `game`: тот же
объект реализует `GamePorts` (оболочка его так и типизирует) и всё остальное. Для простых портов
(галерея скина, тесты) `gameOf` даёт отсоединённый API (без сервисов, данные уровня из записей) —
экраны обязаны рисоваться и в нём.

### 3.2 Как модуль игры получает сервисы
Модуль `kind: 'game'` объявляет `manifest.sdk.uses` и получает `ModuleContext.sdk.<id>` (проверено по
`core/dist/module-context.js`): `uses: ['progress', 'levels', 'inventory', 'iap', 'leaderboards', 'kv',
'gamestate', 'daily-rewards', 'realtime']`, `permissions: ['analytics', 'device:haptics']`; ядро —
`ctx.configs`, `ctx.time`, `ctx.environment` (`test` → `env.qa`), `ctx.analytics`. Вызываются **только**
методы `SERVICES_CONTRACT.json` (функции progress, levels, best, inventory, purchases, offers,
leaderboards, settings, configs, liveops, analytics, profile). Кампания идёт через `GamePorts` (набор
`main`), Siege — свой `levels.open(SIEGE_SET)` той же схемой (`beginAttempt`/`levelEnd`). Идентификаторы
записей — только из `src/boot/ids.ts` (заявка **CR-01**, §12). Чистые правила — без SDK и DOM.

### 3.3 Сигнатуры (полные — в `src/modules/game/index.ts`)

| метод | что делает | кто зовёт |
|---|---|---|
| `ready()` | конфиги, kv, gamestate, прогресс, инвентарь — один раз; офлайн тоже резолвится | home при монтировании |
| `env {qa, haptics, version}` | QA-хуки только при `test`; тумблер вибрации; `Version {version}` | game, settings-окно |
| `campaign(): CampaignInfo` | стадии 1–30 (состояние, ★, лучший), главы, `next`, звёзды, открытие Siege | home, map |
| `prestage(mode, n): PreStageInfo` | цель, лучший, Spare Hull (`on/off/empty`), подсказка, туториал, награда первого прохождения | окно S04 |
| `select(setup)` / `selected()` | выбранная стадия для маршрута `game` (`from`: lobby/map/next/replay/retry) | S04 → `ctx.go('game')`, S07/S08 |
| `start(): Match` | списывает Spare Hull (если взят), `beginAttempt`; `GameError{code:'offline'}` → «Connection needed» | game |
| `balances()`, `onBalances(fn)` | серверные количества 4 бустеров | HUD поля, S04, S08, S16 |
| `boosterLimits(id)` | лимит стадии/забега, длительность | S16 |
| `startGrant()` / `claimStartGrant()` | состав гранта или `null`; бесплатный оффер `start_grant` (`iap.purchase`) | home (окно гранта) |
| `offers(placement)` / `buy(key, placement)` | офферы плейсмента с ценой; покупка → `iap.waitOrder` | S04, S08, окно оффера, S16 |
| `starterDue()` / `starterShown()` | авто-окно Starter Crate (кулдаун 24 ч, ≤ 3 показов) | после S07/S08 |
| `board(board, period)` | `leaderboards.get` + `around`, строка игрока | S13 |
| `siegeStanding(score)` | `leaderboards.rank(siege_best)`: лучший недели, место, «New Best!» | S09, кнопка Siege |
| `settings()`, `setSettings(p)`, `onSettings(fn)` | kv `settings` | окно настроек, звук, вибрация, эффекты |
| `flag(name)`, `setFlag(name)` | флаги kv §2 | S04, S16, обучение |
| `haptic(kind)` | `sdk.device.haptics` по таблице §7.4 | game |
| `notice()`, `online()` | объявление realtime для лобби, индикатор офлайна | home, game |
| `event(name, params)` | аналитика с boolean (§10) | экраны для UI-событий |
| `Match.view()` / `advance(ms)` | состояние для отрисовки; фиксированные тики 1/60 s (≤ 5 за вызов), события тиков | game (rAF) |
| `Match.setInput({move, fire})`, `setInputMode('keys'│'touch')` | удерживаемый ввод; режим подсказок | game |
| `Match.useBooster(id)` | `applied`/`empty`/`limit`/`cooldown`/`blocked` | кнопки 1–3, клавиши 1/2/3 |
| `Match.pause()` / `resume()` | заморозка всех таймеров | game, S06 |
| `Match.tutorialNext()` / `tutorialSkip()` | шаги S15 | game |
| `Match.defeat()` / `continueRun()` | что показывает S08; продолжение за Spare Hull | S08 |
| `Match.end('final'│'quit'): StageResult` | levelEnd по §2, счёт, ★, рекорд, ожидаемая награда, `next`, `starterDue` | S07, S08, S09, S06 Quit |
| `Match.qa {win, lose}` | мгновенная победа / поражение (Ядро), только `env.qa` | кнопки `qa-win`/`qa-lose` |
| `layoutOf(w, h)` | `portrait` при aspect < 0.8, иначе `landscape` при ширине < 1024, иначе `desktop` | все экраны (`data-layout`) |

Цикл кадра — у экрана: `requestAnimationFrame` → `match.advance(dt)` → события → эффекты/звук → `view()`
→ Canvas. `ctx.onSuspend(true)` → `match.pause()` + S06; смена `layoutOf` на `game` → то же. Логика не
трогает DOM, таймеры браузера и звук.

## 4. Маршруты и экраны

`Route = 'home' | 'map' | 'game'`; **игровой (без HUD и меню) — только `game`** (`GAMEPLAY`).
`MENU = []` (нижнего меню нет). `ORIENTATION = 'any'`: portrait 390×844, landscape 844×390, desktop
1440×900 — равноправные раскладки каждого экрана по ГДД 20 (колонка «Раскладка»), `data-layout` на
корне экрана. `LOCALES = ['en']`. `TOP_BAR = []`: слева только профиль, справа только настройки.
`HUD`: слева `daily-rewards` (модуль), `boards` (своя плитка, `icon: 'trophy'`, открывает S13); справа
`shop` (модуль). Иконки HUD без подписей. `PROFILE_STATS`: пройдено стадий, лучший счёт.

| S | где живёт | `data-window` | открывается |
|---|---|---|---|
| S01 Boot | экран загрузки кита (оболочка), фон `scene` | — | старт |
| S02 Lobby | маршрут `home` (логотип, Play, Siege, звёзды, кнопка «Sound») | `lobby` | старт, Map/Lobby |
| S02 grant | окно игры на `home` (`data-state=grant`) | `lobby` | первый вход, `startGrant() ≠ null` |
| S03 Stage Map | маршрут `map` | `stage-map` | `lobby-play`, `clear-map`, `defeat-map` |
| S04 Pre-stage | окно игры (на `map`, `home` для Siege, `game` после Next/Retry/Replay) | `prestage` | узел, `stagemap-play`, `lobby-siege`, `clear-next` |
| S05 Gameplay | маршрут `game`: Canvas-поле + HUD поля + управление | `game` | `prestage-start` |
| S06 Pause | окно игры на `game` (+ тумблеры звука в теле) | `pause` | `hud-pause`, Esc, suspend, смена раскладки |
| S07 Stage Clear | окно игры | `stage-clear` | `cleared` |
| S08 Defeat | окно игры | `defeat` | `defeated` |
| S09 Siege Result | окно игры | `siege-result` | конец забега |
| S10 Shop | окно кита (плитка HUD `shop`, плейсмент `placement_shop`) | кит | HUD |
| S10′ оффер | окно игры с одной карточкой оффера (Starter Crate авто, Get more) | `offer` | `starterDue`, `prestage-shop`, `booster-info-shop` |
| S11 Purchase result | окно игры после `buy()` (магазин кита показывает свой) | `purchase-result` | `buy()` |
| S12 Daily | окно кита (плитка HUD `daily-rewards`, автооткрытие модуля) | кит | HUD |
| S13 Leaderboards | окно игры: вкладки `siege_best`/`campaign_score`, период | `leaderboards` | плитка `boards`, `siege-boards` |
| S14 Settings | (а) окно настроек кита из топбара: ManyPlay ID, язык; (б) окно игры «Sound»: музыка, звук, Reduce Motion, вибрация, версия | (б) `settings` | (а) топбар; (б) `lobby-sound`, тело S06 |
| S15 Tutorial | плашка-подсказка **внутри экрана `game`** (не `ctx.overlay`: слой забирает нажатия, а стадия идёт) | `tutorial` | стадия 1 |
| S16 Booster info | окно игры (стадия на паузе) | `booster-info` | бустер с 0, long-press 500 ms |

Окна игры — только `ctx.window.open` (до 3 кнопок кита; остальное — в `body`), слои — `ctx.overlay`.
Награду всегда показывает окно награды кита (крупные картинки `ITEMS`), после закрытия окна игры.
Фон: `scene` (лобби), `scene-map`, `scene-game` (`src/skin/art.ts`), от края до края под прозрачными
панелями; экраны не рисуют свою карточку и не ставят текст на фон (только плашки и кнопки).
Название игры на `home` — логотип (`logo_iron_burrow`), без картинки — `shell.title` на плашке.
Поле: `cell = floor(fieldPx / 13)`, не больше 72 px; P: поле во всю ширину сверху, ряд бустеров, зона
стика/FIRE снизу; L: поле по центру по высоте, слева враги/жизни/стадия и стик, справа счёт, пауза,
бустеры, FIRE; D: поле по высоте с полями 16 px, панели по бокам, подписи клавиш. Схема ввода — по
`pointer: coarse|fine` (D-20-01).

**Всё, от чего зависит ход, видно на поле**: остаток врагов (`hud-enemies`) и следующий тип в точке
спавна (силуэт `fx_spawn` за 1 s, `MatchView.spawns[].next`), удержание спавна в обучении (точки
затемнены), жизни, счёт, стадия/волна, уровень пушки (`hud-gun` + башня L0–L3), щиты и таймеры
эффектов (кольцо на кнопке бустера и на поле), стальная стена и её таймер, мигание носителя, TTL
power-up (мигает последние 3 s), заморозка, лимиты/кулдаун/пусто бустеров (`data-state`), продолжение
использовано (S08). Правила поля объяснены в обучении стадии 1 (§11).

## 5. Строки

- **Экраны** — `configs/remote/localization/strings/screens.json`, ветка `screen`: ключ ГДД 20 `ui.<a>.<b>`
  → `screen.<a>.<b>`, английский текст ГДД 20 дословно, **кроме** чисел игры — они параметрами
  (`{stars}/{max}`, `Clear stage {n} to unlock`, `Destroy all {count}.`, `+{lives} lives`).
- **Записи** — `strings/game.json` (пишет часть записей): `shell.title` = «Iron Burrow» (и убрать
  «Game» из `strings/shell.json`), `item.<bst_*>.title` / `.description` (названия бустеров: Bubble Shield,
  Shockwave, Steel Fortress, Spare Hull — `display.titleKey` каталога), `offer.<key>.title` / `.subtitle`
  (Starter Crate, Hull Pack, Field Kit, Heavy Arsenal, Commander Cache, Welcome Kit), `levels.chapter.*`,
  заголовки шагов `progress_main` и `reward_daily`. Описания предметов — без чисел.
- `strings.json` руками не правит никто — `npm run strings`.

| экран | ключи `screen.*` |
|---|---|
| общие | `common.{close, back, ok, collect, count, offline}` |
| S02 | `lobby.{play, play_sub, siege, siege_locked, stars, grant_title, grant_body, sound}`; `hud.boards` |
| S03 | `map.{title, chapter, chapter_1, chapter_2, chapter_3, chapter_locked, play}` |
| S04 | `pre.{title, title_siege, goal, goal_siege, best, hull, hull_owned, hull_none, hull_hint, shop, start, rewards, offline}` |
| S05 | `hud.{enemies, lives, stage, wave, score, gun, fire, pause, key, limit}`; `toast.{go, wave, wave_clear, star, star_max, bubble, rebar, quake, freeze, hull, fortify, shockwave}`; `qa.{win, lose}` |
| S06 | `pause.{title, resume, restart, quit}` |
| S07 | `clear.{title, chapter_done, campaign_done, kills, pickups, bonus, lives, total, best, rewards, next, replay, map, retry_save}` |
| S08 | `defeat.{title, core, lives, continue, continue_hint, continue_used, offer_title, retry, map, end_siege}` |
| S09 | `siege.{title, wave, score, best, new_best, rank, unranked, retry, boards, lobby}` |
| S10′/S11 | `shop.{one_time, best_value, contents, buy, pending, test, unavailable}`; `purchase.{success, failed, failed_body, cancelled}` |
| S13 | `boards.{title, siege, campaign, weekly, alltime, you, empty, reset, guest, unavailable}` |
| S14 (б) | `settings.{title, music, sfx, motion, haptics, on, off, version}` |
| S15 | `tut.{move_touch, move_keys, fire_touch, fire_keys, brick, core, core_selfhit, enemy, carrier, booster_hint, booster_keys, booster_touch, next, skip}` |
| S16 | `booster.{owned, more, duration, limit, limit_siege}` (название и описание — `item.<id>.*`) |
| профиль | `profile.{levels, best}` (есть) |

Новые тексты (en): `lobby.sound` «Sound», `pre.hull_hint` «Spare Hull: +1 life for this stage.»,
`pre.rewards` «First clear reward», `pre.offline` «Connection needed», `hud.gun` «Gun level {n}»,
`hud.boards` «Leaderboards», `clear.retry_save` «Retry saving», `siege.new_best` «New Best!»,
`boards.unavailable` «Leaderboards unavailable», `tut.booster_hint` «Core in danger! Use a booster.»,
`tut.booster_keys` «Press 1, 2 or 3», `tut.booster_touch` «Tap a booster button», `booster.duration`
«Lasts {seconds} s», `booster.limit` «Up to {count} per stage», `booster.limit_siege` «Up to {count} per
Siege run», `qa.win` «QA: Win», `qa.lose` «QA: Lose». Ключи `ui.topbar.*`, `ui.boot.*`, `ui.daily.*`,
`ui.settings.{profile, signin, signed, guest}`, `ui.shop.title`, `ui.lobby.title`, `ui.pause.settings`,
`ui.tut.booster`, `ui.booster.bst_*`, `ui.pack.*` — не заводятся (их показывает кит или запись).

## 6. data-testid и хуки

Окна игры: кнопки — кнопки кита с id действия = хуку ГДД; кит ставит `data-testid="game.window.<глубина>.action.<id>"`
(селектор сценариев `[data-testid$=".action.<id>"]`). Остальные хуки — на элементах `body` окна; корень
`body` несёт `data-window` и `data-state`. Хуки кита/оболочки — их собственные `data-testid`.

| экран | элементы и хуки (`data-testid`, атрибуты) | где |
|---|---|---|
| корень экрана | `app-ready` (на `home`, когда отрисован), `data-layout`; `audio-state` (`data-state=locked│unlocked`, `data-music`, `data-sfx`) | экран |
| S02 | `lobby-play` (`data-cta=primary`), `lobby-siege` (`locked│open`), `lobby-stars`, `lobby-sound`, `lobby-notice` | экран |
| S02 grant | `reward-item`, `reward-item-count` (в `body`); действие `grant-collect` | окно игры |
| HUD/топбар | бывшие `topbar-daily` → плитка `daily-rewards`; `topbar-leaderboards` → плитка `boards`; `topbar-shop` → плитка `shop`; `topbar-settings` → кнопка настроек топбара | оболочка |
| S03 | `chapter-tab` (`locked│open`), `stage-node` (`locked│open│cleared`, `data-stars`, `data-stage`), `stagemap-play`, `stagemap-back` | экран |
| S04 | `prestage-goal`, `prestage-best`, `prestage-hull` (`on│off│empty`), `prestage-shop`, `prestage-rewards`; действия `prestage-start`, `prestage-close` | окно игры |
| S05 | `game-field` (canvas: `data-grid=13x13`, `data-cell`, `data-state=playing│paused│won│lost`, `data-fx-ack`), `hud-enemies`, `hud-lives`, `hud-stage`, `hud-score`, `hud-gun`, `hud-booster-bubble│shockwave│fortify` (`ready│active│limit│empty`), `hud-booster-count`, `hud-pause`, `stick`, `fire` (только `pointer: coarse`), `hud-toast`, `qa-win`, `qa-lose` (только `env.qa`) | экран |
| S15 | `tutorial-hint` (`data-step=1..6`), `tutorial-next`, `tutorial-skip` | экран `game` |
| S06 | действия `pause-resume`, `pause-restart`, `pause-quit`; в `body` тумблеры `settings-music`, `settings-sfx`, `settings-motion`, `settings-haptics` | окно игры |
| S07 | `clear-stars` (`data-stars`), `clear-score`, `clear-rewards`; действия `clear-next`, `clear-replay`, `clear-map` (`clear-collect` нет — D-GC-09) | окно игры |
| S08 | `defeat-reason` (`data-reason=core│lives`), `defeat-continue` (`available│empty│used`, кнопка в `body`), `defeat-offer` (`data-pack`), `defeat-offer-buy`; действия `defeat-retry`, `defeat-map` (Siege: End Run) | окно игры |
| S09 | `siege-score`, `siege-rank` (`ranked│unranked`); действия `siege-retry`, `siege-boards`, `siege-lobby` | окно игры |
| S10′ | `offer-card` (`data-pack`, `available│owned│pending`); действия `offer-buy`, `offer-close` | окно игры |
| S11 | `purchase-status` (`success│failed│cancelled`); действие `purchase-ok` | окно игры |
| S13 | `boards-tab` (`data-board`, `active│idle`), `boards-period` (`weekly│alltime`), `boards-row`, `boards-self`; действие `boards-close` | окно игры |
| S14 (б) | `settings-music`, `settings-sfx`, `settings-motion`, `settings-haptics` (`on│off`, вибрация только тач + `env.haptics`), `settings-version`; действие `settings-close` | окно игры |
| S14 (а) | `settings-profile` = строка аккаунта окна настроек кита | кит |
| S16 | `booster-info-card` (`data-item`); действия `booster-info-ok`, `booster-info-shop` | окно игры |
| S10, S12 | `shop-*`, `daily-*`, `purchase-*` магазина — хуки кита (`starter.window.shop…`, окна daily) | кит |

`data-dynamic` — на меняющихся числах и списках. Сценарии `docs/gdd/qa/flows/*.json` переписывает шаг
QA по этой таблице (замены `topbar-*`, `clear-collect`, `pause-settings`, кнопки окон).

## 7. Картинки и звук

### 7.1 Правила
Рисуется только `<имя>-2x.png` (обе стороны чётные), 1x делает `npm run assets`; `assets/game/`,
`assets/ui/` — парой; `assets/skin/` — можно одним файлом (≤ 2× показа). Спрайты носом вверх, поворот
кодом; листы кадров — в ряд (UI-кнопки — столбцом). URL — `assetUrl('<папка>/<файл>')`. Генерация —
Codex image_gen со `STYLE_REF.png` + `palette.json` (§13 D-GC-14 — источник ассетов).

### 7.2 Игровые картинки — `assets/game/<id>-2x.png` (рисует экран `game` на Canvas)

| id | 2x px, кадры |
|---|---|
| `player_hull` | 256×128, 2 (move_a, move_b) |
| `player_turret_l0…l3` | 128×128 ×4 |
| `enemy_scout`, `enemy_grunt`, `enemy_gunner`, `enemy_brute` | 512×128, 4 (move_a, move_b, flash_a, flash_b) |
| `enemy_brute_damage` | 384×128, 3 (hp3, hp2, hp1) |
| `tile_<clay│iron│magma>_<brick│steel│roots│oil>` | 128×128 (12 шт.; четверти — маска кодом) |
| `tile_<theme>_lava` | 512×128, 4; `tile_<theme>_floor` 256×128, 2 |
| `core` 256×128, 2 (intact, destroyed); `core_wall_brick`, `core_wall_steel` | 128×128 |
| `bullet_player`, `bullet_enemy` | 64×32, 2 |
| `pu_star`, `pu_bubble`, `pu_rebar`, `pu_quake`, `pu_freeze`, `pu_hull` | 128×128 |
| `fx_explosion_small` 384×96 ×4; `fx_explosion_big` 1536×256 ×6; `fx_explosion_core` 2048×256 ×8; `fx_spawn` 768×128 ×6; `fx_bubble` 320×160 ×2; `fx_shockwave` 512×512; `fx_frost` 128×128; `fx_hit_spark` 192×64 ×3 | |
| `icon_life`, `icon_enemy_left`, `icon_stage`, `icon_wave`, `icon_pause`, `icon_music`, `icon_sfx`, `icon_haptics`, `icon_back`, `icon_info`, `icon_siege`, `icon_gun` | 96×96 (`icon_gun` вместо `icon_settings` — D-GC-13) |
| `ctrl_stick_base` 240×240, `ctrl_stick_knob` 112×112, `ctrl_fire` 200×200 | (нажатие — кодом) |
| `star_big` 384×192 ×2; `star_small` 96×48 ×2; `node_stage` 512×128 ×4; `node_finale` 640×160 ×4; `node_lock` 64×64; `medal_top3` 288×96 ×3; `tut_hand` 320×160 ×2 | |
| `logo_iron_burrow` | 1200×480 (единственный растровый текст) |
| `app_icon` | 1024×1024 (магазин; в сборку не входит) |

Тема тайлов: глава 1 `clay`, 2 `iron`, 3 `magma`, Siege (`pit`) — `magma`.

### 7.3 Скин кита — `assets/skin/` (ключи `src/skin/art.ts`)

| ключ | файл | размер | из ГДД 21 |
|---|---|---|---|
| `scene` | `scene.webp` | 2880×1800, cover, фокус по центру (портрет 390×844 видит центр) | `bg_lobby_*` |
| `scene-map` | `scene-map.webp` | 2880×1800 | `bg_map_*` (одна на все главы) |
| `scene-game` | `scene-game.webp` | 2880×1800, тёмная стена туннеля | фон вокруг поля |
| `ITEMS.bst_bubble│bst_shockwave│bst_fortify│bst_hull` | `items/<id>.png` | 320×320 | `icon_bst_*` (они же в HUD поля) |
| `OFFERS.starter_crate│hull_pack│field_kit│heavy_arsenal│commander_cache` | `offers/<key>.png` | 320×320 | `pack_*` |
| `OFFERS.start_grant` | `offers/start_grant.png` | 320×320 | `daily_crate` |
| `frame`, `icon-close`, `button-base` (одна серая), `bar-track`, `bar-fill` | `frame.webp` … | 9-slice | `ui_popup_frame`, `ui_btn_close`, `ui_btn_primary`, `ui_progress_*` |
| шрифты `Russo One` 400, `Exo 2` 500/700 (latin) | `fonts/*.woff2` | — | ГДД 21 |

UI-детали экранов игры — `assets/ui/<id>-2x.png` по ГДД 21 `art.uiskin`: `ui_hud_plate`, `ui_booster_slot`,
`ui_field_frame`, `ui_keycap`, `ui_tooltip`, `ui_tab`, `ui_list_row`, `ui_toggle`, `ui_header_plate`,
`ui_ribbon`, `ui_divider`, `ui_card`, `ui_badge`, `ui_btn_round`, `ui_daily_cell`, `ui_panel`
(`ui_btn_secondary`, `ui_slider_*` не делаются — кнопки тонирует `button-base`).

### 7.4 Звук — `assets/audio/` (готово, `manifest.json`)
Музыка `music/<id>.{ogg,m4a}`: `mus_lobby` (home, map, окна лобби), `mus_stage_clay│iron│magma` (по
главе), `mus_siege`. Джинглы `sfx/`: `jgl_stage_start`, `jgl_stage_clear`, `jgl_chapter_clear`,
`jgl_defeat`, `jgl_siege_result`, `jgl_siege_record`. Играет экран (Web Audio, шины music/sfx,
≤ 12 голосов) по `settings()`; пауза — фильтр/тише, `onSuspend` — стоп.

| событие `MatchEvent` | sfx | fx (`data-fx-ack`) | вибрация |
|---|---|---|---|
| `shot` player/enemy (heavy) | `sfx_shot_player(_heavy)` / `sfx_shot_enemy` | `fx.shot` / `fx.shot_enemy` | — |
| `hit` brick / steel, edge / shield / bullet / brute | `sfx_hit_brick` / `sfx_hit_steel` / `sfx_shield_block` / `sfx_bullet_clash` / `sfx_brute_hit` | `fx.hit_brick` / `fx.hit_steel` / — / `fx.bullet_clash` / `fx.hit_brute` | — |
| `steel-broken` | `sfx_break_steel` | `fx.break_steel` | — |
| `kill` (brute) | `sfx_enemy_explode` (`sfx_brute_explode`) | `fx.kill_<kind>` | — |
| `enemy-spawn` / `player-spawn` | `sfx_enemy_spawn` / `sfx_player_spawn` | `fx.enemy_spawn` / `fx.player_spawn` | — |
| `powerup-spawn` / `pickup` / `powerup-expired` | `sfx_powerup_drop` / `sfx_pu_<kind>` / `sfx_powerup_vanish` | `fx.powerup_spawn` / `fx.pickup_<kind>` | `pickup` (`blast` для quake) |
| `effect-end` freeze / shield, bubble / fortify, rebar; `shield-warning` | `sfx_freeze_end` / `sfx_shield_down` / `sfx_wall_revert` | — | — |
| `booster` / `booster-denied` | `sfx_bst_<name>` / `sfx_bst_denied` | `fx.booster_<name>` / `fx.booster_denied` | `blast` (shockwave) |
| `player-death` | `sfx_player_explode` | `fx.player_death` | `player-death` |
| `core-alarm` / `core-destroyed` | `sfx_core_alarm` / `sfx_core_destroyed` | `fx.core_destroyed` | `core-alarm` / `core-destroyed` |
| `oil-slide`, `last-enemy`, `wave-start`, `wave-clear` | `sfx_oil_slide`, `sfx_last_enemy`, `sfx_wave_start`, `sfx_wave_clear` | `fx.wave_clear` | — |
| `cleared` / `defeated` | `jgl_stage_clear` (`jgl_chapter_clear`) / `jgl_defeat` | `fx.stage_clear` | — |
| ход танка | `sfx_engine_loop` пока ввод удерживается | — | — |
| UI | `sfx_ui_click│back│toggle│popup│locked│pause`, `sfx_star`, `sfx_score_tick`, `sfx_reward`, `sfx_daily_claim`, `sfx_purchase_ok│fail`, `sfx_tut_step` | `fx.ui_*` (без ack) | — |

## 8. Записи сервисов

### 8.1 Уровни (D-LVL-01: свои имена наборов платформа не принимает)
- **Кампания** = набор `main`: `levels.main/set` (`first 1`, `last 30`, `unlock sequential`, `chapters`
  c01–c03, `index`) и диапазоны `levels.main/r_0001_0010`, `r_0011_0020`, `r_0021_0030`.
- **Siege** = набор `endless`: `levels.endless/r_0001_0001` (один уровень `siege_pit`; запись `set` —
  если её требует `levels.open`, проверяется dry-run'ом).
- Исходники — `configs/levels/{campaign,siege}/*.json` (ГДД 12 §1); запись собирает
  `tools/levels/export.mjs`, хеш — `node scripts/levels-hash.mjs`.
- **Поля `entries[]`, которые читает игра**: `id` (`stage_NN` / `siege_pit`), `index` 1–30, `chapter` 1–3,
  `theme` `clay│iron│magma│pit`, `maxAlive` 1–8, `spawnInterval` 1.5–3.0, `grid` 13×13 из `.BSLROC`,
  `quarters` `[{col,row,mask 1–14}]` (всегда, `[]` если пусто), `enemies` ровно 20 (Siege — нет).
- **`server` (bounds/1)**: `contentHash`, `seed {mode: perAttempt}`, `win.objectives ["destroy_all"]`,
  `moves {min 0, max 9}`, `stars [{moves≤9},{moves≤1},{moves≤0}]`, `durationMs.min` по главе
  (58 000 / 48 500 / 39 000), `score.max` на уровень = ГДД 11 D-11-04, `entries[].levelId = entries[].id`.
  Siege: `durationMs.min 1000`, `score.max 3 995 000`, без `moves`/`stars`/`win`.

### 8.2 Прогресс и награды — `progress/progress_main` (ключ `PROGRESS.levels`)
Шаги `stage_01…stage_30` (= id уровня; `ports` отмечают шаг по `levelId`), условие `levelEnd`
`filters {set: 'main', n, won: true, verified: true}`, `claimMode: auto`, без `profileProjection`.

| источник | награда |
|---|---|
| первое прохождение стадии N | 1 бустер по `(N−1) mod 4`: bubble, shockwave, fortify, hull |
| финалы 10/20/30 (первое прохождение) | + по 1 каждого бустера (в том же шаге) |
| первые ★★★ стадии | +1 `bst_bubble` — трек `progress_stars` (шаги `stage_NN`, фильтр `stars: 3`), если сервис принимает условие; иначе следующий этап (D-MRG-06) |
| стартовый грант | бесплатный оффер `start_grant`: по 2 каждого, лимит 1 |
| ежедневно | `progress/reward_daily` (ключ `PROGRESS.daily` = функция `daily`): `day_1…day_7`, D1 bubble 1 · D2 shockwave 1 · D3 fortify 1 · D4 hull 1 · D5 bubble 2 · D6 shockwave 1 + fortify 1 · D7 hull 2 + bubble 2 + shockwave 1; `reset {period: day, onMiss: false}`; календарь — настройки модуля daily-rewards |
| replay, Siege | нет |

### 8.3 Инвентарь и покупки
- `inventory.catalog/<bst_bubble│bst_shockwave│bst_fortify│bst_hull>` (`itemType: item`, `isStackable`,
  `clientConsumable: true`, `display.titleKey: item.<id>.title`); `item_coins` и `inventory.starter` удаляются.
- `iap.settings.products/<starter_crate│hull_pack│field_kit│heavy_arsenal│commander_cache>` (0.99 / 1.99 /
  4.99 / 9.99 / 19.99, consumable, выдача в inventory).
- `iap.offers/<key>` — те же 5 + `start_grant` (бесплатный, лимит 1, по 2 каждого); `starter_crate` лимит 1.
- `iap.placements/placement_shop` (5 паков, порядок `shop_order`), `placement_defeat` (hull_pack,
  starter_crate), `placement_prestage` (hull_pack), `placement_starter_auto` (starter_crate),
  `placement_start_grant` (start_grant).

### 8.4 Доски
`leaderboards.definitions.put`: `siege_best` (неделя, сброс пн 00:00 UTC, лучший, источник `levelEnd`
набора `endless`, `won: true`), `campaign_score` (всё время, сумма лучших счётов стадий, источник
`levelEnd` набора `main`); `leaderboard_weekly` удаляется. `submitScore` — только при `canSubmit`.

### 8.5 Конфиги игры (числа)
Записи scope `game`: `balance`, `enemies`, `powerups`, `boosters`, `siege`, `rewards`, `packs`, `shop_order`,
`placements` — поля таблицы ГДД 31 `plat.configs` + tunables ГДД 10–14 (`core.*`, `score.*`, `gen.*`,
`tut.*`). Логические ключи контракта сервисов `iap.packs│shop_order│placements` хранятся в scope `game`
(scope `iap.placements` — запись самого сервиса покупок, D-GC-11). Запасное значение при сбое —
тот же файл записи, встроенный сборкой; литералов чисел в коде нет.

## 9. Награды (что видит игрок)
Награды — только бустеры, звёзды и место в досках; валюты нет. Каждая выдача — окно награды кита
с крупной картинкой предмета (`ITEMS`) и названием `item.<id>.title`; S07/S04 показывают ожидаемую
награду первого прохождения из `game.rewards` (только показ).

## 10. Аналитика
Каталог — `docs/analytics/EVENTS.json` (snake_case, плоские параметры, ≤ 25, без PII); отправляет модуль
игры (`ctx.analytics` / `sendEvent`), серверные факты — только после ACK. **Л** — внутри API логики,
**Э** — экран через `game.event`.

| событие | параметры | кто |
|---|---|---|
| `session_start` / `session_end` | `entry` cold│resume / `duration_s` | Л (`ready`, suspend) |
| `tutorial_step` / `tutorial_done` | `step`, `step_id` / `duration_s`, `skipped` | Л |
| `level_start` / `level_complete` / `level_fail` | `level_set` campaign│siege, `level_n`, `attempt` / `score`, `stars`, `duration_s` / `reason` core│lives│quit | Л |
| `stage_end` | `result`, `stars`, `score`, `duration_s`, `lives_lost`, `boosters_used`, `waves`, `continues` | Л (`end`) |
| `continue_used`, `resource_shortage`, `item_spent` | `level_set`, `level_n`, `wave` / `item`, `context` / `item`, `amount`, `sink_id` | Л |
| `item_earned` | `item`, `amount`, `source_id`, `source_type` | Л (по выдаче) |
| `offer_shown` / `offer_click` | `offer_id`, `placement` (shop│defeat│prestage│starter_auto│lobby_grant) | Э |
| `purchase_start` / `purchase_result` / `offer_purchase` / `iap` | `offer_id`, `placement`, `is_free` / `result`, `is_test` / `product_id` / `price`, `currency_code` | Л (`buy`, `claimStartGrant`) |
| `daily_claim` | `day` | Л (по событию модуля daily) |
| `siege_unlock` | — | Л |
| `leaderboard_view` | `board`, `period` | Э |
| `client_error` | `area`, `code` | Л |

## 11. Обучение первого хода (стадия 1)
Плашка `tutorial-hint` внутри экрана `game` над полем у цели (P — над зоной управления), стрелка к цели,
не перекрывает 2 нижних ряда; стадия не на паузе; спавн удерживается до конца T4 или 25 s (команда в
логе симуляции). Режим подсказок — по последнему вводу (`setInputMode`).

| шаг | текст (`screen.tut.*`) | цель | завершение |
|---|---|---|---|
| T1 | `move_keys` / `move_touch` | клавиши / стик | проехал ≥ 1 клетку; без ввода 6 s — пульс |
| T2 | `fire_keys` / `fire_touch` | FIRE / Space | первый выстрел |
| T3 | `brick` | кирпич перед танком | разрушена четверть или 10 s |
| T4 | `core` + `core_selfhit` | Ядро и его стена | 4 s, затем спавн разрешён |
| T5 | `enemy` (`{count}`) | первый враг, `hud-enemies` | первое убийство или 10 s |
| T6 | `carrier` | power-up | подбор или исчезновение |

Минимум показа шага 1.5 s, пауза 0.5 s; `tutorial-next` «Got it», `tutorial-skip` с T1 (без подтверждения).
Флаги `tut.stage1_step`/`tut.stage1_done` пишутся сразу; повтор стадии 1 при шаге ≥ 4 — с T5 без удержания.
Подсказка бустеров при первом `core-threat` (`booster-hint`, при наличии доступного бустера),
подсказка Spare Hull на S04 со стадии 2 (`hullHint`).

## 12. Владение файлами и заявки

| часть | пишет | не трогает |
|---|---|---|
| логика | `src/modules/game/**`, `tests/game/**`, `tests/sim/**` | экраны, записи |
| экраны | `src/screens/**`, `strings/screens.json` | `src/modules/game/index.ts` (типы — только через заявку), записи |
| записи | `configs/remote/**` (уровни `levels.main/**`, `levels.endless/**`, `progress/**`, inventory, iap, leaderboards, `ui.*`, game.*), `strings/game.json`, строка `shell.title` в `strings/shell.json`, `item.*`/`offer.*`/`levels.*` из `strings/services.json`, `strings/levels.json` | код |
| арт/звук | `assets/**`, `src/skin/**` (ITEMS, OFFERS, ASSETS, FONTS, theme.css, sheets) | код экранов |

Обвязка (`src/main.ts`, `src/boot/**`, `src/shell/**`, `scripts/**`), SDK и UI Kit не меняются.
Шаблонные тесты `tests/hud.test.mjs` проверяют правила раскладки HUD на своём образце (`SAMPLE_HUD`),
а не на HUD игры.

- **CR-01 → интеграция** (`src/boot/ids.ts`, только добавить): `SIEGE_SET = 'endless'`;
  `BOOSTERS = {bubble:'bst_bubble', shockwave:'bst_shockwave', fortify:'bst_fortify', hull:'bst_hull'}`;
  `OFFERS = {startGrant:'start_grant', starter:'starter_crate', hull:'hull_pack', field:'field_kit',
  heavy:'heavy_arsenal', commander:'commander_cache'}`; `PLACEMENTS = {shop: SHOP_PLACEMENT,
  defeat:'placement_defeat', prestage:'placement_prestage', starterAuto:'placement_starter_auto',
  startGrant:'placement_start_grant'}`; `BOARDS = {siege:'siege_best', campaign:'campaign_score'}`;
  `GAME_CONFIG = {scope:'game', keys: balance, enemies, powerups, boosters, siege, rewards, packs,
  shop_order, placements}`; `PROGRESS.stars = 'progress_stars'` (если трек опубликован); `MODULES.kv = 'kv'`.
  До применения логика и экраны компилируются против этих имён — первым идёт CR-01.
- **CR-02 → интеграция/оболочка** (желательно): окно настроек кита получает `values` (music, sound,
  vibration) из kv `settings` и пишет их обратно — тогда кнопка `lobby-sound` убирается.
- Изменение подписей `src/modules/game/index.ts` — только заявкой в этот контракт.

## 13. Решения (D-GC)
Полные формулировки с обоснованием — `docs/gdd/DECISIONS.md`, раздел «Контракт игры».

| ID | решение |
|---|---|
| D-GC-01 | Кампания — набор `main`, Siege — `endless` (D-LVL-01); «campaign/siege» — логические имена |
| D-GC-02 | API игры — модуль `game` (`sdk.uses`), экраны — `gameOf(ctx.game)`; `GamePorts` не меняется |
| D-GC-03 | Маршруты `home`/`map`/`game`; окна S04, S06–S09, S11, S13, S16 — окна игры; S10, S12 — кита |
| D-GC-04 | Топбар ГДД → HUD шаблона (daily, boards слева; shop справа; settings в топбаре), `TOP_BAR = []` |
| D-GC-05 | Строки экранов — `screen.*` из `ui.*`; числа игры в текстах — параметры |
| D-GC-06 | Ориентация `any`, три раскладки равноправны |
| D-GC-07 | S13 — окно игры с двумя досками (сток показывает одну) |
| D-GC-08 | S14 разделено: кит (аккаунт) + окно игры «Sound» (тумблеры), CR-02 |
| D-GC-09 | Награду показывает окно награды кита после окна игры; `clear-collect`, ряды наград S11 — нет |
| D-GC-10 | S15 — плашка в экране `game`, не `ctx.overlay` |
| D-GC-11 | Конфиги игры — scope `game`, без литералов в коде |
| D-GC-12 | Оффер в S08 — только при Spare Hull = 0 и неиспользованном продолжении (D-16-03) |
| D-GC-13 | Фоны: 3 сцены вместо 8 `bg_*`; `icon_settings` → `icon_gun`; `daily_crate` → картинка `start_grant` |
| D-GC-14 | Источник картинок — Codex image_gen; в другом окружении шаг ассетов останавливается с ASSET_SOURCE_UNAVAILABLE |
| D-GC-15 | Siege `levelEnd` с `won: true`, `moves` = волны; поражение кампании шлёт `won: false`; Quit — ничего |
| D-GC-16 | Аналитика с boolean — через модуль игры (`event`), не `GamePorts.track` |
| D-GC-17 | Новые id записей — заявка CR-01 в `src/boot/ids.ts` |
| D-GC-18 | Сюжетных экранов и журнала глав в v1 нет (story = false) |

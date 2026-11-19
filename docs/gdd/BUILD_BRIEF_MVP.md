# BUILD BRIEF — Iron Burrow (MVP)

Сжатое задание разработчику. Источник истины — `docs/gdd/00_MASTER.md` и разделы `docs/gdd/10…40`; при расхождении прав раздел-владелец числа (таблицы Tunables). Сервисы платформы — итог в `docs/gdd/services-matrix.md` (пишет шаг «Сервисы платформы»). Решения — `docs/gdd/DECISIONS.md` и строки D-NN-NN разделов.

## Факты для плана

| ключ | значение |
|---|---|
| render | 2d |
| genre | arcade |
| monetization | iap (только покупки наборов бустеров; рекламы нет) |
| online | true |
| audio | true |
| localisation | en (базовая и единственная локаль MVP; остальные — шаг локализации) |
| liveops | false |
| remote_configs | true — `game.balance`, `game.enemies`, `game.powerups`, `game.boosters`, `game.siege`, `game.rewards`, `iap.packs`, `iap.placements`, `iap.shop_order` (таблица ключей — 31 `plat.configs`) |
| leaderboards | true — `siege_best` (неделя), `campaign_score` (всё время) |
| orientation_fixed | false |
| target | web (владелец не ограничил платформу) |
| orientations | [portrait 390x844, landscape 844x390, desktop 1440x900] |

## Игра в одном абзаце

Аркада сверху: танк-бур Burrower в лабиринте 13×13 клеток (клетка = 2×2 разрушаемые четверти) защищает Burrow Core внизу по центру от 20 Rustbugs за стадию. Одно попадание в Core (в том числе своё) или 0 жизней — поражение; все 20 уничтожены — победа. Звёзды: ★ прохождение, ★★ потеряно ≤ 1 жизни, ★★★ — 0. Кампания 30 стадий (3 главы), Siege — бесконечные волны (после стадии 5), лидерборды, ежедневные награды 7 дней, магазин наборов бустеров. Валют в MVP нет.

## Цикл

`S01 Boot → S02 Lobby (первый вход: окно стартового набора 2× каждого бустера) → S03 Stage Map → S04 Pre-stage (Spare Hull) → S05 стадия → S07 Stage Clear (звёзды, счёт, награда-бустер) | S08 Defeat (Continue за Spare Hull → оффер → Retry / Map)`. Siege: `S02 → S04 → S05 → S09 Siege Result`.

## Правила — где что (для «слепого кодера»)

| что | где |
|---|---|
| состояния стадии, тик 1/60, целые единицы 600 u/клетка, движение, пули по четвертям, порядок разрешения тика, краевые случаи E1–E10, бустеры и лимиты | 10 |
| очки, Siege-множитель `(9+w)/10`, рекорды, 10 рабочих примеров | 11 |
| формат стадии `configs/levels/campaign/stage_NN.json`, состав врагов по формуле, порядок, ИИ псевдокодом, дроп power-up, Siege-волны, правила карт V1–V10, витрина `stage_01`, `stage_11`, `siege_pit` | 12 |
| кривая сложности, симуляции и цели `bal.sim.*` | 13 |
| туториал стадии 1 (T1–T6, строки en), подсказка про бустер, флаги kv | 14 |

Ключевые числа: игрок 3.0 кл/с, пуля 9 (быстрая 13.5); враги scout 3.6 / grunt 1.8 / gunner 2.4 / brute 1.8 (4 HP); очки 200/100/300/400; maxAlive 4/5/6 и интервал спавна 3.0/2.5/2.0 s по главам; носители #4, #11, #18; power-up star 30 · bubble 15 · rebar 15 · quake 10 · freeze 20 · hull 10, живут 12 s.

## Расходуемые предметы и награды

| предмет | эффект | лимит (стадия / забег Siege) |
|---|---|---|
| `bst_bubble` Bubble Shield | неуязвимость 10 s | 2 / 4 |
| `bst_shockwave` Shockwave | уничтожить всех врагов на поле (с очками) | 1 / 2 |
| `bst_fortify` Steel Fortress | стена Core стальная 20 s | 1 / 2 |
| `bst_hull` Spare Hull | +1 жизнь перед стадией или continue (2 жизни, Core восстановлен) | pre-stage 1 / 2; continue 1 / 1 |

Награды: первое прохождение стадии N — 1 бустер по ротации `(N−1) mod 4`; первое ★★★ — +1 bubble; финалы 10/20/30 — +1 каждого; daily 7 дней (13 бустеров за цикл, 15 `meta.daily`); стартовый грант 2× каждого — **отдельной наградой**. Твёрдой валюты нет вовсе. Бустеры в бою применяются сразу, списание параллельно (15 D-15-02); Spare Hull — после подтверждения.

## Экраны (20)

S01 Boot · S02 Lobby (топ-бар: иконки daily / shop / leaderboards / settings через модуль hud) · S03 Stage Map · S04 Pre-stage · S05 Gameplay + HUD · S06 Pause · S07 Stage Clear · S08 Defeat · S09 Siege Result · S10 Shop · S11 Purchase result · S12 Daily Rewards · S13 Leaderboards · S14 Settings (Music, Sound, Reduce Motion, Vibration на таче, ManyPlay ID) · S15 Tutorial · S16 Booster info. Раскладки для трёх ориентаций, строки en (ключи `ui.*`), UI hooks (`data-part`) — 20. Награда в окне — крупная картинка предмета с количеством.

## Ассеты (21, 23)

- Графика: 92 строки `assets/game/<id>.png` + 24 элемента скина `assets/ui/<id>.png`; у каждой строки id, путь, размер показа, состояния; рисуется только `-2x`, 1x делает `npm run assets`. Палитра: холодный сланец/сталь + раскалённая магма + кислотно-зелёный (21). Бюджет генераций 260.
- Звук: 11 музыкальных файлов (лобби, 3 главы, Siege, 6 джинглов) и 50 SFX (≤ 120 КБ каждый), голоса нет; бриф — 23. Генерация — шаг звука через ElevenLabs.

## IAP (16)

| пак | содержимое | USD | тип |
|---|---|---|---|
| Starter Crate | 3 каждого (12) | 0.99 | one-time |
| Hull Pack | 5 Spare Hull | 1.99 | повторяемый |
| Field Kit | 6 каждого (24), бейдж Best value | 4.99 | повторяемый |
| Heavy Arsenal | 15 каждого (60) | 9.99 | повторяемый |
| Commander Cache | 35 каждого (140) | 19.99 | повторяемый |

Плейсменты: Shop (S10), Defeat (Hull Pack + Starter Crate, когда continue доступен и Spare Hull = 0), Pre-stage (ссылка в магазин при Spare Hull = 0), авто-окно Starter Crate (первое поражение / первое прохождение стадии 3, кулдаун 24 ч, ≤ 3 показов). SKU и id офферов — «—» (создаёт services-publish). До подключения оплаты владельцем покупки тестовые. Рекламы нет нигде.

## Техника и интеграция (30, 31)

Модули игры `src/modules/<id>`: game-core (headless, детерминированный, seed mulberry32), field-render (Canvas 2D), input, hud-ui, screens, boosters, shop, meta-bridge, audio, feel. Сервисы SDK: ui-kit, inventory, progress (level-set `campaign` 30 уровней и `siege` 1 уровень, `levelEnd`, награды уровней), daily-rewards, iap, leaderboards, profile-pack (kv `settings`, флаги, gamestate, профиль), hud, configs. Не используются: ads (рамки потока), realtime, scheduling. Время — только `sdk.time` / `core.time`; без localStorage и `window.*`; вибрация — `sdk.device.haptics`. Точные сигнатуры, которых нет в `docs/sdk/*`, — «уточняет интеграция». Бюджеты: first_load 2500 KB, JS 200 KB gzip, app_ready 3000 ms, fps_min 55.

## Приёмка (40)

- 52 AC в индексе 40; 11 машинных сценариев `docs/gdd/qa/flows/*.json` (first-session, stage-clear, defeat-continue, pause-resume, shop-purchase, daily-claim, leaderboards-open, siege-run, settings-profile, orientation-switch, slice) — все селекторы есть в таблице hooks раздела 20, все AC существуют. Победа/поражение в сценариях — QA-хуки `qa-win`/`qa-lose` только в среде test (D-20-05).
- `## Genre targets` в 10, 13, 14, 22, 40; строки `sim:<id>` с seeds 1, 7, 42: `sim:stage_balance`, `sim:siege_waves`, `sim:first_kill_s`, `sim:first_threat_s`, `sim:stage_length_s`, `sim:first_spawn_s`, `sim:win_rate_early`, `sim:win_rate_late`, `sim:win_rate_stage1`, `sim:session_stages`, `sim:siege_run_min` — файлы `tests/sim/<id>.mjs` (`run(seed) → number`) пишет шаг логики игры (13 §3).

## Итог проверки ГДД (gdd-quick-audit, один проход)

| # | пункт | найдено | исправлено |
|---|---|---|---|
| 1 | Согласованность | префиксы ключей в 40 (`content./balance./eco./audio./platform.`) ≠ каталогу | заменены на `gen./bal./meta./aud./plat.` |
| 1 | Согласованность | настройки: в 23 — слайдеры громкости 0..1, в 15 — отдельные ключи, в 20 — тумблеры, тумблера вибрации нет | единый kv-ключ `settings {v, music, sfx, haptics, motion}` (тумблеры), громкость шин — tunables `aud.bus.*`; тумблер Vibration добавлен в 20; ассеты слайдера переназначены на прогресс-бары |
| 1 | Согласованность | списание бустера: 10 — оптимистично, 15/31 — только после подтверждения | бой — оптимистично с повторами, Spare Hull — после подтверждения (D-15-02) во всех трёх разделах |
| 1 | Согласованность | первая сессия: 14 — сразу в стадию 1, 20 и сценарий — окно гранта в лобби | 14 приведён к 20 и `first-session.json` (D-14-02) |
| 1 | Согласованность | лимит Spare Hull в Siege: 15 ≠ 10 | 15 приведён к 10 |
| 1 | Согласованность | «кольцо 8 клеток» вокруг Core на нижнем краю невозможно | MASTER уточнён по D-10-09 (блок 3×3 без Core) |
| 3 | «Слепой кодер» / формат | таблицы Genre targets в 10/13/14/22: цель с пояснениями, у 22 нет `measured by`; в 40 таблицы нет; один `sim:stage_balance` на разные цели | цели — только числа/диапазоны, пояснения в `unit`; отдельный `sim:<id>` на метрику; таблица в 40; `studio-gates gdd genre_targets` — без ошибок формата, остались только «нет tests/sim/*.mjs» (их пишет следующий шаг) |
| 4 | Рамки потока | вибрация через `navigator.vibrate` в 23 (обход SDK); арена Siege в конфиге `game.siege.arena` (уровни — только через progress) | вибрация — `sdk.device.haptics`; арена — level-set `siege` модуля progress (D-30-04, 31) |
| 2 | Объём MVP | лишних систем нет; Scrap/Garage — следующий этап (15 `meta.next`), live-ops — вне MVP (33) | — |
| 4 | Рамки потока | реклама, офлайн-игра, валюты, запретные слова, чужие IP — не найдены (grep по docs/) | — |

Открытых замечаний нет. Сигнатуры методов SDK, отсутствующие в `docs/sdk/*`, помечены «уточняет интеграция» (MINOR, closed).

## Чего не хватает у платформы

- Сигнатуры вызовов модулей daily-rewards, kv profile-pack, чтения level-set и выдачи стартового гранта отсутствуют в локальных `docs/sdk/*` (искали в docs/sdk/README.md, core.md, modules.md, ui-kit.md; `sdk.modules.list` даёт только ссылки на репозиторий пакетов) — помечено «уточняет интеграция»; нужно: страницы методов модулей в MCP docs.
- Нет инструмента/документа, подтверждающего, поддерживает ли награда уровня progress условие «звёзды = 3» (15 D-15-03 — запасной вариант описан).

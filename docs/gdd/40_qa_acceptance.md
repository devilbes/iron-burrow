# 40 — QA и приёмка (`qa.`)

Индекс критериев приёмки ссылается на ключи разделов и `00_MASTER.md` (§), тексты требований не дублирует. Машинные сценарии — `docs/gdd/qa/flows/*.json`, селекторы только из `20_ui_ux_screens_texts.md` `ui.hooks`.

## `qa.wp` — пакеты работ (owner WP)

| WP | Содержание | Модули |
|---|---|---|
| WP-01 | boot, корень, раскладка 3 ориентаций, контрактные хуки | `app` |
| WP-02 | поле, тайлы, правила, симуляция, ввод | `match` |
| WP-03 | враги, ИИ, данные стадий, баланс | `match`, `configs/levels` |
| WP-04 | HUD поля, пауза, тосты | `match-hud` |
| WP-05 | бустеры и инвентарь | `boosters` (inventory) |
| WP-06 | кампания: карта, pre-stage, итоги, награды, звёзды | `campaign` (progress) |
| WP-07 | Siege и лидерборды | `siege`, `boards` (leaderboards) |
| WP-08 | магазин и покупки | `shop` (iap) |
| WP-09 | ежедневные награды | `daily` (daily-rewards) |
| WP-10 | настройки и профиль | `settings` (profile-pack) |
| WP-11 | туториал | `tutorial` |
| WP-12 | эффекты | `fx` |
| WP-13 | звук | `audio` |
| WP-14 | тема UI Kit, ассеты | `src/theme`, `assets` |
| WP-15 | сервисы платформы, конфиги, публикация | services-publish, `configs` |
| WP-16 | QA-хуки, flows, gate-скрипты | `qa-tools`, `tests` |

## `qa.ac` — индекс AC

Ссылки: `§N` — `00_MASTER.md`; ключи разделов — по префиксам `core.` (10), `score.` (11), `gen.` (12), `bal.` (13), `tut.` (14), `meta.` (15), `mon.` (16), `ui.` (20), `art.` (21), `fx.` (22), `aud.` (23), `tech.` (30), `plat.` (31) (D-40-01). Verify: `flow:<id>` — машинный сценарий; `unit` — тест модуля в `tests/`; `gate` — `npm run gate:genre-targets`; `config` — проверка конфигов/платформы через MCP; `visual` — скриншоты 3 ориентаций; `review` — ручная проверка по чек-листу.

| AC ID | раздел | verify | owner WP |
|---|---|---|---|
| AC-10-01 | 10 `core.field` / §5: сетка 13×13, четверти 2×2, `data-grid="13x13"` | unit + flow:first-session | WP-02 |
| AC-10-02 | 10 `core.tiles` / §5: brick/steel/lava/roots/oil/empty поведение | unit | WP-02 |
| AC-10-03 | 10 `core.core` / §5: Ядро (6,12), стена 8 клеток, 1 попадание любой пули → поражение | unit + flow:defeat-continue | WP-02 |
| AC-10-04 | 10 `core.player` / §5: скорость 3.0, пуля 9, 3 жизни, щит спавна 3 s, спавн (4,12) | unit | WP-02 |
| AC-10-05 | 10 `core.gun_levels` / §5: L1–L3, сброс при смерти, перенос между стадиями кампании | unit | WP-02 |
| AC-10-06 | 10 `core.enemies` / §5: 4 типа, скорости, HP, очки | unit | WP-03 |
| AC-10-07 | 10 `core.stage` / §5: 20 врагов, max alive 4/5/6, носители #4/#11/#18 | unit | WP-03 |
| AC-10-08 | 10 `core.powerups` / §5: 6 типов, 12 s, веса дропа, 500 очков | unit (seed 1/7/42, D-40-04) | WP-02 |
| AC-10-09 | 10 `core.win_lose` / §5: победа 20/20, поражение Ядро/жизни | flow:stage-clear, flow:defeat-continue | WP-02 |
| AC-10-10 | 10 `core.stars` / §5: ★/★★/★★★, Spare Hull не считается потерей | unit | WP-06 |
| AC-11-01 | 11 `score.formula` / §10: очки за врагов, пикап, clear 1000, 500 за жизнь | unit | WP-02 |
| AC-11-02 | 11 `score.siege` / §10: множитель волны, бонус 300·wave | unit | WP-07 |
| AC-12-01 | 12 `gen.stage_format`: 30 стадий + `siege_pit` валидны по схеме `configs/schemas` | config | WP-03 |
| AC-12-02 | 12 `gen.ai`: ИИ и спавны детерминированы от seed | unit (повтор seed → идентичный лог) | WP-03 |
| AC-13-01 | 13 `bal.spawn` / §5: интервал 3.0/2.5/2.0 s по главам, из `game.balance` | unit + config | WP-03 |
| AC-13-02 | 13 `bal.duration`: стадия 90–180 s | gate | WP-03 |
| AC-14-01 | 14 `tut.stage1`: туториал только на стадии 1 первый раз, Skip пишет флаг | flow:first-session | WP-11 |
| AC-15-01 | 15 `meta.no_currency` / §7: валют нет ни в UI, ни в конфигах | review + config | WP-15 |
| AC-15-02 | 15 `meta.start_grant` / §6: 2 × каждый бустер, один раз | flow:first-session + unit | WP-05 |
| AC-15-03 | 15 `meta.stage_rewards` / §8: ротация первого clear, ★★★ +bubble, финал главы +1 каждого, реплей — без наград | unit + flow:stage-clear | WP-06 |
| AC-15-04 | 15 `meta.daily` / §8: 7 дней, состав по дням, цикл | flow:daily-claim + config | WP-09 |
| AC-15-05 | 15 `meta.booster_limits` / §6: 2/1/1 на стадию, ×2 в Siege, 1 continue | unit | WP-05 |
| AC-16-01 | 16 `mon.packs` / §12: 5 наборов, состав, цены из `iap.*`, без хардкода SKU | config + flow:shop-purchase | WP-08 |
| AC-16-02 | 16 `mon.placements` / §12: Shop, Defeat (Hull Pack / Starter Crate), Pre-stage при `bst_hull = 0` | flow:defeat-continue + review | WP-08 |
| AC-16-03 | 16 `mon.no_ads` / §4 рамки: нет модуля ads, нет `ad-banner-slot`, нет rewarded | config + review | WP-15 |
| AC-16-04 | 16 `mon.starter_once`: Starter Crate разовый, после триггера (D-20-12) | unit + flow:siege-run | WP-08 |
| AC-20-01 | 20 `ui.screens`: каждое окно S01–S16 имеет `data-window` и раскладку P/L/D | visual | WP-01 |
| AC-20-02 | 20 `ui.flow`: переходы таблицы | все flows | WP-01 |
| AC-20-03 | 20 `ui.hud`: 4 счётчика, 3 бустера с количеством, пауза | flow:pause-resume | WP-04 |
| AC-20-04 | 20 `ui.lobby_topbar`: 4 иконки через `hud`, бейджи по правилам | flow:leaderboards-open, flow:daily-claim | WP-01 |
| AC-20-05 | 20 `ui.rewards`: отдельная крупная карточка на предмет, ряд | visual + flow:stage-clear | WP-14 |
| AC-20-06 | 20 `ui.strings`: все видимые строки через `sdk.l10n`, 0 литералов в коде, плейсхолдеры подставлены | unit (скан `src/`) + review | WP-01 |
| AC-20-07 | 20 `ui.contract_hooks`: `app-ready`, `data-cta` ровно один primary/reward на окно, `audio-state`, `data-dynamic` | flow:first-session + unit (DOM-скан) | WP-16 |
| AC-20-08 | 20 `ui.safe_zones` / §2: фулскрин без пустых полей во всех 3 ориентациях, цели ≥ 48 px | visual | WP-01 |
| AC-20-09 | 20 `ui.settings`: music/sound/motion применяются сразу и сохраняются | flow:settings-profile | WP-10 |
| AC-20-10 | 20 D-20-06: смена ориентации в стадии → пауза, поле целиком видно | flow:orientation-switch | WP-01 |
| AC-21-01 | 21 `art.palette` / §16: холодная/горячая палитра, скин UI Kit | review | WP-14 |
| AC-21-02 | 21 `art.forbidden` / рамки: запретных слов нет в UI, ассетах, сторе, коде | unit (grep по репо и `dist/`) | WP-16 |
| AC-22-01 | 22 `fx.catalog`: эффект на каждое событие таблицы | review + gate | WP-12 |
| AC-22-02 | 22 `fx.shake`, `fx.particles`: потолок 0.35 cell, лимит пула | unit + gate | WP-12 |
| AC-22-03 | 22 `fx.reduced_motion`: тряска 0, нет мигания > 3 Гц | flow:settings-profile + review | WP-12 |
| AC-22-04 | 22 `fx.genre_targets`: все пороги | gate | WP-12 |
| AC-23-01 | 23 `aud.toggles`: music/sfx раздельно, `audio-state` отражает | flow:settings-profile | WP-13 |
| AC-23-02 | 23 `aud.unlock`: звук после первого жеста, `data-state="unlocked"` | flow:first-session | WP-13 |
| AC-30-01 | 30 `tech.sim`: фиксированный шаг, время только `core.time.now()` | unit + review | WP-02 |
| AC-30-02 | 30 `tech.configs` / §15: тюнинги из `game.*`, без хардкода чисел баланса | config + review | WP-15 |
| AC-30-03 | 30 `tech.build`: `npm ci && npm run typecheck && npm run build` → `dist/index.html` | ci | WP-16 |
| AC-31-01 | 31 `plat.modules` / §14: состав модулей, без ads/realtime | config | WP-15 |
| AC-31-02 | 31 `plat.progress`: verified level end, награды выдаёт сервер | flow:stage-clear + config | WP-06 |
| AC-31-03 | 31 `plat.leaderboards` / §11: `siege_best` weekly, `campaign_score`, id из конфигов | flow:siege-run + config | WP-07 |
| AC-31-04 | 31 `plat.inventory`: расход бустера подтверждён сервером, офлайн — кнопка неактивна | unit | WP-05 |
| AC-31-05 | 31 `plat.profile`: ManyPlay ID в S14 через UI Kit, гость работает | flow:settings-profile | WP-10 |

## `qa.flows` — машинные сценарии

Формат файла: `{"name","path":"/","ac":[AC ID...],"steps":[...]}`. Шаг: `action` = `click|type|expect`; `selector` — только `[data-part="…"]` или `[data-testid="…"]` из `ui.hooks`. Доп. поля: `key` и `holdMs` (для `type`), `visible`, `attr`+`value`, `attr`+`contains` (для `expect`), `viewport` (`"WxH"`, ресайз перед шагом), `timeoutMs` (по умолчанию 5000), `phase` (только `slice.json`). Селектор с несколькими совпадениями берёт первое в порядке DOM.

Предусловия всех flows (D-40-02): env `test`, свежий гостевой профиль, viewport 390×844 если не указан, тестовые покупки завершаются без внешнего платёжного листа, `qa-win`/`qa-lose` доступны.

| id | Что проверяет | AC |
|---|---|---|
| first-session | boot → грант → стадия 1 → туториал → выстрел с откликом | AC-10-01, AC-14-01, AC-15-02, AC-20-07, AC-23-02 |
| stage-clear | победа → звёзды → Collect наград → следующая стадия | AC-10-09, AC-15-03, AC-20-05, AC-31-02 |
| defeat-continue | поражение (Ядро) → Continue за Spare Hull → повторное поражение → Retry | AC-10-03, AC-10-09, AC-16-02 |
| pause-resume | пауза кнопкой и Esc, Resume, Quit | AC-20-03 |
| shop-purchase | Shop → покупка → результат с наградами | AC-16-01 |
| daily-claim | Daily → Claim → награды → день 1 claimed | AC-15-04, AC-20-04 |
| leaderboards-open | Leaderboards → вкладки, период, закрытие | AC-20-04 |
| siege-run | 5 стадий → Siege открыт → забег → результат → лидерборд | AC-16-04, AC-31-03 |
| settings-profile | тумблеры, сохранение, `audio-state`, профиль | AC-20-09, AC-22-03, AC-23-01, AC-31-05 |
| orientation-switch | P → L → D: `data-layout`, пауза при смене в стадии | AC-20-08, AC-20-10 |
| slice | вертикальный срез start → action → feedback → win/lose → replay | AC-10-09, AC-22-04 |

## Genre targets

| key | target | unit | measured by | seeds |
|---|---|---|---|---|
| gt.qa.blind_goal_understood | ≥ 2 | игроков из 3 поняли цель «защити Ядро» без подсказок | playtest:blind | — |
| gt.qa.blind_want_more | ≥ 4 | медиана оценки «хочу ещё» 1–5 | playtest:blind | — |
| gt.qa.genre_gate_violations | 0 | нарушений в `npm run gate:genre-targets` по всем `sim:*` разделов 10/13/14/22 | sim:stage_balance | 1, 7, 42 |

### `qa.genre_targets` — протокол

1. Сборка env `test`; `npm run gate:genre-targets` (скрипт пишет WP-16).
2. Скрипт гоняет бота-эталона на seeds `1`, `7`, `42` × ориентации P/L/D × стадии 1, 10, 20 и Siege до волны 5; собирает пороги из `22_vfx_animation_feel.md` `fx.genre_targets` (ввод → `data-fx-ack` ≤ 50 ms, hit в тот же кадр, p95 кадра, первый спавн/контакт, длительность стадии 90–180 s, hitstop, лимит частиц). Падение любого порога на любом seed → gate красный.
3. Слепой плейтест: 3 игрока, не видевших игру, по 2 минуты каждый (стадия 1 с туториалом на mobile portrait, стадия 3 на desktop, Siege на landscape). Наблюдатель не подсказывает; фиксирует: понял ли цель «защити Ядро» без слов (да/нет), время до первого убийства, число непреднамеренных смертей, оценку «хочу ещё» 1–5. Порог: ≥ 2 из 3 поняли цель, медиана «хочу ещё» ≥ 4.
4. Результат (таблица gate по seed/ориентации + итог плейтеста + решения по провалам) — в `docs/plan/FINAL_REPORT.md`, раздел `Genre targets`.

## Решения

- D-40-01: префиксы ключей разделов 10–31 зафиксированы выше; если в разделе ключ назван иначе, AC ID не меняется — правится только ссылка в индексе (привязка по § MASTER остаётся).
- D-40-02: flows выполняются на свежем гостевом профиле в env `test`; победа/поражение стадии в flows — через QA-хуки `qa-win`/`qa-lose` (D-20-05), реальный геймплей проверяет gate с ботом.
- D-40-03: тестовая покупка в env `test` завершается внутри игры (без внешнего листа), чтобы flow был детерминирован.
- D-40-04: AC-10-08 (распределение дропа) проверяется на 10 000 сгенерированных дропов с допуском ±5 п.п. на вес.

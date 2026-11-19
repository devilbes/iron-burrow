# Запросы шага «логика» (правила и ход уровня)

Шаг работал по подписям `src/modules/game/index.ts` (не менялись) и `docs/plan/SERVICES_CONTRACT.md/.json`.
Файла `docs/game/CONTRACT.md` в проекте нет — API модуля игры описан ниже (R1).

## R1. Контракт: API модуля игры (для экранов и интеграции)

Импорт — `src/modules/game/controller/index.js` (контроллер) и `src/modules/game/core/index.js` (правила, только чтение состояния).

```ts
createLevelController(deps: ControllerDeps): LevelController
ControllerDeps = { campaign: GamePorts; siege?: LevelSetPorts; inventory?: BoosterInventory;
                   records?: GameRecords; clock: Clock; uuid: () => string }
BoosterInventory = { quantity(kind: 'bubble'|'shockwave'|'fortify'|'hull'): number;
                     consume(kind, { reason, idempotencyKey }): Promise<void> }
LevelSetPorts = Pick<GamePorts, 'level' | 'beginAttempt' | 'endLevel'>   // набор Siege, уровень 1 = siege_pit
Clock = { now(): number; setTimeout(fn, ms): unknown; clearTimeout(handle): void }

LevelController:
  phase: 'idle'|'loading'|'intro'|'playing'|'paused'|'cleared'|'defeated'|'ending'|'result'|'end_failed'|'error'
  run: RunState | null        // поле, танки, пули, power-up, жизни, счёт — рендер и HUD читают как есть
  start({ mode: 'campaign', stage?, hull? } | { mode: 'siege', hull? }): Promise<boolean>
  frame(nowMs)                // из requestAnimationFrame; фиксированный шаг 1/60, ≤ 5 тиков за кадр
  setInput(dir: 0|1|2|3|null, fire: boolean); useBooster(kind): boolean; canUse(kind): boolean
  pause(); resume()           // D-10-01: без авто-продолжения
  continueWithHull(): Promise<boolean>; concede(); retryEnd(); next(); retry(); exit()
  on(listener) → unsubscribe  // события правил (kill, hit, drop, pickup, threat, wave_start, …) и
                              // phase, start_failed, booster_failed, defeat {canContinue, score, cause},
                              // result {outcome: {mode, stage, wave, won, verified, stars, score, localStars}}
  dispose()
```

Сеть контроллера за уровень: `currentLevel` (если стадия не задана) → `level(n)` → `beginAttempt(n)` →
[`consume` на каждый бустер / Spare Hull] → `endLevel` один раз (повторы 2/4/8/16/32 с только при
ошибке, тот же eventId) → `save` один раз после ответа и только если перенос пушки изменился.
`loadSave` — не больше одного раза за сессию. Никаких опросов и таймеров вне повторов.

## R2. Интеграция (src/boot, src/screens) — чего не хватает в `GamePorts`

1. **Набор Siege.** `createGamePorts` открывает только `LEVEL_SET = 'main'`. Для Siege нужен второй
   экземпляр уровней на наборе арены (в записях — `levels.endless/r_0001_0001`, в контракте сервисов —
   level-set `siege`): `LevelSetPorts` = `level`/`beginAttempt`/`endLevel` того набора. Id набора — в
   `src/boot/ids.ts`. Без `siege` контроллер отвечает на старт Siege `start_failed`.
   Расхождение имён: контракт сервисов называет кампанию `campaign`, записи и `ids.ts` — `main`.
2. **Инвентарь бустеров.** `BoosterInventory` поверх `sdk.inventory`: `quantity` — `inventory.quantity`,
   `consume` — `inventory.consume(itemId, 1, { reason, idempotencyKey })`. Соответствие вида бустера и
   id предмета (`bst_bubble`, `bst_shockwave`, `bst_fortify`, `bst_hull` или
   `game.boosters.items.<kind>.item_id`) — в boot, в модуле игры id сервисов нет.
3. **Записи `game.*`.** `records` = `{ 'game.balance': sdk.configs.get('game','balance'), … }`
   (`game.enemies`, `game.powerups`, `game.boosters`, `game.siege`); ключ без значения или не той формы
   берётся из встроенной копии ключ за ключом.
4. **Часы.** `clock` = `{ now: () => sdk.time.now(), setTimeout, clearTimeout }`, `uuid` = `crypto.randomUUID`.
5. **Лидерборды.** `leaderboards.submitScore` по контракту — после результата (`result.outcome`) у
   экрана/мета-модуля; контроллер его не вызывает (счёт Siege уходит в `endLevel` набора Siege с
   `won = true`, см. D-LOGIC-08).

## R3. Записи (шаг записей): опубликовать `game.*` с числами встроенной копии

Опубликовать записи scope `game`: `balance`, `enemies`, `powerups`, `boosters`, `siege` — ровно со
значениями `src/modules/game/core/records.default.json` (это одновременно встроенный запасной вариант
по ГДД 31 `plat.configs`; копия и опубликованные записи должны совпадать), со схемой. Кроме ключей
таблицы ГДД 31 там есть ключи, которых в таблице нет, а правилам они нужны (тюнинги ГДД 10/12/13):
`unit_per_cell`, `ticks_per_second`, `max_ticks_per_frame`, `max_frame_ms`, `intro_s`, `clear_delay_s`,
`defeat_delay_s`, `continue_ready_s`, `first_spawn_delay_s`, `enemy_spawn_anim_s`,
`player_respawn_delay_s`, `player_fire_cooldown_s`, `booster_cooldown_s`, `threat_radius_cells`,
`fire_mult_by_chapter`, `score_max_lives_check`, `level_end_retry_s`, `ai.*`; `game.powerups.max_on_field`;
`game.boosters.consume_retry_s`; `game.siege.gunner`, `scout`, `spawn_interval`, `fire_mult`
(с новым `base`), `carrier_indices`, `wave_break_s`.

Баланс перенастроен через эти записи (симуляции ГДД 13 §3, D-LOGIC-06):

| ключ | было (ГДД) | стало |
|---|---|---|
| `game.balance.ai.weights` (core/player/random) | 50 / 25 / 25 | 19 / 17 / 64 |
| `game.balance.ai.decision_s` | 0.25 | 0.5 |
| `game.balance.ai.aim_fire_p` | 0.9 | 0.19 |
| `game.balance.ai.brick_keep_dir_p` | 0.5 | 0.49 |
| `game.balance.ai.fire_p` (scout/grunt/gunner/brute) | 0.20 / 0.30 / 0.45 / 0.35 | 0.07 / 0.13 / 0.26 / 0.21 |
| `game.balance.fire_mult_by_chapter` | 1.0 / 1.15 / 1.3 | 0.71 / 1.4 / 1.38 |
| `game.balance.first_spawn_delay_s` | 1.0 | 3.0 |
| `game.siege.spawn_interval` (start/step/min) | 3.0 / 0.1 / 1.5 | 4.3 / 0.16 / 1.5 |
| `game.siege.fire_mult` (base/step/cap) | 1.0 / 0.02 / 1.5 | 0.45 / 0.15 / 3.0 |

Числа 00_MASTER (скорости, HP, очки, 20 врагов, maxAlive, интервалы спавна кампании, жизни) не менялись.

## R4. ГДД / владелец баланса: длительность стадии недостижима при числах 00_MASTER

Не проходят на сидах 1, 7, 42: `bot.stage_length_s` (62 с при цели 90–180),
`bal.sim.novice.stage_duration_median` (62), `bal.sim.expert.stage_duration_median` (56–58 при 70–150)
и производная `bot.session_stages` (8 при 3–6). Причина — расписание спавна: 20 врагов, первый через
`first_spawn_delay_s`, далее каждые 3.0 / 2.5 / 2.0 с → стадию нельзя пройти быстрее 60 / 50.5 / 41 с, а
бот, который успевает убивать в темпе спавна, выигрывает; бот, который не успевает, проигрывает (враги
копятся до `maxAlive` и ломают Core). Все цели по победам, поражениям, Siege, первому убийству и угрозе
выполнены, поэтому темп убийств не замедлялся. Варианты (решение — за ГДД, числа мастер-документа):
`spawn_interval_s_by_chapter` ≈ 4.5 / 4.0 / 3.5 или `stage_enemies` ≈ 30, после чего — повторная
настройка `ai.*` / `fire_mult_by_chapter` теми же симуляциями (`node tests/sim/<id>.mjs`).

## R5. Уровни (шаг уровней), необязательно

Стадии 11–15 при одинаковых числах главы заметно тяжелее 16–20 (при `fire_mult` главы 2 выше 1.4
появляется нарушение `bal.sim.novice.monotonic_violations`): карты 11–15 стоит открыть, а 16–20 — закрыть,
чтобы у главы 2 был запас по монотонности.

## R6. Обвязка тестов (package.json, scripts/check.mjs — не шаг логики)

Добавить `"tests/game/index.js"` (или `"tests/game/*.spec.mjs"`) в `test:unit` и в список `scripts/check.mjs`,
чтобы `npm run check` гонял тесты правил и контроллера. Сейчас они идут командой `node --test tests/game/`
и названы `*.spec.mjs`, потому что `tests/test-set.test.mjs` требует каждый `*.test.mjs` в globs `test:unit`.
Симуляции баланса — `node tests/sim/<id>.mjs [seed…]` (минуты на первый прогон сида, потом из `.cache/sim/`).

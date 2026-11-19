# 14 — Tutorial and onboarding (`tut.`)

Источник — `00_MASTER.md` §4, §6, §13 (S15 Tutorial overlay). Правила — `10_core_rules.md`. Строки — en, финальный текст UI владеет 20; здесь — точные значения ключей.

## 1. Первая сессия

1. **S01 Boot**: `sdk.boot()` → чтение kv profile-pack. Если `onb.start_grant_done ≠ true` — запрос стартового гранта (2 × каждый бустер; id награды из configs `game.rewards`), при успехе флаг = true. Ошибка не блокирует: повтор при каждом открытии S02 (D-14-01).
2. **Новый игрок**: Boot → S02 Lobby с окном стартового набора (S02 `grant`: 4 крупные картинки бустеров ×2, кнопка `Collect`, 20 `ui.`) → `Play` → S03 (узел стадии 1) → S04 (без подсказки про Spare Hull) → Stage 1 с оверлеем S15. Путь совпадает с `qa/flows/first-session.json`. D-14-02: окно гранта показывает награду крупно по правилу окон наград; 3 нажатия до старта укладываются в `gt.tut.time_to_control`.
3. Stage 1 с оверлеем S15 (§2). Бустеры в HUD уже есть (грант).
4. После S07/S08 → S02 Lobby. S12 Daily Rewards в первой сессии сам не открывается — только бейдж hud (D-14-03).
5. Первое открытие S04 начиная со стадии 2: подсказка `Spare Hull: +1 life for this stage.` (флаг `tut.prestage_hint_shown`).

## 2. Обучение на стадии 1

Оверлей не ставит игру на паузу; баннер над полем, стрелка на цель. Шаг появляется с fade 0.3 s, держится минимум `tut.step_min_show_s` (раннее выполнение ждёт этот минимум), между шагами `tut.step_gap_s`. **Спавн врагов удерживается** до завершения T4 или `tut.spawn_hold_max_s` от начала `playing` — это команда в лог симуляции (детерминизм сохраняется).

| step | старт | keyboard (en) | touch (en) | завершение |
|---|---|---|---|---|
| T1 move | `playing` t = 0 | `Drive with Arrow keys or WASD` | `Drag the stick to drive` | проехал ≥ `tut.move_done_cells`; без ввода `tut.idle_pulse_s` — пульс стика / иконки клавиш |
| T2 fire | после T1 | `Press Space or J to fire` | `Tap FIRE to shoot` | первая пуля игрока |
| T3 brick | после T2 | `Shots chew through brick. Blast a path!` | = | разрушен ≥ 1 brick quarter пулей игрока или `tut.brick_timeout_s` |
| T4 core | после T3 | `Guard the Burrow Core. One hit and it's gone!` + `Even your own shots can break it.` | = | таймер `tut.core_show_s`; затем снятие удержания спавна |
| T5 enemy | первый враг активен | `Rustbugs incoming! Destroy all 20.` | = | первое убийство или `tut.enemy_timeout_s` |
| T6 power-up | первый power-up на поле | `Flashing Rustbugs drop power-ups. Grab it!` | = | подбор или исчезновение power-up |

- **Skip**: кнопка `Skip` в правом верхнем углу S15, доступна с T1; без подтверждения. Ставит `tut.stage1_done = true`, снимает удержание спавна (первый спавн через `core.first_spawn_delay_s`). Esc — пауза, не skip.
- **Клавиатура / тач**: режим по последнему вводу (keydown → keyboard; touch/pointer coarse → touch); стартовый — по `(pointer: coarse)`. Смена режима меняет строку текущего шага сразу. В тач-режиме стрелка указывает на стик/кнопку, в клавиатурном — плашка с клавишами.
- `tut.stage1_step` = последний завершённый шаг (0–6). Повтор стадии 1 при `step ≥ 4` начинается с T5 без удержания спавна (D-14-04). `tut.stage1_done = true` после T6 или при первом исходе стадии 1 (`cleared`/`defeated`).

## 3. Подсказка про бустер

При первом `core.threat` (10 §7) в любой стадии или Siege, если `tut.booster_hint_shown ≠ true` и в inventory есть хотя бы один доступный по лимитам бустер:
- текст `Core in danger! Use a booster.` + keyboard `Press 1, 2 or 3` / touch `Tap a booster button`;
- кнопки бустеров пульсируют `tut.booster_pulse_s`; без паузы и замедления (D-14-05);
- флаг ставится в момент показа. Нет бустеров — подсказка не показывается и не помечается.

## 4. Флаги (profile-pack kv)

| key | тип | когда пишется |
|---|---|---|
| `onb.start_grant_done` | bool | грант подтверждён сервером |
| `tut.stage1_step` | int 0–6 | после каждого шага |
| `tut.stage1_done` | bool | T6 / первый исход стадии 1 / Skip |
| `tut.booster_hint_shown` | bool | показ §3 |
| `tut.prestage_hint_shown` | bool | первое открытие S04 |

Запись — `profile-pack` kv сразу после события (без батча); чтение — один раз на Boot. Ошибка записи — повтор при следующем событии; локальная копия флагов в памяти сессии не даёт показать шаг дважды (D-14-06).

## Tunables

| key | value | src |
|---|---|---|
| tut.step_min_show_s | 1.5 | new |
| tut.step_gap_s | 0.5 | new |
| tut.move_done_cells | 1.0 | new |
| tut.idle_pulse_s | 6 | new |
| tut.brick_timeout_s | 10 | new |
| tut.core_show_s | 4 | new |
| tut.enemy_timeout_s | 10 | new |
| tut.spawn_hold_max_s | 25 | new |
| tut.booster_pulse_s | 5 | new |
| tut.start_grant | 2 × bst_bubble, bst_shockwave, bst_fortify, bst_hull | master |

## Genre targets

| key | target | unit | measured by | seeds |
|---|---|---|---|---|
| gt.tut.time_to_control | ≤ 10 | s от конца загрузки до `playing` стадии 1 | flow:first-session | — |
| gt.tut.t1_t4_duration | ≤ 35 | s на шаги T1–T4 при скриптовом вводе | flow:first-session | — |
| gt.tut.first_kill_stage1 | ≤ 50 | s от начала `playing` стадии 1 с туториалом | playtest:blind | — |
| gt.tut.stage1_clear_rate | ≥ 80 | %, стадия 1, бот novice | sim:win_rate_stage1 | 1, 7, 42 |
| gt.tut.completion_rate | ≥ 85 | % живых игроков T1→T6 (после релиза) | analytics:tutorial_step | — |
| gt.tut.skip_rate | ≤ 25 | % живых игроков (после релиза) | analytics:tutorial_step | — |

# 32 — Аналитика (`an.`)

**Транспорт — только через SDK.** В `docs/sdk/*` модуля телеметрии нет → все события имеют статус **NOT_RUN_LATER**: игра формирует события в модуле `meta-bridge` (заглушка-приёмник на шине) и никуда их не отправляет; сторонних SDK, пикселей и своих запросов нет (D-32-01). Когда платформа даст телеметрию, заглушка подключается к ней без правки остальных модулей. Серверные факты (конец уровня, покупки, daily, рейтинг) и так фиксируют сервисы progress / iap / daily-rewards / leaderboards.

| event | params | trigger | sender module | funnel / KPI | status |
|---|---|---|---|---|---|
| `an.app_ready` | load_ms, device_type, orientation | `sdk:core:ready`, показан Lobby | meta-bridge | загрузка, `tech.perf.app_ready_ms` | NOT_RUN_LATER |
| `an.tutorial_step` | step (1–N) | шаг туториала стадии 1 | screens | FTUE-воронка | NOT_RUN_LATER |
| `an.tutorial_done` | duration_s, skipped | конец туториала | screens | FTUE-доходимость | NOT_RUN_LATER |
| `an.stage_start` | stage, chapter, attempt, hull_prestage, gun_level | старт стадии | game-core | воронка кампании | NOT_RUN_LATER |
| `an.stage_end` | stage, result (clear/defeat/quit), stars, score, duration_s, lives_lost, boosters_used, defeat_cause (core/lives) | Stage Clear / Defeat / выход | game-core | прохождение стадий, сложность (13), D1/D7 | NOT_RUN_LATER |
| `an.booster_use` | item, stage_or_wave, mode | успешное списание бустера | boosters | расход (15 `meta.forecast`) | NOT_RUN_LATER |
| `an.continue_used` | stage_or_wave, mode | continue Spare Hull | boosters | спрос на `bst_hull` | NOT_RUN_LATER |
| `an.reward_granted` | source (first_clear/three_star/finale/daily/start_grant), items | ответ сервиса о выдаче | meta-bridge | источники бустеров | NOT_RUN_LATER |
| `an.daily_claim` | day (1–7) | получение daily | meta-bridge | возвращаемость | NOT_RUN_LATER |
| `an.siege_unlock` | — | первое прохождение стадии 5 | meta-bridge | вовлечение в Siege | NOT_RUN_LATER |
| `an.siege_end` | waves, score, duration_s, boosters_used, best | конец забега | game-core | Siege-удержание | NOT_RUN_LATER |
| `an.offer_shown` | placement (shop/defeat/prestage/starter_auto), pack | показ оффера | shop | показы → конверсия | NOT_RUN_LATER |
| `an.purchase_start` | pack, placement | нажатие «купить» | shop | воронка покупки | NOT_RUN_LATER |
| `an.purchase_result` | pack, placement, result (success/cancel/error/pending), test | ответ `iap.purchase` | shop | конверсия, ARPPU | NOT_RUN_LATER |
| `an.leaderboard_view` | board, period | открытие S13 | screens | интерес к рейтингу | NOT_RUN_LATER |
| `an.service_failed` | service, code | `sdk:module:failed` / ошибка вызова | meta-bridge | надёжность | NOT_RUN_LATER |

KPI MVP: доходимость туториала, доля прошедших стадии 5 / 10 / 30, D1 / D7, конверсия в первую покупку, доля Starter Crate в покупках.

| ID | решение |
|---|---|
| D-32-01 | Телеметрии в SDK нет → все события NOT_RUN_LATER, транспорт не реализуется, сторонняя аналитика запрещена |

# Публикация в QA — 19.11.2026 (21:04 UTC)

**Итог: сборка собрана и опубликована в QA, уровень 1 проходится до победы с подтверждением сервера и наградой.
Проверка «консоль без ошибок» НЕ пройдена (2 ошибки), поэтому шаг не закрывается как выполненный.** Причина — вопрос
владельцу о тестовом провайдере магазина и ценах (см. «Что мешает закрыть шаг»).

| требование | результат |
|---|---|
| builds.create (web) для текущего main → succeeded | ✔ `6aff61d02b51c60526635b76`, succeeded |
| projects.qa.publish с этим buildId | ✔ операция `4b8248b3f1f27ec71b0dc751` — `done` |
| projects.qa.current возвращает этот buildId | ✔ `current.sourceId = 6aff61d02b51c60526635b76` |
| адрес QA открывается | ✔ https://qa.manyplay.fun/iron-burrow/ — HTTP 200; во фрейме загружена `test.manyplay.fun/qa-builds/360/6aff61d02b51c60526635b76/` |
| консоль без ошибок | ✘ 2 ошибки (409 магазина; CSP скрипта Cloudflare хостинга) |
| уровень 1 до победы с подтверждением сервера | ✔ `levelEnd` → 202, `level.verified: true`, 3 звезды |
| награда | ✔ окно «Reward received: +2 Bubble Shield»; в инвентаре `bst_bubble` 3 → 5 |

## Сборка
| поле | значение |
|---|---|
| **buildId** | **`6aff61d02b51c60526635b76`** |
| платформа | web |
| исходник | main `c026d474ad0044c16e4798d2c6ac4e364258974f` (совпадает с `projects.tree` revision и локальным HEAD) |
| версия | 1.0.2 (`release/1.0.2`), obfuscation minify |
| SDK | все пакеты `@manygamescorp/*@1.0.0-rc.30`, modulesRevision 3, lockHash `bfb051f9…b3d2` |
| артефакт | 2205 файлов, 116 961 906 байт, точка входа `www/index.html` |
| статус | **succeeded** |
| время | создана 20:53:36, старт 20:54:48, конец 21:00:57 UTC (подготовка 40 с, сборка 89 с, выгрузка 45 с, подпись 3 мин 15 с) |

Из лога (`builds.log`, 104 строки, `done: true`): `package-lock.json` пересоздан сервисом сборки (platform.json /
package.json не совпали с lock), `npm install` — 14 пакетов, `node scripts/build.mjs` без ошибок, обфускация minify
(3 файла), `Run ID: ca4pa was successful after 1m14s`.

## Публикация
| поле | значение |
|---|---|
| operationId | `4b8248b3f1f27ec71b0dc751` — `done`, reason null |
| опубликовано | 21:04:30.346 UTC |
| `projects.qa.current` | `sourceId = 6aff61d02b51c60526635b76` ✔ |
| предыдущая | `6aff262a2b51c60526635b37` (16:51:30) |
| **адрес QA** | **https://qa.manyplay.fun/iron-burrow/** |

## Проверка (новый гость, 1440x900, Chromium headless, 21:04:35–21:06:15 UTC)
Порядок: открытие → стартовый набор «Welcome, Burrower!» → Collect → лобби → карта → стадия 1 → обучение → бой
(движение и огонь) → пауза до ~61 с от начала попытки → `QA: Win` → окно «Stage Clear!» → Next Stage → окно награды.

| шаг | результат |
|---|---|
| загрузка, `app-ready` | ✔ |
| стартовый набор | ✔ `POST /v1/iap/orders` 201 → заказ 200 → инвентарь: по 2 каждого бустера |
| старт стадии 1 | ✔ `progress/me/attempts/begin` 200 |
| конец уровня | ✔ `POST /v1/progress/me/actions` → **202**, `{"status":"accepted","level":{"verified":true,"stars":3}}`; отправлено `levelEnd`, `levelId stage_01`, `won: true`, `score 2500`, `durationMs 63334` |
| окно победы | «STAGE CLEAR!», 3 звезды, Score 2 500, награда Bubble Shield ×2 |
| награда | окно «REWARD RECEIVED! +2 Bubble Shield»; `GET /v1/inventory/me` → `bst_bubble` 5 (до боя 3) |
| исключения страницы | ✔ нет |
| ответы 4xx/5xx | ✘ 1: `409 POST https://test.manyplay.fun/v1/iap/store/products` → `{"code":"IAP_PROVIDER_UNAVAILABLE"}` |
| **ошибки консоли** | ✘ **2**: (1) `Failed to load resource: … status of 409` — запрос магазина выше; (2) `Refused to load the script 'https://static.cloudflareinsights.com/beacon.min.js…' because it violates … "default-src 'none'"` — скрипт подставляет хостинг QA, не игра |
| прочие сетевые | `POST /v1/iap/orders` один раз ERR_ABORTED (повтор того же запроса прошёл, 201) — не ошибка консоли |

Остальные запросы к API — 200/201/202 (auth, configs, inventory, iap/init, progress, player-data).

Как засчитана победа: тестовой кнопкой `QA: Win` (она есть только в окружении test) после ~61 с в бою. Сервер не
принимает победу короче 58 с (`server.durationMs.min`) и сам ставит `verified`. Врагов в этом проходе не уничтожали
(Rustbugs 0), то есть честная проходимость уровня ботом здесь не проверялась (D-PUB-05).

## Что мешает закрыть шаг
1. **409 `IAP_PROVIDER_UNAVAILABLE` при запуске** — у приложения в test не включён тестовый провайдер магазина. Ошибку
   убирает только его включение с ценами пяти наборов (в ГДД D-00-10: 0.99 / 1.99 / 4.99 / 9.99 / 19.99 USD).
   Это денежное решение владельца (D-POL-05), сам не включал. **Вопрос владельцу:** включить тестовый провайдер
   магазина с ценами из D-00-10? После этого нужна только повторная проверка той же сборки, пересборка не нужна.
2. **CSP-ошибка Cloudflare beacon** — её вставляет хостинг qa.manyplay.fun, а CSP фрейма игры этот скрипт блокирует.
   Код игры её не исправит. Нужно решение платформы (убрать beacon на QA) или владельца (не считать её ошибкой игры).

## Решения (также в docs/gdd/DECISIONS.md)
- D-PUB-04: собран текущий main c026d47 и опубликован, `projects.qa.current` = buildId.
- D-PUB-05: победа на уровне 1 засчитана `QA: Win` после 61 с; сервер подтвердил её, награда пришла.
- D-PUB-06: «консоль без ошибок» не пройдена; провайдер магазина не включался — это решение владельца.
- D-PUB-07: проход по развёрнутому адресу сделан временным скриптом вне репозитория (игра идёт во фрейме).

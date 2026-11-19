# 30 — Техническая архитектура (`tech.`)

Источник — `00_MASTER.md` §2, §13–§15; `docs/sdk/*`; `platform.json` (SDK 1.0.0-rc.30, адаптер `@manygamescorp/platform-web`, `gameType: server`, `clientAuthoritative: false`). Интеграция с сервисами — 31 `plat.`.

## tech.stack — стек

| слой | решение |
|---|---|
| шаблон | game-template, стек v2: TypeScript, без бандлера, `tsc` → `dist/app/`, import map SDK вставляется в `dist/index.html` (`scripts/build.mjs`) |
| SDK | ManyPlay web SDK `@manygamescorp/core` 1.0.0-rc.30 + модули `mod-*`; ставится только через MCP в `vendor/@manygamescorp/`; `vendor/`, `platform.json` руками не правятся |
| UI | UI Kit `@manygamescorp/ui-kit` + скин `skin-manyplay`, тема игры в `src/theme/iron-burrow/` (токены `--mp-*`, шрифт, иконки); все окна, топ-бар, нижний бар, HUD-иконки и очередь окон — UI Kit |
| поле | Canvas 2D (один `<canvas>`), рисует игра; UI Kit — HTML поверх |
| цель | только web (desktop + mobile browser); ориентации portrait 390×844, landscape 844×390, desktop 1440×900 |
| запреты | SDK и UI Kit только используются, не меняются; нет `localStorage`/`sessionStorage`/`indexedDB`, нет глобалов `window.*` для состояния и связи модулей; модули не импортируют друг друга |

## tech.modules — модули игры `src/modules/<id>`

Модули объявляются через `defineModule` шаблона (сигнатура — уточняет интеграция) и общаются только через `sdk.bus` (`on`/`once`/`off`; способ публикации своих событий — уточняет интеграция). Точка входа `src/main.ts`: `createSdk` + `boot` (31 `plat.init`).

| id | ответственность | requires | sdk.uses | события: шлёт → / слушает ← |
|---|---|---|---|---|
| `game-core` | headless-логика: поле 13×13 / четверти, движение, пули, столкновения, ИИ Rustbugs, спавн, носители, power-ups, жизни, счёт, звёзды, Siege-волны; фиксированный шаг 60 Гц; сид-RNG | — (чистое ядро без DOM и SDK; тонкая обёртка-модуль) | — (тюнинги и уровень приходят событием) | → `core:stage-started`, `core:state`, `core:enemy-killed`, `core:powerup-picked`, `core:player-died`, `core:defeat`, `core:stage-cleared`, `core:wave-cleared` ← `meta:stage-data`, `input:cmd`, `boosters:applied`, `app:pause`, `app:resume` |
| `field-render` | Canvas 2D: тайлы, танки, пули, power-ups, корни поверх танков, интерполяция между тиками, масштаб `floor(fieldPx/13)`, раскладка портрет/ландшафт | game-core | `sdk.device.screen` | ← `core:state`, `feel:shake` |
| `input` | клавиатура (стрелки/WASD, Space/J, 1–3, Esc), виртуальный стик + FIRE + кнопки бустеров (touch) | — | `sdk.device.info` | → `input:cmd`, `input:booster`, `input:pause` |
| `hud-ui` | игровой HUD стадии (жизни, осталось врагов, счёт, уровень пушки, кнопки бустеров со счётчиками и лимитами); регистрация HUD-иконок daily / shop / leaderboards и бейджей | boosters | `sdk.hud.register`, `sdk.hud.setBadge`, `sdk.l10n.t` | ← `core:state`, `boosters:balances`, `meta:badges` → `input:booster` |
| `screens` | S02–S16 через окна UI Kit и очередь окон; обработка `kit:intent`; туториал стадии 1 | meta-bridge | UI Kit (окна, `kit:intent`), `sdk.l10n.t` | ← `core:defeat`, `core:stage-cleared`, `meta:*` → `screens:start-stage`, `screens:continue`, `screens:open-shop` |
| `boosters` | балансы, списание, лимиты за стадию/забег, Spare Hull pre-stage и continue | meta-bridge | `sdk.inventory.balance`, `sdk.inventory.consume` | ← `input:booster`, `screens:continue`, `shop:purchased` → `boosters:applied`, `boosters:balances`, `boosters:failed` |
| `shop` | витрина паков, плейсменты, Starter Crate, покупка, результат | meta-bridge | `sdk.iap.offers`, `sdk.iap.purchase`, `sdk.device.network` | ← `screens:open-shop`, `core:defeat`, `core:stage-cleared` → `shop:purchased`, `shop:failed` |
| `meta-bridge` | конфиги и их валидация, level-set и `levelEnd`, награды, стартовый грант, daily, лидерборды, gamestate / kv, аналитика-заглушка | — | `sdk.configs.*`, `sdk.progress.send`, `sdk.progress.levelEnd`, `sdk.leaderboards.get`, `sdk.leaderboards.submitScore`, `sdk.gamestate.get`, `sdk.gamestate.set`, `sdk.profile.get`, `sdk.profile.update`, daily-rewards (уточняет интеграция), `core.time.now()` | ← `sdk:core:ready`, `core:stage-cleared`, `core:defeat` → `meta:stage-data`, `meta:rewards`, `meta:badges`, `meta:unlocks` |
| `audio` | музыка глав, SFX, громкость из настроек, приостановка при скрытии | — | — (настройки громкости приходят от meta-bridge) | ← `core:*`, `app:pause`, `app:resume`, `meta:settings` |
| `feel` | тряска экрана, хит-стоп, частицы, вспышки, вибрация | — | `sdk.device.haptics` | ← `core:*` → `feel:shake` |

## tech.data — данные

| что | где | как читается |
|---|---|---|
| тюнинги | `configs/remote/game/{balance,enemies,powerups,boosters,siege,rewards}.json` + `configs/remote/iap/*.json` | сервис configs → `sdk.configs` (ключи `game.*`, `iap.*`, 31 `plat.configs`) |
| схемы | `configs/schemas/game.*.schema.json`, `iap.*.schema.json`, `level.schema.json` | валидация при публикации и в meta-bridge; при невалидном ключе — встроенный дефолт |
| уровни кампании | `configs/levels/campaign/stage_01.json … stage_30.json` | публикуются как level-set `campaign` модуля progress (services-publish); игра получает данные стадии через progress / configs (способ — уточняет интеграция) |
| арена Siege | `configs/levels/siege/siege_pit.json` | публикуется в составе `game.siege.arena` (D-30-04) |
| тексты | `localization/strings.json` (en) | `sdk.l10n.t`; ни одной строки UI в коде |
| время | — | только `core.time.now()` (daily, кулдауны оффера); `sdk.time` — уточняет интеграция |
| сохранения | inventory, progress, profile-pack kv / gamestate | 15 `meta.save`; никаких локальных хранилищ браузера |

## tech.loop — цикл и пауза

- Симуляция — фиксированный шаг 60 Гц (1/60 с): аккумулятор, максимум 5 шагов за кадр, кадр длиннее 250 мс усекается (без «спирали»). Рендер интерполирует между двумя последними состояниями.
- Кадры планирует `requestAnimationFrame` в `field-render` (единственное разрешённое обращение к глобальному API для цикла, D-30-02); длительность шага меряется по `core.time.now()`.
- Пауза при скрытии вкладки: `document.visibilitychange` → `app:pause` — симуляция стоит, звук приостановлен, при возврате открыт S06 Pause (игра не продолжается сама). Если SDK шлёт событие жизненного цикла на шине — используется оно (имя — уточняет интеграция). Потеря фокуса окна на desktop — то же.
- Детерминизм: ядро получает сид RNG и команды ввода по тикам → реплеи для тестов.

## tech.perf — бюджеты

| ключ | значение | как меряется |
|---|---|---|
| `tech.perf.first_load_kb` | 2500 | байты по сети (gzip) до `sdk:core:ready`, включая vendor SDK / UI Kit |
| `tech.perf.js_gzip_kb` | 200 | JS игры `dist/app/` (gzip), без vendor |
| `tech.perf.css_gzip_kb` | 25 | CSS темы игры (gzip), без UI Kit |
| `tech.perf.image_kb` | 900 | изображения первой загрузки (атласы поля + иконки темы) |
| `tech.perf.font_kb` | 120 | шрифты темы (woff2, сабсет латиницы) |
| `tech.perf.app_ready_ms` | 3000 | от навигации до Lobby на устройстве-минимуме, сеть 4G (9 Мбит/с, RTT 170 мс) |
| `tech.perf.long_task_ms` | 50 | максимальная длинная задача в стадии (за стадию — 0 задач > 50 мс) |
| `tech.perf.fps_min` | 55 | 5-й перцентиль FPS стадии 30 (6 врагов) на устройстве-минимуме |

Музыка грузится после Lobby (лениво), не входит в `first_load_kb`.

## tech.device — устройство-минимум

Android-смартфон 2019 г. среднего класса (4 ГБ ОЗУ, Snapdragon 660-класс), Chrome 110+; iPhone 8 / iOS Safari 15.4+; desktop — две последние версии Chrome, Edge, Firefox, Safari. Экран от 360×640 CSS px.

## tech.verify — проверки шаблона

- `npm run verify` шаблона v2 = части: `typecheck` (`tsc --noEmit`), `build` (`dist/index.html`), `test` (тесты `tests/`), статические проверки (запрещённые слова 00_MASTER, нет `localStorage`/`window.*`, нет импортов между модулями, нет строк UI вне `localization/strings.json`), бюджеты `tech.perf.*` по `dist/`.
- В текущем репозитории `manifest.json` = 1.0.0 и в `package.json` есть только `build` и `typecheck` → минимальная проверка `npm ci && npm run typecheck && npm run build`; остальные части добавляются скриптами проекта в `scripts/` без правки SDK (D-30-05).
- Путь к QA — сервис builds (`ci/README.md`).

## tech.tests — стратегия тестов headless-ядра

| уровень | что | пример |
|---|---|---|
| unit | разрушение по четвертям, коллизии с тайлами, `lava`/`roots`/`oil`, уровни пушки, носители #4/#11/#18, веса дропа, формулы счёта и звёзд, Siege-формулы (max alive, доля brute, множитель) | `tests/game-core.*.test.ts` |
| сценарий | реплей: сид + скрипт команд по тикам → ожидаемый итог (победа/поражение, счёт, звёзды, хэш состояния) | 30 стадий по 1 «эталонному» реплею |
| свойства | на всех 30 стадиях: Core окружён стеной, спавны свободны, путь от спавнов до Core существует | генерация по данным `configs/levels` |
| производительность | 10 000 тиков стадии 30 без рендера быстрее 1 с в Node | бюджет на ядро |
| мета (моки SDK) | ротация наград `(N−1) mod 4`, лимиты бустеров, порядок окна Defeat, кулдаун Starter Crate | фейковые `inventory`/`iap`/`progress` |

Ядро не импортирует DOM и SDK → тесты идут в Node без браузера.

## Решения

| ID | решение |
|---|---|
| D-30-01 | 10 модулей игры; `game-core` — чистое ядро без DOM/SDK |
| D-30-02 | `requestAnimationFrame` — единственный глобальный API цикла; время шага — `core.time.now()` |
| D-30-03 | Пауза при скрытии вкладки, возобновление только через окно Pause |
| D-30-04 | Арена `siege_pit` публикуется внутри `game.siege.arena`, а не в level-set кампании |
| D-30-05 | До появления `verify` в шаблоне — `typecheck` + `build` + проектные скрипты проверок |
| D-30-06 | Бюджеты `tech.perf.*` — значения таблицы выше |

# ManyPlay Starter — что где читать

Шаблон: заглушка игры поверх готовой обвязки платформы. Что заменить, что не трогать и в каком
порядке — [README.md](README.md).

| Нужно | Файл |
|---|---|
| SDK, модули, UI Kit | [docs/sdk/README.md](docs/sdk/README.md) |
| Уровни, попытка, награда за уровень, сохранение, аналитика | [docs/platform/services/progress-and-levels.md](docs/platform/services/progress-and-levels.md) |
| Сеть: без опросов (конфиги, прогресс, выдачи, сохранение) | [docs/platform/services/network.md](docs/platform/services/network.md) |
| Монеты и инвентарь | [docs/platform/services/inventory-and-currency.md](docs/platform/services/inventory-and-currency.md) |
| Покупки, магазин | [docs/platform/services/purchases.md](docs/platform/services/purchases.md) |
| Ежедневные награды | [docs/platform/services/daily-rewards.md](docs/platform/services/daily-rewards.md) |
| Лидерборд | [docs/platform/services/leaderboards.md](docs/platform/services/leaderboards.md) |
| Профиль, настройки, вход ManyPlay ID | [docs/platform/services/profile-and-settings.md](docs/platform/services/profile-and-settings.md) |
| Тексты и языки | [docs/platform/services/localization.md](docs/platform/services/localization.md) |
| Топбар, HUD, меню, окна сервисов | [docs/platform/services/windows-and-hud.md](docs/platform/services/windows-and-hud.md) |
| Своя плитка HUD (событие, задания, оффер), счётчик топбара | [docs/platform/recipes/add-a-hud-entry.md](docs/platform/recipes/add-a-hud-entry.md) |
| Окна игры (результат, пауза, поражение, подтверждение), слой поверх экрана — `ctx.window`, `ctx.overlay`; своей вёрстки модальных окон нет | [docs/platform/recipes/game-windows.md](docs/platform/recipes/game-windows.md) |
| Ориентация игры (`ORIENTATION`: по жанру и механике), пауза — `ctx.onSuspend` | [docs/platform/recipes/orientation.md](docs/platform/recipes/orientation.md) |
| Записи сервисов (`configs/remote/`), их публикация, хеш уровней | [configs/remote/README.md](configs/remote/README.md), [docs/platform/services/configs.md](docs/platform/services/configs.md) |
| Рецепты: уровень, строка, экран, окна игры, ориентация и пауза, плитка HUD, товар, трата валюты, картинки и звук, свой скин окон | [docs/platform/recipes/](docs/platform/recipes/) |
| Тесты | [tests/README.md](tests/README.md) |

## Карта проекта
| Путь | Что |
|---|---|
| `src/main.ts` | точка входа: без SDK показывает понятное сообщение |
| `src/boot/` | запуск SDK (`start.ts`), таблица модулей (`modules.ts`), id записей (`ids.ts`), сервисы уровня (`game-ports.ts`), прогресс сессии (`progress-state.ts`), вход дня и выдачи (`grants.ts`), строки оболочки |
| `src/shell/` | зоны UI Kit и кнопки игры (`zones.ts`), плитки HUD и счётчики топбара игры (`hud.ts`, правила — `hud-plan.ts`), маршруты (`router.ts`), подключение скина (`skin.ts`, цвета стока переменными — `stock-colors.ts`, генерирует `scripts/stock-colors.mjs`; кнопки из одной серой картинки, окрашенной по видам, — `button-tint.ts`), окна сервисов (`windows/`), окна игры и слои поверх экрана (`windows/game.ts`, порядок с окном награды — `windows/order.ts`), сигнал паузы `ctx.onSuspend` (`suspend.ts`) |
| `src/skin/` | свой вид игры: цвета, радиусы, шрифты — `theme.css`; общий лист и листы компонентов — `sheets.ts`; картинки, шрифты и фон сцены — `art.ts`; там же картинки предметов и предложений (`ITEMS`, `OFFERS`) для всех окон кита ([рецепт](docs/platform/recipes/custom-window-skin.md), [фон и панели](docs/platform/recipes/custom-window-skin.md#фон-сцены-и-панели), [растровая кнопка](docs/platform/recipes/custom-window-skin.md#растровая-кнопка-одна-серая-картинка-на-все-цвета)) |
| `src/modules/game/` | шов игры: `GamePorts` и модуль игры, без SDK и DOM |
| `src/screens/` | экраны игры (`index.ts`: маршруты, `GAMEPLAY`, `MENU` — нижнее меню, по умолчанию пустое; `HUD` — плитки HUD, `TOP_BAR` — счётчики топбара; `LOCALES` — языки игры; `ORIENTATION` — ориентация игры; `PROFILE_STATS` — строки профиля); в шаблоне — заглушка: главный экран и экран игры, их строки |
| `src/assets.ts` | `assetUrl` — URL файла из `assets/` |
| `assets/` | картинки, звук, арт скина; сборка копирует в `dist/assets/` |
| `configs/remote/` | образцы записей сервисов приложения |
| `scripts/build.mjs` | проверка типов `tsc`, бандл esbuild → `dist/app/` (`main.js`, `start.js`, куски `chunk-<хэш>.js`, минификация, карты `.map` рядом; SDK — внешний, через import map), минифицированные `.css` из `src/` на своих путях в `dist/app/`, import map, заголовок (имя проекта) и язык в минифицированном `dist/index.html`, копия `assets/` |
| `scripts/typecheck.mjs` | проверка типов тем же конфигом, что и сборка (`scripts/sdk.mjs`); инкрементальная, кэш — `.cache/typecheck/` |
| `scripts/check.mjs` | `npm run check` — полная проверка одной командой, все провалы разом; `npm run check:fast` — быстрая: типы, бандл в `dist/`, тесты `tests/*.test.mjs` |
| `tests/screen-shot.mjs` | `npm run shot` — снимок одного экрана игры в одном размере |
| `scripts/levels-hash.mjs` | `server.contentHash` диапазонов уровней |
| `scripts/assets.mjs` | `npm run assets` — из каждой картинки 2x (`<имя>-2x.png`) делает 1x (`<имя>.png`) ровно вдвое меньше; `--check` — ничего не пишет, называет все неверные пары разом ([рецепт](docs/platform/recipes/add-art-and-sound.md#картинки-только-2x-остальное--командой)) |

## Правила
- Символьных ссылок в проекте не создавать (в том числе `app` → `dist/app`): сборка платформы не читает архив с ними. Раздаётся `dist/`, а не корень проекта; `tests/no-symlinks.test.mjs` это проверяет.
- Не править: `vendor/`, `platform.json`, `package.json`, `.npmrc` (lock-файла нет: состав SDK задаёт `platform.json`, пакеты лежат в `vendor/`)
  и `docs/platform/sdk-methods.lock.json` (если есть) — их формирует платформа.
- Методы SDK сверять с `vendor/@manygamescorp/*/dist/*.d.ts` и README пакетов.
- Id записей сервисов — только из `src/boot/ids.ts`; числа (цены, награды, уровни) — только из записей.
- Окна игры — только `ctx.window.open`, слой поверх экрана — `ctx.overlay`; своей вёрстки
  модальных окон и затемнений в `src/screens/` нет ([рецепт](docs/platform/recipes/game-windows.md)).
- Видимый текст — только по ключам (`ctx.t(key)`); текст ключа — в одном месте:
  часть записи `localization/strings`, `configs/remote/localization/strings/<часть>.json`
  (`npm run strings` склеивает `strings.json`; ключи проверяет `tests/strings.test.mjs`).
- Записи `configs/remote/` перед записью в сервисы — `npm run records` (схемы сервера — в `schemas/`,
  [configs.md](docs/platform/services/configs.md#проверка-до-записи)).
- Картинки `assets/`: рисовать только 2x — `<имя>-2x.png` (или `.webp`, `.jpg`), обе стороны чётные.
  Файл 1x (`<имя>.png`) руками не создавать и не править: один раз после добавления картинок —
  `npm run assets` (ореол цвета-ключа на прозрачных краях — `npm run assets -- --defringe <файлы>`).
  Пара обязательна в `assets/images/`, `assets/game/`, `assets/ui/`; в `assets/skin/` картинка может
  быть одним файлом. Неверную пару называет `npm run check`.
- Секреты в репозиторий не класть.
- Обвязку (`src/main.ts`, `src/assets.ts`, `src/boot/`, `src/shell/`) не менять: всё, что меняет
  игра, — в `src/modules/game/`, `src/screens/`, `assets/`, `configs/remote/`.
- Перед сдачей: `npm run check` (ниже) — один раз, всё зелёное.

## Проверки: группами, а не после каждой правки
- Сначала сделать все правки задачи (или одной её независимой части), потом проверить один раз.
  Проверка после каждой мелкой правки — потерянное время.
- Полная проверка — одна команда: `PLAYWRIGHT=<путь к playwright> [SKIN_STRICT=1] npm run check`.
  Одна сборка, на ней все тесты, записи `configs/remote/` и галерея всех видов во всех размерах.
  На первой ошибке не останавливается: в конце — все проваленные части разом.
- Запускать её один раз, когда правки закончены. Исправить **всё**, что она назвала, одним заходом и
  запустить ещё раз. Не чинить по одной ошибке с полным прогоном после каждой.
- `npm run check:fast` (секунды: типы, бандл, тесты без сборок; `-- --only "<часть имени теста>"`) —
  изредка, чтобы убедиться посреди большой правки, что ничего не сломано. Не ритуал после каждой
  правки и не сдача.
- Посмотреть экран — один снимок, а не все экраны во всех размерах:
  `PLAYWRIGHT=<путь> npm run shot -- --route <маршрут> --size 844x390` (`--level <n>`; `--watch`
  держит браузер и переснимает сам после правок). Окно кита —
  `node tests/skin-gallery.mjs --only <вид> --size 844x390`.
- Сдача — только зелёный `npm run check` с `PLAYWRIGHT` (без него галерея пропущена, и команда это
  пишет). Запуск на стенде (`tests/browser-startup.mjs`) — отдельно, один раз в конце.

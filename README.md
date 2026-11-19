# ManyPlay Starter

Шаблон игры для платформы ManyPlay. Игры в нём нет: кнопка «Play» открывает заглушку
«Game template» с кнопкой «Close». Всё остальное — готовая обвязка платформы: запуск SDK,
топбар, HUD, нижнее меню, окна сервисов (магазин, ежедневные награды, лидерборд, профиль,
настройки), локализация, аналитика, облачное сохранение, уровни и прогресс с проверкой
конца уровня сервером и выдачей награды.

## Сборка и запуск
```sh
npm install
node scripts/typecheck.mjs
npm run build          # dist/index.html
npm run test:unit
npm run check          # всё сразу одной командой: сборка, все тесты, записи, галерея (с PLAYWRIGHT)
npm run check:fast     # изредка посреди правок: типы, бандл, быстрые тесты — секунды
```
Сборка: `tsc` проверяет типы, esbuild склеивает код игры в `dist/app/main.js` (и `start.js` —
запуск SDK) с общими кусками `chunk-<хэш>.js`, минифицирует, карты кладёт рядом в `.map` (в
опубликованную сборку они не попадают); `.css` из `src/` и `index.html` минифицируются, `assets/`
копируется как есть, пакеты SDK — через import map из `vendor/`, в бандл не входят. Код после
сборки работает из `dist/app/`: путь в `new URL('…', import.meta.url)` пишется от `dist/app/`
(как от `src/`), например `./skin/theme.css`, `../assets/`.

Локально: раздать `dist/` статическим сервером (`python3 -m http.server 8080 -d dist`) и
открыть http://localhost:8080. SDK берётся из `vendor/@manygamescorp/`, настройки приложения —
из `platform.json`. Без `vendor/` сборка проходит, а страница сообщает, что SDK не установлен.

Проверка типов — `node scripts/typecheck.mjs`, по тому же правилу, что и сборка
(`scripts/sdk.mjs`): при SDK в `platform.json`, `package.json` или `vendor/` — весь `src/`, экраны
тоже, по типам SDK (`tsconfig.sdk.json`); без SDK — вход и `src/modules/game/` (`tsconfig.json`).
`npm run build` проверяет то же самое, всегда целиком. `scripts/typecheck.mjs` (и `npm run typecheck`)
— инкрементально: после мелкой правки перепроверяется только затронутое, кэш — `.cache/typecheck/`
(не в git; удалить каталог — проверить с нуля).

Проверки — группами: сначала все правки задачи, потом одна проверка. `npm run check` — полная, одной
командой: сборка (один раз), на ней все тесты, записи `configs/remote/` и, если задан `PLAYWRIGHT`,
галерея всех видов во всех размерах (`SKIN_STRICT=1` — строгая); на первой ошибке не останавливается
и в конце печатает все проваленные части разом — их чинят одним заходом и запускают ещё раз.
`npm run check:fast` — изредка посреди правок: типы, бандл в `dist/` без повторной проверки типов и
тесты `tests/*.test.mjs` (без сборок копий проекта и без браузера); `-- --only "<часть имени>"` —
только подходящие тесты. Снимок одного экрана — `npm run shot -- --route game --size 844x390`
([tests/README.md](tests/README.md)).

## Заглушка и обвязка
| Часть | Файлы | Что делать |
|---|---|---|
| Заглушка игры | `src/screens/game.ts`, `src/screens/home.ts`, `configs/remote/localization/strings/screens.json`, `src/screens/ui.ts` | заменить целиком |
| Шов игры | `src/modules/game/index.ts` — `GamePorts` и модуль игры | дописать: правила и цикл уровня игры, её API модуля |
| Маршруты экранов | `src/screens/index.ts` (`Route`, `ScreenContext`, таблица экранов, `GAMEPLAY` — экраны без HUD и меню, `MENU` — нижнее меню, по умолчанию пустое: панели нет; `HUD` — плитки HUD, `TOP_BAR` — счётчики топбара; `ORIENTATION` — ориентация игры, по умолчанию `any`) | дополнить своими экранами, плитками ([рецепт](docs/platform/recipes/add-a-hud-entry.md)); объявить ориентацию по жанру ([рецепт](docs/platform/recipes/orientation.md)) |
| Вид игры | `src/skin/`: перекрас — только `theme.css`; общий лист и листы окон — `sheets.ts`; картинки, шрифты и фон сцены (`scene`) — `art.ts` ([фон и панели](docs/platform/recipes/custom-window-skin.md#фон-сцены-и-панели)) | заполнить, если нужен свой вид |
| Картинки и звук | `assets/images/`, `assets/audio/`, `assets/skin/`; URL — `assetUrl` (`src/assets.ts`); рисовать только `<имя>-2x.png`, файл 1x делает `npm run assets` ([рецепт](docs/platform/recipes/add-art-and-sound.md)) | добавить свои |
| Готовые сервисы уровня | `src/boot/game-ports.ts` | не трогать; заглушка их не вызывает |
| Обвязка платформы | `src/main.ts`, `src/assets.ts`, остальное в `src/boot/`, `src/shell/` (`stock-colors.ts` — только `node scripts/stock-colors.mjs`) | не трогать |
| Записи сервисов | `configs/remote/` | менять числа и тексты; `ui.windows/` — что открывают плитки (свои плитки добавляют свои триггеры), `ui.hud/` — пусто: состав HUD задаёт `HUD` |
| Файлы платформы | `platform.json`, `package.json`, `.npmrc`, `vendor/**` (lock-файла нет: состав SDK задаёт `platform.json`) | не трогать |

`ctx.game` на экранах — готовые сервисы уровня (`GamePorts`): текущий уровень, данные уровня из
записи (`level(n)`), начало попытки с сидом сервера, конец уровня с проверкой сервером
(`verified`, `stars` сразу по ответу; награду показывает окно награды, когда она приходит),
облачное сохранение по желанию игры, аналитика. Они работают, но заглушка их не вызывает — это
делает настоящая игра. Сеть — без опросов: прогресс читается один раз при запуске, выдачи
приходят событиями модуля `realtime` ([network.md](docs/platform/services/network.md)).

`ctx.window.open` — окна самой игры (результат, пауза, поражение, подтверждение) окнами кита в
скине игры, с затемнением на весь экран; `ctx.overlay` — слой поверх всего экрана (обучение,
вуаль). Своей вёрстки модальных окон на экранах нет
([recipes/game-windows.md](docs/platform/recipes/game-windows.md)).

`ORIENTATION` (`src/screens/index.ts`) — ориентация, под которую сделана игра; её применяет SDK
(экран «Поверните устройство» на телефоне в другой ориентации), `ctx.onSuspend` ставит уровень на
паузу — на это время и пока вкладка в фоне. SDK 1.0.0-rc.30 ориентацию ещё не применяет
([recipes/orientation.md](docs/platform/recipes/orientation.md)).

Ограничения платформы, которые игра учитывает:
- монеты только копятся: ключ приложения не публикует стартовый баланс и правила обмена
  ([inventory-and-currency.md](docs/platform/services/inventory-and-currency.md));
- все тексты, и название игры (`shell.title`), — в одной записи `localization/strings`, частями в
  `configs/remote/localization/strings/` ([localization.md](docs/platform/services/localization.md)).

## Порядок замены
1. Правила и состояние игры — в `src/modules/game/` (чистые функции, без SDK и DOM).
2. Цикл уровня поверх `GamePorts`: `currentLevel` → `level(n)` (числа уровня) → `beginAttempt`
   (сид) → ходы → `endLevel` (сервер проверяет результат, окно результата — по ответу, через
   `ctx.window.open`; награду сервер выдаёт сам, её показывает окно награды — после окна результата,
   [recipes/game-windows.md](docs/platform/recipes/game-windows.md)). Перезагрузка посреди уровня начинает его
   заново; продолжение уровня — только если игре это нужно, через `save`/`loadSave` в редкие
   моменты (пауза, выход).
3. Экраны вместо `src/screens/game.ts` и `home.ts`; новые маршруты — в `src/screens/index.ts`,
   игровые (без HUD и меню) — в `GAMEPLAY` там же. `src/shell/` не меняется.
4. Тексты — части записи `localization/strings` в `configs/remote/localization/strings/`
   (`npm run strings` склеивает файл для заливки); название игры — `shell.title` там же.
5. Уровни и награды — записи `levels.main/*` и `progress/progress_main`
   ([docs/platform/services/progress-and-levels.md](docs/platform/services/progress-and-levels.md)),
   публикация — [docs/platform/services/configs.md](docs/platform/services/configs.md).
6. Картинки и звук — [recipes/add-art-and-sound.md](docs/platform/recipes/add-art-and-sound.md),
   свой вид окон — [recipes/custom-window-skin.md](docs/platform/recipes/custom-window-skin.md).

Что где читать — [AGENTS.md](AGENTS.md).

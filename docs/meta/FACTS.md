# Iron Burrow — факты для меты

Дата сбора: 24.11.2026. Здесь только то, что подтверждено файлами проекта или наблюдением опубликованной сборки. Если факта нет, он помечен как «не подтверждено».
Сырые ответы инструментов лежат в `docs/meta/current/` (`apps.info.json`, `apps.catalog.get.json`, `projects.qa.current.json`, `mcp.session.get.json`; ошибки: `apps.metadata.get.error.json`, `apps.portal.readiness.error.json`, `portal.game.meta.*.unavailable.json`), наблюдение сборки — в `docs/meta/current/build-observation/OBSERVATION.md` (там же снимки).

## 1. Название и код
| Факт | Значение | Источник |
|---|---|---|
| Название | **Iron Burrow** | `apps.info.appName`, `apps.catalog.get.appName`; строка `shell.title` в `configs/remote/localization/strings.json`; заголовок лобби в сборке |
| Код приложения | `iron-burrow` | `mcp.session.get.appCode` |
| appId | 360 | `mcp.session.get`, `platform.json` |
| Окружение ключа | test | `mcp.session.get.env` |
| Версия в сборке | 1.0.1 (строка в окне паузы) | наблюдение сборки |

## 2. Жанр (из допустимых значений)
- **Портал** `genre`: **`arcade`**. Схема `apps.metadata.update` допускает только word-games, solitaire, board-games, puzzles, arcade, card-games, mahjong, quiz, learning, brain-games, tools. В ГДД жанр — «arcade (maze shooter / base defence)» (`docs/gdd/00_MASTER.md` §2), поэтому выбран `arcade`.
- **Сторы** `common.category`: **`GAME_ARCADE`**. Это тот же жанр ГДД. Альтернатива `GAME_ACTION` возможна, но ГДД прямо называет жанр arcade.
- Поджанр для текстов: top-down maze tank shooter / base defence, 2D.

## 3. Суть и основной цикл
- **Суть.** Аркада с видом сверху. Игрок ведёт железный бур-танк Burrower по подземному лабиринту из кирпича и стали и защищает Burrow Core внизу карты от 20 вражеских танков-жуков Rustbugs. Выстрелы разрушают кирпич по четвертинкам, так что лабиринт меняется прямо в бою. Одно попадание в Core означает поражение. Источники: `docs/GAME_BRIEF.md`, `docs/gdd/00_MASTER.md` §1, §5; в сборке цель стадии сформулирована так: «Destroy 20 Rustbugs. Protect the Core!».
- **Цикл.** Lobby → карта кампании → окно перед стадией (можно взять Spare Hull, +1 жизнь) → стадия: уничтожить 20 Rustbugs и сохранить Core → Stage Clear (звёзды, очки, бустер-награда) → следующая стадия. При поражении — окно Defeat: продолжить за Spare Hull, купить набор или переиграть. Источник: `00_MASTER.md` §4; в сборке подтверждены шаги lobby → map → prestage → game.
- Длина стадии 90–180 с, сессия 6–15 мин (ГДД, это цель дизайна, а не замер).
- Подборы на поле от мигающих врагов: star (уровень пушки), bubble, rebar, quake, freeze, hull (`00_MASTER.md` §5).
- Рекламы нет совсем (`GAME_BRIEF.md`, `services-matrix`; модуля ads в `platform.json` нет).

## 4. Режимы и мета
| Элемент | Факт | Источник |
|---|---|---|
| Кампания | 30 стадий в 3 главах: Clay Tunnels (1–10), The Iron Works (открывается после 10), Magma Depths (после 20); до 3 звёзд за стадию, всего 90 | `configs/remote/levels.main/*` (r_0001–0030); в сборке карта и счётчик «0/90» |
| Siege | бесконечный режим, открывается после стадии 5 | `00_MASTER.md` §4, `configs/remote/levels.endless`; в сборке подпись «Clear stage 5 to unlock» |
| Рейтинг | лидерборды `siege_best` (лучший счёт Siege), `campaign_score`, `leaderboard_weekly`; в ГДД доска Siege недельная | `configs/remote/leaderboards/*.json`; в сборке кнопка Leaderboards |
| Ежедневные награды | цикл 7 дней, модуль daily-rewards | `platform.json` (cycleLength 7); в сборке кнопка Daily rewards |
| Бустеры | Bubble Shield, Shockwave, Steel Fortress, Spare Hull; новичок получает по 2 каждого | `00_MASTER.md` §6; в сборке окно «Welcome, Burrower!» |
| Магазин | наборы бустеров за реальные деньги: Starter Crate $0.99 (разово), Hull Pack $1.99, Field Kit $4.99, Heavy Arsenal $9.99, Commander Cache $19.99 | `configs/remote/game.iap_packs/main.json`, `GAME_BRIEF.md`; в сборке кнопка Shop. **Оплата не подключена**: 409 `IAP_PROVIDER_UNAVAILABLE` (D-PUB-06), так что цены в мету не выносить |
| Валюта | в MVP нет | `GAME_BRIEF.md` |
| Настройки | Music, Sound, Reduce Motion; на тач-устройстве ещё Vibration | наблюдение сборки |

## 5. Управление (по факту сборки)
| Действие | Клавиатура (`pointer: fine`) | Тач (`pointer: coarse`) | Источник |
|---|---|---|---|
| Движение | стрелки или WASD | плавающий виртуальный стик, 4 направления | код `src/screens/controls.ts`; в сборке ArrowUp и KeyA двигали танк, на тач-устройстве виден `stick` и подсказка «Drag the stick to drive» |
| Огонь | Space или J (удержание) | кнопка FIRE (удержание) | код `controls.ts`; в сборке подсказка «Press Space or J to fire» и кнопка `fire` на тач-устройстве |
| Бустеры | 1 / 2 / 3 (и Numpad 1–3) | кнопки бустеров на HUD | код `controls.ts`; в сборке Digit1 включил Bubble Shield («Shield On!», счётчик 3→2) |
| Пауза | Esc или P | кнопка паузы в HUD | код `controls.ts`; в сборке Esc и P открыли окно Paused |
| Spare Hull | выбирается в окне перед стадией или в окне Defeat | то же | `00_MASTER.md` §6; в сборке переключатель в окне перед стадией |
- Схема зависит от устройства ввода, а не от ориентации. На гибридных устройствах работают обе (D-20-01, `docs/gdd/20_ui_ux_screens_texts.md`).
- Мышью стрелять и двигаться нельзя: на desktop мышь нажимает только кнопки интерфейса (по коду; в сборке не опровергнуто).

## 6. Языки, на которых игра реально показывает тексты
- **Только английский (en).** Источники:
  - `configs/remote/localization/locales.json`: `defaultLocale: en`, единственная локаль en;
  - все части `configs/remote/localization/strings/*.json` и `strings.json` содержат только ветку `en`;
  - в сборке при локали браузера ru-RU и de-DE все тексты остаются английскими, `<html lang="en">`.
- Строки ядра SDK `vendor/@manygamescorp/core/dist/locales/ru.json` относятся к самому SDK, а не к текстам игры. Считать игру русифицированной на их основании нельзя.
- Значит, `common.locales` меты = `["en"]`, `primary = en`. Тексты меты на ru и других языках — это перевод страницы, а не язык игры: страница не должна обещать русский интерфейс.

## 7. Устройства и ориентации
- Платформа — только web, браузер на desktop и телефоне (`platform.json`: `platform: web`, `store: web`; `GAME_BRIEF.md`). Android и iOS-сборок нет (`project.json` bundleIds = null).
- Ориентация `any` (`platform.json`). ГДД: portrait 390×844, landscape 844×390, desktop 1440×900 равноправны, `orientation_fixed=false` (`00_MASTER.md` §2).
- Проверено в сборке:
  - desktop 1440×900 — `data-layout=desktop`, клавиатура;
  - телефон 390×844 portrait — `data-layout=portrait`, стик и FIRE;
  - поворот в 844×390 — `data-layout=landscape`, стик и FIRE на месте, игра встаёт на паузу.
- Планшеты отдельно не проверялись. По правилу раскладки (`20_ui_ux_screens_texts.md`: aspect < 0.8 → portrait, ширина < 1024 → landscape, иначе desktop) они попадают в одну из этих трёх раскладок. В мете писать «desktop и mobile browser», без отдельного обещания про планшеты.
- Нужен интернет (`online: true`, `00_MASTER.md` §2).

## 8. Разработчик
- **ManyPlay.** Полную мету (`apps.metadata.get`) прочитать не удалось (см. §10), а в `apps.info` и `apps.catalog.get` поля разработчика нет. Поэтому по правилу цели берётся значение по умолчанию. Контакт, сайт и privacyUrl не подтверждены.

## 9. Опубликована ли игра
- **Published build в QA есть**: `projects.qa.current.current` — buildId `6b05cdbe56ec4bd18df123c6`, https://qa.manyplay.fun/iron-burrow/, 2026-11-24T17:52:49Z, операция `done`. Предыдущая публикация — `6aff61d02b51c60526635b76`.
- **В каталоге сети не опубликована и не показывается**: `apps.catalog.get` — `networkCatalog.published=false`, `test=true`, `listed=false`, `publicationState=ready`, `status=active`, `storeLinks={}`.
- Что это значит для пути сохранения: published build для скриншотов есть, но это сборка test-окружения. Скриншоты и обложки портала загружаются как `portal-cover`/`portal-screenshot` (dev/test) через `assets.upload.*` и записываются в мету через `apps.metadata.update` (`covers`, `screenshots`). Ссылки web в `storeLinks` пока нет.

## 10. Текущая мета: что заполнено, что пусто, что неверно
Удалось прочитать только `apps.info` (version 1) и `apps.catalog.get` (version 1). Повторное чтение 24.11.2026 18:23Z дало те же ошибки, что и первое в 18:03Z:
- **`apps.metadata.get` → 401 `MCP_UPSTREAM_KEY_REJECTED`**, 2 попытки, rid не вернулся. Ключ приложения в этом прогоне истёк, отозван или выдан для другого окружения. Ответ в `current/apps.metadata.get.error.json`.
- **`apps.portal.readiness` → `NOT_FOUND`** («resource — not found», upstream panel), 2 попытки, rid `faa87f70-…`, `f3f3b322-…`. Схема инструмента не принимает параметров, поэтому передать ресурс нельзя. Ответ в `current/apps.portal.readiness.error.json`.
- `portal.game.meta.get` и `portal.game.meta.candidates` в MCP нет.

Поэтому состояние портальной меты (SEO, FAQ, гайды, обложки, скриншоты, жанр, похожие игры) не прочитано. **Это блокер MF-2.** Нужно перевыпустить или проверить ключ приложения в Studio и повторить чтение. Писать мету вслепую поверх version 1 нельзя.

| Поле | Состояние | Источник |
|---|---|---|
| appName | заполнено: «Iron Burrow», верно | apps.info, apps.catalog.get |
| metadata version | 1, то есть меты, скорее всего, почти не касались; это вывод, а не факт | apps.info |
| common.icon512 | **пусто (null)** | apps.info, apps.catalog.get |
| storeLinks (web/googlePlay/appStore) | **пусто ({})** | apps.catalog.get |
| networkCatalog.published / listed | false / false | apps.catalog.get |
| common.name/loc/locales/primary/category/contact/privacyUrl/targetAudience | **не прочитано** (401) | — |
| portal.locales (slug/h1/title/description/body/faq), variants how-to-play/tips | **не прочитано** | — |
| covers, screenshots, genre | **не прочитано** | — |
| android/ios | не прочитано; нативных сборок у игры нет | — |
| похожие игры (candidates) | **инструмента нет** | — |
| `project.json` metadataRevision/appId/name | пусто (null) в проекте — это локальная запись, не мета сервиса | `project.json` |

Неверного в прочитанной части не найдено. Ожидаемые значения для заполнения: genre `arcade`, category `GAME_ARCADE`, locales `["en"]`, primary `en`, android.containsAds — не применимо (только web), реклама — нет.

## 11. Ограничения для текстов и скриншотов меты
- Нельзя упоминать название референсной аркады 80-х, её издателя и консольные бренды (список запретных слов из `00_MASTER.md`).
- Нельзя обещать языки, кроме английского, а также мультиплеер, офлайн-игру и внутриигровую валюту. Нельзя писать про «отключение рекламы за покупку»: рекламы в игре нет вообще.
- Цены не выносить, пока не подключена оплата (D-PUB-06).
- На скриншотах test-сборки видны кнопки «QA: Win / QA: Lose», а верхняя полоса бустеров показывает 0. Такие кадры нужно кадрировать или снимать кадры без них.

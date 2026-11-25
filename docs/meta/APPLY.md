# APPLY — мета Iron Burrow (gameId 360), 25.11.2026, третий проход

## Итог: НЕ СОХРАНЕНО. Блокер платформы: загрузка обложки

| Acceptance | Статус |
|---|---|
| MM-1 apps.metadata.update не в dryRun, version выросла, 5 языков | **Не выполнено.** Тексты прошли проверку панели, но запись отклонена: `covers` — «Covers are required with portal metadata». Версия меты осталась 1 → 1 |
| MM-2 обложка и ≥4 скриншота с HTTPS из assets.upload, 200 image/* | **Не выполнено.** `assets.upload.begin` отвечает `NOT_FOUND` (field `resource`, upstream `panel`) на portal-cover и portal-screenshot. Адресов нет, проверять кодом ответа нечего |
| MM-3 иконка есть; readiness без блокеров или блокеры названы | **Иконка есть** (была до шага). **Readiness прочитать нельзя:** `apps.portal.readiness` → `NOT_FOUND` (field `resource`, upstream `panel`, rid `b852740f-8036-4f64-b47b-f3c6929c5f53`) |

## Цепочка сохранения (apps.metadata.update, version 1, dryRun)
| # | Ответ | Что исправлено в docs/meta/patch.json |
|---|---|---|
| 1 | 422 `PNL_METADATA_INVALID` `portal.variants`: expected array (rid `c874baa3-29a6-414f-95da-b6a65f83c979`) | добавлено `portal.variants: []` (D-MT-15) |
| 2 | 422 `portal.locales.{en,de,es,fr,ru}.body`: «Use 200-400 words» (было 479–660 слов; rid `f0568394-861b-4823-98e9-2cad54a05b29`) | тела сокращены до 343–357 слов (D-MT-16) |
| 3 | 422 `covers`: «Covers are required with portal metadata» (rid `061d3c4b-418c-4879-af34-bd8d4d047172`) | **исправить нельзя**: обложку не загрузить (см. ниже) |

Запись с `dryRun:false` не выполнялась. Версия меты до = 1, после = 1. Ответы лежат в `docs/meta/current/`: `apps.metadata.get.before-update.json` и `apps.metadata.update.dryrun.error.json`.

## Что готово к сохранению (patch.json, собирается `node docs/meta/build-patch.mjs`)
- `common.locales` = en, de, es, fr, ru, `primary` en, `category` GAME_ARCADE, `genre` arcade.
- По каждому языку — en, de, es, fr, ru (`docs/meta/locales/<loc>.json`):
  - название, `common.loc.<loc>.description` (полное описание);
  - короткое описание в `android.loc.<loc>.short`, другого поля для него в схеме нет;
  - страница портала: slug, h1, seoTitle с « | ManyPlay» (41–51 символ), seoDescription (132–155), тело (343–357 слов), FAQ из 3 вопросов;
  - управление: абзац тела и вопрос FAQ;
  - alt для обложки и пяти скриншотов.
- Проверка `build-patch.mjs` (лимиты, запретные слова, уникальность slug) проходит без нарушений.

| язык | slug |
|---|---|
| en | iron-burrow-tank-maze-defense |
| de | iron-burrow-panzer-arcade-labyrinth |
| es | iron-burrow-defiende-el-nucleo |
| fr | iron-burrow-jeu-arcade-defense-de-base |
| ru | iron-burrow-tanki-v-podzemnom-labirinte |

## Картинки
Подготовлены во временном каталоге пода `/tmp/metashots/upload/`, в проект не коммитились:
| файл | источник | размер |
|---|---|---|
| cover-16x9.png | assets/meta/cover-16x9.png (готовый арт) | 1920×1080, 1,55 МиБ |
| shot-1-lobby.png | docs/game/look/1440x900-03-lobby.png | 1440×900 |
| shot-2-battle.png | снят headless Chromium в опубликованной сборке (stage 1, Rustbugs на поле) | 1440×900 |
| shot-3-campaign-map.png | docs/game/shots/1440x900-12-stagemap.png | 1440×900 |
| shot-4-shop.png | docs/game/look/1440x900-09-shop.png | 1440×900 |
| shot-5-stage-clear.png | docs/game/look/1440x900-23-win-level2.png | 1440×900 |

Загрузка: `assets.upload.begin {kind, bytes, sha256}` отвечает `NOT_FOUND` «resource — not found» (upstream panel) для обоих типов. rid: cover `5bca4230-535c-48aa-a7d1-71da929af321`, `fa7180f5-719a-468a-af49-217fea10a9c8`; скриншоты `5ccc3289-…`, `5ecdede1-…`, `1fe45d31-…`, `6f61aa89-…`, `2e907c3f-…`, `c8da61d5-7dd2-4368-ba20-9be141c5217f`. Параметра `resource` в схеме инструмента нет. Подробности — в `current/assets.upload.error.json`.
Адресов нет, поэтому коды ответа не проверялись.

На кадрах боя и Stage Clear видны отладочные кнопки «QA: Win / QA: Lose» сборки QA. Для портала лучше переснять кадры в сборке без них.

## Иконка
У приложения иконка уже была: `assets/icons/48999546d96c77162c3cf2c47a8836ef1ba4b95f919f8f208718ae2a90361051.png` (apps.info). Её по ошибке заменили на `assets/icons/app-icon.png` (version 5 → 6) и сразу вернули обратно (6 → 7), см. `current/apps.icon.update.json` и `apps.icon.restore.json`.
Расхождение на стороне платформы: apps.info показывает icon512, а в apps.metadata.get его нет, и в readiness gp/ios `common.icon512` числится отсутствующим.

## Readiness
`apps.portal.readiness` → `NOT_FOUND`, rid `b852740f-8036-4f64-b47b-f3c6929c5f53` (`current/apps.portal.readiness.before.json`). Судя по описанию инструмента, нужен включённый portal environment manifest и приёмник panel#2663. Известные блокеры по существу:
1. нет обложки (загрузка недоступна);
2. нет скриншотов (то же);
3. нет описания и SEO, потому что мета не сохранена из-за п.1.
Readiness сторов из apps.metadata.get: gp и ios — `draft`.

## Что нужно, чтобы закончить
Платформе — включить приём `assets.upload.begin` для portal-cover и portal-screenshot у app 360 в test (rid выше) и, по возможности, `apps.portal.readiness`. После этого:
1. svc-assets загружает 6 файлов из `/tmp/metashots/upload/` (если под пересоздан — те же источники из таблицы, кадр боя переснять) и пишет `docs/meta/current/assets.upload.json`;
2. `node docs/meta/build-patch.mjs` сам добавит covers и screenshots с alt на 5 языках;
3. apps.metadata.update: сначала dryRun, затем запись с version 1.

## Поля без инструмента в MCP (заполнить в Studio)
- **Похожие игры:** аркадные шутеры с видом сверху и защитой базы, а также аркады-лабиринты из каталога ManyPlay. Конкретных id в проекте нет, выбрать в каталоге.
- **Разработчик:** ManyPlay (D-META-03).
- **Устройства:** браузер на компьютере и на телефоне; ориентации portrait, landscape и desktop; нужен интернет. Управление: клавиатура (стрелки/WASD, Space/J, 1–3, Esc/P) и тач (стик, кнопка FIRE).

# APPLY — мета Iron Burrow (gameId 360), 25.11.2026, повтор (раунд 1)

## Итог
Тексты сторов на пяти языках **сохранены**: version меты **1 → 2**. Страницы портала, обложка и скриншоты **не сохранены**, потому что платформа не принимает картинки портала для app 360: `NOT_FOUND`, upstream panel, отвечает и на valid PNG, и на загрузку через base64. А без обложки панель не принимает блок `portal` (422 covers). Иконка есть, её не трогали. Readiness портала прочитать нельзя: `NOT_FOUND`.

| Acceptance | Статус |
|---|---|
| MM-1 запись не dryRun, version выросла, все языки | **Частично.** Запись прошла, version 1 → 2, языки en, de, es, fr, ru: название, полное и короткое описание, category, genre. Поля страницы портала (slug, h1, seoTitle, seoDescription, body, FAQ) готовы в `patch.full.json` и проходят валидацию панели. Единственная ошибка — `covers` required. На платформу их записать нельзя, пока не работает загрузка обложки |
| MM-2 обложка + ≥4 скриншота, HTTPS из assets.upload, 200 image/* | **Не выполнено (блокер платформы).** Все пути загрузки отвечают `NOT_FOUND` еще до проверки файла, rid ниже. Адресов нет, коды ответа проверить нечем |
| MM-3 иконка есть; readiness без блокеров или блокеры названы | **Иконка есть** (была до шага). `apps.portal.readiness` → `NOT_FOUND`, rid `2e0b64e7-5316-4cb9-9d1d-1c21d7ed4809`. Блокеры названы ниже |

## Сохранение (apps.metadata.update)
| # | Вызов | Ответ | rid / файл |
|---|---|---|---|
| 1 | apps.metadata.get | version 1, в мете только `common.locales:["en"]` | `current/apps.metadata.get.round2-before.json` |
| 2 | update dryRun, version 1, `docs/meta/patch.json` как есть (common, android, genre) | ок, без ошибок | `current/apps.metadata.update.round2-dryrun.json` |
| 3 | update **dryRun:false**, version 1 (If-Match), тот же патч | ответ `UPSTREAM_UNAVAILABLE` (projects 503). Чтение обратно показало, что запись применилась: **version 2**, все значения патча совпали. Повтор не делали | rid `8d868423-6f1e-4512-b78c-95bf92210220`; `current/apps.metadata.update.round2-save.json`, `current/apps.metadata.get.round2-after.json` |
| 4 | update dryRun, version 2, `docs/meta/patch.full.json` (с portal, без covers) | 422 `PNL_METADATA_INVALID`: `covers` — «Covers are required with portal metadata». Других замечаний нет: тексты портала валидны | rid `d5b2a161-31b4-4d41-82bb-ff0963f8fcb8`; `current/apps.metadata.update.round2-full-dryrun.json` |

**Version до = 1, после = 2.**

Сохранено на платформе (по чтению обратно):
- `common.locales` = en, de, es, fr, ru; `primary` en; `category` GAME_ARCADE; `genre` arcade.
- `common.name.<loc>` = «Iron Burrow» для всех пяти.
- `common.loc.<loc>.description`: en 1948, de 1304, es 1831, fr 1939, ru 1405 символов.
- `android.loc.<loc>.short` — короткое описание для всех пяти.

Готово, но не сохранено (`patch.full.json` = полный патч; собирается `node docs/meta/build-patch.mjs`):
| язык | slug | seoTitle, симв. | seoDescription, симв. | body, слов | FAQ |
|---|---|---|---|---|---|
| en | iron-burrow-tank-maze-defense | 41 | 140 | 357 | 3 |
| de | iron-burrow-panzer-arcade-labyrinth | 48 | 146 | 344 | 3 |
| es | iron-burrow-defiende-el-nucleo | 49 | 155 | 343 | 3 |
| fr | iron-burrow-jeu-arcade-defense-de-base | 49 | 148 | 343 | 3 |
| ru | iron-burrow-tanki-v-podzemnom-labirinte | 51 | 132 | 348 | 3 |
Управление описано в абзаце тела и в одном вопросе FAQ. Alt для обложки и пяти скриншотов есть на всех языках.

## Картинки
Файлы лежат во временном каталоге пода `/tmp/metashots/upload/`, в проект не коммитились:
| файл | источник | sha256 (начало) |
|---|---|---|
| cover-16x9.png 1920×1080, 1,55 МиБ | assets/meta/cover-16x9.png (готовый арт) | 0f00b8ec |
| shot-1-lobby.png 1440×900 | docs/game/look/1440x900-03-lobby.png | a3bd3d57 |
| shot-2-battle.png 1440×900 | **переснят**: опубликованная сборка, headless Chromium, stage 1, бой с Rustbugs; кнопки «QA: Win/Lose» скрыты на время снимка | cb562edd |
| shot-3-campaign-map.png 1440×900 | docs/game/shots/1440x900-12-stagemap.png | 0811b1b5 |
| shot-4-shop.png 1440×900 | docs/game/look/1440x900-09-shop.png | def2786d |
| shot-5-stage-clear.png 1440×900 | docs/game/look/1440x900-23-win-level2.png. Затемнённые кнопки QA за окном заменены тем же фоном игры из чистого кадра, затемнение подогнано по соседним пикселям (D-MT-22) | ce68043e |

Попытки загрузки, все с ответом `NOT_FOUND` «resource — not found», details.field `resource`, upstream `panel`:
| путь | kind | файл | rid |
|---|---|---|---|
| assets.upload.begin | portal-screenshot | shot-4-shop.png (485 460 Б) | 6d8b3519-cdbb-4071-9044-916f903c72bc |
| assets.upload (base64) | portal-screenshot | **valid PNG 256×256, 569 Б**, sha256 сверен после декодирования | ea31ce53-72f4-44c1-9051-8951fdd61418 |
| assets.upload (base64) | portal-cover | тот же valid PNG | c7912211-96b1-4a0a-83c2-ceafdd47f43a |
| assets.upload.begin | portal-screenshot | тот же valid PNG | 72b5a223-1043-4cd4-9e5d-a730ffbdf0e5 |
| assets.upload (base64) | portal-cover | cover-16x9.png (проба) | 786e9df8-3b28-4416-a9eb-24ce36c5f6b5 |
| для сравнения: assets.upload | config-asset | та же проба | ответ `VALIDATION_FAILED`, то есть маршрут доходит до проверки файла (f0e61cc0-f4e8-4c01-9cb1-9d26bea47590) |

Вывод: ошибка зависит от kind, а не от файла и способа загрузки. У панели нет ресурса для portal-ассетов app 360 в test, или ключ к нему не имеет доступа. У инструментов нет параметра `resource`. Подробности — в `current/assets.upload.partial1.json` и `current/assets.upload.probe-valid.json`.
Адресов нет, поэтому HTTP-кодов тоже нет.

## Иконка
Иконка уже была до шага, её не трогали. `apps.info` показывает `common.icon512 = assets/icons/48999546d96c77162c3cf2c47a8836ef1ba4b95f919f8f208718ae2a90361051.png` (`current/apps.info.round2.json`). При этом `apps.metadata.get` не показывает icon512, и в readiness gp/ios `common.icon512` значится отсутствующим. Это расхождение между двумя источниками на стороне платформы.

## Readiness
`apps.portal.readiness` → `NOT_FOUND` (upstream panel), rid `2e0b64e7-5316-4cb9-9d1d-1c21d7ed4809` (`current/apps.portal.readiness.round2.json`). По описанию инструмента ему нужны portal environment manifest и приемник panel#2663.
Блокеры портала по существу:
1. **cover** — нет: платформа не принимает загрузку portal-cover (rid выше).
2. **screenshots** — нет по той же причине (portal-screenshot).
3. **portal SEO и тело страницы** — не сохранены: панель не принимает `portal` без covers (rid `d5b2a161-…`). Тексты готовы.
4. **published / test=false** — приложение в test, публикация портала вне этого шага.
Есть: icon (по apps.info), genre arcade, описание на пяти языках.

Readiness сторов из ответа update (status `draft` у gp и ios) — это поля вне шага портала: dataSafety, IARC, containsAds, targetAudience, privacyUrl, contact.email, phone-скриншоты, iOS keywords/supportUrl/copyright, а также icon512 из-за расхождения выше.

## Что сделать после починки платформы
1. svc-assets: `assets.upload.begin → PUT → complete` для 6 файлов из `/tmp/metashots/upload/`. Если под пересоздан — взять те же источники из таблицы. Записать `docs/meta/current/assets.upload.json` вида `{cover:{publicUrl}, screenshots:[{file, publicUrl}]}`, проверить каждый адрес на 200 image/*.
2. `node docs/meta/build-patch.mjs`: при наличии assets.upload.json патч `patch.json` станет полным, с portal, covers, screenshots и alt на пяти языках.
3. svc-apps: dryRun, затем запись с version 2, затем apps.portal.readiness.

## Поля без инструмента в MCP (заполнить в Studio)
- **Похожие игры:** аркадные шутеры с видом сверху и защитой базы, аркады-лабиринты из каталога ManyPlay. Id в проекте нет, выбрать в каталоге.
- **Разработчик:** ManyPlay (D-META-03).
- **Устройства:** браузер на компьютере и телефоне; раскладки portrait, landscape, desktop; нужен интернет. Управление: клавиатура (стрелки/WASD — движение, Space/J — огонь, 1–3 — бустеры, Esc/P — пауза) и тач (стик, кнопка FIRE, кнопки бустеров).

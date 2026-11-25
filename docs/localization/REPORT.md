# Локализация Iron Burrow (gameId 360) — 25.11.2026

## Языки
| tag | name | status | роль |
|---|---|---|---|
| en | English | published | по умолчанию (`defaultLocale`) |
| de | Deutsch | published | новый |
| es | Español | published | новый |
| fr | Français | published | новый |
| ru | Русский | published | новый |

Языки взяты по умолчанию задачи (de, es, fr, ru) — они же языки страницы игры на портале. Название игры «Iron Burrow» не переводится.
Единый глоссарий терминов (ржавожуки / Rostkäfer / Oxibichos / Rouillards, Ядро, бустеры, Запасной корпус, Осада, Кампания и т. д.) применён во всех файлах.

## Число строк по файлам (ключей на каждый язык)
| файл | en | de | es | fr | ru |
|---|---|---|---|---|---|
| strings/game.json | 102 | 102 | 102 | 102 | 102 |
| strings/levels.json | 3 | 3 | 3 | 3 | 3 |
| strings/screens.json | 154 | 154 | 154 | 154 | 154 |
| strings/services.json | 6 | 6 | 6 | 6 | 6 |
| strings/shell.json | 13 | 13 | 13 | 13 | 13 |
| **итого (strings.json)** | **278** | **278** | **278** | **278** | **278** |

## Проверка ключей (вывод одной команды node)
```
game.json | en=102 | de: 102 keys, missing=0, extra=0, placeholderMismatch=0 | es: 102 keys, missing=0, extra=0, placeholderMismatch=0 | fr: 102 keys, missing=0, extra=0, placeholderMismatch=0 | ru: 102 keys, missing=0, extra=0, placeholderMismatch=0
levels.json | en=3 | de: 3 keys, missing=0, extra=0, placeholderMismatch=0 | es: 3 keys, missing=0, extra=0, placeholderMismatch=0 | fr: 3 keys, missing=0, extra=0, placeholderMismatch=0 | ru: 3 keys, missing=0, extra=0, placeholderMismatch=0
screens.json | en=154 | de: 154 keys, missing=0, extra=0, placeholderMismatch=0 | es: 154 keys, missing=0, extra=0, placeholderMismatch=0 | fr: 154 keys, missing=0, extra=0, placeholderMismatch=0 | ru: 154 keys, missing=0, extra=0, placeholderMismatch=0
services.json | en=6 | de: 6 keys, missing=0, extra=0, placeholderMismatch=0 | es: 6 keys, missing=0, extra=0, placeholderMismatch=0 | fr: 6 keys, missing=0, extra=0, placeholderMismatch=0 | ru: 6 keys, missing=0, extra=0, placeholderMismatch=0
shell.json | en=13 | de: 13 keys, missing=0, extra=0, placeholderMismatch=0 | es: 13 keys, missing=0, extra=0, placeholderMismatch=0 | fr: 13 keys, missing=0, extra=0, placeholderMismatch=0 | ru: 13 keys, missing=0, extra=0, placeholderMismatch=0
TOTAL de: missing=0 extra=0 placeholderMismatch=0
TOTAL es: missing=0 extra=0 placeholderMismatch=0
TOTAL fr: missing=0 extra=0 placeholderMismatch=0
TOTAL ru: missing=0 extra=0 placeholderMismatch=0
```
`npm run strings`: `strings.json up to date from 5 files … (en 278, de 278, es 278, fr 278, ru 278)`.

## Проверки пакета
| команда | итог |
|---|---|
| npm run strings | OK |
| проверка ключей (выше) | 0 пропущенных, 0 лишних, 0 расхождений плейсхолдеров на каждом языке |
| npm run typecheck | exit 0 |
| npm run build | exit 0 |
| npm run test:unit | exit 0 — 167 тестов: 164 pass, 0 fail (3 skipped самим набором) |

Первый прогон: упал 1 тест — `tests/build/bundle.test.mjs` («base locale other than English»). Его фикстура подкладывала `de.shell.title = "Mondgarten"`, а это конфликтует с настоящей веткой de. Исправлено: фикстура берёт язык `pt`, которого в игре нет (D-LZ-03). Пакет повторён один раз — всё зелёное.

## Публикация записей (сервис конфигов, через саб-агента svc-configs)
Сервер хранит scope `localization` не одной записью `strings`/`locales`, а так: настройки локалей (без key) и строки по ключу-языку (`value.changes[]`). Первая попытка в форме `{data: файл}` по ключам `strings`/`locales` на dryRun вернула `VALIDATION_FAILED`, поэтому без записи. Публикация шла в форме сервера (D-LZ-04): dryRun, затем запись с текущей версией, затем чтение обратно.

| запись | до | dryRun | после записи | чтение обратно |
|---|---|---|---|---|
| localization (настройки локалей) | revision 1, только en | add-locale `{tag,name,status:"published"}` valid ×4 | revision 5 (de 2, es 3, fr 4, ru 5) | revision 5, defaultLocale en, 5 локалей published |
| localization / en (строки) | version 4, 133 ключа | applied 278 | version 5 | version 5: 278/278 совпадают (+8 старых ключей только на сервере, не удалялись) |
| localization / de | version 1 (новая) | applied 278 | version 2 | version 2: 278 ключей, размер = файлу (9706) |
| localization / es | version 1 (новая) | applied 278 | version 2 | version 2: 278 ключей, размер = файлу (10041) |
| localization / fr | version 1 (новая) | applied 278 | version 2 | version 2: 278 ключей, размер = файлу (10088) |
| localization / ru | version 1 (новая) | applied 278 | version 2 | version 2: 278 ключей, размер = файлу (13184) |

Ключи, которые есть только на сервере в en (их не использует код игры — тест «каждый ключ кода есть в записи» зелёный): screen.game.close, screen.game.leave.confirm/stay/text/title, screen.game.placeholder, screen.home.play, screen.profile.best.

## QA
- Код загружен в проект: upload 6b066a9d273cb0201adf7e26, main abb9d9b85b3d7e7b4eea046b5f779a3a05cb35c6.
- Сборка web 1.0.5: buildId 6b066af93baeabcf449d9cd9 — succeeded.
- projects.qa.publish: operation 602dda70298f9f33b88d69db — done; projects.qa.current.sourceId = 6b066af93baeabcf449d9cd9.
- Адрес: **https://qa.manyplay.fun/iron-burrow/**
- Язык выбирался так же, как его выбирает игра: настройка игрока → язык браузера → defaultLocale (docs localization, `l10n.supported` = LOCALES). Браузер Chromium с locale ru-RU / de-DE, окно 1440×900; `<html lang>` игры = ru / de.

| снимок | что видно |
|---|---|
| docs/localization/shots/ru-1-home-1440x900.png | главный экран: «Играть / Уровень 1», «Осада / Пройди уровень 5, чтобы открыть», «Звук: вкл.» |
| docs/localization/shots/ru-2-stage-1440x900.png | карта кампании: «КАМПАНИЯ», главы, «Играть: ур. 1» |
| docs/localization/shots/de-1-home-1440x900.png | главный экран: «Spielen / Level 1», «Belagerung», «Sound: an» |
| docs/localization/shots/de-2-stage-1440x900.png | карта кампании: «KAMPAGNE», «Lehmtunnel», «Spiele Level 1» |

Обрезки и вылезания текста из кнопок нет, ошибок страницы 0. Повторная публикация не понадобилась. Перед публикацией превентивно укорочены кнопки: ru `screen.map.play` → «Играть: ур. {n}», fr `screen.lobby.sound_on/off` → «Son : oui / non».

## Известные ограничения
- Шрифты игры (Russo One, Exo 2) подключены латинским подмножеством. Для de/es/fr его хватает, а на ru текст идёт системным шрифтом: без «тофу», но заголовки не фирменные. Подключить кириллический набор — правка кода темы (src/skin/art.ts), она вне рамок этой задачи («только тексты и локали»).
- Скрытая подпись кнопки ежедневной награды («Daily rewards») приходит из UI Kit, у которого свои тексты только на en/ru. На de/es/fr она английская. На экране её не видно (только для экранных читалок); UI Kit менять запрещено.

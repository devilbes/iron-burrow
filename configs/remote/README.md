# configs/remote

Образцы записей сервисов приложения: `<scope>/<key>.json` — копия опубликованного (с правками,
которые нужно туда перенести); коммит файла сам ничего не публикует.

Формат записи конфигов: `{ name: "<scope>/<key>", data, visibility, enabled, conditionals }`;
записи `levels.*` дополнительно несут `scope` и `key`. Клиент читает только `data`
(`sdk.configs.get(scope, key)`). `visibility: 2` — только для сервера (`inventory.starter`).
`inventory.starter` и правила `inventory.exchange` публикует только владелец приложения: ключ
приложения получает `FORBIDDEN`.

Как публиковать записи (схема → пакетная запись → чтение обратно) и как считать
`server.contentHash` диапазона уровней (`node scripts/levels-hash.mjs`) —
[docs/platform/services/configs.md](../../docs/platform/services/configs.md).

Не записи конфигов, а определения других сервисов: `inventory.catalog/item_coins.json`
(каталог inventory; картинка предмета — не здесь, а `ITEMS` в `src/skin/art.ts` по его `itemId`,
название — `display.titleKey` в `localization/strings`), `leaderboards/leaderboard_weekly.json` (лидерборд);
`localization/locales.json` — данные записи `localization/locales` без конверта.
`localization/strings.json` — все тексты игры в виде, который принимает сервис локализации; его
склеивает `npm run strings` из частей `localization/strings/<часть>.json` (той же схемы), правят
части, заливают `strings.json` ([localization.md](../../docs/platform/services/localization.md)).
`ui.windows/` — триггеры: что открывает плитка HUD или кнопка (своя плитка — свой триггер,
[рецепт](../../docs/platform/recipes/add-a-hud-entry.md)); `ui.hud/` — пустая подстройка: состав,
сторону и порядок плиток задаёт `HUD` в `src/screens/index.ts`, запись может только скрыть плитку
или показать её сегменту.

## Проверка
`npm run records` — до записи в сервисы: каждый файл по схеме сервера из `schemas/<scope>.json`,
без неё — тем, чем запись читает SDK, плюс связи между записями (id и ключи текстов, названные
одной записью, есть в другой). Разделы без схемы печатаются как `not validated: no schema`; для
`progress`, инвентаря, лидербордов, продуктов и офферов схем сервера нет — их проверяет сервис
при пробной записи
([configs.md](../../docs/platform/services/configs.md#проверка-до-записи)).

Что где используется — [docs/platform/services](../../docs/platform/services/).

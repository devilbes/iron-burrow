# APPLY — мета Iron Burrow (gameId 360), 24.11.2026

## Итог: НЕ СОХРАНЕНО (блокер)

| Acceptance | Статус |
|---|---|
| MM-1 apps.metadata.update (не dryRun), version выросла, en+ru | НЕ ВЫПОЛНЕНО: version = 1 (apps.info), обновления не было |
| MM-2 обложка + ≥4 скриншота по HTTPS, 200 image/* | НЕ ВЫПОЛНЕНО: файлы не сняты и не загружены |

## Причины
1. Инструменты `apps.metadata.get`, `apps.metadata.update`, `apps.portal.readiness` и `apps.icon.update` есть у ключа: find_tools показывает их на пути `/apps`, scope apps.metadata.write есть. Однако в сессии агента их нельзя вызвать: request_tool ответил «granted», а инструменты так и не появились. Ключа и адреса MCP в окружении нет, поэтому прямой вызов `/apps` тоже невозможен.
2. `projects.upload.begin` (purpose project-file) разрешает только корни src/, assets/, art/, docs/, configs/, localization/, stores/, scripts/ и tests/. Пути `public/meta/` из запроса там нет. Варианты: класть файлы в `assets/meta/`, если сборка его публикует, или разрешить `public/` на платформе. Это решает владелец или платформа.

## Что готово к применению
- Тексты en (основной) и ru: название, короткое и полное описание, страница портала (slug, H1, seoTitle с « | ManyPlay», seoDescription, body, FAQ) и управление. Файлы — `docs/meta/texts/en.json` и `ru.json`, проверка — `node docs/meta/texts/build.mjs` (0 нарушений). Других языков в игре нет: locales.json → только en.
- Гайды how-to-play и tips в патч не входят (D-MT-09).
- Жанр: `genre: arcade`, `category: GAME_ARCADE`.
- Готовый арт: `assets/meta/cover-16x9.png`, `assets/meta/cover-1x1.png`, `assets/icons/app-icon.png`. На платформе иконка не привязана (icon512 = null).
- Опубликованная сборка: https://qa.manyplay.fun/iron-burrow/ (build 6b05cdbe56ec4bd18df123c6).

## Поля без инструмента в MCP (заполнить в Studio)
- Похожие игры: другие аркады-«танчики» с лабиринтом из каталога ManyPlay. Конкретных id в проекте нет — выбрать в каталоге.
- Разработчик: в проекте не указан — уточнить у владельца.
- Устройства: десктоп-браузер и мобильный браузер; ориентации portrait, landscape и desktop; нужен интернет.

## Что нужно, чтобы закончить
Перезапустить шаг в сессии, где `apps.metadata.*`, `apps.portal.readiness` и `apps.icon.update` подключены как инструменты, и решить, куда класть картинки вместо `public/meta/`.

# Аудитория — Iron Burrow

Целевая аудитория по 00_MASTER §3: casual–midcore веб-игроки 16–45 лет, которые помнят или любят простые аркадные шутеры; играют в браузере на десктопе и на телефоне.

## Кто играет в веб-игры

- **Устройства.** Аудитория крупных веб-порталов делится примерно поровну. На Poki мобильные сессии дают около 48 % и растут ([Outlook India о Poki](https://www.outlookindia.com/xhub/featured-insights/poki-indian-brands-spend-millions-on-social-media-ads-but-ignore-a-far-more-engaged-audience)). Poki отдельно предупреждает, что тач-управление обязательно ([Poki Study](https://windowsnews.ai/article/poki-study-browser-games-capture-more-idle-time-than-social-media-say-2000-players.432286)). Вывод: портрет, ландшафт и десктоп у нас равноправны, это совпадает с 00_MASTER §2.
- **Возраст и пол.** По оценке Similarweb, крупнейшая возрастная группа poki.com — 25–34 года, пол примерно поровну ([Similarweb](https://www.similarweb.com/website/poki.com/)). Similarweb не учитывает игроков младше 18, а реальная аудитория порталов моложе ([Poki — Grokipedia](https://grokipedia.com/page/Poki)). Наш диапазон 16–45 не спорит с данными.
- **География.** В топе рынков Poki — Индия, Бразилия, Индонезия ([Outlook India](https://www.outlookindia.com/xhub/featured-insights/poki-indian-brands-spend-millions-on-social-media-ads-but-ignore-a-far-more-engaged-audience)). Отсюда важны лёгкая загрузка и работа на слабых телефонах (подробно в platform.md). Покупательная способность в этих регионах ниже, поэтому нужен дешёвый вход — пак за 0.99 (оценка).
- **Ностальгический сегмент.** Игроки 30–45 лет узнают формулу «танк + лабиринт + база» без обучения. Порог входа низкий, но ждут они честной аркады, а не pay-to-win (оценка; см. monetization.md).

## Сессия

| Источник | Метод | Длина |
|---|---|---|
| [CrazyGames, 2025–26](https://www.gamespress.com/Browser-game-platform-CrazyGames-releases-extensive-analysis-of-US-bro) | данные платформы, 1,74 млрд сессий в США | в среднем ~30 мин (всё время на портале) |
| [Poki, State of Web Gaming 2026](https://poki.com/blog/state-of-web-gaming-report-2026) | опрос 2000 игроков US/UK | чаще всего 11–20 мин, 2–3 игры за сессию, несколько раз в день |

Вывод: время на одну игру ≈ 10–20 мин (оценка по Poki). Наша сессия 6–15 мин = 3–6 стадий по 90–180 с попадает в это окно. Стадия короче 3 мин даёт точку выхода, а значит игроку легко сыграть «ещё одну».

## Что удерживает (в нашем жанре и в вебе)

1. **Короткий цикл «бой → результат → следующий».** Короткий раунд и мгновенный рестарт держат игрока в Tank Trouble и в .io-играх ([GamePix](https://www.gamepix.com/play/tank-trouble), [Diep.io](https://en.wikipedia.org/wiki/Diep.io)). У нас это стадия 90–180 с и кнопка Next сразу после Stage Clear.
2. **Видимый прогресс.** Карта 30 стадий, звёзды и главы со сменой визуала. Структура «миры → уровни» держит игроков Tank Hero, а главная жалоба там — «контент кончился» ([App Store](https://apps.apple.com/us/app/tank-hero/id438314348)).
3. **Вечный режим с соревнованием.** У Siege недельный лидерборд, и он даёт повод вернуться после кампании (как бесконечные волны с лидербордом в [GridTanks](https://gridtanks.net/)).
4. **Ежедневный повод зайти.** Календарь на 7 дней с бустерами. Игрок веба заходит несколько раз в день ([Poki](https://poki.com/blog/state-of-web-gaming-report-2026)), и короткий визит «забрать награду + 1 стадия» вписывается в эту привычку (оценка).
5. **Ощущение честности.** Нет таймеров, нет рекламы, ничего не нужно ждать. Жалобы на таймеры и сундуки — типичная причина негатива в жанре ([Tanks a Lot, отзывы](https://apps.apple.com/us/app/tanks-a-lot-3v3-brawls/id1344713773)).

## Что отталкивает

- Долгая загрузка: игроки уходят, если загрузка дольше ~10 с ([Poki requirements via paweljarosz](https://www.paweljarosz.pl/blog/html5-game-optimization.html)).
- Неудобный тач-стик: «дрейф», мёртвые зоны, перекрытие поля пальцем (см. platform.md).
- Скачки сложности, после которых очевидный выход — купить бустер. Это главная жалоба в казуальных играх с бустерами ([Unstar, обзор отзывов](https://unstar.app/hi/blog/candy-crush-royal-match-gardenscapes-homescapes-toon-blast-puzzle-games-ranked-2026)).

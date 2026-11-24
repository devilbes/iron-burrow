# Наблюдение опубликованной сборки — 24.11.2026

- Адрес: https://qa.manyplay.fun/iron-burrow/ (по `projects.qa.current`). Игра открывается во фрейме `https://test.manyplay.fun/qa-builds/360/6b05cdbe56ec4bd18df123c6/index.html`.
- Сборка: publicationId и buildId `6b05cdbe56ec4bd18df123c6`, опубликована 2026-11-24T17:52:49Z. В окне паузы указана версия 1.0.1.
- Инструмент: headless Chromium из Playwright (`/opt/pw-browsers`), временные скрипты лежат вне репозитория. MCP-инструменты браузера были выданы, но из этого сеанса не вызывались.

## Desktop 1440×900, локаль браузера en-US, `pointer: fine`
1. Старт. `data-layout=desktop`, `<html lang="en">`. Окно «Welcome, Burrower!» дарит стартовые бустеры по 2 шт. каждого: Bubble Shield, Shockwave, Steel Fortress, Spare Hull. Кнопка Collect, затем окно «Reward received!» с кнопкой Great.
2. Лобби. Элементы: Iron Burrow, звёзды 0/90, Play (Stage 1), Siege с подписью «Clear stage 5 to unlock», Sound: On. В боковом HUD кнопки Daily rewards, Leaderboards, Shop, в верхней полосе профиль и настройки.
3. Карта кампании. Глава 1 Clay Tunnels открыта, The Iron Works помечена «Clear stage 10 to open», Magma Depths — «Clear stage 20 to open». На главе 10 узлов, есть кнопка «Play Stage 1».
4. Окно перед стадией. «Destroy 20 Rustbugs. Protect the Core!», Best: 0, переключатель «Take a Spare Hull (+1 life)», награда за первое прохождение — ×1 Bubble Shield, кнопка Start.
5. Стадия 1. HUD: Stage 1, Rustbugs left: 20, Lives: 3, Gun level 0, ★★★, Score. Пауза подписана клавишей Esc, бустеры — клавишами 1/2/3. В углу подсказка управления: «W A S D ←↑↓→ / FIRE Space J».
   - Нажатия ArrowUp, затем KeyA двигают танк: он сместился, а подсказка обучения сменилась с «Drive with Arrow keys or WASD» на «Press Space or J to fire».
   - Digit1 включил Bubble Shield: появился тост «Shield On!», счётчик уменьшился с 3 до 2.
   - Escape открыл окно Paused: Resume, Restart Stage, Quit, Music, Sound, Reduce Motion, Version 1.0.1. KeyP тоже ставит паузу.
6. Ошибки консоли: CSP-блок скрипта Cloudflare beacon (его подставляет хостинг QA) и 409 на загрузку товаров магазина (как D-PUB-06).
7. В test-окружении в HUD видны кнопки «QA: Win» и «QA: Lose». Для скриншотов меты их нужно избегать или кадрировать.
8. Верхняя полоса валют показывает 0 по всем бустерам, хотя кнопки бустеров на поле показывают 3/2/2. Это расхождение отображения, на мету оно не влияет, но заметно на скриншотах.

## Локаль браузера ru-RU и de-DE, 1440×900
- Все тексты на английском, `<html lang="en">`. Другой локали в сборке нет.

## Тач: 390×844, `hasTouch`, `isMobile`, `pointer: coarse`
- `data-layout=portrait`. Обучение показывает «Drag the stick to drive». Внизу экрана стик (`stick`) и кнопка FIRE (`fire`), над ними три кнопки бустеров, пауза в верхней полосе.
- После поворота в 844×390 раскладка стала `data-layout=landscape`, стик и FIRE на месте. Смена раскладки ставит игру на паузу (по ГДД). На тач-устройстве в окне паузы есть ещё переключатель Vibration.

## Снимки
`desktop-1440x900-*.png`, `desktop-ru-RU-browser-start.png`, `touch-390x844-stage1.png`, `touch-844x390-after-rotate.png` — в этой папке.

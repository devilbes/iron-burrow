# UI Kit (`@manygamescorp/ui-kit`)

Готовые окна и элементы платформы: вход ManyPlay ID, магазин и офферы, инвентарь, HUD с бейджами, лидерборды, награды. Игра передаёт данные (props), получает интенты (`kit:intent`) и выполняет действие через модули SDK. Игровой экран (поле, уровень) рисует сама игра.

- Окна ставятся в очередь, чтобы не накладываться (`ui-kit/window-queue`).
- Топ-бар, нижний бар, HUD и окна принадлежат UI Kit; модули игры их только регистрируют.
- Тема (скин) игры — в `src/theme/`: токены `--mp-*`, шрифты, иконки (`ui-kit/recipe/make-theme`).
- Под баннер рекламы — элемент `ad-banner-slot`; показ рекламы — модуль `ads`.

UI Kit приходит в `vendor/@manygamescorp/ui-kit/` через MCP, не копируется в `src/`.

Подробно: MCP `docs.get` `ui-kit/overview`, `ui-kit/registration`, `ui-kit/recipe/show-hud`, `ui-kit/recipe/show-shop`.

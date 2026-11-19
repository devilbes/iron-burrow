# src/modules
Код игры: по модулю на логическую единицу, `src/modules/<id>/` с `defineModule` (boot, field, hud, levels, screens, audio, save, …). Модули не импортируют друг друга, общаются через шину SDK.
Пишет: Студия (агенты-разработчики) и разработчик. SDK, UI Kit и скины здесь не лежат: они в `vendor/@manygamescorp/` и правятся только через MCP.

# SDK ManyPlay в игре

Коротко: подключить, вызвать, настроить. Подробности — в MCP docs (`docs.search`, `docs.get`, раздел `sdk/*`).

| Файл | О чём |
|---|---|
| [core.md](core.md) | ядро: `createSdk`, `boot`, вход, конфиги, шина, `destroy` |
| [modules.md](modules.md) | модули `mod-*`: состав, подключение, настройки |
| [ui-kit.md](ui-kit.md) | UI Kit: готовые окна, HUD, тема |

## Как SDK попадает в проект
1. Модули приложения выбираются в Студии или MCP `sdk.modules.set`.
2. MCP `sdk.modules_install` кладёт готовые сборки в `vendor/@manygamescorp/<pkg>/`, import map в `vendor/@manygamescorp/importmap.json` и `vendor.lock.json`, публичные зависимости — в `package.json`.
3. `npm run build` вставляет import map в `index.html`; код импортирует `@manygamescorp/...` как обычно.

`vendor/` и `platform.json` не править руками. npm-пакетов `@manygamescorp/*` в `package.json` нет: приватный реестр в сборке недоступен.

## Сборка
`npm ci && npm run build` → `dist/` с `index.html`. Бандлера нет: `tsc` компилирует `src/` в `dist/app/`. Путь до QA — [ci/README.md](../../ci/README.md).

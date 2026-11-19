# SDK ManyPlay в игре (1.0.0-rc.30)

## Как SDK попадает в проект
- Состав модулей задан в `platform.json` (`sdk.modules`); пакеты лежат в `vendor/@manygamescorp/<pkg>/`.
- `npm run build` вставляет import map из `vendor/@manygamescorp/importmap.json` в
  `dist/index.html`; код импортирует `@manygamescorp/...` как обычно. Код игры склеивает esbuild
  (`scripts/build.mjs` → `dist/app/`), пакеты SDK в бандл не входят: они грузятся по import map из `vendor/`.
- Источник правды по методам — `vendor/@manygamescorp/*/dist/*.d.ts` и README пакетов.

## Запуск (`src/boot/start.ts`)
`createSdk` получает содержимое `platform.json` и фабрики модулей. Модуль работает, только если
он выбран в `platform.json` и его фабрика есть в таблице `src/boot/modules.ts`; выбранный пакет
без фабрики — ошибка запуска `modules not wired in this build: <id>`, а не тихий пропуск.
Пакеты, которые платформа кладёт только для включённого модуля (`mod-realtime`,
`mod-scheduling`), таблица импортирует по строке-спецификатору: проверка типов и сборка их не
требуют, а включённый модуль без пакета — та же ошибка запуска с его id. Порядок `boot()`: платформа → вход игрока →
конфиги → `init`/`start` модулей → `sdk:core:ready`. Подписки на шину — до `boot()`, API
модулей — после. Ошибка запуска остаётся на экране загрузки UI Kit с кнопкой повтора. Экран
загрузки монтируется после скина игры, до него видна нейтральная полоса `index.html`
([«Стартовый экран»](../platform/recipes/custom-window-skin.md#стартовый-экран)).

## Ядро (`Sdk`)
| | Что использует проект |
|---|---|
| `sdk.configs` | `get(scope, key)` — записи из снимка, прочитанного при запуске |
| `sdk.l10n` | `t`, `has`, `locale`, `setLocale`, `available`, `registerDefaults` |
| `sdk.analytics` | `sendEvent(name, payload)` |
| `sdk.profile` | `get` |
| `sdk.ui` | `elementAction(element)` — открыть окно по триггерам `ui.windows/main` |
| `sdk.bus` | `on`; презентеры окон — `ctx.bus.emit` своего модуля |
| `sdk.time` | `now()` — серверное время |

## Модули
| Пакет | Фабрики | Что вызывает проект |
|---|---|---|
| `mod-progress` | `progressModule()`, `levelsModule()` | `progress.init`, `progress.send`, `progress.beginAttempt`; `levels.open(set)` → `get(n)`, `levelEnd` |
| `mod-inventory` | `inventoryModule()` | `inventory.balance`, `inventory.entities`, `inventory.refresh` |
| `mod-iap` | `iapModule({ store })`, `fakeStore` | `iap.load`, `iap.products`, `iap.offers`, `iap.purchase` |
| `mod-leaderboards` | `leaderboardsModule()` | `leaderboards.get(key)` |
| `mod-daily-rewards` | `dailyRewardsModule()` | `plan()`; плитку HUD и автооткрытие окна делает модуль |
| `mod-profile-pack` | `kvModule()`, `gameStateModule()`, `profileUiModule()` | `gamestate.get/set/clear` — только если игра вызывает `loadSave`/`save` |
| `mod-hud` | `hudModule()` | — (плитки HUD) |
| `mod-realtime` | `realtimeModule()` | — (события сервера на шину: выдачи inventory, подсказки progress, `configs.reload`) |
| `mod-scheduling` | `schedulingModule()` | — (`sdk.scheduling`; запросов нет, пока игра его не вызовет) |

`realtime` входит в набор модулей шаблона: без него сервер не присылает событий, и награды видны
только после следующего чтения инвентаря ([network.md](../platform/services/network.md)). Запись
модуля в `platform.json`:
```json
{ "id": "realtime", "version": "1.0.0-rc.30", "source": "local", "load": "eager",
  "settings": { "enabled": true, "availability": {} }, "package": "@manygamescorp/mod-realtime" }
```
Не подключены в этой сборке (выбор в `platform.json` — ошибка запуска с id модуля): `ads`
(`mod-ads-web`: нужен адаптер показа рекламы), модули Cordova (`mod-ads-mobile`,
`mod-iap-google-play`).

## UI Kit (`@manygamescorp/ui-kit`, скин `@manygamescorp/ui-kit/skins/manyplay`; в старых SDK — пакет `@manygamescorp/skin-manyplay`)
Топбар, HUD, нижнее меню, очередь окон и стандартные окна — элементы UI Kit со скином
`manyplay` (`src/shell/skin.ts`). Окна модулей в rc.30 только объявляют себя на шине; наполняют
их данными презентеры `src/shell/windows/`. Экраны игры рисует игра из `@manygamescorp/ui-kit/core`
и токенов темы `--mp-*`.

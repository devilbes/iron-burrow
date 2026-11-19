# Модули SDK (`mod-*`)

Модуль работает, если 1) включён в составе приложения (Студия или MCP `sdk.modules.set`, настройки по `settingsSchema` модуля) и 2) его фабрика передана в `createSdk({ modules })`. API — `sdk.<id>` или `sdk.getModule('<id>')` после `boot()`.

| id | Импорт фабрики | Главное |
|---|---|---|
| profile | `profileModule()` из `@manygamescorp/mod-profile/profile` | `get`, `update` |
| gamestate | `gameStateModule()` из `@manygamescorp/mod-profile/state` | `get`, `set` |
| inventory | `inventory()` из `@manygamescorp/mod-inventory/inventory` | `balance`, `consume` |
| progress | `progressModule()` из `@manygamescorp/mod-progress/progress` | `send`, `levelEnd` |
| leaderboards | `leaderboardsModule({ boards })` из `@manygamescorp/mod-leaderboards/leaderboards` | `get`, `submitScore` |
| ads | `adsModule({...})` из `@manygamescorp/mod-ads/ads` | `isAvailable`, `show` |
| iap | `iapModule({})` из `@manygamescorp/mod-iap/iap` | `offers`, `purchase` |
| hud | `hudModule()` из `@manygamescorp/mod-hud/hud` | `register`, `setBadge` |

Установка в проект — только MCP `sdk.modules_install` (в `vendor/@manygamescorp/`). Свои модули игры — в `src/modules/`, не в vendor.

Подробно: MCP `docs.get` `sdk/modules`, `sdk/module-json`, `sdk/recipe/load-module`.

# Ядро SDK (`@manygamescorp/core`)

## Подключить
```ts
import { createSdk } from '@manygamescorp/core/kernel';
import { profileModule } from '@manygamescorp/mod-profile/profile';

const platformConfig = await (await fetch('./platform.json')).json();
const sdk = createSdk({ modules: [profileModule()], platformConfig, http: { appVersion: '1.0.0' } });
sdk.bus.on('sdk:module:failed', ({ id, code }) => console.warn(id, code));
await sdk.boot();
```

## Порядок `boot()`
платформа готова → вход игрока (`sdk.auth.init`) → конфиги и состав → `init`/`start` модулей по зависимостям → `ready`, событие `sdk:core:ready`. Сбой входа или некритичного модуля `boot()` не роняет. Подписки — до `boot()`, API модулей — после.

## Встроено
| | Методы |
|---|---|
| `sdk.auth` | `init`, `session`, `signin`, `confirm`, `logout` (только при `app` в `platform.json`) |
| `sdk.configs` | `fetch`, `get`, `getScope`, `refresh` |
| `sdk.l10n` | `t`, `locale`, `setLocale` |
| `sdk.bus` | `on`, `once`, `off` |
| `sdk.device` | `info`, `screen`, `network`, `haptics` |
| ядро | `boot`, `destroy`, `getModule`, `loadModule`, `state` |

Время — только `core.time.now()`. Новый запуск — `await sdk.destroy()` и новый `createSdk`.

Подробно: MCP `docs.get` `sdk/init-order`, `sdk/overview`, `sdk/pitfalls`.

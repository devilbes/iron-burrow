# Как игре тратить валюту

> **Сегодня недоступно.** Ключ приложения не может публиковать правила обмена
> (`inventory.exchange`, ответ `FORBIDDEN`) — это раздел владельца приложения
> ([configs.md](../services/configs.md)). Ниже — как трата будет работать, когда платформа это
> откроет; до тех пор монеты в игре только копятся.

> Рецепт. Код шаблона этого не делает: фрагменты ниже — образец для игры, их нет в `src/`.
> Методы — из `vendor/@manygamescorp/mod-inventory/README.md` и `dist/inventory.d.ts`.

Валюту (`soft_currency`) с клиента напрямую не тратят: её нельзя пометить `clientConsumable`,
`inventory.consume` монет отвечает `INVENTORY_CONSUME_NOT_ALLOWED`. Путь — правило обмена и
расходуемый предмет (пример: бустер за 40 монет).

1. Предмет в каталоге inventory: `itemType: "stackable"`, `isStackable: true`,
   `clientConsumable: true`, `display.titleKey` (образец полей — `inventory.catalog/item_coins.json`).
2. Правило обмена — запись `inventory.exchange/booster_buy` (`visibility: 3`, его читает и клиент):
   ```json
   { "name": "inventory.exchange/booster_buy",
     "data": { "costs": [{ "id": "item_coins", "amount": 40 }],
       "rewards": [{ "id": "item_booster", "amount": 1 }], "enabled": true },
     "visibility": 3, "enabled": true, "conditionals": [] }
   ```
3. Id правила и предмета — константы в `src/boot/ids.ts`; трата — новый метод `GamePorts`
   (`src/modules/game/index.ts`) с реализацией в `src/boot/game-ports.ts`:
   ```ts
   import { randomUuidV7 } from '@manygamescorp/core/context';
   const inventory = sdk.getModule<InventoryNamespace>(MODULES.inventory);
   // Свой ключ на каждую операцию — до первого запроса; после сбоя сети повтор с тем же ключом.
   const keys = { exchange: randomUuidV7(sdk.time.now()), consume: randomUuidV7(sdk.time.now()) };
   if ((inventory.quantity(BOOSTER.item) ?? 0) < 1) {
     await inventory.exchange(BOOSTER.exchange, { idempotencyKey: keys.exchange });
   }
   await inventory.consume(BOOSTER.item, 1, { idempotencyKey: keys.consume, reason: 'level_3' });
   ```
   Сервер списывает и начисляет строго по правилу; клиент называет только правило и сумм не передаёт.
4. Отказы приходят кодом (`SDKError.code`): `INVENTORY_INSUFFICIENT_FUNDS`, `INVENTORY_INSUFFICIENT_ITEMS`,
   `INVENTORY_EXCHANGE_RULE_NOT_FOUND`, `INVENTORY_EXCHANGE_LIMIT_REACHED`, `INVENTORY_CONSUME_NOT_ALLOWED`,
   `INVENTORY_ITEM_UNKNOWN`, `RATE_LIMITED`, `VALIDATION_FAILED` — это ответ «нельзя», не сбой.
5. Цену на экране брать из правила (`sdk.configs.get('inventory.exchange', <правило>)`, `costs`),
   а не дублировать числом; нет правила — кнопку покупки не показывать.

# module.json configSchemas v1 (E175, client-sdk#929)

## Любой конфиг требует схемы (решение владельца 24.10)

Раздел configs без зарегистрированной схемы нельзя создавать или редактировать.
Перед записью прочитайте схему и guidance через `configs.get` с `include: "schema"`.
`schemaVersion: null` и `schemaMissing: true` не разрешают обход валидации; при отсутствии
схемы сначала обеспечьте её регистрацию. Адреса берутся из env, лимиты игры — из конфигов.

| Вид схемы | Кто регистрирует | Порядок |
| --- | --- | --- |
| Нативная: `iap.*`, `ads.*`, `inventory.*`, `progress.*`, `leaderboards.*`, `levels.*`, `game.placements` | Сервис-владелец при старте, через `configs.schema.register` (configs#485) | Дождаться регистрации; агент не подменяет схему сервиса своей |
| Кастомная: собственный раздел игры | Разработчик или генератор Студии через MCP `configs.schemas.put` | Сначала dryRun схемы, затем регистрация; после этого `configs.write` с dryRun, запись и readback |
| Схемы механики из подписанного `module.json` | Доверенный release-worker Studio | Проверка артефакта и регистрация по E175, описанные ниже |

Справочная JSON Schema в репозитории не доказывает регистрацию в конкретной среде.
Цены/валюта цены не задаются в конфигах игры: их возвращает стор; fake — настройки
провайдера IAP (client-sdk#1240). `iap.offers`/`iap.placements` общие для всех скинов.

## Декларация схем механики

Механика объявляет каталоги и параметры в собственном пакете. Уровни остаются
в progress `levels.*`. SDK не регистрирует схемы: `ModuleContext.configs` только
читает конфиги. Поле `schemas` настроек/редактора не меняется.

Публичные типы: `ModuleConfigSchemas`, `ModuleConfigSchemaSource`,
`ModuleConfigSchemaInline`, `ModuleConfigScope`; валидатор
`validateModuleConfigSchemas` — `@manygamescorp/contracts-client/vendor-artifact`.

```json
{
  "id": "mech-match3",
  "configSchemas": {
    "version": 1,
    "scopes": [{
      "section": "mech.match3",
      "label": "Три в ряд",
      "patterns": ["mech.match3.*"],
      "schemas": {
        "mech.match3.tiles": "mech.match3.tiles",
        "mech.match3.params": "mech.match3.params"
      }
    }],
    "schemas": [
      { "schemaId": "mech.match3.tiles", "version": 1, "path": "./schemas/tiles.schema.json" },
      { "schemaId": "mech.match3.params", "version": 1, "path": "./schemas/params.schema.json" }
    ]
  }
}
```

Namespace — `mech.` + id без `mech-`: `mech-block-tetris` → `mech.block-tetris`.
Section, patterns, ключи mappings и schemaId принадлежат этому namespace;
каждый mapping ссылается на объявленный schemaId и покрывается pattern.
Пути относительны module.json, допустим начальный `./`, запрещены `..`, symlink
наружу каталога и сетевые URL. Vendor builder получает файлы относительно того же корня.

Каждый JSON-файл содержит объект с `$schema` строго
`https://json-schema.org/draft/2020-12/schema` и `$id` строго
`urn:manyplay:schema:<schemaId>:v<version>`. Версия — безопасное целое ≥1;
пара `(schemaId, version)` уникальна. Разрешены `$ref`/`$dynamicRef` только
`#/…` и `urn:manyplay:schema:<schemaId>:v<version>` (с необязательным `#/…`).
Гейт не загружает ссылки и не компилирует JSON Schema: семантическую проверку
и доступность URN-ссылок выполняет configs при регистрации.

Лимиты одного configSchemas: 200 схем, 50 scopes, 192 KiB UTF-8 JSON
(проверяется и декларация, и развёрнутый блок), глубина 32, 20 000 узлов.
В scope максимум 200 patterns и mappings, label — непустая строка ≤256 символов.

## Подписанный артефакт

В vendor `module.json` каждый элемент `schemas` заменяется на
`{schemaId, version, schema, hash}`: `path` удаляется, `schema` — inline объект,
`hash` — SHA-256 от JCS(schema), **64 lowercase hex без префикса**.
Порядок ключей и пробелы исходного файла не меняют hash.
Валидатор проверяет форму, builder дополнительно пересчитывает каждый hash.
Схемы механик не копируются в исходники SDK/kit/configs.

`catalog.sig → catalog.json → vendor.sha256 → files.json → module.json`
покрывает inline-схемы и их hash. Studio должен читать схемы из проверенного
vendor module.json, а не из исходного path или непроверенного поля каталога.
Если schemas объявлены в metadata SDK registry publisher, он разворачивает их
до подписи module.json; лимит module.json SDK registry 64 KiB остаётся в силе.

Только доверенный release-worker Studio регистрирует схемы через
`configs.schema.register` с module identity; интеграция — panel#1215/configs#412.
Выпуск npm контракта — обычный Studio SDK release после merge; этот PR не
публикует пакеты и не подтверждает живую регистрацию в configs.

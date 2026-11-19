# game-template

Минимальный шаблон проекта игры ManyPlay. Студия создаёт из него репозиторий игры (тег `v1.0.0`).

## Что где лежит
| Путь | Что |
|---|---|
| `package.json`, `package-lock.json` | скрипты `build`, `typecheck`; без пакетов `@manygamescorp/*` |
| `scripts/build.mjs` | сборка: `tsc` → `dist/app/`, import map SDK в `dist/index.html` |
| `index.html`, `src/main.ts` | страница и точка входа |
| `tsconfig.json` | TypeScript |
| `platform.json` | приложение и состав SDK; заполняет платформа |
| `project.json` | происхождение проекта, среды, bundleIds |
| `manifest.json` | версия шаблона |
| `.mcp.json`, `.env.example` | MCP ManyPlay; URL и ключ только из env |
| `src/modules/`, `src/theme/` | код игры и тема UI Kit |
| `assets/source`, `assets/generated`, `assets/audio` | графика и звук |
| `configs/levels`, `configs/remote`, `configs/schemas` | уровни, удалённые конфиги, схемы |
| `docs/gdd`, `docs/plan`, `docs/requirements` | ГДД, план, требования (пишет Студия) |
| `docs/sdk/` | коротко про SDK, модули, UI Kit |
| `tests/` | тесты |
| `ci/` | как платформа собирает игру |
| `vendor/@manygamescorp/` | появляется после установки SDK через MCP |

## Сборка
```
npm ci
npm run build   # dist/index.html
```
Без установленного SDK сборка проходит, страница показывает заглушку.

## Версии
`main` — разработка, проекты берут только тег. patch — доки; minor — новые файлы; major — смена формата `package.json`/`manifest.json`/`platform.json`.

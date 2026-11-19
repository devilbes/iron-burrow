# Проект игры ManyPlay

Шаблон: game-template v1.0.0. Приложение задаёт `platform.json` (подставляет платформа).

- Как устроен SDK: [docs/sdk/README.md](docs/sdk/README.md).
- Где что лежит: [README.md](README.md) и README в каждой папке.
- Документация и схемы — ManyPlay MCP: `docs.search`, `docs.get`, `configs.get_schema`. Ключ только из `MANYPLAY_MCP_KEY`, в файлы не писать.

Правила:
- `vendor/@manygamescorp/`, `platform.json`, `package-lock.json` после установки SDK не править руками: SDK, модули и UI Kit ставит MCP.
- Код игры — `src/modules/<id>/`, тема — `src/theme/`, ассеты — `assets/`, конфиги — `configs/`.
- Проверка перед сдачей: `npm ci && npm run typecheck && npm run build` → `dist/index.html`.
- Секреты в репозиторий не класть.

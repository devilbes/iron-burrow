# ci
Сборку выполняет платформа (сервис builds), а не CI репозитория.

Путь через MCP: `projects.upload.*` → `projects.snapshot.create` → `builds.create` (`platform: "web"`, `sha`, `branch`) → `builds.get` до `succeeded` → `projects.qa.publish`. Публикация в prod — только человек в Студии.

Что делает builds: `npm ci` (только публичный npm), `npm run build`, берёт `dist/` (обязателен `dist/index.html`), кладёт `platform.json` приложения из панели. Корневой `platform.json` проекта не используется.

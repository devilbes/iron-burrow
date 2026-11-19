# Лидерборд

Недельный лидерборд `leaderboard_weekly`. Очки клиент не отправляет: сервис прибавляет
`score` проверенного `levelEnd` выигранного уровня набора `main` (`GamePorts.endLevel`).

## Записи
| Что | Файл |
|---|---|
| определение `leaderboard_weekly` (`writeMode: "increment"`, источник `levelEnd`) | `configs/remote/leaderboards/leaderboard_weekly.json` |

## Где подключено
Окно открывает плитка HUD `leaderboards` (триггер `hud-leaderboards`); наполняет `src/shell/windows/leaderboard.ts`:
```ts
      const page = await api.get(LEADERBOARD, { limit: 20 });
```

## Как проверить
Плитка лидерборда → окно с вкладкой «This week». Очки появляются, когда игра отправляет победы через `endLevel`.

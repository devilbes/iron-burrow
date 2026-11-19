# Ежедневные награды

Недельный календарь: награда за вход каждый день, при пропуске цикл начинается заново.
Плитку в HUD и автооткрытие окна делает модуль `daily-rewards`; выдачу — сервис progress.

## Записи
| Что | Где |
|---|---|
| `progress` / `reward_daily` — шаги `day_1…day_7`, событие `login`, `claimMode: "auto"`, `reset: { period: "day", onMiss: true }` | `configs/remote/progress/reward_daily.json` |
| настройки модуля (`track`, `cycleLength`, `autoOpen`, `entry`) | `platform.json` → `sdk.modules[id=daily-rewards].settings` |

## Где подключено
Вход дня отправляет `src/boot/grants.ts` (`sendDailyLogin`) — один раз при запуске, после
единственного чтения прогресса и только для активного трека; ответ не ждёт выдачи:
```ts
    const ack = await sdk.getModule<Progress>(MODULES.progress)
      .send({ eventId: `login:${gid}:${day}`, type: 'login', data: {} });
```
Принятый вход отмечает доступный день пройденным в прочитанном состоянии; монеты дня приходят
событием выдачи (модуль `realtime`) и показываются окном награды ([network.md](network.md)).
Окно `dailyReward` наполняет `src/shell/windows/daily.ts`: дни — из `plan()` модуля, состояние —
из того же прочитанного трека; открытие окна запросов к прогрессу не делает.

## Как проверить
Новый гость → окно наград открывается само, награда дня 1 выдана (окно награды), один
`progress/me/init` за сессию; повторно в тот же день — недоступна.

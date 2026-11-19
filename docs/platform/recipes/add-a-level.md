# Добавить уровень

1. Запись диапазона `configs/remote/levels.main/r_0006_0010.json` по образцу `r_0001_0005.json`:
   `scope`, `key`, `name`, `data.kind: "range"`, `first: 6`, `last: 10`, `entries[]`
   (`id: "level_6"`, `title` — ключ локализации, плюс числа, которые читает ваша игра) и
   `server` — границы, по которым сервер проверяет `levelEnd` (`moves`, `durationMs`, `score`).
   Хеш содержимого — `node scripts/levels-hash.mjs` (пишет `server.contentHash` в файлы диапазонов).
2. В `levels.main/set`: `last: 10`, в `index` — `{ "key": "r_0006_0010", "first": 6, "last": 10 }`.
   По `last` `currentLevel()` узнаёт, что уровни кончились.
3. Награда — шаг `level_6` в `progress/progress_main` с фильтром
   `{ "set": "main", "n": 6, "won": true, "verified": true }` и `reward`.
4. Названия `levels.main.level_6.title` — в `localization/strings`.
5. Опубликовать записи ([configs.md](../services/configs.md)). Код шаблона не меняется: игра
   получает числа уровня через `ctx.game.level(n).entry`.

# Добавить экран

Экран — функция `mount(root, ctx)`: рисует в `root` и возвращает функцию снятия. Окна
сервисов экранами не делаются — их открывают плитки HUD и кнопки топбара. Окна самой игры
(результат, пауза, поражение, подтверждение) — тоже не экраны и не своя вёрстка:
`ctx.window.open`, слой поверх всего экрана (обучение, вуаль) — `ctx.overlay`
([game-windows.md](game-windows.md)).

1. Имя маршрута — в `Route` (`src/screens/index.ts`):
   ```ts
   export type Route = 'home' | 'game';
   ```
2. Файл экрана по образцу `src/screens/game.ts` (помощники — `src/screens/ui.ts`) и строка в таблице:
   ```ts
   export const screens: Record<Route, ScreenMount> = { home, game };
   ```
3. Игровой экран (без HUD и нижнего меню) — в `GAMEPLAY` там же; нижнее меню — список `MENU`
   (пустой — нижней панели нет; пункты добавлять, только если в лобби несколько разделов):
   ```ts
   export const GAMEPLAY: ReadonlySet<Route> = new Set<Route>(['game']);
   ```
   `src/shell/` при этом не меняется.
4. Вид экрана: содержимое стоит прямо на общем фоне сцены — без своей карточки, рамки и полей
   вокруг сцены (помощники `src/screens/ui.ts` так и рисуют). Фон экрана не рисуется в экране:
   свой фон маршрута — картинка `scene-<маршрут>` в `src/skin/art.ts`, она ложится под всю игру
   вместо общей `scene` ([фон сцены и панели](custom-window-skin.md#фон-сцены-и-панели)). Текст
   на фон не ставить: только на плашке (`.hero-title` в `ui.ts`) или в кнопке.
5. Тексты — по ключам ([add-a-localized-string.md](add-a-localized-string.md)); переход — `ctx.go('<name>')`.
6. Модальных окон своей вёрсткой нет: ни карточки окна с затемнением, ни `role="dialog"`, ни слоя
   `position: fixed` / `absolute` на весь экран — такой слой экрана ограничен его областью
   (`contain: paint` слота экрана), затемнение не доходит до краёв и топбара. Окно —
   `ctx.window.open({ title, body, actions })`, слой — `ctx.overlay({ draw })`
   ([game-windows.md](game-windows.md)); `tests/screens-modals.test.mjs` перечисляет нарушения
   (`SCREENS_STRICT=1` — провал).

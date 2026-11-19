# Идентификаторы и раскладки окон (#1165)

В ui-kit — механизмы окон и тема ManyPlay. Игра регистрирует окна и скины,
связывает их с SDK, передаёт данные и обрабатывает intents. Этот этап #1165 доводит
механизмы ui-kit; регистрации потребителей и полная визуальная приёмка остаются
незакрытыми критериями общей задачи (см. список ниже).

Источник id и привязок — `packages/ui-kit/src/catalog.json`. `./windows` экспортирует
`KIT_WINDOWS`, `windowDefinition(id)` и ленивый `loadWindow(id, variant?)`.
Неизвестный id / вариант отвергается (`UI_WINDOW_UNKNOWN` / `UI_WINDOW_VARIANT_UNKNOWN`),
алиасов старых id нет. Служебные экраны помечены `devOnly` и этим загрузчиком не открываются.
Имена экспортов компонентов и ключи скинов не являются id окон; append-only
`skin-keys.json` не переименовывается. `component:idAccount` добавлен.

```ts
import { loadWindow } from '@manygamescorp/ui-kit/windows';
const inventory = await loadWindow('inventory'); // InventoryWindowProps
inventory.mount(container, { elementId: 'inventory', lang: 'ru', emitIntent,
  tab: 'items', currencies: [], items: [] });
// Другой макет того же назначения, без второго id:
const board = await loadWindow('daily-reward', 'board'); // DailyBoardProps
```

## Сверка с макетами

Каждая строка имеет P+L в выгрузке MPS и INDEX.md; это проверяется тестом.
Привязка артборда описывает назначение компонента, а не обещает реализацию каждого
состояния картинки: например, почта принимает уже доставленные сообщения и отправляет
`read` / `readAll`, не выполняет выдачу наград. Hall использует тот же leaderboardWindow;
данные и вкладку выбирает хост. Игра не создаёт второй id `leaderboard-hall`.

| id | Компонент | Артборды (P и L) |
| --- | --- | --- |
| `login` | `services/login:login` | MP_Start, MP_Email, MP_Code, MP_Confirm, MP_SocialEmail |
| `offer` | `services/shop:limitedOffer` | D_Offer, B_Offer |
| `reward` | `services/reward-window:rewardWindow` | D_Reward |
| `daily-reward` | `services/progress:dailyReward` | D_Daily |
| `ad-slot` | `services/cross-promo:promoSlot` | CP_AdSlot |
| `bonus` | `services/cross-promo:promoBonus` | CP_Bonus |
| `lives` | `services/cross-promo:promoLives` | CP_Lives |
| `mail` | `services/mailbox:mailbox` | D_Mail |
| `inventory` | `services/inventory-windows:inventoryWindow` | D_Inventory |
| `chests` | `services/inventory-windows:chestsWindow` | D_Chests |
| `chest-opened` | `services/inventory-windows:chestOpened` | D_Chests |
| `skin-detail` | `services/inventory-windows:skinDetail` | B_SkinDetail |
| `collection` | `services/collection:cardCollection` | B_Collection |
| `card-detail` | `services/collection:cardDetail` | B_CardDetail |
| `album` | `services/collection:cardAlbum` | CP_Album |
| `shelf` | `services/collection:gamesShelf` | CP_Shelf |
| `easter` | `services/collection:easterGuest` | CP_Easter |
| `leaderboard` | `services/leaderboard-window:leaderboardWindow` | D_Leaderboard |
| `error` | `services/error:error` | D_Toasts, D_PurchaseError |
| `popup` | `services/popup:popup` | Popup |
| `confirm` | `services/popup:confirm` | D_Confirm |
| `settings` | `services/settings:settings` | D_Settings |
| `pause` | `services/level-windows:pause` | D_Pause |
| `help` | `services/level-windows:levelGoal` | D_Help |
| `shop` | `services/iap-windows:shopWindow` | D_Shop, B_Shop, B_Shop2 |
| `offer-chain` | `services/iap-windows:offerChain` | B_OfferChain |
| `calendar` | `services/daily-rewards:dailyCalendar` | CP_Calendar |
| `gift` | `services/daily-rewards:dailyGift` | B_Gift |
| `level-map` | `services/progress-windows:levelMap` | D_LevelMap |
| `win` | `services/progress-windows:levelWin` | D_Win |
| `lose` | `services/progress-windows:levelLose` | D_Lose |
| `level-fail` | `services/progress-windows:levelFail` | CP_LevelFail |
| `points` | `services/progress-windows:points` | CP_Points |
| `quests` | `services/progress-windows:quests` | D_Quests, B_Quests |
| `cross-quest` | `services/progress-windows:crossQuest` | CP_Quest |
| `season` | `services/progress-windows:season` | CP_Season |
| `content-end` | `services/progress-windows:contentEnd` | CP_ContentEnd |
| `continue` | `services/progress-windows:continueAs` | CP_Continue |
| `endless` | `services/progress-windows:endlessHud` | B_Endless |
| `endless-entry` | `services/progress-windows:endlessEntry` | B_EndlessEntry |
| `endless-revive` | `services/progress-windows:endlessRevive` | B_EndlessRevive |
| `endless-result` | `services/progress-windows:endlessResult` | B_EndlessResult |
| `id-account` | `services/login:idAccount` | MP_Account, MP_Games, MP_Confirm |

`daily-reward/board` — dailyBoard, B_Daily. Основной daily-reward — D_Daily.
`leaderboard/hall` — та же таблица D_Leaderboard; отдельного окна hall нет.
`shelf` и `endless` — компоненты, не игровой раунд ui-kit.

## Переименования

| Было | Стало |
| --- | --- |
| inventory-window | inventory |
| leaderboard-window / leaderboard-hall | leaderboard (hall — вариант/вкладка) |
| chests-window | chests |
| limited-offer | offer; цепочка — offer-chain |
| level-goal | help |
| mailbox (route) | mail (window) |
| promo-slot / promo-bonus / promo-lives | ad-slot / bonus / lives |
| card-album / card-collection / games-shelf / easter-guest | album / collection / shelf / easter |
| progress | level-map / win / lose / endless-* и остальные самостоятельные окна |
| retention | daily-reward / calendar / quests |
| ui-shell-settings | settings |

Прежние комбинированные демонстрационные компоненты inventory, shop, leaderboard,
leaderboardHall, progress и retention остаются диагностическими экспортами; их записи
каталога теперь `dev-*`, `devOnly: true`, это не алиасы игровых окон.
Стандартные элементы оболочки — error, popup, confirm, settings, reward.
Их владельцы в очереди SDK по-прежнему ui.error, ui.popup, ui.confirm, ui.settings,
ui.reward с action main: это адрес владельца, а не второй id окна. REWARD_WINDOW
обозначает владельца; REWARD_ELEMENT — канонический id reward в оболочке.
Триггеры и регистрации SDK/игры переводятся отдельной задачей своего репозитория.

## Поворот и скины

У FeatureProps есть `orientation: auto | portrait | landscape`. `auto` разрешается
из реального viewport. При повороте компонент перерисовывается с прежним локальным
состоянием, без unmount/mount и без intent. Обработчик resize снимается на unmount.
Login использует этот же механизм, его MP-раскладка меняется без потери введённого email.
Встроенные ManyPlay CSS используют свои раскладки MPS для горизонтального viewport;
дополнительные ограничения по высоте/ширине сохраняют компактные макеты телефона.

Шаблон скина может независимо задавать mode, slots, heading каждой ориентации.
Выбранный вариант заменяет базовую раскладку; если его нет, используется базовая.
Настройки клонируются и замораживаются, неверные варианты отвергаются до установки скина.

```ts
windows: { shopWindow: {
  mode: 'centered',
  portrait: { mode: 'centered', slots: ['balance', 'deals', 'free'] },
  landscape: { mode: 'fullscreen', slots: ['deals', 'balance', 'free'] }
} }
```

`data-orientation` на рамке — хук CSS скина; slots не скрывают неперечисленные части
и сохраняют intents. Это механизм структурной раскладки, не автомасштабирование.
Окно mail реализовано по D_Mail: в портрете список и действия идут стопкой,
в landscape — отдельная колонка действий и компактный прокручиваемый список.
Письма ограничены 50; даты локализует хост через dateLabel, исходное at остаётся в time.
Служебные сведения о push/email убраны из игрового окна.

## ManyPlay ID и отсутствующие экраны

Login — одно окно с экранами id-start, id-email, id-code, id-confirm,
id-social-email по соответствующим MP_*. id-account — отдельный компонент того же
неизменяемого фирменного слоя, с профилем, моими играми и настройками.
Принимает LoginProps; шаг auth-flow не переключает его на форму входа.

По решению владельца в docs-PR #1166 функции без API — «Скоро»: строки друзей,
валюты без переданного баланса, аватара, online и запросов в друзья не вызывают
команды. Смена аккаунта в настройках заблокирована. Готовые функции профиля,
ника, привязок, выхода и каталога продолжают работать через intents.
Список друзей, история валюты, загрузка аватара и новые ML/WEB landscape-экраны
не рисуются без дизайна Claude. Наличие functional references Supercell из #1166
не заменяет визуальный макет ManyPlay.

Скины mafia-paper принадлежат demo-game. Их регистрацию и недостающие landscape-макеты
(кроме main) этот PR не создаёт; скриншоты ниже показывают только тему ManyPlay ui-kit.
До полной приёмки #1165 требуется:

- Перевести регистрации и triggers demo-game, потребителей SDK и MCP-knowledge
  на согласованные id, не добавляя legacy-алиасов. Владельцы очереди SDK (`ui.*`)
  и имена экспортов компонентов при этом не являются id каталога.
- Получить отсутствующие P/L-макеты друзей, ID Rewards/кросс-валюты, загрузки
  аватара, ML/WEB landscape и mafia-paper (кроме main) от Claude Design.
- Реализовать утверждённые макеты и приложить снимки обоих скинов; текущие
  снимки подтверждают рендер ManyPlay, не выполнение визуальной приёмки всех макетов.
- Обновить GamesGenerationFlow v2 по новому каталогу и API шаблонов.

## Проверка

`npx vitest run packages/ui-kit` включает сверку id ↔ INDEX.md ↔ файлы P/L,
реальную загрузку всех компонентов и вариантов, Chromium-render обеих ориентаций,
поворот без потери черновика, независимые шаблоны и валидацию, unmount и отсутствие
утечек между mount. Gallery использует синтетические данные без SDK/API.
Снимки — [галерея](ui-kit-screens/1165/README.md), не эталоны визуального diff.
Повторная генерация: `UIKIT_WINDOW_SHOTS=docs/ui-kit-screens/1165 npx vitest run
packages/ui-kit/test/window-gallery.test.ts packages/ui-kit/test/window-rotation.test.ts`.

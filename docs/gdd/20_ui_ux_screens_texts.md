# 20 — UI/UX: экраны, переходы, HUD, тексты, хуки (`ui.`)

Источник чисел, id и экранов — `00_MASTER.md` (§2, §5, §6, §8, §12, §13). Базовая локаль `en`; все видимые строки идут через `sdk.l10n.t(key, params)`, литералов в коде нет. Рекламы нет нигде: ни слотов `ad-banner-slot`, ни rewarded-кнопок.

## `ui.principles` — общие правила

- Все окна (S01–S04, S06–S16) — компоненты UI Kit со скином игры (`src/theme/`: токены `--mp-*`, холодный сланцево-синий + teal-сталь, оранжевое магма-свечение на primary CTA, кислотно-зелёные акценты, рамки из клёпаного металла — §21). Игра передаёт props и получает `kit:intent`; окна идут через очередь UI Kit (`ui-kit/window-queue`), не накладываются.
- S05 — поле Canvas 2D рисует игра; HUD поверх поля — HTML-элементы UI Kit (счётчики, кнопки) в скине игры, владелец `match-hud`.
- Фулскрин без пустых полей: фон (каменная стена туннеля, §21) — full-bleed на весь вьюпорт под всеми слоями; поле, панели и окна масштабируются внутри него. Чёрных/пустых полос нет ни в одной ориентации.
- Ориентация определяется по вьюпорту: `aspect < 0.8` → `portrait`, иначе ширина `< 1024` → `landscape`, иначе `desktop`. Значение пишется в `data-layout` на корне. Схема управления — по устройству ввода, не по ориентации: при `pointer: coarse` показываются стик и FIRE, при `pointer: fine` — подсказки клавиш (D-20-01).
- Размер клетки поля: `cell = floor(fieldPx / 13)`, поле = `13 × cell`, остаток делится поровну как поля фона.
- Тач-цели ≥ 48×48 px (CSS), между целями ≥ 8 px. Шрифты UI ≥ 14 px в portrait, ≥ 16 px на desktop.

## `ui.screens` — инвентарь S01–S16

Раскладка: **P** = portrait 390×844, **L** = landscape 844×390, **D** = desktop 1440×900.

| S | `data-window` | Назначение | Раскладка |
|---|---|---|---|
| S01 Boot/Loading | `boot` | Лоадер SDK, `sdk.boot()`, загрузка ассетов; ошибка сети → кнопка Retry | P: логотип в верхней трети, прогресс-бар снизу над safe-area. L/D: логотип по центру слева, прогресс-бар по центру внизу |
| S02 Lobby | `lobby` | Хаб: Play (кампания), Siege, верхняя панель функций (hud), прогресс звёзд; разовое окно стартового гранта | P: топ-бар сверху; арт Burrower + Ядро в центре; Play (крупно) и Siege внизу. L/D: топ-бар сверху; арт слева 55 %; справа колонка Play / Siege / звёзды |
| S03 Stage Map | `stage-map` | 3 главы × 10 узлов, звёзды, «Play Stage N» | P: вкладки глав сверху, вертикальный серпантин из 10 узлов, CTA снизу. L/D: вкладки слева столбцом, узлы горизонтальной змейкой 5×2 по центру, CTA справа снизу |
| S04 Pre-stage | `prestage` | Цель стадии, лучший счёт/звёзды, тумблер Spare Hull, Start; при `bst_hull = 0` — ссылка в магазин | P: модальное окно-карточка по центру, ширина 92 %. L/D: карточка 560 px по центру |
| S05 Gameplay + HUD | `game` | Поле 13×13, HUD, управление | P: верхняя HUD-полоса 48 px; поле во всю ширину (390×390, cell 30); ряд из 3 бустеров 64 px; ниже зона управления (~340 px): стик слева, FIRE справа. L: поле 390×390 по центру по высоте; слева — враги/жизни/стадия и стик; справа — очки, пауза, 3 бустера, FIRE. D: поле по высоте с полями 16 px (cell 66, 858×858) по центру; слева панель стадии/врагов/жизней; справа очки, бустеры с подсказками клавиш 1–3, пауза (Esc) |
| S06 Pause | `pause` | Resume / Restart / Settings / Quit | Модальная карточка по центру во всех ориентациях; поле под затемнением 60 % |
| S07 Stage Clear | `stage-clear` | Звёзды, разбивка очков, ряд наград, Next/Replay/Map | P: звёзды сверху, очки, ряд наград (до 3 в ряд, переносом), кнопки снизу. L/D: слева звёзды+очки, справа ряд наград и кнопки |
| S08 Defeat | `defeat` | Причина, Continue за Spare Hull, оффер (Hull Pack / Starter Crate), Retry/Map | P: причина сверху, Continue крупно, карточка оффера, вторичные кнопки снизу. L/D: слева причина и Continue, справа карточка оффера |
| S09 Siege Result | `siege-result` | Волна, счёт, лучший за неделю, ранг, Play Again / Leaderboards / Lobby | Модальная карточка; P — столбцом, L/D — счёт слева, ранг и кнопки справа |
| S10 Shop | `shop` | Наборы бустеров за реальные деньги (UI Kit shop + `iap.offers`) | P: вертикальный список карточек. L: горизонтальная лента 3 видимых карточки. D: сетка 5 карточек в ряд |
| S11 Purchase result | `purchase-result` | Успех (ряд наград) / ошибка / отмена | Модальная карточка по центру; ряд наград как в S07 |
| S12 Daily Rewards | `daily` | 7-дневный календарь, Claim | P: сетка 3+3, день 7 широкой плашкой снизу, Claim снизу. L/D: 7 карточек в ряд, день 7 в 1.5 ширины, Claim под ними |
| S13 Leaderboards | `leaderboards` | Вкладки `siege_best` / `campaign_score`, период weekly/all-time, строка игрока | UI Kit leaderboard; P — во весь экран под топ-баром; L/D — карточка 720 px по центру, строка игрока закреплена снизу |
| S14 Settings | `settings` | Music, Sound, Reduce Motion, Vibration (тач), ManyPlay ID / профиль (компонент UI Kit), версия | Модальная карточка; P — 92 % ширины; L/D — 520 px |
| S15 Tutorial overlay | `tutorial` | Подсказки стадии 1 (§14) поверх S05 | Облако-подсказка со стрелкой к цели; P — над зоной управления; L/D — над полем у края цели. Поле на паузе только на шагах с кнопкой |
| S16 Booster info | `booster-info` | Карточка бустера: картинка, имя, эффект, лимит, количество, «Get more» | Модальная карточка 360 px (P — 92 %); игра на паузе пока окно открыто |

**Стартовый грант (§6)** — не отдельный экран: при первом входе S02 получает состояние `data-state="grant"` и через очередь UI Kit показывает окно наград (ряд из 4 картинок ×2) с кнопкой Collect (D-20-02).

## `ui.flow` — переходы

| from | event | to |
|---|---|---|
| S01 | `sdk:core:ready` + ассеты загружены | S02 (ставится `data-testid="app-ready"`) |
| S01 | ошибка boot / сети | S01 `data-state="error"` → Retry → S01 |
| S02 | первый вход, грант не выдан | S02 `grant` → Collect → S02 `ready` |
| S02 | вход со 2-го дня, награда дня доступна (раз в день) | S12 (D-20-11) |
| S02 | `lobby-play` | S03 (открыта глава текущей стадии) |
| S02 | `lobby-siege` (открыт после стадии 5) | S04 (режим siege) |
| S02 | `topbar-daily` / `topbar-shop` / `topbar-leaderboards` / `topbar-settings` | S12 / S10 / S13 / S14 |
| S03 | `stagemap-play` или открытый `stage-node` | S04 |
| S03 | `stagemap-back` | S02 |
| S04 | `prestage-start` | S05 (стадия 1 при первом запуске → + S15) |
| S04 | `prestage-shop` (при `bst_hull = 0`) | S10 → закрытие → S04 |
| S04 | `prestage-close` | S03 (siege → S02) |
| S05 | `hud-pause` / Esc / вкладка скрыта / смена `data-layout` | S06 |
| S05 | бустер с количеством 0 или long-press 500 ms на бустере | S16 (игра на паузе) |
| S05 | уничтожены все 20 врагов (кампания) | S07 через 1500 ms (`fx.stage_clear`) |
| S05 | Ядро уничтожено или жизней 0 | S08 через 1800 ms (`fx.core_destroyed` / `fx.player_death`) |
| S06 | `pause-resume` / Esc | S05 |
| S06 | `pause-restart` | S05 (новая попытка той же стадии, бустеры не возвращаются) |
| S06 | `pause-settings` | S14 → закрытие → S06 |
| S06 | `pause-quit` | кампания: S03; siege: S09 (счёт отправляется) |
| S07 | `clear-collect` (есть награды) | S07 `collected` |
| S07 | `clear-next` | S04 стадии N+1 (после стадии 30 → S02) |
| S07 | `clear-replay` / `clear-map` | S04 той же стадии / S03 |
| S07 | закрыт после первого clear стадии 3, Starter Crate не куплен | S10 с фокусом на Starter Crate (через очередь окон) |
| S08 | `defeat-continue`, `bst_hull ≥ 1`, continue ещё не использован | S05: +2 жизни, Ядро и стена восстановлены |
| S08 | `defeat-continue` при `bst_hull = 0` | S16 (Spare Hull) → Get more → S10 |
| S08 | `defeat-offer-buy` | платёжный лист платформы → S11 → S08 (количество обновлено) |
| S08 | `defeat-retry` / `defeat-map` | S04 / S03; siege: `defeat-map` → S09 |
| S09 | `siege-retry` / `siege-boards` / `siege-lobby` | S04 siege / S13 (вкладка Siege) / S02 |
| S10 | `shop-buy` | платёжный лист → S11 |
| S10 | `shop-close` | предыдущий экран |
| S11 | `purchase-ok` | S10 (или экран-источник: S04/S08) |
| S12 | `daily-claim` | S12 `claimed` (анимация ряда наград) |
| S12 / S13 / S14 / S16 | `*-close` | предыдущий экран |
| S14 | `settings-profile` | окно ManyPlay ID UI Kit → S14 |
| S15 | `tutorial-next` / выполнено действие шага | следующий шаг / S05 |
| S15 | `tutorial-skip` | S05, флаг туториала записан в profile-pack |

## `ui.hud` — HUD S05

| Элемент | data-part | Содержимое |
|---|---|---|
| Враги осталось | `hud-enemies` | иконка Rustbug + число оставшихся из 20 (siege: в волне из 10); `data-dynamic` |
| Жизни | `hud-lives` | иконка Burrower + число; при потере — `fx.ui_life_lost` |
| Стадия / волна | `hud-stage` | `Stage {n}` / `Wave {n}` |
| Очки | `hud-score` | число с разделителем тысяч; `data-dynamic` |
| Бустеры ×3 | `hud-booster-bubble`, `hud-booster-shockwave`, `hud-booster-fortify` | крупная иконка, бейдж количества (`hud-booster-count`), кольцо таймера действия; `data-state="ready|active|limit|empty"`; desktop — подпись клавиши 1/2/3 |
| Пауза | `hud-pause` | иконка; desktop — подпись Esc |
| Стик | `stick` | только `pointer: coarse`; плавающий: центр там, где палец коснулся в зоне стика; мёртвая зона 12 %; 4 направления (доминирующая ось) |
| FIRE | `fire` | только `pointer: coarse`; 96 px (P), 88 px (L); удержание = автоогонь с темпом перезарядки |
| Тосты | `hud-toast` | строки `ui.toast.*` над полем, 1200 ms |

Spare Hull в HUD не показывается (только S04 и S08). Лимиты на стадию (§6): bubble 2, shockwave 1, fortify 1; siege — ×2 (§9).

## `ui.lobby_topbar` — верхняя панель лобби

Топ-бар — UI Kit; иконки функций регистрируются через SDK-модуль `hud` (`register`, `setBadge`) владельцем-модулем каждой функции. Порядок слева направо: daily, shop, leaderboards, settings. Валют в топ-баре нет (их нет в MVP).

| Иконка | data-part | Бейдж (`setBadge`) | Владелец |
|---|---|---|---|
| Daily | `topbar-daily` | «!» если награда дня доступна | `daily` (daily-rewards) |
| Shop | `topbar-shop` | «1» пока активен неоткупленный Starter Crate | `shop` (iap) |
| Leaderboards | `topbar-leaderboards` | точка: Siege только что открыт или прошёл недельный сброс с последнего открытия | `boards` (leaderboards) |
| Settings | `topbar-settings` | точка: игрок гость и прошёл ≥ 3 стадий (предложение войти в ManyPlay ID) | `settings` (profile-pack) |

## `ui.rewards` — окна наград

Компонент UI Kit «reward» в скине игры, используется в S02 (грант), S07, S11, S12.
- Каждая награда — отдельная карточка `reward-item`: крупная картинка предмета (P 96 px, L 80 px, D 128 px) и количество `×{count}` (`reward-item-count`) снизу справа на картинке. Одинаковые предметы не сливаются с разными, разные предметы — отдельные карточки.
- Все награды выкладываются **рядом** крупных картинок; при > 4 (P) / > 6 (L/D) — перенос на вторую строку, центрированно.
- Появление: по одной, шаг 120 ms (`fx.reward_reveal`); Collect активен после последней.
- Данные — из ответа модуля (progress level rewards, daily-rewards claim, iap purchase); игра не считает награду сама.

## `ui.settings` — настройки (S14)

| Элемент | data-part | Хранение |
|---|---|---|
| Music on/off | `settings-music` (`data-state="on|off"`) | profile-pack kv `settings.music` |
| Sound on/off | `settings-sfx` (`data-state="on|off"`) | `settings.sfx` |
| Reduce Motion | `settings-motion` (`data-state="on|off"`) | `settings.motion`; по умолчанию = `prefers-reduced-motion` (D-20-03) |
| Vibration (только тач и если `sdk.device.haptics` доступен) | `settings-haptics` (`data-state="on|off"`) | `settings.haptics` (23 `aud.settings`) |
| ManyPlay ID / профиль | `settings-profile` | компонент UI Kit (вход, имя, аватар); гость → кнопка Sign In |
| Версия | `settings-version` | `Version {version}` |

Изменения применяются сразу, без кнопки Save. Язык не показывается (одна локаль в MVP).

## `ui.safe_zones` — сейф-зоны

- Все интерактивные элементы и HUD — внутри `env(safe-area-inset-*)` + 12 px. Фон и поле фона — под всей областью, включая вырезы.
- P: стик и FIRE не ниже `100vh − inset-bottom − 24 px` (home indicator); поле не перекрывается топ-баром/HUD-полосой.
- L: боковые колонки отсчитываются от `inset-left/right` (вырез камеры); поле всегда целиком видимо, если колонка уже 180 px — HUD-счётчики уменьшаются до 0.85 масштаба, кнопки не меньше 48 px.
- D: окна не шире 1200 px, по центру; поле никогда не масштабируется выше `cell = 72`.
- Тосты и подсказки S15 не перекрывают нижние 2 ряда поля (зона Ядра).

## `ui.strings` — строки (`en`, ключи `sdk.l10n`)

| key | en |
|---|---|
| ui.common.close | Close |
| ui.common.back | Back |
| ui.common.ok | OK |
| ui.common.collect | Collect |
| ui.common.count | ×{count} |
| ui.common.offline | No connection. Reconnecting... |
| ui.boot.loading | Digging in... |
| ui.boot.error | Can't reach the server. |
| ui.boot.retry | Retry |
| ui.lobby.title | Iron Burrow |
| ui.lobby.play | Play |
| ui.lobby.play_sub | Stage {n} |
| ui.lobby.siege | Siege |
| ui.lobby.siege_locked | Clear stage 5 to unlock |
| ui.lobby.stars | {stars}/90 |
| ui.lobby.grant_title | Welcome, Burrower! |
| ui.lobby.grant_body | Your starter boosters |
| ui.topbar.daily | Daily |
| ui.topbar.shop | Shop |
| ui.topbar.leaderboards | Ranks |
| ui.topbar.settings | Settings |
| ui.map.title | Campaign |
| ui.map.chapter | Chapter {n} |
| ui.map.chapter_1 | Clay Tunnels |
| ui.map.chapter_2 | Iron Works |
| ui.map.chapter_3 | Magma Depths |
| ui.map.chapter_locked | Clear stage {n} to open |
| ui.map.play | Play Stage {n} |
| ui.pre.title | Stage {n} |
| ui.pre.title_siege | Siege |
| ui.pre.goal | Destroy {count} Rustbugs. Protect the Core! |
| ui.pre.goal_siege | Survive the waves. Protect the Core! |
| ui.pre.best | Best: {score} |
| ui.pre.hull | Take a Spare Hull (+1 life) |
| ui.pre.hull_owned | You have {count} |
| ui.pre.hull_none | No Spare Hulls left |
| ui.pre.shop | Get more |
| ui.pre.start | Start |
| ui.hud.enemies | Rustbugs left: {count} |
| ui.hud.lives | Lives: {count} |
| ui.hud.stage | Stage {n} |
| ui.hud.wave | Wave {n} |
| ui.hud.score | Score |
| ui.hud.fire | FIRE |
| ui.hud.pause | Pause |
| ui.hud.key | {key} |
| ui.hud.limit | Limit reached |
| ui.toast.go | Stage {n}. Go! |
| ui.toast.wave | Wave {n} |
| ui.toast.wave_clear | Wave {n} cleared! +{bonus} |
| ui.toast.star | Gun Up! |
| ui.toast.star_max | Gun Maxed! |
| ui.toast.bubble | Shield On! |
| ui.toast.rebar | Rebar Wall! |
| ui.toast.quake | Quake! |
| ui.toast.freeze | Freeze! |
| ui.toast.hull | +1 Life! |
| ui.toast.fortify | Steel Fortress! |
| ui.toast.shockwave | Shockwave! |
| ui.pause.title | Paused |
| ui.pause.resume | Resume |
| ui.pause.restart | Restart Stage |
| ui.pause.settings | Settings |
| ui.pause.quit | Quit |
| ui.clear.title | Stage Clear! |
| ui.clear.chapter_done | Chapter Complete! |
| ui.clear.campaign_done | Campaign Complete! |
| ui.clear.kills | Rustbugs |
| ui.clear.pickups | Power-ups |
| ui.clear.bonus | Clear bonus |
| ui.clear.lives | Lives left ×{count} |
| ui.clear.total | Score |
| ui.clear.best | New Best! |
| ui.clear.rewards | Rewards |
| ui.clear.next | Next Stage |
| ui.clear.replay | Replay |
| ui.clear.map | Map |
| ui.defeat.title | Defeat |
| ui.defeat.core | The Core was destroyed! |
| ui.defeat.lives | Out of lives! |
| ui.defeat.continue | Continue |
| ui.defeat.continue_hint | Use 1 Spare Hull: +2 lives, Core rebuilt |
| ui.defeat.continue_used | Continue already used |
| ui.defeat.offer_title | Need more hulls? |
| ui.defeat.retry | Retry |
| ui.defeat.map | Map |
| ui.defeat.end_siege | End Run |
| ui.siege.title | Siege Over |
| ui.siege.wave | Reached wave {n} |
| ui.siege.score | Score: {score} |
| ui.siege.best | Best this week: {score} |
| ui.siege.rank | Rank #{rank} |
| ui.siege.unranked | Unranked |
| ui.siege.retry | Play Again |
| ui.siege.boards | Leaderboards |
| ui.siege.lobby | Lobby |
| ui.shop.title | Shop |
| ui.shop.one_time | One-time offer |
| ui.shop.best_value | Best value |
| ui.shop.contents | {count} boosters |
| ui.shop.buy | {price} |
| ui.shop.pending | Processing... |
| ui.shop.owned | Purchased |
| ui.shop.test | Test purchase |
| ui.shop.unavailable | Shop is unavailable. Try again later. |
| ui.pack.starter | Starter Crate |
| ui.pack.hull | Hull Pack |
| ui.pack.field | Field Kit |
| ui.pack.heavy | Heavy Arsenal |
| ui.pack.commander | Commander Cache |
| ui.purchase.success | Purchase Complete |
| ui.purchase.failed | Purchase Failed |
| ui.purchase.failed_body | No charge was made. Please try again. |
| ui.purchase.cancelled | Purchase Cancelled |
| ui.daily.title | Daily Supplies |
| ui.daily.day | Day {n} |
| ui.daily.claim | Claim |
| ui.daily.claimed | Claimed |
| ui.daily.next | Next in {time} |
| ui.boards.title | Leaderboards |
| ui.boards.siege | Siege |
| ui.boards.campaign | Campaign |
| ui.boards.weekly | This Week |
| ui.boards.alltime | All Time |
| ui.boards.you | You |
| ui.boards.empty | No scores yet. Be the first! |
| ui.boards.reset | Resets in {time} |
| ui.boards.guest | Sign in to keep your rank |
| ui.settings.title | Settings |
| ui.settings.music | Music |
| ui.settings.sfx | Sound |
| ui.settings.motion | Reduce Motion |
| ui.settings.haptics | Vibration |
| ui.settings.on | On |
| ui.settings.off | Off |
| ui.settings.profile | ManyPlay ID |
| ui.settings.signin | Sign In |
| ui.settings.signed | Signed in as {name} |
| ui.settings.guest | Playing as guest |
| ui.settings.version | Version {version} |
| ui.tut.move_touch | Drag the stick to drive |
| ui.tut.move_keys | Use WASD or arrows to drive |
| ui.tut.fire_touch | Tap FIRE to shoot |
| ui.tut.fire_keys | Press Space to shoot |
| ui.tut.brick | Shots chew through brick. Steel needs a stronger gun. |
| ui.tut.core | Protect the Core! One hit and it's over. |
| ui.tut.carrier | Hit flashing Rustbugs to drop power-ups |
| ui.tut.booster | In trouble? Tap a booster. |
| ui.tut.next | Got it |
| ui.tut.skip | Skip |
| ui.booster.bst_bubble | Bubble Shield |
| ui.booster.bst_bubble_desc | You can't be hurt for 10 s. Up to 2 per stage. |
| ui.booster.bst_shockwave | Shockwave |
| ui.booster.bst_shockwave_desc | Destroys every Rustbug on the field. 1 per stage. |
| ui.booster.bst_fortify | Steel Fortress |
| ui.booster.bst_fortify_desc | Turns the Core wall to steel for 20 s and rebuilds it. 1 per stage. |
| ui.booster.bst_hull | Spare Hull |
| ui.booster.bst_hull_desc | +1 life before a stage, or continue after defeat. |
| ui.booster.owned | You have {count} |
| ui.booster.more | Get more |

Числа и цены форматируются `Intl` по `sdk.l10n.locale()`; `{price}` — локализованная строка цены из `iap.offers`, не литерал. Имена наборов из §12 — ключи `ui.pack.*`; состав берётся из оффера.

## `ui.hooks` — UI hooks

`data-window` ставится на корень каждого окна (значения — колонка `data-window` в `ui.screens`); `data-state` — на корень окна и на элементы, где указано. Хуки, которые UI Kit рендерит сам, игра передаёт пропсом компонента (`part`/`testid`); если компонент не пробрасывает атрибут — игра оборачивает его в контейнер с атрибутом (D-20-04).

| window | state | element | data-part / data-testid | data-cta | owner module |
|---|---|---|---|---|---|
| root | `loading` → `ready` | корень приложения, `data-layout="portrait|landscape|desktop"` | `data-testid="app-ready"` (появляется, когда S02 отрисован, в т.ч. в состоянии `grant`) | — | `app` |
| root | `unlocked|locked` | скрытый статус аудио, `data-music`, `data-sfx` = `on|off` | `data-testid="audio-state"` | — | `audio` |
| boot | `loading|error` | прогресс-бар | `boot-progress` | — | `app` |
| boot | `error` | Retry | `boot-retry` | primary | `app` |
| lobby | `ready|grant` | Play | `lobby-play` | primary | `lobby` |
| lobby | `locked|open` | Siege | `lobby-siege` | — | `lobby` |
| lobby | `ready` | звёзды кампании | `lobby-stars` | — | `lobby` |
| lobby | `ready` | иконка Daily (+бейдж) | `topbar-daily` | — | `daily` (hud, daily-rewards) |
| lobby | `ready` | иконка Shop | `topbar-shop` | — | `shop` (hud, iap) |
| lobby | `ready` | иконка Leaderboards | `topbar-leaderboards` | — | `boards` (hud, leaderboards) |
| lobby | `ready` | иконка Settings | `topbar-settings` | — | `settings` (hud, profile-pack) |
| lobby, stage-clear, purchase-result, daily | `grant|pending|claimable` | карточка награды / количество | `reward-item` / `reward-item-count` | — | ui-kit (reward) |
| lobby | `grant` | Collect гранта | `grant-collect` | reward | `lobby` (inventory) |
| stage-map | `ready` | вкладка главы, `data-state="locked|open"` | `chapter-tab` | — | `campaign` |
| stage-map | `ready` | узел стадии, `data-state="locked|open|cleared"`, `data-stars` | `stage-node` | — | `campaign` (progress) |
| stage-map | `ready` | Play Stage N | `stagemap-play` | primary | `campaign` |
| stage-map | `ready` | Back | `stagemap-back` | — | `campaign` |
| prestage | `ready` | цель стадии | `prestage-goal` | — | `campaign` |
| prestage | `ready` | тумблер Spare Hull, `data-state="on|off|empty"` | `prestage-hull` | — | `boosters` (inventory) |
| prestage | `ready` | Get more (при `bst_hull = 0`) | `prestage-shop` | — | `shop` |
| prestage | `ready` | Start | `prestage-start` | primary | `campaign` |
| prestage | `ready` | Close | `prestage-close` | — | `campaign` |
| game | `playing|paused|won|lost` | поле Canvas, `data-grid="13x13"`, `data-fx-ack` | `game-field` | — | `match` (+ `fx`) |
| game | `playing` | враги осталось | `hud-enemies` (`data-dynamic`) | — | `match-hud` |
| game | `playing` | жизни | `hud-lives` | — | `match-hud` |
| game | `playing` | стадия / волна | `hud-stage` | — | `match-hud` |
| game | `playing` | очки | `hud-score` (`data-dynamic`) | — | `match-hud` |
| game | `ready|active|limit|empty` | бустер Bubble Shield | `hud-booster-bubble` | — | `boosters` (inventory) |
| game | `ready|active|limit|empty` | бустер Shockwave | `hud-booster-shockwave` | — | `boosters` |
| game | `ready|active|limit|empty` | бустер Steel Fortress | `hud-booster-fortify` | — | `boosters` |
| game | `playing` | количество на кнопке бустера | `hud-booster-count` | — | `boosters` |
| game | `playing` | пауза | `hud-pause` | — | `match-hud` |
| game | `playing` | стик (touch) | `stick` | — | `match` |
| game | `playing` | FIRE (touch) | `fire` | — | `match` |
| game | `playing` | тост | `hud-toast` (`data-dynamic`) | — | `match-hud` |
| pause | `open` | Resume | `pause-resume` | primary | `match-hud` |
| pause | `open` | Restart | `pause-restart` | — | `match-hud` |
| pause | `open` | Settings | `pause-settings` | — | `match-hud` |
| pause | `open` | Quit | `pause-quit` | — | `match-hud` |
| stage-clear | `pending|collected` | звёзды, `data-stars="1..3"` | `clear-stars` | — | `campaign` |
| stage-clear | `pending|collected` | итог очков | `clear-score` (`data-dynamic`) | — | `campaign` |
| stage-clear | `pending` | Collect | `clear-collect` | reward | `campaign` (progress) |
| stage-clear | `collected` | Next Stage | `clear-next` | primary | `campaign` |
| stage-clear | `collected` | Replay | `clear-replay` | — | `campaign` |
| stage-clear | `collected` | Map | `clear-map` | — | `campaign` |
| defeat | `open` | причина, `data-reason="core|lives"` | `defeat-reason` | — | `campaign` |
| defeat | `available|empty|used` | Continue | `defeat-continue` | primary | `boosters` (inventory) |
| defeat | `open` | карточка оффера, `data-pack` | `defeat-offer` | — | `shop` (iap) |
| defeat | `open` | кнопка цены оффера | `defeat-offer-buy` | — | `shop` (iap) |
| defeat | `open` | Retry | `defeat-retry` | — | `campaign` |
| defeat | `open` | Map / End Run | `defeat-map` | — | `campaign` |
| siege-result | `open` | итог (волна, счёт, лучший) | `siege-score` (`data-dynamic`) | — | `siege` |
| siege-result | `ranked|unranked` | ранг | `siege-rank` (`data-dynamic`) | — | `boards` (leaderboards) |
| siege-result | `open` | Play Again | `siege-retry` | primary | `siege` |
| siege-result | `open` | Leaderboards | `siege-boards` | — | `boards` |
| siege-result | `open` | Lobby | `siege-lobby` | — | `siege` |
| shop | `ready|unavailable` | карточка набора, `data-pack`, `data-state="available|owned|pending"` | `shop-pack` | — | `shop` (ui-kit shop, iap) |
| shop | `ready` | кнопка цены набора | `shop-buy` | primary (первая карточка) | `shop` |
| shop | `ready` | Close | `shop-close` | — | `shop` |
| purchase-result | `success|failed|cancelled` | заголовок статуса | `purchase-status` | — | `shop` |
| purchase-result | `success` / иначе | Collect / OK | `purchase-ok` | reward / primary | `shop` (inventory) |
| daily | `claimable|claimed` | день, `data-day="1..7"`, `data-state="claimed|today|locked"` | `daily-day` | — | `daily` (daily-rewards) |
| daily | `claimable` | Claim | `daily-claim` | reward | `daily` |
| daily | `claimable|claimed` | Close | `daily-close` | — | `daily` |
| leaderboards | `loading|ready|empty` | вкладка, `data-board="siege_best|campaign_score"`, `data-state="active|idle"` | `boards-tab` | — | `boards` (ui-kit leaderboard) |
| leaderboards | `ready` | переключатель периода, `data-state="weekly|alltime"` | `boards-period` | — | `boards` |
| leaderboards | `ready` | строка таблицы | `boards-row` (`data-dynamic`) | — | `boards` |
| leaderboards | `ready|empty` | строка игрока | `boards-self` (`data-dynamic`) | — | `boards` |
| leaderboards | любое | Close | `boards-close` | — | `boards` |
| settings | `open` | Music | `settings-music` | — | `settings` (profile-pack) |
| settings | `open` | Sound | `settings-sfx` | — | `settings` |
| settings | `open` | Reduce Motion | `settings-motion` | — | `settings` |
| settings | `open` | Vibration (тач) | `settings-haptics` | — | `settings` |
| settings | `guest|signed` | ManyPlay ID / профиль (UI Kit) | `settings-profile` | — | `settings` (ui-kit profile) |
| settings | `open` | версия | `settings-version` | — | `settings` |
| settings | `open` | Close | `settings-close` | — | `settings` |
| tutorial | `step-1..6` | облако подсказки, `data-step` | `tutorial-hint` | — | `tutorial` |
| tutorial | `step-*` | Got it | `tutorial-next` | primary | `tutorial` |
| tutorial | `step-*` | Skip | `tutorial-skip` | — | `tutorial` |
| booster-info | `open` | карточка, `data-item="bst_*"` | `booster-info-card` | — | `boosters` |
| booster-info | `open` | OK | `booster-info-ok` | primary | `boosters` |
| booster-info | `open` | Get more | `booster-info-shop` | — | `shop` |
| root (только env `test`) | — | QA: мгновенная победа стадии | `data-testid="qa-win"` | — | `qa-tools` |
| root (только env `test`) | — | QA: мгновенное поражение (Ядро) | `data-testid="qa-lose"` | — | `qa-tools` |

### `ui.contract_hooks` — контрактные хуки

| Хук | Где | Смысл |
|---|---|---|
| `data-testid="app-ready"` | корень | ставится один раз, когда S02 отрисован и интерактивен; до этого — нет атрибута |
| `data-window="<id>"` | корень каждого окна | id из `ui.screens`; при закрытии окно удаляется из DOM |
| `data-state` | окна и элементы | значения из таблицы хуков; меняется синхронно с логикой (до анимации) |
| `data-grid="13x13"` | `game-field` | размер логической сетки; `data-cell` = текущий px клетки |
| `data-cta="primary"` | одна главная кнопка окна | ровно одна на окно; в состоянии наград — `data-cta="reward"` |
| `data-fx-ack` | `game-field` | `"<fxId>#<seq>"` после первого кадра, где эффект отрисован (§22 `fx.genre_targets`) |
| `data-testid="audio-state"` | скрытый узел | `data-state="locked|unlocked"` (autoplay), `data-music`, `data-sfx` = `on|off` |
| `data-dynamic` | меняющиеся числа/списки | исключаются из скриншот-сравнения |

QA-хуки `qa-win` / `qa-lose` рендерятся только при `platform.json.environment = "test"` и отсутствуют в prod-сборке (D-20-05).

## Решения

- D-20-01: схема управления выбирается по `pointer: coarse|fine`, а не по ориентации; гибрид (тач-ноутбук) — показывает стик/FIRE и принимает клавиатуру одновременно.
- D-20-02: стартовый грант показывается как окно наград в S02 (`data-state="grant"`), не как отдельный экран; S01–S16 не меняются.
- D-20-03: добавлен тумблер Reduce Motion (по умолчанию из `prefers-reduced-motion`) — нужен §22.
- D-20-04: data-part на элементы UI Kit передаются пропсами или обёрткой игры.
- D-20-05: QA-хуки `qa-win`/`qa-lose` только в тестовом окружении.
- D-20-06: смена раскладки (`data-layout`: portrait/landscape/desktop) и скрытие вкладки во время стадии ставят паузу (S06); поле перестраивается под новую раскладку до показа паузы.
- D-20-07: Siege стартует через S04 (тумблер Spare Hull доступен, как в кампании); `pause-quit` в Siege завершает забег с отправкой счёта.
- D-20-08: Starter Crate после первого clear стадии 3 показывается как S10 с фокусом на наборе через очередь окон, после закрытия S07; после первого поражения — карточкой в S08.
- D-20-09: Continue при `bst_hull = 0` открывает S16 (Spare Hull) с «Get more», а не сразу магазин.
- D-20-10: на S03 есть «Play Stage N» (`stagemap-play`) — ведёт на самую дальнюю открытую стадию; узлы — для переигровки.
- D-20-11: S12 не открывается сам в первой сессии (там уже грант); со второго дня — открывается один раз за календарный день при входе в S02, если награда доступна (через очередь окон, после гранта/покупок).
- D-20-12: Starter Crate присутствует в S10 и бейдже Shop только после триггера (первое поражение или первый clear стадии 3) и до покупки; до этого первая карточка S10 — Hull Pack.

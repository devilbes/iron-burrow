# Iron Burrow — карта скина

Машинная версия — `docs/skin/map.json`. Источники: рецепт `docs/platform/recipes/custom-window-skin.md`,
`design/system/UI_ART_BIBLE.md`, `design/system/palette.json`, ГДД 00/16/20/21.

**Класс жанра: arcade.** Аркадный tank maze shooter (ГДД 00 §2). Материал интерфейса по библии — гладкая
кованая сталь, эмаль и свечение магмы, без бумаги и дерева. Поэтому **растровых деталей интерфейса нет**:
весь вид окна делает код. Растром остаются только фоны сцены, свои значки, картинки предметов и наборов.

## Индивидуальная форма (identity)

| # | Приём | Мера | Основание |
|---|---|---|---|
| 1 | Бронеплита: углы срезаны под 45°, скруглений нет | окно 16 px; кнопки, плитки, капсулы 8 px; поле 4 px | Bible · Shape |
| 2 | Кованая рамка в два контура + светящаяся бирюзовая щель внутри | обводка 1 px, фаска 2 px, щель 1 px на отступе 6 px | Bible · Shape; ГДД 21 ui_popup_frame |
| 3 | Заклёпки только на углах окна, не за текстом | 4 × Ø6 px, 12 px от среза | Bible · Shape, Pillars |
| 4 | Заголовок на выступающей шильде со скосами и оранжевой полосой снизу | h 44, выступ 22, скос 12, полоса 2 px; Russo One 24/32 caps | Bible · Typography; ГДД 21 ui_header_plate |
| 5 | Кнопка — литая плита с нижней гранью, при нажатии проседает | срез 8, грань 4→2 px, h 56/48 | Bible · States, Light and depth |
| 6 | Крестик — квадратная стальная плита, крест из брусков | 40×40, срез 6, бруски 4 px | Bible · Shape; ГДД 21 ui_btn_close |
| 7 | Разделитель — кованая полоса с заклёпками на концах и бирюзовой точкой; ритм отступов | 4 px; Ø6/Ø4; 8/24/24 | Bible · Air, groups; ГДД 21 ui_divider |
| 8 | Холодный металл, жар только у действия: светящиеся вставки, утопленные пазы, кольцо фокуса | свечение 8 px 35 %; inset 0 2 3; фокус 2+2 px | Bible · Pillars, Light and depth |

Крестик стоит в шапке справа (`head-right`). Тени: raised 0/2/4 24 %, floating 0/6/12 32 %, modal 0/12/24 40 % цветом #0A1118.

## Шрифты

| Семейство | Роли | Начертания | Основание |
|---|---|---|---|
| Russo One | display | 400 | Bible · Typography, D-ART-03 |
| Exo 2 | ui, body | 500, 700 | Bible · Typography, D-ART-03 |

Шрифты только с латиницей: базовый язык игры — en. Кириллицу добавит шаг локализации, если понадобится.

## Палитра (раздел Palette в theme.css, 48 строк)

| Переменная | Значение | Роль палитры |
|---|---|---|
| --mp-card-background | #121E29 | slate_deep |
| --mp-card-surface | #1E2E3D | slate_blue |
| --mp-card-raised | #2F4558 | slate_mid |
| --mp-card-line | #2F4558 | slate_mid |
| --mp-card-line-strong | #5D6B75 | rivet_iron |
| --mp-window-background | #0A1118 | slate_abyss |
| --mp-card-fg | #F2F6F7 | text_main |
| --mp-card-muted | #CFE6E8 | steel_frost |
| --mp-card-subtle | #8FA3B0 | text_dim |
| --mp-card-accent | #FF6A1A | magma_orange |
| --mp-card-accent-hover | #FFB23F | magma_hot |
| --mp-card-accent-text | #FFB23F | magma_hot |
| --mp-card-success | #6FC2C4 | steel_teal_light (зелёный — только у врагов) |
| --mp-card-error | #FF3B3B | alarm_red |
| --mp-card-warning | #FFB23F | magma_hot |
| --mp-card-info | #CFE6E8 | steel_frost |
| --mp-card-gold | #FFC845 | core_amber |
| --mp-card-overlay | rgba(10,17,24,.80) | slate_abyss 80 % |
| --game-shade | #0A1118 | slate_abyss |
| --mp-gold-edge | #B5713F | rust_light |
| --mp-wood | #5D6B75 | rivet_iron (дерева нет — железо) |
| --mp-wood-dark | #2F4558 | slate_mid |
| --mp-wood-edge | #0A1118 | slate_abyss |
| --mp-chest-bronze | #D08A5E | clay_brick_light |
| --mp-chest-bronze-deep | #A65A3A | clay_brick |
| --mp-chest-bronze-rim | #7A4A2E | rust_shell |
| --mp-chest-green-deep | #2F7D86 | steel_teal |
| --mp-chest-violet-deep | #B8320C | magma_deep |
| --game-bronze | #D08A5E | clay_brick_light |
| --mp-game-0 … 5 | #2F7D86 #FF6A1A #FFC845 #6FC2C4 #B8320C #D08A5E | steel_teal, magma_orange, core_amber, steel_teal_light, magma_deep, clay_brick_light |
| --game-tone-orange / -blue | #FF6A1A / #6FC2C4 | magma_orange / steel_teal_light |
| --mp-bg-edge-top / --game-bg-mid / --mp-bg-edge-bottom | #0A1118 / #121E29 / #0A1118 | slate_abyss / slate_deep |
| --mp-bg-glow-center / -left / -right | magma 22 % / teal 30 % / teal-light 18 % | свечение Ядра и стали |
| --game-bar-top / -bottom / -line | transparent | сцена идёт под панелями до краёв |
| --game-sheet-paper / -ink | #F2F6F7 / #0A1118 | text_main / slate_abyss |

Кнопки (код, `button-base` нет): основная — magma_orange с гранью magma_deep, вторичная — steel_teal,
кнопка цены — core_amber, опасная — alarm_red, выключенная — та же плита без насыщенности.
Надпись на оранжевой и янтарной кнопке — #0A1118.

## Части

| Часть | Компонент | Глубина | Обоснование |
|---|---|---|---|
| Фон сцены, поля страницы | shell | raster: `scene`, `scene-game` 1920×1200 | Фон — всегда арт игры (ГДД 21 bg_lobby, bg_map_iron); фактура скалы и иллюстрация |
| Верхняя панель | hud | sheet | Bible · Shape: капсулы — плиты со срезом 8 px и фаской |
| HUD по бокам (награды, рейтинг, магазин) | hud | sheet | ГДД 21 S02 + Bible · Shape: квадратные плиты 6 px с оранжевым бейджем |
| Нижнее меню | bottomMenu | recolor | В ГДД нет; полоса прозрачна |
| Экраны игры | * | recolor | Bible · Pillars/Shape: те же правила COMMON |
| Загрузка, ошибка запуска | preloader | recolor | Identity 8: паз и магма кодом, фон `scene` |
| Магазин | shopWindow | sheet | ГДД 21 ui_card + ui_ribbon, D-16-08: кромка выделения и лента «Best value» кодом |
| Награды дня | dailyReward | sheet | ГДД 21 ui_daily_cell: сегодня — оранжевая кромка, день 7 широкий |
| Рейтинг | leaderboardWindow | sheet | ГДД 21 ui_tab, ui_list_row, medal_top3; ступени подиума ≤ 20 px — без 9-slice |
| Профиль | profile | recolor | Bible · Palette: перекраски и общей рамки достаточно |
| Вход ManyPlay ID | login | recolor | Вид входа задаёт кит, менять нельзя |
| Настройки, язык | settings | recolor | Bible · States: тумблер кодом |
| Окно, подтверждение, ошибка | popup, confirm, error | recolor | Identity 2–4, 6: общая рамка, шильда, крестик |
| Награда получена | rewardWindow | recolor | Bible · «Reward art leads»: картинка предмета из ITEMS |
| Окна игры (пауза, итог, поражение, Siege, бустер) | popup [game] | recolor | ГДД 21 ui_popup_frame + ui_header_plate — та же рамка кодом |
| Слой поверх экрана, обучение | --mp-card-overlay | recolor | Bible · Palette: вуаль slate_abyss 80 % |
| Кнопки всех видов | * | recolor | Bible · States: гладкая эмаль — градиент, блик, грань кодом |
| Тестовая оплата | fakePaymentSheet | recolor | Только в тестовых сборках, цвета из палитры |
| Рамка окна (общая) | * | recolor | Identity 1–3: срез, двойной контур, заклёпки — гладкое |
| Плашка заголовка (общая) | * | recolor | Identity 4 |
| Крестик (общий) | * | recolor | Identity 6 |
| Полосы прогресса | * | recolor | Identity 8: свечение магмы кодом |
| Вкладки, тумблеры, бейджи | * | recolor | Bible · Shape + States |
| Картинки бустеров (4) | ITEMS | raster: items/bst_*.webp 256×256 | Предметы — всегда из арта игры (ГДД 21 №40–43) |
| Картинки наборов (5) | OFFERS | raster: offers/<набор>.webp 256×256 | Награды игры — из её арта (ГДД 16, ГДД 21 pack_*) |

**Общие растровые детали: нет.** Рамка, шильда, кнопки, крестик, полосы — один раз в COMMON кодом.

## Значки

Режим **sheet**: свой лист `game-icons.png` (6×5 ячеек по 96 px) поверх перекрашенного стокового атласа.
Причина: Bible · Icons — кованые предметы с обводкой и верхне-левым светом. Плоские стоковые значки
с этим не сочетаются, а чёрные стоковые check, lock, medal-*, sparkle перекраска не меняет.

Ключи листа (29): boost, brand-mark, calendar, check, clock, close, coins*, flame, gems*, gift, heart,
hud-hud-item-view-1, hud-settings, lock, medal, medal-1, medal-2, medal-3, no-signal, play, quest,
rating-star, retry, shop, sparkle, star, stopwatch-chip, trophy, user.
\* Валюты в игре нет: `coins` — ящик снабжения, `gems` — янтарный осколок Ядра.
Предметы и наборы: bst_bubble, bst_shockwave, bst_fortify, bst_hull; offer-starter_crate, -hull_pack,
-field_kit, -heavy_arsenal, -commander_cache — картинки из ITEMS и OFFERS.

## Вес

Лимит — 2 МБ (`SKIN_WEIGHT_LIMIT`). Расчёт: перекрашенный атлас ≈1000 КБ, лист значков 140, шрифты 70,
предметы 80, наборы 125, две сцены по 200, тема и листы 30 — итого ≈1845 КБ.
Если не уложимся, первыми ужимаем сцены до 1600×1000.

## Решения (перенести в docs/gdd/DECISIONS.md при слиянии)

| ID | Решение | Почему |
|---|---|---|
| D-SKIN-01 | arcade; растровых деталей интерфейса ноль | Гладкая кованая сталь: нет фактуры и неровного контура |
| D-SKIN-02 | 24 растровых элемента ГДД 21 art.uiskin для окон кита не генерируются, их вид делает код | Ничего такого, чего не нарисует код; экономия веса и генераций. Рамку поля, плашки HUD, слоты бустеров и клавиши решает шаг ассетов игры |
| D-SKIN-03 | Свой лист из 29 значков; coins и gems — не монеты | Bible · Icons, «No currency in v1» |
| D-SKIN-04 | Russo One + Exo 2, только латиница | Bible · Typography, язык en |
| D-SKIN-05 | Успех — бирюзовый, не зелёный | Зелёный только у врагов |

Расхождение при слиянии: в конфигах шаблона лежат `item_coins` и `offer_coins_*`, а по ГДД валюты нет:
4 бустера и 5 наборов. Карта следует ГДД.

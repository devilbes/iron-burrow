# 21 — Арт-дирекшн и таблица ассетов (`art.`)

Источник фактов: `00_MASTER.md` (поле 13×13 клеток по 2×2 четверти, тайлы, Rustbugs, power-ups, бустеры, экраны S01–S16, главы). Этот раздел владеет стилем, палитрой, правилами читаемости, скином UI и полным списком растровых ассетов. Анимации, тайминги эффектов и «сочность» — раздел 22; звук — раздел 23.

Язык растра: **только английский**, и только там, где текст запечён намеренно (логотип). Все остальные подписи, цифры, цены и названия рисует код поверх растра (шрифты темы UI Kit), чтобы локализация не трогала картинки.

---

## art.style — стиль

- **art.style.01 Уровень.** Визуал на уровне топовых казуальных F2P: объёмные «игрушечные» формы, мягкий рассеянный свет, тонкие детали материала (заклёпки, сколы, потёки, швы), сочные толстые рамки UI с бликом по верхней кромке и внутренней тенью. Не пиксель-арт, не плоский вектор: «отрендеренная вручную» 2D-графика с объёмом.
- **art.style.02 Палитра одной фразой.** Холодный сланцево-синий и стальной бирюзовый фон + раскалённый оранжевый магмы + кислотно-зелёные глаза врагов — потому что жёсткий холодно-горячий контраст мгновенно читается в быстрой аркаде и сразу отличает игру от тёплой «деревянно-бумажной» казуалки.
- **art.style.03 Семантика цвета.** Оранжевый/янтарный = «наше, важное, тёплое» (ядро, кнопки действия, огонь орудия L3, награды). Кислотно-зелёный = враг (глаза, вражеские пули, спавн врагов). Бирюза/сталь = игрок и интерфейс. Красный `#FF3B3B` — только тревога (ядро под угрозой, ошибки покупки). Лава оранжево-красная, но отличается фактурой (корка, трещины) и тем, что лежит тайлом, а не стоит объектом.
- **art.style.04 Вид.** Строго сверху (ортографическая проекция), без перспективы и без «вида 3/4». Глубину дают объём и мягкий свет, а не наклон камеры.
- **art.style.05 Свет.** Спрайты, которые поворачиваются (танки, пули, эффекты): свет «куполом» сверху по центру, без направленной запечённой тени — поворот на 90/180/270° не ломает освещение. Падающая тень под танками рисуется кодом (смещение 0.06 клетки вниз, размытие, 35 % чёрного). Неповорачиваемые тайлы и UI: мягкий свет сверху-слева.
- **art.style.06 Обводка.** Тёмная обводка `#0A1118` у всех игровых объектов (2 px на исходнике 2x); у UI-рамок — двойная кромка: тёмная наружная + светлая фаска внутри.
- **art.style.07 Без чужих IP.** Никаких отсылок к существующим играм, брендам, логотипам и персонажам. В описаниях для генерации — только собственные формы и материалы.

## art.palette — палитра

| # | токен | hex | где |
|---|---|---|---|
| 1 | slate_abyss | `#0A1118` | обводки, самый тёмный фон, тени |
| 2 | slate_deep | `#121E29` | фон экранов, подложка поля |
| 3 | slate_blue | `#1E2E3D` | панели UI (тело), пол Clay Tunnels в тени |
| 4 | slate_mid | `#2F4558` | заливка рамок, неактивные табы |
| 5 | steel_teal | `#2F7D86` | корпус игрока, вторичные кнопки, сталь |
| 6 | steel_teal_light | `#6FC2C4` | блики стали, активные табы, прогресс-бар «холодный» |
| 7 | steel_frost | `#CFE6E8` | спекуляр, иконки на тёмном, эффект Freeze |
| 8 | rivet_iron | `#5D6B75` | заклёпки, кованый металл рамок |
| 9 | magma_orange | `#FF6A1A` | основная кнопка, огонь, лава, бейджи |
| 10 | magma_hot | `#FFB23F` | раскалённая сердцевина, блик кнопки, пуля L3 |
| 11 | magma_deep | `#B8320C` | тень магмы, нажатая кнопка, корка лавы |
| 12 | core_amber | `#FFC845` | свечение Burrow Core, звёзды, награды |
| 13 | core_white | `#FFF4D6` | центр ядра, вспышки взрывов |
| 14 | acid_green | `#9BFF2E` | глаза Rustbugs, вражеские пули |
| 15 | acid_green_dark | `#3F9E12` | свечение вокруг глаз, спавн врагов |
| 16 | rust_shell | `#7A4A2E` | панцири Rustbugs (ржавчина) |
| 17 | rust_light | `#B5713F` | блики ржавчины |
| 18 | clay_brick | `#A65A3A` | кирпич Clay Tunnels |
| 19 | clay_brick_light | `#D08A5E` | фаска кирпича |
| 20 | alarm_red | `#FF3B3B` | тревога ядра, ошибки |
| 21 | text_main | `#F2F6F7` | основной текст UI |
| 22 | text_dim | `#8FA3B0` | второстепенный текст, заблокированное |

Токены UI Kit (`--mp-*`) в `src/theme/` берут значения из этой таблицы (правит шаг сборки, не этот раздел).

## art.chapters — три темы глав

Правило: **тип тайла узнаётся одинаково во всех главах** (один силуэт, один рисунок кладки/плит), меняются материал и палитра. Игрок, враги, ядро, кольцо ядра, пули, power-ups одинаковы во всех главах.

| тема | id | главы/режим | фон за полем | пол (`floor`) | `brick` | `steel` | `lava` | `roots` | `oil` |
|---|---|---|---|---|---|---|---|---|---|
| Clay Tunnels | `clay` | гл. 1, стадии 1–10 | `#121E29` → `#1E2E3D`, корни и сырая глина в полутьме, редкие бирюзовые грибы-огоньки | утрамбованная холодная серо-синяя земля `#26333D` с мелкими камешками | терракотовая глиняная кладка `#A65A3A`, фаска `#D08A5E` | сине-серые клёпаные плиты `#4C6372` | тусклая трещина с магмой под коркой (редкий тайл) | толстые тёмно-бирюзовые корни `#1F4A48` с зелёными спорами | чёрная лужа с бирюзово-фиолетовым отливом |
| Iron Works | `iron` | гл. 2, стадии 11–20 | заводская шахта: трубы, балки, далёкие оранжевые лампы | стальная решётка-настил `#1F2A33` с болтами | закопчённый тёмно-красный заводской кирпич `#7E3B2A` | бирюзовые плиты `#2F7D86` с жёлто-чёрной фаской-штриховкой по краю | разлив расплава в жёлобе | те же корни, проросшие сквозь решётку, чуть светлее `#2C5B57` | машинное масло с радужной плёнкой |
| Magma Depths | `magma` | гл. 3, стадии 21–30; **Siege** (`siege_pit`) | базальтовая пещера, снизу оранжевое зарево | чёрно-синий базальт `#1A1C24` с тонкими светящимися трещинами `#B8320C` | базальтовые блоки `#3A3436` с оранжевым швом | закалённая сталь с цветами побежалости (синий→соломенный) | яркая текучая лава `#FF6A1A`/`#FFB23F`, тёмная корка | обугленные корни с тлеющими кончиками | вязкая смола с оранжевым бликом |

Решение D-21-03: Siege использует тему `magma` (самая контрастная арена; заодно тизер третьей главы для тех, кто открыл Siege после стадии 5).

## art.readability — читаемость

- **art.read.01 Размер клетки.** Поле квадратное, 13×13 клеток. Клетка в CSS px: портрет 390×844 — **28** (поле 364), ландшафт 844×390 — **26** (поле 338), десктоп 1440×900 — **56** (поле 728). Минимум, под который проверяется арт, — **24 px** (узкие телефоны 360 px).
- **art.read.02 Силуэты врагов** различимы в 24 px даже в монохроме (проверка: заливка силуэта одним цветом, 24×24, четыре врага рядом — каждого назовёт тестировщик):
  - `scout` — узкий вытянутый жук, длинные тонкие лапки-траки, маленький корпус, короткий тонкий ствол;
  - `grunt` — круглый панцирь-купол, средний размер, короткий толстый ствол;
  - `gunner` — каплевидный корпус, **длинный** ствол далеко за пределы панциря, два усика-антенны;
  - `brute` — самый широкий, квадратный, с рогом-тараном и наложенными бронеплитами, занимает всю клетку.
- **art.read.03 Игрок** — угловатый стальной корпус с бирюзовыми панелями, два широких трака, оранжевые фары; ни у одного врага нет прямоугольного силуэта и бирюзы. Глаза врагов — всегда две кислотно-зелёные точки, у игрока глаз нет.
- **art.read.04 Ориентация исходника.** Все танки, башни, пули и направленные эффекты нарисованы **носом вверх**; повороты 0/90/180/270° делает код. Пивот — центр холста.
- **art.read.05 Заполнение клетки.** Танк занимает ≈ 88 % клетки (на холсте 128×128 — прозрачный отступ 8 px), `brute` — 96 %. Power-up — 80 %. Тайл — 100 % без отступа, бесшовный.
- **art.read.06 Четверти.** Тайлы `brick`, `steel`, `core_wall_*` рисуются как 2×2 визуально различимых блока (по 64×64 на исходнике), чтобы снятие четверти выглядело естественно; повреждённое состояние = код не рисует снятую четверть и добавляет тёмную кромку скола 1 px.
- **art.read.07 Контраст.** Объект против пола своей главы — разница светлоты ≥ 35 % (L* в Lab). Пол — самый тёмный и самый «тихий» слой: без ярких пятен крупнее 1/4 клетки.
- **art.read.08 Мигающие носители.** Кадр `flash_*` у врага — золотисто-белая кромка `#FFC845`/`#FFF4D6` по панцирю и светящиеся щели; код чередует обычный кадр и flash с частотой 4 Гц.
- **art.read.09 Корни.** `roots` рисуется поверх танков; плотность покрытия ≈ 85 %, сквозь просветы виден краешек танка и зелёные глаза врага (глаза код дорисовывает поверх корней с альфой 0.5 — враг не теряется совсем).

## art.uikit — скин UI Kit

- **art.ui.01 Материал.** Кованый тёмный металл (`#2F4558`→`#1E2E3D`) с заклёпками по углам, фаской по кромке и **светящимися вставками**: бирюзовая щель-подсветка на нейтральных элементах, оранжево-магмовая — на элементах действия и наград.
- **art.ui.02 Растр, а не CSS-градиенты.** Рамки, кнопки, панели, табы, бейджи, прогресс-бары, карточки, тумблеры — растровые 9-slice/3-slice PNG из `assets/ui/` (таблица ниже); тема UI Kit подключает их через `src/theme/` (токены `--mp-*`, `border-image`). Текст и цифры на них — шрифтами темы.
- **art.ui.03 Шрифты.** Заголовки — **Russo One** (OFL), текст — **Exo 2** (OFL, 500/700). Цифры счёта — Exo 2 700 tabular. Тень текста 0 2px 0 `#0A1118`.
- **art.ui.04 Кнопки.** Primary (магма, оранжевая, светится) — одна на экран: PLAY, CONTINUE, NEXT, BUY. Secondary (бирюзовая сталь) — остальные. Нажатие — кадр `pressed` (вставка темнее, кнопка «утоплена» на 2 px), disabled — обесцвеченный металл без свечения.
- **art.ui.05 Области касания** ≥ 44×44 CSS px на таче; визуально иконка-кнопка 52 (портрет) / 64 (десктоп).
- **art.ui.06 Рамка поля.** Поле обрамлено кованой рамкой `ui_field_frame` (толщина 8 CSS px портрет / 14 десктоп), внутри — тень от рамки на пол.

### Композиция экранов (кратко; раскладка — раздел 20)

- S01 — лоадер SDK; поверх — `logo_iron_burrow` на `bg_lobby_*`.
- S02 Lobby — `bg_lobby_*`, логотип сверху, большая primary PLAY, secondary SIEGE (замок `node_lock`, пока стадия 5 не пройдена), круглые кнопки фич HUD (`icon_daily`, `icon_shop`, `icon_leaderboard`, `icon_settings`) с `ui_badge`.
- S03 Stage Map — `bg_map_<theme>_*`, путь между узлами рисует код (светящаяся пунктирная жила), узлы `node_stage`/`node_finale`, звёзды `star_small`, `node_lock` на закрытых.
- S04/S06/S08/S09/S11/S12/S16 — `ui_popup_frame` + `ui_header_plate`.
- S05 Gameplay — поле в `ui_field_frame`; HUD-плашки `ui_hud_plate` (счёт, жизни `icon_life`, враги `icon_enemy_left`, стадия/волна), слоты бустеров `ui_booster_slot` с `icon_bst_*`, на таче — `ctrl_stick_*` и `ctrl_fire`.
- S07 Stage Clear — три `star_big`, награда `icon_bst_*` 128+ px.
- S10 Shop — `ui_card` + `pack_*` + `ui_ribbon`.
- S13 Leaderboards — `ui_tab`, `ui_list_row`, `medal_top3`.
- S15 Tutorial — `tut_hand` (тач) / `ui_keycap` (десктоп) + `ui_tooltip`.

---

## art.assets — таблица игровых ассетов

Правила для всей таблицы:

- Путь `assets/game/<id>.png`. Исходник рисуется **в 2x** (размер в колонке «исходник 2x»); файл 1x (половина) делает `npm run assets`. Код выбирает 2x, если `показ × devicePixelRatio` > размера 1x.
- Спрайт-листы — кадры **в один горизонтальный ряд**, одинакового размера, порядок кадров = порядок в колонке «состояния».
- Прозрачный фон у всего, кроме фонов (`bg_*`) и иконки игры.
- Размер показа: «портрет / десктоп» в CSS px. Ландшафт 844×390: игровые объекты = клетка 26; UI — как в портрете.
- Описание для генерации — промпт на английском (так точнее для генератора). Ко всем промптам игровых объектов добавляется общий суффикс: *"top-down orthographic view, facing up, volumetric hand-painted game sprite, soft dome light from above, dark outline, transparent background, no text, no perspective"*. Для тайлов: *"seamless square tile, top-down, soft light from top-left, no text"*.

| # | id | путь | исходник 2x, px | показ CSS px (портрет / десктоп) | состояния | назначение | описание для генерации |
|---|---|---|---|---|---|---|---|
| 1 | player_hull | `assets/game/player_hull.png` | 256×128 (2 кадра 128×128) | 28 / 56 (1 клетка) | move_a / move_b (траки); hit, spawn — кодом | корпус Burrower, общий для всех уровней оружия | stubby armored drill-tank hull, angular forged iron with teal panels, two wide treads with chunky links, small amber headlights at the front, rivets, no turret |
| 2 | player_turret_l0 | `assets/game/player_turret_l0.png` | 128×128 | 28 / 56 | — | башня, оружие L0 | small round iron turret with one short barrel ending in a drill-bit muzzle, teal hatch, rivets; same canvas as hull, centered |
| 3 | player_turret_l1 | `assets/game/player_turret_l1.png` | 128×128 | 28 / 56 | — | башня, L1 (быстрая пуля) | round iron turret with one longer barrel wrapped in cooling fins, teal glow slit along the barrel |
| 4 | player_turret_l2 | `assets/game/player_turret_l2.png` | 128×128 | 28 / 56 | — | башня, L2 (две пули) | wider iron turret with twin parallel barrels, drill-bit muzzles, teal glow slits |
| 5 | player_turret_l3 | `assets/game/player_turret_l3.png` | 128×128 | 28 / 56 | — | башня, L3 (ломает сталь) | heavy iron turret with one thick barrel, glowing molten orange muzzle and heat vents, steel-breaker look |
| 6 | enemy_scout | `assets/game/enemy_scout.png` | 512×128 (4×128) | 28 / 56 | move_a / move_b / flash_a / flash_b | враг `scout` | narrow elongated beetle scrap-tank, thin long leg-treads, small rusty shell, short thin gun, two acid-green glowing eyes; flash frames: gold-white glowing rim and glowing shell seams |
| 7 | enemy_grunt | `assets/game/enemy_grunt.png` | 512×128 (4×128) | 28 / 56 | move_a / move_b / flash_a / flash_b | враг `grunt` | round dome-shelled beetle scrap-tank, medium size, rusty plates, short thick gun, two acid-green eyes; flash frames with gold-white rim |
| 8 | enemy_gunner | `assets/game/enemy_gunner.png` | 512×128 (4×128) | 28 / 56 | move_a / move_b / flash_a / flash_b | враг `gunner` (быстрая пуля) | teardrop-shaped beetle scrap-tank with a very long gun reaching past its shell, two antennae, two acid-green eyes; flash frames with gold-white rim |
| 9 | enemy_brute | `assets/game/enemy_brute.png` | 512×128 (4×128) | 28 / 56 (96 % клетки) | move_a / move_b / flash_a / flash_b | враг `brute` (4 HP) | wide square heavy beetle scrap-tank with a front ram horn, layered bolted armor plates, short heavy gun, two acid-green eyes; flash frames with gold-white rim |
| 10 | enemy_brute_damage | `assets/game/enemy_brute_damage.png` | 384×128 (3×128) | 28 / 56 | hp3 / hp2 / hp1 | накладка повреждений brute (поворачивается вместе с ним) | transparent overlay of cracks, dents and missing armor plates for the brute silhouette, three stages of increasing damage, sparks in gaps |
| 11 | tile_clay_brick | `assets/game/tile_clay_brick.png` | 128×128 | 28 / 56 | целый; 1–4 четверти сняты (маска кодом) | кирпич, гл. 1 | terracotta clay brick masonry, 2×2 block grid clearly readable, chipped corners, cold shadowed mortar |
| 12 | tile_clay_steel | `assets/game/tile_clay_steel.png` | 128×128 | 28 / 56 | целый; 1–4 четверти сняты | сталь, гл. 1 | blue-grey riveted steel plate divided into 2×2 panels, worn edges, cold highlight |
| 13 | tile_clay_lava | `assets/game/tile_clay_lava.png` | 512×128 (4×128) | 28 / 56 | кадры 1–4 (цикл) | лава, гл. 1 | dim magma glowing through a cracked dark crust, slow pulse across four frames, seamless |
| 14 | tile_clay_roots | `assets/game/tile_clay_roots.png` | 128×128 | 28 / 56 | — | корни, гл. 1 (поверх танков) | dense tangle of thick dark teal roots with tiny green glowing spores, about 85 % coverage with small see-through gaps, transparent gaps |
| 15 | tile_clay_oil | `assets/game/tile_clay_oil.png` | 128×128 | 28 / 56 | — (отлив кодом) | масло, гл. 1 | glossy black oil puddle filling the tile with teal-violet sheen, soft edge into packed earth |
| 16 | tile_clay_floor | `assets/game/tile_clay_floor.png` | 256×128 (2×128) | 28 / 56 | var_a / var_b | пол, гл. 1 | packed cold blue-grey earth with small pebbles, very low contrast, seamless; two variations |
| 17 | tile_iron_brick | `assets/game/tile_iron_brick.png` | 128×128 | 28 / 56 | целый; 1–4 четверти сняты | кирпич, гл. 2 | sooty dark red factory brick, 2×2 block grid, soot stains, chipped |
| 18 | tile_iron_steel | `assets/game/tile_iron_steel.png` | 128×128 | 28 / 56 | целый; 1–4 четверти сняты | сталь, гл. 2 | teal steel plate in 2×2 panels with yellow-black hazard bevel along edges, bolts |
| 19 | tile_iron_lava | `assets/game/tile_iron_lava.png` | 512×128 (4×128) | 28 / 56 | кадры 1–4 | лава, гл. 2 | molten metal flowing in an iron trough, orange-yellow glow, four-frame flow loop |
| 20 | tile_iron_roots | `assets/game/tile_iron_roots.png` | 128×128 | 28 / 56 | — | корни, гл. 2 | thick teal roots growing through an iron floor grate, 85 % coverage, transparent gaps |
| 21 | tile_iron_oil | `assets/game/tile_iron_oil.png` | 128×128 | 28 / 56 | — | масло, гл. 2 | machine oil spill with rainbow film on steel grate |
| 22 | tile_iron_floor | `assets/game/tile_iron_floor.png` | 256×128 (2×128) | 28 / 56 | var_a / var_b | пол, гл. 2 | dark steel grate decking with bolts, very low contrast, seamless; two variations |
| 23 | tile_magma_brick | `assets/game/tile_magma_brick.png` | 128×128 | 28 / 56 | целый; 1–4 четверти сняты | кирпич, гл. 3 и Siege | dark basalt blocks in 2×2 grid with faint orange glowing seams |
| 24 | tile_magma_steel | `assets/game/tile_magma_steel.png` | 128×128 | 28 / 56 | целый; 1–4 четверти сняты | сталь, гл. 3 и Siege | heat-tempered steel plate in 2×2 panels with blue-to-straw temper colors, rivets |
| 25 | tile_magma_lava | `assets/game/tile_magma_lava.png` | 512×128 (4×128) | 28 / 56 | кадры 1–4 | лава, гл. 3 и Siege | bright flowing lava, orange and yellow-white with dark floating crust plates, four-frame loop, seamless |
| 26 | tile_magma_roots | `assets/game/tile_magma_roots.png` | 128×128 | 28 / 56 | — | корни, гл. 3 и Siege | charred black roots with smoldering orange tips, 85 % coverage, transparent gaps |
| 27 | tile_magma_oil | `assets/game/tile_magma_oil.png` | 128×128 | 28 / 56 | — | масло, гл. 3 и Siege | thick tar pool with orange reflected glow |
| 28 | tile_magma_floor | `assets/game/tile_magma_floor.png` | 256×128 (2×128) | 28 / 56 | var_a / var_b | пол, гл. 3 и Siege | black-blue basalt floor with thin dim orange cracks, low contrast, seamless; two variations |
| 29 | core | `assets/game/core.png` | 256×128 (2×128) | 28 / 56 | intact / destroyed | Burrow Core | glowing amber energy core sphere with white-hot center, held in a hexagonal forged iron cradle with rivets; destroyed frame: cracked dark cradle, shattered dim core, smoke |
| 30 | core_wall_brick | `assets/game/core_wall_brick.png` | 128×128 | 28 / 56 | целый; 1–4 четверти сняты | кирпичное кольцо ядра (8 клеток), все главы | reinforced clay brick in 2×2 blocks bound with iron straps and corner rivets, warmer and sturdier than normal brick |
| 31 | core_wall_steel | `assets/game/core_wall_steel.png` | 128×128 | 28 / 56 | целый; 1–4 четверти сняты; мигание перед концом — кодом | кольцо ядра под `rebar` / Steel Fortress | thick steel plates in 2×2 panels with glowing orange-hot rivets and rebar pattern |
| 32 | bullet_player | `assets/game/bullet_player.png` | 64×32 (2×32) | 7 / 14 | normal (L0–L2) / heavy (L3) | пули игрока | small teal-white energy slug with short trail, facing up; heavy frame: molten orange slug with hot core |
| 33 | bullet_enemy | `assets/game/bullet_enemy.png` | 64×32 (2×32) | 7 / 14 | normal / fast (gunner) | пули врагов | acid-green glowing plasma pellet, facing up; fast frame: elongated streak |
| 34 | pu_star | `assets/game/pu_star.png` | 128×128 | 28 / 56 | idle; мигание последних 3 с — кодом | power-up Star (оружие +1) | hexagonal forged token with a glowing golden five-point star |
| 35 | pu_bubble | `assets/game/pu_bubble.png` | 128×128 | 28 / 56 | idle | power-up Bubble (неуязвимость 10 с) | hexagonal forged token with a translucent teal energy bubble icon |
| 36 | pu_rebar | `assets/game/pu_rebar.png` | 128×128 | 28 / 56 | idle | power-up Rebar (стена ядра → сталь 15 с) | hexagonal forged token with crossed steel rebar bars over a small brick wall |
| 37 | pu_quake | `assets/game/pu_quake.png` | 128×128 | 28 / 56 | idle | power-up Quake (уничтожить всех на поле) | hexagonal forged token with an orange shock crack burst |
| 38 | pu_freeze | `assets/game/pu_freeze.png` | 128×128 | 28 / 56 | idle | power-up Freeze (враги стоят 8 с) | hexagonal forged token with an icy frost crystal glowing pale cyan |
| 39 | pu_hull | `assets/game/pu_hull.png` | 128×128 | 28 / 56 | idle | power-up Hull (+1 жизнь) | hexagonal forged token with a tiny teal drill-tank hull silhouette and plus mark |
| 40 | icon_bst_bubble | `assets/game/icon_bst_bubble.png` | 320×320 | награда 128 / 160; HUD 44 / 56; магазин 96 / 128 | — | бустер Bubble Shield | large glossy teal energy dome generator capsule with a glowing bubble shell, chunky rivets, item icon |
| 41 | icon_bst_shockwave | `assets/game/icon_bst_shockwave.png` | 320×320 | 128 / 160; 44 / 56; 96 / 128 | — | бустер Shockwave | heavy iron seismic charge with orange glowing core and radiating shock rings, item icon |
| 42 | icon_bst_fortify | `assets/game/icon_bst_fortify.png` | 320×320 | 128 / 160; 44 / 56; 96 / 128 | — | бустер Steel Fortress | thick steel shield-wall segment with rivets around a small amber core glow, item icon |
| 43 | icon_bst_hull | `assets/game/icon_bst_hull.png` | 320×320 | 128 / 160; 44 / 56; 96 / 128 | — | бустер Spare Hull | spare drill-tank hull on a small crate pallet, teal panels, amber headlights, item icon |
| 44 | fx_explosion_small | `assets/game/fx_explosion_small.png` | 384×96 (4×96) | 21 / 42 | кадры 1–4 | попадание пули в стену/пулю | small burst of orange sparks and dust puff, four frames from flash to smoke |
| 45 | fx_explosion_big | `assets/game/fx_explosion_big.png` | 1536×256 (6×256) | 56 / 112 (2 клетки) | кадры 1–6 | гибель танка (игрок и враги) | big fiery explosion with scrap fragments and smoke ring, six frames from white flash to dark smoke |
| 46 | fx_explosion_core | `assets/game/fx_explosion_core.png` | 2048×256 (8×256) | 56 / 112 (2 клетки) | кадры 1–8 | уничтожение ядра | huge amber-white energy blast with shattering crystal shards and shock ring, eight frames |
| 47 | fx_spawn | `assets/game/fx_spawn.png` | 768×128 (6×128) | 28 / 56 | кадры 1–6 | появление врага (игрок — тот же лист с бирюзовой тонировкой кодом) | ground bursting open from below, swirling acid-green sparks and dirt ring, six frames |
| 48 | fx_bubble | `assets/game/fx_bubble.png` | 320×160 (2×160) | 35 / 70 | кадры 1–2 | щит спавна и Bubble | translucent teal hexagon-patterned energy bubble, two shimmer frames |
| 49 | fx_shockwave | `assets/game/fx_shockwave.png` | 512×512 | до размера поля (масштаб кодом) | — | волна Shockwave и Quake | expanding orange-white shock ring with dust, transparent center |
| 50 | fx_frost | `assets/game/fx_frost.png` | 128×128 | 28 / 56 | — | накладка Freeze на врагов | translucent icy crust overlay with frost crystals, shaped to cover a tank |
| 51 | fx_hit_spark | `assets/game/fx_hit_spark.png` | 192×64 (3×64) | 14 / 28 | кадры 1–3 | рикошет от стали, попадание по brute | sharp white-teal ricochet sparks, three frames |
| 52 | bg_lobby_portrait | `assets/game/bg_lobby_portrait.png` | 780×1688 | 390×844 (cover) | — | фон S01/S02, портрет | vast underground cavern, cold slate-blue rock, teal steel scaffolds, distant molten orange glow from below, empty center for logo and buttons, no text |
| 53 | bg_lobby_landscape | `assets/game/bg_lobby_landscape.png` | 2880×1800 | 844×390 / 1440×900 (cover) | — | фон S01/S02, ландшафт и десктоп | same cavern, wide composition, key elements away from edges for cover crop, no text |
| 54 | bg_map_clay_portrait | `assets/game/bg_map_clay_portrait.png` | 780×1688 | 390×844 | — | карта стадий гл. 1; фон вокруг поля гл. 1 (затемнён кодом) | vertical cross-section of clay tunnels, roots and teal glowing mushrooms, calm low-contrast areas for stage nodes, no text |
| 55 | bg_map_clay_landscape | `assets/game/bg_map_clay_landscape.png` | 2880×1800 | 844×390 / 1440×900 | — | то же, ландшафт/десктоп | wide cross-section of clay tunnels, same style, no text |
| 56 | bg_map_iron_portrait | `assets/game/bg_map_iron_portrait.png` | 780×1688 | 390×844 | — | карта гл. 2; фон вокруг поля | underground ironworks shaft, pipes, girders, distant orange lamps, cold steel, no text |
| 57 | bg_map_iron_landscape | `assets/game/bg_map_iron_landscape.png` | 2880×1800 | 844×390 / 1440×900 | — | то же, ландшафт/десктоп | wide underground ironworks shaft, same style, no text |
| 58 | bg_map_magma_portrait | `assets/game/bg_map_magma_portrait.png` | 780×1688 | 390×844 | — | карта гл. 3; фон вокруг поля гл. 3 и Siege | deep basalt cave with lava rivers glowing from below, dark blue rock, no text |
| 59 | bg_map_magma_landscape | `assets/game/bg_map_magma_landscape.png` | 2880×1800 | 844×390 / 1440×900 | — | то же, ландшафт/десктоп | wide deep basalt lava cave, same style, no text |
| 60 | icon_life | `assets/game/icon_life.png` | 96×96 | 24 / 32 | — | HUD: жизни | tiny teal drill-tank hull icon, front view from above |
| 61 | icon_enemy_left | `assets/game/icon_enemy_left.png` | 96×96 | 24 / 32 | — | HUD: осталось врагов | tiny rusty beetle tank icon with green eyes |
| 62 | icon_stage | `assets/game/icon_stage.png` | 96×96 | 24 / 32 | — | HUD: номер стадии | small forged pennant flag on a pole, orange cloth |
| 63 | icon_wave | `assets/game/icon_wave.png` | 96×96 | 24 / 32 | — | HUD Siege: волна | three stacked orange chevrons on forged plate |
| 64 | icon_pause | `assets/game/icon_pause.png` | 96×96 | 24 / 32 | — | кнопка паузы | two thick rounded steel bars, teal glow |
| 65 | icon_settings | `assets/game/icon_settings.png` | 96×96 | 32 / 40 | — | настройки (S14) | forged iron cog with rivets |
| 66 | icon_daily | `assets/game/icon_daily.png` | 96×96 | 32 / 40 | — | фича HUD: ежедневные награды | small iron calendar plate with orange glowing gift mark |
| 67 | icon_shop | `assets/game/icon_shop.png` | 96×96 | 32 / 40 | — | фича HUD: магазин | iron supply crate with orange glowing seams |
| 68 | icon_leaderboard | `assets/game/icon_leaderboard.png` | 96×96 | 32 / 40 | — | фича HUD: лидерборды | forged trophy cup with amber glow |
| 69 | icon_siege | `assets/game/icon_siege.png` | 96×96 | 32 / 40 | — | кнопка режима Siege | crossed drill and gun barrel over a fortress wall |
| 70 | icon_music | `assets/game/icon_music.png` | 96×96 | 24 / 32 | — | настройка музыки | steel music note |
| 71 | icon_sfx | `assets/game/icon_sfx.png` | 96×96 | 24 / 32 | — | настройка звуков | steel speaker with sound waves |
| 72 | icon_haptics | `assets/game/icon_haptics.png` | 96×96 | 24 / 32 | — | настройка вибрации | phone silhouette with vibration marks |
| 73 | icon_back | `assets/game/icon_back.png` | 96×96 | 24 / 32 | — | назад | thick steel left arrow |
| 74 | icon_info | `assets/game/icon_info.png` | 96×96 | 20 / 24 | — | «i» в слоте бустера (S16) | small round steel badge with letter i |
| 75 | ctrl_stick_base | `assets/game/ctrl_stick_base.png` | 240×240 | 112 / скрыт (тач-ландшафт 104) | idle / active | виртуальный стик (тач) | round forged steel joystick base with four teal direction notches, semi-transparent center |
| 76 | ctrl_stick_knob | `assets/game/ctrl_stick_knob.png` | 112×112 | 52 / скрыт (48) | idle / pressed | ручка стика | domed steel knob with teal glow ring |
| 77 | ctrl_fire | `assets/game/ctrl_fire.png` | 200×200 | 88 / скрыт (80) | idle / pressed | кнопка FIRE (тач) | big round forged button with molten orange glowing center and crosshair mark, no text |
| 78 | star_big | `assets/game/star_big.png` | 384×192 (2×192) | 56 / 80 | earned / empty | звёзды S07 | chunky golden five-point star with amber glow and bevel; empty frame: dark iron star socket |
| 79 | star_small | `assets/game/star_small.png` | 96×48 (2×48) | 14 / 18 | earned / empty | звёзды на узлах карты | small golden star; empty: dark iron star |
| 80 | node_stage | `assets/game/node_stage.png` | 512×128 (4×128) | 52 / 64 | locked / open / current / cleared | узел стадии S03 (номер — кодом) | round forged iron hatch disk; locked: dark cold; open: teal glow rim; current: pulsing orange rim; cleared: amber inner glow |
| 81 | node_finale | `assets/game/node_finale.png` | 640×160 (4×160) | 64 / 80 | locked / open / current / cleared | узел финала главы (10/20/30) | larger hexagonal forged hatch with horned beetle emblem, same four states |
| 82 | node_lock | `assets/game/node_lock.png` | 64×64 | 20 / 24 | — | замок на узле стадии и на Siege | heavy iron padlock with rivets, teal keyhole glint |
| 83 | medal_top3 | `assets/game/medal_top3.png` | 288×96 (3×96) | 28 / 32 | gold / silver / bronze | места 1–3 в S13 | forged medal with gear rim; gold, silver, bronze |
| 84 | tut_hand | `assets/game/tut_hand.png` | 320×160 (2×160) | 56 / 64 (только тач) | idle / tap | указатель туториала S15 | stylized armored glove pointing finger, steel and teal; tap frame: finger pressed with small ring |
| 85 | daily_crate | `assets/game/daily_crate.png` | 320×320 | 96 / 128 | closed / open | награда 7-го дня S12 | big forged iron supply crate with orange glowing seams; open frame: lid up, golden light |
| 86 | pack_starter | `assets/game/pack_starter.png` | 320×320 | 96 / 128 | — | Starter Crate (S10, S08) | small wooden-and-iron crate with four booster capsules peeking out, warm amber glow |
| 87 | pack_hull | `assets/game/pack_hull.png` | 320×320 | 96 / 128 | — | Hull Pack | stack of five spare drill-tank hulls on a pallet |
| 88 | pack_field_kit | `assets/game/pack_field_kit.png` | 320×320 | 96 / 128 | — | Field Kit | open iron field case with rows of booster capsules |
| 89 | pack_heavy_arsenal | `assets/game/pack_heavy_arsenal.png` | 320×320 | 96 / 128 | — | Heavy Arsenal | large armored chest overflowing with booster capsules, orange glow |
| 90 | pack_commander_cache | `assets/game/pack_commander_cache.png` | 320×320 | 96 / 128 | — | Commander Cache | massive vault crate with gold trim, mountain of booster capsules, strongest glow |
| 91 | app_icon | `assets/game/app_icon.png` | 1024×1024 | 512 магазин / 192 PWA / 48 вкладка | — | иконка игры (фон непрозрачный) | stubby teal drill-tank bursting out of a brick wall toward the viewer from above, orange sparks, slate-blue background, bold readable silhouette, no text |
| 92 | logo_iron_burrow | `assets/game/logo_iron_burrow.png` | 1200×480 | 300×120 / 520×208 | — | логотип (S01, S02) | text "IRON BURROW" in chunky forged iron letters with rivets, molten orange glow in the cracks, drill-bit accent on the letter O, transparent background |

**Итого в таблице игровых ассетов: 92 строки.**

## art.uiskin — элементы скина UI (`assets/ui/<id>.png`)

Правила как выше (исходник 2x, 1x — `npm run assets`), с одним отличием: у тянущихся по ширине 3-slice элементов (кнопки, табы, строки, прогресс) кадры состояний сложены **по вертикали**, чтобы срез по ширине был общим. 9-slice/3-slice: в колонке «исходник» указаны вставки (insets) в px исходника. Общий суффикс промпта: *"game UI element, forged dark metal with rivets, glowing inset, soft light from top-left, transparent background, no text"*.

| # | id | путь | исходник 2x, px | показ CSS px (портрет / десктоп) | состояния | назначение | описание для генерации |
|---|---|---|---|---|---|---|---|
| 1 | ui_panel | `assets/ui/ui_panel.png` | 192×192, 9-slice 48 | тянется; кромка 24 / 24 | — | базовая панель экранов | dark slate forged metal panel, corner rivets, beveled rim, subtle inner shadow |
| 2 | ui_popup_frame | `assets/ui/ui_popup_frame.png` | 256×256, 9-slice 64 | ширина 350 / 520 | — | рамка попапов S04, S06, S08, S09, S11, S12, S16 | heavy forged frame with large corner rivets and thin teal glowing inner slit |
| 3 | ui_header_plate | `assets/ui/ui_header_plate.png` | 480×112, 3-slice 64 | высота 48 / 56 | — | плашка заголовка попапа | wide forged nameplate with bolted ends and orange glowing underline |
| 4 | ui_btn_primary | `assets/ui/ui_btn_primary.png` | 320×384 (3 кадра 320×128 по вертикали), 3-slice 64 | высота 56 / 64 | normal / pressed / disabled | главная кнопка (PLAY, CONTINUE, NEXT, BUY) | chunky rounded button, molten orange glowing face, forged iron rim with rivets, top gloss; pressed: darker and sunk; disabled: desaturated grey metal |
| 5 | ui_btn_secondary | `assets/ui/ui_btn_secondary.png` | 320×384 (3×128 по вертикали), 3-slice 64 | высота 48 / 56 | normal / pressed / disabled | вторичная кнопка | same shape, teal steel face with soft glow |
| 6 | ui_btn_round | `assets/ui/ui_btn_round.png` | 256×128 (2×128) | 52 / 64 | normal / pressed | круглая кнопка под иконку (фичи HUD, пауза) | round forged button with rivet ring and teal inner glow |
| 7 | ui_btn_close | `assets/ui/ui_btn_close.png` | 192×96 (2×96) | 40 / 44 | normal / pressed | закрыть попап | round iron button with a bold X cross, orange edge glow |
| 8 | ui_tab | `assets/ui/ui_tab.png` | 240×192 (2×96 по вертикали), 3-slice 48 | высота 40 / 48 | active / inactive | табы S13 | forged tab plate; active: teal glowing face; inactive: dark slate |
| 9 | ui_badge | `assets/ui/ui_badge.png` | 48×48 | 20 / 22 | — | счётчик на иконках (бустеры, фичи HUD) | small round magma-orange badge with dark rim and gloss |
| 10 | ui_progress_track | `assets/ui/ui_progress_track.png` | 256×40, 3-slice 20 | высота 14 / 18 | — | дорожка прогресс-бара | recessed dark metal groove with rivet caps at ends |
| 11 | ui_progress_fill | `assets/ui/ui_progress_fill.png` | 256×80 (2×40 по вертикали), 3-slice 20 | высота 10 / 14 | magma / teal | заливка прогресса (волна Siege, цикл daily, загрузка ассетов) | glowing liquid bar; magma: orange with hot highlight; teal: cold steel glow |
| 12 | ui_card | `assets/ui/ui_card.png` | 896×560 (2×448×560), 9-slice 64 | 160×200 / 220×280 | normal / highlight | карточка пака S10 | tall forged card frame; highlight: amber glowing rim |
| 13 | ui_ribbon | `assets/ui/ui_ribbon.png` | 256×64, 3-slice 32 | высота 24 / 28 | — | лента «BEST VALUE» / «ONE TIME» (текст кодом) | orange metal ribbon banner with folded ends |
| 14 | ui_toggle | `assets/ui/ui_toggle.png` | 256×64 (2×128×64) | 52×26 / 60×30 | on / off | тумблеры S14, Spare Hull в S04 | forged toggle switch; on: orange glow knob right; off: dark knob left |
| 15 | ui_slider_track | `assets/ui/ui_slider_track.png` | 256×32, 3-slice 16 | высота 10 / 12 | empty / filled | прогресс-бары (загрузка S01, прогресс главы S03) | thin recessed metal track with teal glow fill groove |
| 16 | ui_slider_knob | `assets/ui/ui_slider_knob.png` | 64×64 | 24 / 28 | idle / pressed | резерв: ручка ползунка (в MVP не используется в S14 — там тумблеры) | round riveted steel knob |
| 17 | ui_booster_slot | `assets/ui/ui_booster_slot.png` | 512×128 (4×128) | 52 / 64 | ready / active / spent / empty | слот бустера в HUD S05 | square forged slot frame; ready: teal rim; active: pulsing orange rim; spent: dark with lock-out hatch; empty: dim grey |
| 18 | ui_daily_cell | `assets/ui/ui_daily_cell.png` | 624×248 (3×208×248), 9-slice 40 | 76×92 / 104×124 | claimed / today / locked | ячейка дня S12 | forged plate cell; claimed: dim with check mark; today: orange glowing rim; locked: dark slate |
| 19 | ui_list_row | `assets/ui/ui_list_row.png` | 512×208 (2×104 по вертикали), 3-slice 48 | высота 44 / 52 | normal / self | строка лидерборда S13 | long thin forged plate; self: teal glowing rim |
| 20 | ui_tooltip | `assets/ui/ui_tooltip.png` | 160×128, 9-slice 40 | тянется | — | подсказка туториала S15 | dark metal speech bubble with small pointer at bottom, teal rim |
| 21 | ui_keycap | `assets/ui/ui_keycap.png` | 192×96 (2×96), 9-slice 24 | 32 / 36 (ширина тянется под Space) | normal / pressed | клавиши в туториале и S14 | chunky keyboard key cap in dark steel with top bevel |
| 22 | ui_divider | `assets/ui/ui_divider.png` | 512×16, 3-slice 32 | высота 6 / 8 | — | разделитель в попапах | thin forged bar with rivet ends and teal glow dot center |
| 23 | ui_hud_plate | `assets/ui/ui_hud_plate.png` | 192×96, 9-slice 32 | высота 32 / 40 | — | плашки HUD (счёт, жизни, враги, стадия/волна) | compact dark forged plate with two rivets and inner teal slit |
| 24 | ui_field_frame | `assets/ui/ui_field_frame.png` | 256×256, 9-slice 48 | кромка 8 / 14 вокруг поля | — | рамка игрового поля S05 | heavy forged square frame with corner bolts, inner shadow, warm orange micro-glow at corners |

**Итого в таблице скина UI: 24 строки.**

## art.budget — бюджет генераций

**Бюджет: 260 генераций** на 116 ассетов (92 игровых + 24 UI), включая 6 эталонов стиля (`player_hull`, `enemy_grunt`, `tile_clay_brick`, `core`, `ui_panel`, `ui_btn_primary`), которые генерируются первыми и дальше подаются как референс; перегенерации спрайт-листов покадрово и запас на брак.

Порядок генерации: эталоны → игрок и враги → тайлы `clay` → ядро/пули/power-ups → UI-скин → остальные темы → фоны → иконки и паки → логотип и иконка игры.

## art.decisions — решения

- **D-21-01** Игрок = один корпус `player_hull` + четыре башни `player_turret_l0..l3` на том же холсте 128×128: корпус гарантированно одинаков, смена уровня оружия видна по башне.
- **D-21-02** Состояния четвертей не рисуются отдельными спрайтами: тайл нарисован как 2×2 блока, снятые четверти не рисует код (маска на 4 бита) + тёмная кромка скола 1 px.
- **D-21-03** Siege — тема `magma`.
- **D-21-04** Повреждения brute — отдельная накладка `enemy_brute_damage` (3 стадии), а не 4 разных спрайта: силуэт brute постоянен и узнаваем.
- **D-21-05** Подсветка ядра, мигание power-ups, тонировка Freeze/спавна игрока, тени под танками, путь на карте стадий — кодом, без отдельных растров.
- **D-21-06** Растровый текст только в `logo_iron_burrow` («IRON BURROW»); всё остальное — шрифты темы.
- **D-21-07** Фоны лобби и карт по два кадрирования (портрет 390×844 и общий для ландшафта и десктопа, cover); фон вокруг поля в игре = фон карты своей главы, затемнённый кодом на 55 %.

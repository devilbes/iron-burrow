# Iron Burrow — базовый скин (перекраска и форма без растра)

Шаг: полная перекраска в палитру карты скина (`docs/skin/map.json`) и своя форма окна, шапки,
кнопок, плашек и крестика кодом. Рецепт — `docs/platform/recipes/custom-window-skin.md`.
Обвязка (`src/shell/**`, `scripts/**`), SDK и UI Kit не менялись.

## Что сделано
1. **`src/skin/theme.css`** — все 48 строк раздела Palette по карте (сланец, сталь, магма, янтарь Ядра;
   успех — бирюзовый, не зелёный). Производные разорваны только там, где связь давала неверное:
   `--mp-card-focus` (кольцо 2 px steel_frost с зазором 2 px, библия States) и `--mp-card-shadow`
   (modal 0 12 24 slate_abyss 40 %). Радиусы: окно/карточка/кнопка 0 (форму дают срезы), поле 4 px.
   Шрифты: display — Russo One, ui и body — Exo 2. Новый раздел «3a» — все числа и цвета формы
   переменными (`--game-cut-*`, `--game-frame-*`, `--game-slit-*`, `--game-rivet*`, `--game-plate-*`,
   `--game-button-face*`, `--game-close-*`, тени raised/floating/modal, `--kit-title-*`), цвета видов
   кнопок и их нижних граней — в разделе 5.
2. **Шрифты** — `assets/skin/fonts/`: `russo-one-latin-400.woff2`, `exo-2-latin-500.woff2`,
   `exo-2-latin-700.woff2` (@fontsource/russo-one 5.x и @fontsource/exo-2 5.3.0, SIL OFL 1.1),
   объявлены в `FONTS` (`src/skin/art.ts`) с латинским `unicodeRange`.
3. **`COMMON`** (`src/skin/sheets.ts`) — все приёмы раздела identity, только переменными:
   - `id-cut-corners`: окно — срез 16 px на всех углах (`clip-path`), кнопки, плитки HUD, капсулы
     топбара, карточки магазина, ячейки дней, своя строка рейтинга — срез 8 px, крестик 6 px, бейдж 4 px;
   - `id-forged-frame`: внешняя обводка 1 px slate_abyss, фаска 2 px (верх/лево steel_frost 24 %,
     низ/право slate_abyss 60 %), светящаяся бирюзовая щель 1 px на отступе 6 px — составными фонами,
     срезы рамки и щели параллельны срезу плиты;
   - `id-rivets`: 4 заклёпки Ø6 px в 12 px от среза по диагонали (верхняя правая под крестиком);
   - `id-nameplate`: шильда slate_mid высотой 44 px со скосами 12 px и светящейся полосой magma 2 px;
     выходит над верхним краем окна на 22 px; текст Russo One заглавными, трекинг .04em, одна тень
     0 2px 0 slate_abyss, цвет — `--kit-title-top`; та же шильда — заголовок главного экрана;
   - `id-button-face`: литая плита — градиент лица (верх светлее, низ темнее), блик 1 px по верхней
     кромке, нижняя грань 4 px тёмным тоном вида (primary — magma_deep), тень raised; нажатие —
     сдвиг 2 px и грань 2 px; выключенная — та же плита без насыщенности, яркость .7;
   - `id-close-plate`: квадратная стальная плита 40 px со срезом 6 px, фаска, крест из двух брусков
     4 px steel_frost; при наведении — оранжевая кромка со свечением; `closePosition: 'head-right'`;
   - `id-glow-inset`: прогресс — утопленный паз slate_abyss с внутренней тенью, заливка магмой со свечением;
   - тени окна и плашек сохраняют форму плиты: многоугольник обрезки продолжает срезы наружу.
   Та же рамка применена к собственному окну оболочки (карточка игрока) — `COMPONENTS.shell`, это не
   отдельный лист, а функция `frame()` общего окна на селекторах оболочки.
4. **Фон сцены** — ключевого фона игры в арте нет (`assets/generated/` пуст, в `design/` только стилевой
   якорь), поэтому `scene` не объявлен: под игрой градиент `--mp-bg-*` палитры (slate_abyss, свечение
   магмы снизу, бирюзовые отсветы). Полосы панелей прозрачны.
5. **Значки** — `node scripts/skin-icons.mjs`: перекрашенный атлас `assets/skin/icons-recolored.png`
   (2048×9856, 1 053 015 байт, 196 ключей). Стоковых значков в галерее: 0.

## Вывод команд (последние строки)

`npm install`
```
removed 14 packages, and audited 15 packages in 1s
1 moderate severity vulnerability
To address all issues, run:
  npm audit fix --force
Run `npm audit` for details.
```

`npm run build`
```
npm notice run manyplay-game@1.0.0 build
npm notice run node scripts/build.mjs
exit=0
```

`npm run test:unit`
```
ℹ tests 130
ℹ pass 127
ℹ fail 0
ℹ skipped 3
exit=0
```
Пропущены: два теста шаблона без установленного SDK и строгая проверка цветов (идёт без `SKIN_STRICT`).

`SKIN_STRICT=1 node --test tests/skin-readiness.test.mjs`
```
✔ the skin fits SKIN_WEIGHT_LIMIT
✔ items of the catalog: a picture in ITEMS and a localized title; SKIN_STRICT=1: own pictures, none missing
✔ item and offer pictures become the skin assets the kit draws
✔ index.html: neutral inline loader from the first paint, no stock blue
ℹ tests 15
ℹ pass 15
ℹ fail 0
exit=0
```

`PLAYWRIGHT=/usr/local/lib/node_modules/@playwright/mcp/node_modules/playwright SKIN_STRICT=1 SHOTS=tmp/shots node tests/skin-gallery.mjs`
(полная приёмка: все 20 видов в 390x844, 844x390, 1280x720; playwright 1.56 из глобального пакета `@playwright/mcp`)
```
icons shown: 26 (boost calendar check clock coins flame gems gift heart hud-hud-item-view-1 hud-settings lock medal medal-1 medal-2 medal-3 no-signal play quest rating-star retry shop star stopwatch-chip trophy user)
stock pictures (scripts/skin-icons.mjs, src/skin/art.ts): none

stock still visible: none identical to stock; 0 stock-colored elements in all sizes (details: …/tmp/shots/gallery/report.json)
20 views x 3 sizes in 214.1 s, 2 pages at once
PASS screenshots: …/tmp/shots/gallery
exit=0
```

## Элементы стандартного цвета (отчёт галереи)

| Размер | Видов | Элементов стандартного цвета | Стоковых картинок |
|---|---|---|---|
| 390x844 | 19 (+ `login`, вид кита без отчёта) | **0** | 0 |
| 844x390 | 19 | **0** | 0 |
| 1280x720 | 19 | **0** | 0 |

Снимки и `report.json` — `docs/skin/shots/base/` (виды магазина, главного экрана, ежедневной награды и
рейтинга просмотрены: текст читается на своём фоне, оранжевая кнопка — единственный горячий акцент,
холодная сталь и магма по арт-библии).

## Значки, оставшиеся чёрно-белыми стандартными

Перекрас атласа не меняет серые, белые и чёрные значки. Из видимых игроку (`visible-icons.json`)
остались без цвета 13:

| Значок | Что сейчас |
|---|---|
| `check` | белая галочка |
| `clock` | белый циферблат |
| `hud-hud-item-view-1` | белый плюс |
| `hud-settings` | белая шестерня |
| `lock` | белый замок |
| `medal-1`, `medal-2`, `medal-3` | чёрные силуэты медалей (видны на подиуме рейтинга) |
| `no-signal` | белая перечёркнутая антенна |
| `play` | белый треугольник |
| `retry` | белая круговая стрелка |
| `sparkle` | чёрная искра (в окне награды её заменяет звезда оболочки) |
| `stopwatch-chip` | белый секундомер |

Кроме того: `brand-mark` — перекрашенная «M» ManyPlay (на загрузке скрыта правилом COMMON до своего
знака), `close` в окнах не показывается — крест рисует код (id-close-plate). Все они — в листе своих
значков следующего шага (`map.json` → `icons.keys`).

## Решения шага (журнал — `docs/gdd/DECISIONS.md`, раздел «Базовый скин»)
- **D-SKIN-06** Окно — `clip-path` + составные фоны; шильда «выступает» за счёт прозрачной полосы
  сверху окна (у диалога кита `overflow:auto`, настоящий выступ обрезался бы); тень — многоугольник
  обрезки продолжает срезы наружу (иначе `clip-path` срезает и тень).
- **D-SKIN-07** Кодовые кнопки — `:where()` с весом только `:not(#stock)`: растровые кнопки обвязки
  (`button-base`) всегда сильнее, а срез с переменной картинки недействителен — тест галереи
  `buttons-tinted` проходит.
- **D-SKIN-08** Размер шильды на телефоне 20 px вместо 24 px карты (`clamp(20px, 2.5vw, 32px)`, на
  десктопе 32 px): при 24 px «LEADERBOARD» рвался посреди слова в окне 390 px.
- **D-SKIN-09** Рамка окна оболочки (карточка игрока) — `COMPONENTS.shell` той же функцией `frame()`:
  `COMMON` в документ не попадает.
- **D-SKIN-10** `item_coins` (заготовка каталога шаблона) — файл `items/item_coins.webp`, вырезанная
  перекрашенная монета атласа: строгая готовность требует свой файл, генерации картинок на этом шаге
  нет (Codex image_gen недоступен в этом исполнителе; рисовать растр — следующий шаг). Заменить, когда
  каталог получит бустеры `bst_*` и их картинки.
- **D-SKIN-11** Знак ManyPlay на загрузке скрыт правилом COMMON (перекрас объявляет `icon-brand-mark`,
  и обвязка его показывает); снять правило вместе с появлением своего `brand-mark`.
- Высоты кнопок 56/48 px из карты не задавались: размеры кнопок и окон — кита (рецепт «Чего не делать»).

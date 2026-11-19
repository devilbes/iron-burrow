# 12 — Content generation (`gen.`)

Источник — `00_MASTER.md` §5, §9. Уровни — level-set модуля `progress`; файлы в `configs/levels/`, публикуются через configs (в web-сборку не входят). Состав врагов — `game.enemies`, power-up — `game.powerups`, Siege — `game.siege`.

## 1. Формат стадии

`configs/levels/campaign/stage_NN.json` (NN = 01…30), `configs/levels/siege/siege_pit.json`.

| поле | тип | правило |
|---|---|---|
| `id` | string | `stage_NN` / `siege_pit` |
| `index` | int | 1…30 (Siege — нет поля) |
| `chapter` | int | 1: 1–10, 2: 11–20, 3: 21–30 |
| `theme` | string | `clay` / `iron` / `magma` по главе; Siege — `pit` |
| `grid` | string[13] | 13 строк по 13 символов, row 0 сверху |
| `quarters` | object? | `"col,row": "<hex>"` — маска оставшихся quarters для `B`/`S`: 1=TL, 2=TR, 4=BL, 8=BR; нет ключа = `F` (целая) |
| `enemies` | string[20] | порядок появления; `scout`/`grunt`/`gunner`/`brute` (Siege — нет поля) |
| `maxAlive` | int | 4 / 5 / 6 по главе |
| `spawnInterval` | number | 3.0 / 2.5 / 2.0 по главе, s |

Коды тайлов: `.` empty · `B` brick · `S` steel · `L` lava · `R` roots · `O` oil · `C` Burrow Core. Carriers (#4, #11, #18) в данных не пишутся — это `gen.carriers`.

## 2. Состав врагов (campaign)

```
brute(N)  = floor((N−1)/5)            + 1 на финалах 10, 20, 30 (за счёт grunt)
gunner(N) = min(floor((N+1)/3), 6)
scout(N)  = min(2 + floor(N/4), 7)
grunt(N)  = 20 − brute − gunner − scout
```

| N | brute | gunner | scout | grunt | | N | brute | gunner | scout | grunt |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | 0 | 2 | 18 | | 16 | 3 | 5 | 6 | 6 |
| 2–3 | 0 | 1 | 2 | 17 | | 17–19 | 3 | 6 | 6 | 5 |
| 4 | 0 | 1 | 3 | 16 | | 20 | 4 | 6 | 7 | 3 |
| 5 | 0 | 2 | 3 | 15 | | 21–25 | 4 | 6 | 7 | 3 |
| 6–7 | 1 | 2 | 3 | 14 | | 26–29 | 5 | 6 | 7 | 2 |
| 8–9 | 1 | 3 | 4 | 12 | | 30 | 6 | 6 | 7 | 1 |
| 10 | 2 | 3 | 4 | 11 | | | | | | |
| 11 | 2 | 4 | 4 | 10 | | | | | | |
| 12–13 | 2 | 4 | 5 | 9 | | | | | | |
| 14–15 | 2 | 5 | 5 | 8 | | | | | | |

**Порядок** (детерминированно, без PRNG; D-12-01): слоты 1…20.
1. brute i = 0…b−1 → слот `4 + floor((i+0.5)·17/b)` (первые 3 врага никогда не brute).
2. gunner → свободные слоты из 2…20 (список F по возрастанию), `F[floor((i+0.5)·|F|/g)]`.
3. scout → свободные из 1…20 тем же правилом.
4. остальное — grunt.

## 3. ИИ врагов

```
каждый тик, враг не заморожен и не в анимации спавна:
  decisionTimer += dt; fireTimer += dt
  if decisionTimer >= gen.ai.decision_s: wantDecision = true
  if wantDecision and (танк на линии кратной 0.5 cell по оси хода — ход в этом тике
                        обрезается ровно до линии — или стоит):
      decide(); decisionTimer = 0; wantDecision = false
  двигаться по dir; если сдвиг = 0 (блок):
      если впереди brick и своей пули нет: выстрел
          и с p = 0.5 сохранить dir, иначе decide(exclude = dir)
      иначе decide(exclude = dir)   // при блоке — смена немедленно
  если stuckTime >= gen.ai.stuck_s: decide(mode = random, exclude = dir)
  if fireTimer >= gen.ai.fire_check_s: fireTimer = 0
      p = aimLine ? gen.ai.aim_fire_p : gen.ai.fire_p[type] × bal.ai.fire_mult
      if своей пули нет and rngAI() < p: выстрел

decide(exclude):
  mode = weighted(rngAI, core: 50, player: 25, random: 25)
  if mode = player и игрока нет на поле: mode = core
  core/player: dir = ось с большим |Δ| к цели, при равенстве — вертикаль;
               если dir ∈ exclude или впереди steel/lava/край — вторая ось;
               если и она заблокирована — mode = random
  random: равновероятно из 4 направлений минус exclude
```

- `aimLine`: Core или игрок (не под `roots`) впереди на оси ствола (центры в пределах 0.5 cell), между ними нет steel. D-12-02.
- Порядок вызовов rngAI: враги по id ↑, внутри — decide до fire. Brick — не блок для выбора направления (враги его простреливают).

## 4. Power-up

- Дроп: carrier (слоты `gen.carriers`) при первом попадании (или Shockwave). Сначала тип по весам (star 30, bubble 15, rebar 15, quake 10, freeze 20, hull 10), потом клетка — оба через `rngDrop`.
- Клетка: равновероятно из свободных — тайл `.`/`R`/`O` или `B`/`S` со всеми разрушенными quarters; не Core, не 8 клеток Core wall, не 4 точки спавна, не перекрытая танком. D-12-03.

## 5. Siege

Карта `siege_pit`; волна w = 10 врагов, порядок — Fisher–Yates через `mulberry32(runSeed + w)`.

```
maxAlive(w)      = min(4 + floor(w/3), 8)
brute(w)         = min(w, 5)                 // доля min(0.1·w, 0.5)
gunner(w)        = min(floor(w/2), 3)
scout(w)         = min(1 + floor(w/3), 2)
grunt(w)         = 10 − остальные
spawnInterval(w) = max(1.5, 3.0 − 0.1·(w−1))
```

Carriers волны: `gen.siege.carriers` = #4, #9. Пауза между волнами `gen.siege.wave_break_s` (баннер `WAVE N`), бонус волны — в 11.

## 6. Правила построения карт (шаг levels, 27 карт)

| # | правило |
|---|---|
| V1 | 13×13, алфавит `.BSLROC`, ровно один `C` в (6,12) |
| V2 | Core wall: cols 5–7, rows 10–12 без Core = 8 клеток `B`, без масок |
| V3 | `.` в (0,0),(6,0),(12,0) и под ними (row 1); `.` в (4,12),(4,11) и зеркально (8,12),(8,11) |
| V4 | Из каждой вражеской точки BFS по клеткам ∉ {S, L, C} доходит до соседа Core wall |
| V5 | Из каждой вражеской точки BFS по {`.`, `R`, `O`} доходит до row ≥ 6 (враг не замурован на старте) |
| V6 | Каждая клетка ∉ {S, L, C} достижима из (4,12) по клеткам ∉ {S, L, C} (нет карманов за сталью) |
| V7 | Доли клеток: brick 25–45 % (Siege 15–35 %); steel ≤ 6 % гл.1, ≤ 12 % гл.2–3; lava 0 до ст. 21, ≤ 8 %; roots ≤ 10 %; oil 0 до ст. 13, ≤ 8 % |
| V8 | Ввод тайлов: steel с ст. 3, roots с 5, oil с 13, lava с 21 |
| V9 | Зеркальная симметрия col c ↔ 12−c для ≥ 80 % клеток |
| V10 | `enemies` — состав и порядок строго по §2; `maxAlive`/`spawnInterval`/`chapter`/`theme` — по главе |

Финалы глав (10, 20, 30) — более закрытый центр (steel-колонны в cols 4–8). Проверка V1–V10 — валидатор шага levels.

## 7. Витринные карты

```json
{"id":"stage_01","index":1,"chapter":1,"theme":"clay","maxAlive":4,"spawnInterval":3.0,
 "grid":[".............",".B.B.B.B.B.B.",".B.B.B.B.B.B.",".B.B.B.B.B.B.",".B.B.....B.B.",
         ".....B.B.....","BB.BB...BB.BB",".....B.B.....",".B.B.BBB.B.B.",".B.B.....B.B.",
         ".B.B.BBB.B.B.",".B...BBB...B.",".....BCB....."],
 "enemies":["grunt","grunt","grunt","grunt","grunt","scout","grunt","grunt","grunt","grunt",
            "grunt","grunt","grunt","grunt","grunt","scout","grunt","grunt","grunt","grunt"]}
```

```json
{"id":"stage_11","index":11,"chapter":2,"theme":"iron","maxAlive":5,"spawnInterval":2.5,
 "grid":[".............",".BB.B...B.BB.",".BB.B.S.B.BB.","....B...B....","SS..RRRRR..SS",
         "...BB...BB...",".B.BB.S.BB.B.",".B.........B.",".BBB.BBB.BBB.",".....S.S.....",
         ".B.B.BBB.B.B.",".B.S.BBB.S.B.","...S.BCB.S..."],
 "quarters":{"4,1":"C","8,1":"C"},
 "enemies":["grunt","scout","grunt","gunner","grunt","grunt","scout","brute","gunner","grunt",
            "grunt","scout","gunner","grunt","grunt","brute","grunt","gunner","scout","grunt"]}
```

```json
{"id":"siege_pit","theme":"pit",
 "grid":[".............","..B.......B..","..B.SS.SS.B..",".....OOO.....",".LL.B...B.LL.",
         ".LL.B.R.B.LL.","....BRRRB....",".SS.......SS.","...BB.S.BB...",".B.........B.",
         ".B.B.BBB.B.B.",".O.B.BBB.B.O.",".O...BCB...O."]}
```

Siege `maxAlive`/`spawnInterval`/состав — из §5 (D-12-04).

## Tunables

| key | value | src |
|---|---|---|
| gen.carriers | [4, 11, 18] | master |
| gen.ai.weights (core/player/random) | 50 / 25 / 25 | brief |
| gen.ai.decision_s | 0.25 | brief |
| gen.ai.fire_check_s | 0.5 | brief |
| gen.ai.fire_p (scout/grunt/gunner/brute) | 0.20 / 0.30 / 0.45 / 0.35 | new |
| gen.ai.aim_fire_p | 0.9 | new |
| gen.ai.brick_keep_dir_p | 0.5 | new |
| gen.ai.stuck_s | 1.0 | new |
| gen.powerup_weights | 30/15/15/10/20/10 | master |
| gen.siege.wave_size | 10 | master |
| gen.siege.carriers | [4, 9] | new |
| gen.siege.wave_break_s | 3.0 | new |
| gen.siege.gunner_cap / scout_cap | 3 / 2 | new |
| gen.siege.spawn_interval (start / step / min) | 3.0 / 0.1 / 1.5 | new |

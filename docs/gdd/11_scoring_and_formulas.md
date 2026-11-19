# 11 — Scoring and formulas (`score.`)

Источник — `00_MASTER.md` §5, §10, §11. Ключи живут в `game.balance` (`score.*`). Все очки — целые; накопление в int.

## 1. Формулы

**Campaign, стадия:**

```
S_stage = Σ kill(type) за убийства пулей игрока или Shockwave
        + score.pickup × подобранные power-up
        + (cleared ? score.clear + score.life × lives_left : 0)
```

- `lives_left` — жизни на момент перехода в `cleared` (включая текущий танк; Spare Hull pre-stage, power-up `hull` и continue в них входят).
- Убийство power-up `quake` — 0 очков (засчитано для 20). Brute даёт 400 только за последний HP, промежуточные попадания — 0.
- `star` на L3 всё равно даёт 500 (это pickup).
- D-11-01: при `defeated` счёт показывается в S08, но в progress не пишется и в рекорды не идёт.

**Siege, run:**

```
kill_siege(type, w) = floor(kill(type) × (9 + w) / 10)     // = kill × (1 + 0.1·(w−1))
wave_bonus(w)       = score.siege.wave_bonus × w            // при уничтожении 10-го врага волны
S_run = Σ kill_siege + score.pickup × pickups + Σ wave_bonus
```

- D-11-02: множитель считается целочисленно `(9 + w) / 10`, а не `1 + 0.1·(w−1)` во float (иначе ошибка 0.1 даёт ±1 после floor на разных волнах).
- D-11-03: pickup и wave bonus в Siege без множителя. Shockwave-убийства — с множителем; `quake` — 0.
- Нет clear-бонуса и бонуса за жизни. Run кончается поражением; итог = `S_run`.

**Округление**: `Math.floor` на каждом событии (до прибавления к сумме); других дробей в формулах нет.

**Проверка (verified level end)**: `score.max_stage(N) = Σ kill(состав N) + 3 × 500 + 1000 + 500 × 7` (7 = 4 lives + 3 возможных `hull`). Счёт выше — отклоняется клиентом до `progress.levelEnd` (D-11-04). Пример: стадия 30 → 5700 + 1500 + 1000 + 3500 = 11 700.

## 2. Рекорды

- `progress`: на `cleared` отправляется `levelEnd` с `score`, `stars`; хранится `best_score[N] = max(old, S_stage)`, `best_stars[N] = max(...)`. Replay улучшает только рекорд.
- `campaign_score = Σ best_score[N]` по 30 стадиям (непройденная = 0). Пересчёт после каждого `levelEnd`; `leaderboards.submitScore('campaign_score', sum)` только если сумма выросла (D-11-05).
- `siege_best`: `submitScore('siege_best', S_run)` в конце каждого run (период недельный — доска сама держит лучший); локально `siege.best_local` в gamestate для S09 "NEW BEST!".

## 3. Рабочие примеры

| # | ситуация | расчёт | итог |
|---|---|---|---|
| 1 | Стадия 1 (18 grunt, 2 scout), 2 pickup, 0 смертей | 1800 + 400 + 2×500 + 1000 + 3×500 | **5700**, ★★★ |
| 2 | То же, 2 смерти, 1 pickup | 2200 + 500 + 1000 + 1×500 | **4200**, ★ |
| 3 | Стадия 11 (2 brute, 4 gunner, 4 scout, 10 grunt), Spare Hull pre-stage (4 lives), 1 смерть, 3 pickup, `quake` убил 2 grunt + 1 scout | (800+1200+800+1000) − 400 = 3400; + 1500 + 1000 + 3×500 | **7400**, ★★ |
| 4 | Стадия 5 (2 gunner, 3 scout, 15 grunt), Shockwave убил 2 gunner, 2 pickup, 0 смертей | 600+600+1500 (Shockwave как обычные убийства) + 1000 + 1000 + 1500 | **6200**, ★★★ |
| 5 | Стадия 3, поражение после 12 grunt и 1 pickup | 1200 + 500 (показ), не пишется | **1700**, нет рекорда |
| 6 | Стадия 7 (1 brute, 2 gunner, 3 scout, 14 grunt), continue, в конце 2 lives, 1 pickup | 3000 + 500 + 1000 + 2×500 | **5500**, ★ (cap continue) |
| 7 | Siege, одиночные убийства | w1 grunt 100·10/10=100; w3 scout 200·12/10=240; w4 gunner 300·13/10=390; w7 brute 400·16/10=640; w12 gunner 630; w15 scout 480; w20 brute 1160 | — |
| 8 | Siege run: волна 1 (1 brute, 1 scout, 8 grunt), волна 2 (2 brute, 1 gunner, 1 scout, 6 grunt), 1 pickup, в волне 3 убил 3 grunt и проиграл | w1: 1400 + 300; w2: 880+330+220+660 = 2090 + 600; pickup 500; w3: 3×120 = 360 | **5250** |
| 9 | Рекорды: best 1 = 5700, best 2 = 5100, ст. 3 не пройдена; replay ст. 1 на 4700, потом на 6100 | 10 800 → без изменений → 11 200, submit | **11 200** |
| 10 | Siege волна 25, brute через Shockwave | 400·34/10 = 1360 | **1360** |

## Tunables

| key | value | src |
|---|---|---|
| score.kill.scout / grunt / gunner / brute | 200 / 100 / 300 / 400 | master |
| score.pickup | 500 | master |
| score.clear | 1000 | master |
| score.life | 500 | master |
| score.siege.mult_step | 0.1 (в формуле как `(9+w)/10`) | master |
| score.siege.wave_bonus | 300 | master |
| score.max_lives_check | 7 | new (derived) |

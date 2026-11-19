# 13 — Difficulty and balance (`bal.`)

Источник — `00_MASTER.md` §3, §5, §9; состав и ИИ — `12_content_generation.md`. Tunables — `game.balance` / `game.siege` (`bal.*`). Здесь только спецификация; код симуляций пишет шаг разработки.

## 1. Кривая сложности (campaign)

Рычаги по главам: maxAlive, spawnInterval, состав (12 §2), множитель огня ИИ `bal.ai.fire_mult`, карта (12 §6 V7–V8).

**Threat index** (для проверки монотонности):

```
TI(N) = Σ count(type)·bal.ti.w(type) × maxAlive/4 × 3.0/spawnInterval × bal.ai.fire_mult(chapter)
```

| стадии | maxAlive | spawnInterval, s | fire_mult | TI | novice win, % | expert win, % |
|---|---|---|---|---|---|---|
| 1–3 | 4 | 3.0 | 1.0 | 20.6–21.2 | 80–95 | ≥ 90 |
| 4–10 | 4 | 3.0 | 1.0 | 21.5–26.0 | 65–90 | ≥ 90 |
| 11–15 | 5 | 2.5 | 1.15 | 45.9–47.4 | 50–70 | ≥ 90 |
| 16–20 | 5 | 2.5 | 1.15 | 50.5–54.7 | 40–65 | ≥ 70 |
| 21–25 | 6 | 2.0 | 1.3 | 92.7 | 35–60 | ≥ 70 |
| 26–30 | 6 | 2.0 | 1.3 | 97.1–101.5 | 30–50 | ≥ 70 |

D-13-01: TI(N) не убывает по N (плато разрешены); рост внутри главы — за счёт состава и карт, ступени — на границах глав. Финалы 10/20/30 — +1 brute (12 §2).

## 2. Siege-волны

| w | maxAlive | spawnInterval, s | brute / gunner / scout / grunt | kill mult | fire_mult |
|---|---|---|---|---|---|
| 1 | 4 | 3.0 | 1 / 0 / 1 / 8 | 1.0 | 1.00 |
| 2 | 4 | 2.9 | 2 / 1 / 1 / 6 | 1.1 | 1.02 |
| 3 | 5 | 2.8 | 3 / 1 / 2 / 4 | 1.2 | 1.04 |
| 4 | 5 | 2.7 | 4 / 2 / 2 / 2 | 1.3 | 1.06 |
| 5 | 5 | 2.6 | 5 / 2 / 2 / 1 | 1.4 | 1.08 |
| 6–8 | 6 | 2.5–2.3 | 5 / 3 / 2 / 0 | 1.5–1.7 | 1.10–1.14 |
| 9–11 | 7 | 2.2–2.0 | 5 / 3 / 2 / 0 | 1.8–2.0 | 1.16–1.20 |
| 12–15 | 8 | 1.9–1.6 | 5 / 3 / 2 / 0 | 2.1–2.4 | 1.22–1.28 |
| ≥ 16 | 8 | 1.5 | 5 / 3 / 2 / 0 | 1 + 0.1·(w−1) | min(1 + 0.02·(w−1), 1.5) |

`bal.siege.fire_mult(w) = min(1 + 0.02·(w−1), 1.5)` (D-13-02). Лимиты бустеров в run — ×2 (10 §7), 3 lives, continue 1.

## 3. Симуляции (спецификация)

- `sim:stage_balance` — `tests/sim/stage_balance.mjs`, экспорт `run(seed) → number`; `sim:siege_waves` — `tests/sim/siege_waves.mjs`, `run(seed) → number`.
- Метрические симуляции (каждая — `tests/sim/<id>.mjs`, `run(seed) → number` = значение метрики, общий прогон-движок с двумя файлами выше): `first_kill_s`, `first_threat_s`, `stage_length_s`, `first_spawn_s` (медианы, s), `win_rate_early` (ст. 1–3), `win_rate_late` (ст. 26–30), `win_rate_stage1` (%, novice), `session_stages` (= floor(720 / (медиана длительности + 20))), `siege_run_min` (медиана, min). Строки целей — в `## Genre targets` разделов 10, 13, 14, 22, 40; gate `npm run gate:genre-targets` читает их по ключу.
- **Возвращаемое число** = количество нарушенных целей `bal.sim.*` для этого seed (0 = pass). Значения метрик — по строке JSON на метрику в stdout (`{"key","value","target","ok"}`). D-13-03.
- Seeds: 1, 7, 42. На seed: `bal.sim.runs_per_stage` = 10 прогонов на стадию на policy; Siege — `bal.sim.siege_runs` = 20 run на policy. `runSeed = (seed·1000003 + N·101 + k·7 + policyIdx) >>> 0`.
- Headless тот же core (10), dt 1/60, без туториала, без бустеров, без Spare Hull и continue, каждая стадия с L0 (D-13-04).
- Run прерывается на `bal.sim.timeout_s` sim-времени (засчитывается как softlock).
- **Softlock**: `bal.sim.softlock_idle_s` подряд нет ни убийства, ни спавна, ни потери жизни, ни исхода; или timeout.

**Policies** (бот игрока):
- `random` — каждые 0.25 s случайно одно из 5 (4 направления или стоп), выстрел с p 0.5.
- `novice` — перепланирование каждые `bal.sim.novice.reaction_s`; цель — ближайший активный враг по BFS (brick = стоимость 3, steel/lava — стена); едет по пути, стреляет при совпадении оси (±0.5 cell) и в brick на пути; с p `bal.sim.novice.err_p` берёт случайное направление на этот цикл; не уворачивается; берёт power-up в радиусе 3 cells.
- `expert` — реакция `bal.sim.expert.reaction_s`; приоритет — враг ближе 4 cells к Core; уходит с линии вражеской пули ближе 2 cells; берёт любой power-up; на L3 режет steel.
- Все policy не стреляют, если Core на оси впереди без препятствий.

## 4. Цели `bal.sim.<policy>.<metric>`

| key | target | measured by | seeds |
|---|---|---|---|
| bal.sim.novice.win_rate_s01_03 | 80–95 % | `sim:stage_balance` | 1, 7, 42 |
| bal.sim.novice.win_rate_s04_10 | 65–90 % | `sim:stage_balance` | 1, 7, 42 |
| bal.sim.novice.win_rate_s11_15 | 50–70 % | `sim:stage_balance` | 1, 7, 42 |
| bal.sim.novice.win_rate_s16_25 | 35–65 % | `sim:stage_balance` | 1, 7, 42 |
| bal.sim.novice.win_rate_s26_30 | 30–50 % | `sim:stage_balance` | 1, 7, 42 |
| bal.sim.novice.stage_duration_median | 90–180 s (clear) | `sim:stage_balance` | 1, 7, 42 |
| bal.sim.novice.defeat_core_share | 40–65 % | `sim:stage_balance` | 1, 7, 42 |
| bal.sim.novice.defeat_lives_share | 35–60 % | `sim:stage_balance` | 1, 7, 42 |
| bal.sim.novice.monotonic_violations | 0 (средний win rate блоков по 5 стадий не растёт более чем на 5 п.п.) | `sim:stage_balance` | 1, 7, 42 |
| bal.sim.expert.win_rate_s01_15 | ≥ 90 % | `sim:stage_balance` | 1, 7, 42 |
| bal.sim.expert.win_rate_s16_30 | ≥ 70 % | `sim:stage_balance` | 1, 7, 42 |
| bal.sim.expert.stage_duration_median | 70–150 s | `sim:stage_balance` | 1, 7, 42 |
| bal.sim.random.win_rate_s01_30 | ≤ 10 % | `sim:stage_balance` | 1, 7, 42 |
| bal.sim.all.ti_monotonic_violations | 0 | `sim:stage_balance` | 1, 7, 42 |
| bal.sim.all.softlocks | 0 | `sim:stage_balance`, `sim:siege_waves` | 1, 7, 42 |
| bal.sim.novice.siege_median_wave | 4–8 | `sim:siege_waves` | 1, 7, 42 |
| bal.sim.expert.siege_median_wave | 10–20 | `sim:siege_waves` | 1, 7, 42 |
| bal.sim.random.siege_median_wave | ≤ 3 | `sim:siege_waves` | 1, 7, 42 |
| bal.sim.novice.siege_wave_duration_median | 30–75 s | `sim:siege_waves` | 1, 7, 42 |

D-13-05: при нарушении правим в порядке `bal.ai.fire_mult` → `gen.ai.fire_p` → карта стадии → состав; числа из 00_MASTER не трогаем.

## Tunables

| key | value | src |
|---|---|---|
| bal.ai.fire_mult (ch1/ch2/ch3) | 1.0 / 1.15 / 1.3 | new |
| bal.siege.fire_mult | min(1 + 0.02·(w−1), 1.5) | new |
| bal.ti.w (grunt/scout/gunner/brute) | 1.0 / 1.3 / 1.6 / 2.5 | new |
| bal.sim.runs_per_stage | 10 | new |
| bal.sim.siege_runs | 20 | new |
| bal.sim.siege_max_waves | 40 | new |
| bal.sim.timeout_s | 600 | new |
| bal.sim.softlock_idle_s | 60 | new |
| bal.sim.novice.reaction_s / err_p | 0.4 / 0.2 | new |
| bal.sim.expert.reaction_s | 0.1 | new |

## Genre targets

| key | target | unit | measured by | seeds |
|---|---|---|---|---|
| gt.bal.sim_violations | 0 | число нарушенных целей `bal.sim.*` (§4) | sim:stage_balance | 1, 7, 42 |
| gt.bal.siege_violations | 0 | число нарушенных целей `bal.sim.*.siege_*` (§4) | sim:siege_waves | 1, 7, 42 |
| gt.bal.early_win_rate | 80–95 | %, стадии 1–3, бот novice | sim:win_rate_early | 1, 7, 42 |
| gt.bal.late_win_rate | 30–50 | %, стадии 26–30, бот novice | sim:win_rate_late | 1, 7, 42 |
| gt.bal.session_stages | 3–6 | стадий за 12-минутную сессию (720 s / медиана длительности стадии с экранами +20 s) | sim:session_stages | 1, 7, 42 |
| gt.bal.siege_run_length | 3–10 | min, медиана забега Siege, бот novice | sim:siege_run_min | 1, 7, 42 |

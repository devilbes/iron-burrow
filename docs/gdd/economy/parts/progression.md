# Progression and reward curves (companion to progression.json)

Boosters only (bst_bubble, bst_shockwave, bst_fortify, bst_hull), plus stars and leaderboard place. No currencies. IAP only, no ads. Sources: GDD 15 meta.forecast / meta.flow / meta.unlocks, GDD 13 §1, GDD 16 mon.defeat.

## Chapters (D-15-04)

| chapter | stages | first 3-star | attempts / 10 stages | boosters / attempt | defeat rate |
|---|---|---|---|---|---|
| 1 Clay Tunnels | 1-10 | 0.7 | 12 | 0.3 | 0.17 |
| 2 Iron Works | 11-20 | 0.5 | 14 | 0.8 | 0.29 |
| 3 Magma Depths | 21-30 | 0.3 | 18 | 1.5 | 0.44 |

Unlocks: Siege after stage 5, chapter 2 after 10, chapter 3 after 20 (no star gates).

## Daily curve (all boosters; hull tracked separately)

| day | stages | income | spend | balance end | hull end |
|---|---|---|---|---|---|
| 1 | 1-3 | 14 (grant 8) | 1 | 13 | 2 |
| 2 | 4-6 | 6 | 1 | 18 | 3 |
| 3 | 7-10 | 12 | 2 | 28 | 4 |
| 4 | 11-15 | 8 | 5 | 31 | 4 |
| 5 | 16-20 | 14 | 6 | 39 | 5 |
| 6 | 21-25 | 8 | 13 | 34 | 1 |
| 7 | 26-30 | 16 | 14 | 36 | 0 |
| 8 | Siege + replays | 2 | 4 | 34 | 0 |
| 9 | Siege + replays | 2 | 4 | 32 | 0 |
| 10 | Siege + replays | 2 | 4 | 30 | 0 |
| 11 | Siege + replays | 2 | 4 | 28 | 0 |
| 12 | Siege + replays | 3 | 4 | 27 | 0 |
| 13 | Siege + replays | 3 | 4 | 26 | 0 |
| 14 | Siege + replays | 6 | 4 | 28 | 1 |

The chapter-end balances (28 / 39 / 36) match GDD 15 meta.forecast. Days 8-14: income 20 (daily 13 + 3-star replays 7) against spend 28 (Siege 3 runs x 1.0 + replays 1 per day). The balance falls, so there is no inflation.

## Continue offer (GDD 16 mon.defeat)

Trigger: level.fail. Price: 1 bst_hull. Limit: 1 per stage or Siege run. When hull = 0, show hull_pack and starter_crate (if not yet bought). No countdown, and the continue is not applied automatically after a purchase.

| near-win stage | why |
|---|---|
| 10 | chapter 1 finale, +1 brute |
| 11 | chapter 2 step, TI 26.0 -> 45.9 |
| 19 | late chapter 2 spike, TI up to 54.7 |
| 20 | chapter 2 finale, +1 brute |
| 21 | chapter 3 step, TI -> 92.7 |
| 29 | late chapter 3 spike, TI near 101.5 |
| 30 | campaign finale |

## Payer curve

| metric | value |
|---|---|
| expected first purchase day | 6 (need-driven; Starter Crate impulse window is days 1-3) |
| hull shortage day | 7 |

## Health checks

| check | result |
|---|---|
| non-payer can finish campaign | pass (balance never below 13; Retry is free) |
| unbounded sources | pass (only daily, which is time-gated, and IAP) |
| deficit type | risk (bst_hull; this pressure is intended) |
| inflation after campaign | pass (net -8 over days 8-14) |

## Decisions

- DE-PROG-01. Decision: chapter defeat rate = (attempts - 10) / attempts, giving 0.17 / 0.29 / 0.44. Reason: this follows from the D-15-04 attempts and fits the GDD 13 novice win bands once boosters are used.
- DE-PROG-02. Decision: stages per day are 3/3/4 for days 1-3, then 5/5 and 5/5. Reason: D-15-04 puts 7 days on the campaign with chapters on days 1-3, 4-5 and 6-7.
- DE-PROG-03. Decision: per-day spend is rounded so chapter totals equal 4 / 11 / 27. Reason: this keeps the curve consistent with GDD 15 meta.forecast.
- DE-PROG-04. Decision: bst_hull's share of spend grows with the chapter (1 / 4 / 10 per chapter). Reason: a higher defeat rate means more continues and pre-stage hulls. Hull runs out on day 7.
- DE-PROG-05. Decision: post-campaign Siege use is 3 runs per day at 1.0 booster per run, plus 1 booster per day on replays. Reason: casual endless modes see a few runs per day, and players hoard under limits that are x2 the campaign limits.
- DE-PROG-06. Decision: 3-star replays give 1 per day after the campaign. Reason: 15 of the 30 3-star rewards are still open at day 7, and they are a bounded source.
- DE-PROG-07. Decision: near-win stages are 10, 11, 19, 20, 21, 29 and 30. Reason: these are the chapter finales and the TI steps and spikes in GDD 13 §1.
- DE-PROG-08. Decision: expected first purchase is on day 6. Reason: hull drops to 1 at the chapter 3 start. The Starter Crate auto-offer can pull the purchase earlier.
- DE-PROG-09. Decision: add the lever game.rewards.daily.hold_cap_per_item (default 30, off by default). Reason: players who only claim the daily reward and do not play gain 13 per week without limit. The cap swaps a capped type for another type.
- DE-PROG-10. Decision: hull deficit is accepted as a "risk", not a fail. Reason: Retry is free and there are no star gates. The lever game.rewards.finale.items can add hull if defeat churn rises.

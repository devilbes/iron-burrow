# Rewards (economy part)

Source: docs/gdd/15_economy_meta.md (meta.rewards, meta.daily, meta.grant, meta.siege). Data: rewards.json. No currencies, no ads; only 4 boosters, stars, leaderboard place. Scrap is next-stage only.

## Start grant (separate reward)
| bst_bubble | bst_shockwave | bst_fortify | bst_hull | total |
|---|---|---|---|---|
| 2 | 2 | 2 | 2 | 8 |

## Levels (per stage, first clear)
Rotation (N-1) mod 4: bubble, shockwave, fortify, hull. Three stars: +1 bst_bubble once per stage. Finale on 10, 20, 30: +1 of each booster.

| source | bubble | shockwave | fortify | hull | total |
|---|---|---|---|---|---|
| first clears (30 stages) | 8 | 8 | 7 | 7 | 30 |
| chapter finales (3x) | 3 | 3 | 3 | 3 | 12 |
| three stars (max 30) | 30 | 0 | 0 | 0 | 30 |

## Daily (7-day cycle, missed day does not reset)
| day | items | total |
|---|---|---|
| 1 | bubble 1 | 1 |
| 2 | shockwave 1 | 1 |
| 3 | fortify 1 | 1 |
| 4 | hull 1 | 1 |
| 5 | bubble 2 | 2 |
| 6 | shockwave 1, fortify 1 | 2 |
| 7 | hull 2, bubble 2, shockwave 1 | 5 |
| cycle | 5 / 3 / 2 / 3 | 13 |

## Siege
No item rewards; only score and place on leaderboard siege_best.

## Campaign maximum (one daily cycle, 3 stars everywhere)
| scope | bubble | shockwave | fortify | hull | all |
|---|---|---|---|---|---|
| without start grant | 46 | 14 | 12 | 13 | 85 |
| with start grant | 48 | 16 | 14 | 15 | 93 |

## Cross-check vs meta.forecast
First clears 8/8/7/7 = 30: match. Finales 3 each = 12: match. Stars max 30 bubble: match. Daily 5/3/2/3 = 13: match. Max total with grant 48/16/14/15 = 93: match. No mismatches found. Note: forecast chapter-3 daily is 7 (D5..D7 style split) and chapter sums 3+3+7 = 13: consistent.

## decisions
- DE-REWARDS-01: Rewards file mirrors GDD values unchanged. Reason: GDD 15 is internally consistent and already sums correctly.
- DE-REWARDS-02: campaignMax is reported both without and with start grant. Reason: grant is a separate reward; the GDD forecast total (93) includes it.
- DE-REWARDS-03: Three-star reward is modelled as a per-stage field (threeStars) separate from firstClear. Reason: GDD D-15-03, both are granted together when 3 stars on first clear.
- DE-REWARDS-04: Siege has no item rewards (itemRewards=false). Reason: D-15-05, leaderboard place is the reward; keeps boosters scarce and drives pack sales.
- DE-REWARDS-05: Hull remains the scarcest booster (15 per campaign). Reason: it is used for pre-stage and continue, which supports Hull Pack IAP without any hard currency.

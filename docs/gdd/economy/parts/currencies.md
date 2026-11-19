# Currencies and sinks (economy part)

MVP has no currencies. Four consumable boosters only. Scrap is described, not implemented.

## Boosters

| id | cap | start | per stage | Siege run | in-stage cost |
|---|---|---|---|---|---|
| bst_bubble | 99 | 0 | 2 | 4 | 1 |
| bst_shockwave | 99 | 0 | 1 | 2 | 1 |
| bst_fortify | 99 | 0 | 1 | 2 | 1 |
| bst_hull | 99 | 0 | 2 (1 pre-stage + 1 continue) | 3 (2 pre-stage + 1 continue) | 1 |

Sinks: use_bubble, use_shockwave, use_fortify (stage.booster_tap), hull_prestage (stage.prestage), hull_continue (level.fail). All optional and elastic. No hard and no soft currency exists in MVP.

## Scrap (next stage)

Sources: first clear 30, first 3-star 20, chapter finale 150, replay 12 (max 8 paid per day), Siege wave 3 (cap 180/day), daily cycle D2 30, D4 40, D5 50, D6 40, D7 100 (260 per cycle, 37/day).

Sinks: Garage 3 lines x tiers 150 / 450 / 1000 = 4800; skins 4 x 300 + 4 x 600 = 3600; bonus chapter 1500. Total 9900.

## Arithmetic (non-paying player)

- Tier 1 (150): day 1 about 4 stages = 120 + two 3-stars 40 = 160. Reached in day 1 to 2.
- Campaign one-time: 900 + about 300 (15 expected 3-stars) + 450 finales = about 1650 by day 7, plus daily 260 and some replays/Siege, so about 2200 by day 7.
- Steady state: daily 37 + replays 96 + Siege 90 = about 223/day.
- Remaining 9900 - 2200 = 7700; 7700 / 223 = about 35 days. Full Garage ends near day 42 (inside 30-45). A player who skips Siege (about 133/day) needs about 58 days, a Siege-active player about 30.
- Open risk: after everything is bought Scrap has no sink; add a sink in a later update.

## decisions

- DE-CUR-01: cap 99 per booster. Reason: above the largest pack share (35 per type) and reward flow; keeps UI numbers short.
- DE-CUR-02: start balance 0 for all boosters. Reason: start grant (2 each) is a separate reward (D-15-01).
- DE-CUR-03: bst_hull limits are pre-stage + continue (2 per stage, 3 per Siege run). Reason: matches 10 section 7.
- DE-CUR-04: all booster sinks optional and elastic. Reason: boosters are never required to pass a stage.
- DE-CUR-05: Scrap deferred. Reason: platform has no exchange rules or start balance (meta.next).
- DE-CUR-06: replay Scrap capped at 8 per day and Siege at 180 per day. Reason: stops grind farming and keeps the 30-45 day target.
- DE-CUR-07: Garage tier curve 150 / 450 / 1000. Reason: fast first tier for early hook, steep later for retention.

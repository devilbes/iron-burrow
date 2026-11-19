# Economy decisions (economy-design, mode "decide yourself")

Section decisions from the parallel parts are kept under their ids. Merge decisions are DE-MRG-*.

| ID | decision | reason |
|---|---|---|
| DE-00-01 | v1 has no currencies; the rewards are 4 consumable boosters, stars and leaderboard place | Economy rule: the boosters are what the mechanic uses. Scrap has real sinks but the platform cannot publish exchange rules or a start balance yet, so it is described as the next stage |
| DE-00-02 | Archetype iap-only, no ads | Flow frame lite-flow-rules; GDD 16 D-16-01 |
| DE-00-03 | No hard currency at all; start grant is a separate booster-only reward | Platform inventory rejects mixed rewards with hard currency; GDD 15 D-15-01 |
| DE-CUR-02 | Start balance 0 for all boosters | The start grant (2 each) is a separate reward |
| DE-CUR-03 | Hull limits: pre-stage 1 + continue 1 per stage; Siege pre-stage 2 + continue 1 | GDD 10 §7, GDD 31 game.boosters.hull |
| DE-CUR-04 | All booster sinks are optional and elastic | No stage requires a booster |
| DE-CUR-06 | Scrap: replays capped at 8 per day, Siege at 180 per day | Stops grind farming |
| DE-CUR-07 | Garage tiers 150 / 450 / 1000 per line | Fast first tier (day 2), steep later tiers for retention |
| DE-IAP-01 | Keep GDD prices 0.99 / 1.99 / 4.99 / 9.99 / 19.99 | They match market anchors (research monetization.md §2) |
| DE-IAP-02 | Payer conversion estimate 3 % | Typical 2–4 % for web casual IAP-only without ads |
| DE-IAP-03 | ARPPU estimate 6.5 USD | A 0.99 entry, then repeat Hull Pack and Field Kit purchases |
| DE-IAP-04 | Shop order: Starter (while not bought), Hull, Field Kit, Heavy, Commander | Entry pack first, then ascending price |
| DE-IAP-05 | Hull Pack premium accepted | Impulse rescue at Defeat; Field Kit "Best value" next to it |
| DE-PROG-01 | Chapter defeat rate (attempts − 10) / attempts = 0.17 / 0.29 / 0.44 | From D-15-04 attempts; fits GDD 13 win bands |
| DE-PROG-02 | Stages per day: 3/3/4, 5/5, 5/5 | D-15-04: 7-day campaign |
| DE-PROG-05 | After the campaign: 3 Siege runs per day × 1 booster + 1 booster on replays | Casual endless-mode use under ×2 limits |
| DE-PROG-07 | Near-win stages for the continue offer: 10, 11, 19, 20, 21, 29, 30 | Chapter finales and the TI steps and spikes of GDD 13 |
| DE-PROG-08 | Expected first purchase on day 6 | Hull drops to 1 at the start of chapter 3; the Starter auto-offer can pull it earlier |
| DE-PROG-10 | The hull deficit is an intended "risk", not a fail | Retry is free and there are no star gates; the lever is game.rewards.finale_bundle |
| DE-REW-01 | Rewards mirror GDD 15 unchanged | GDD tables are consistent (8/8/7/7, 12, 30, 13, 93) |
| DE-MRG-01 | Booster cap 999 is a safety bound only; the client never blocks rewards or purchases | Reviewer: 99 had wrong arithmetic and needed client logic that conflicts with D-16-06 |
| DE-MRG-02 | Reward levers change service data via services-publish and mirror it in game.rewards | GDD 31 D-31-03: game.rewards is display-only |
| DE-MRG-03 | The proposed lever hold_cap_per_item is dropped | It would need client-side granting logic; daily-only accumulation is time-bounded and harmless without a currency |
| DE-MRG-04 | A repeatable Scrap sink was added: a weekly rotating skin at 400 | GDD meta.next requires permanent sinks; otherwise Scrap would have no sink after about day 42 |
| DE-MRG-05 | Badges Save 20 % / Save 31 % / Rescue / One-time offer are economy decisions | GDD defines only Best value (D-16-08); the discounts are computed per item vs Field Kit |
| DE-MRG-06 | Model horizon 14 days (2 daily cycles); the simulator horizon comes from QUALITY_TARGETS only | No threshold facts; the design horizon is not a threshold |
| DE-MRG-07 | IAP sources use a model bound of 10 purchases per day (Starter: 1) | The simulator needs a numeric perDay value; the store itself has no limit |
| DE-MRG-08 | First A/B: Hull Pack 5 → 6 hulls at 1.99 | It halves the per-item premium on the main Defeat-screen offer; one parameter, iap.packs.hull_pack (D-MRG-02) |

# Economy part: Prices and IAP

IAP only, no ads, no currencies. Prices in USD; source GDD 16 mon.catalog.

## Packs

| pack | items | USD | USD/item | vs Field Kit | type |
|---|---|---|---|---|---|
| Starter Crate | 12 (3 each) | 0.99 | 0.0825 | -60% | one-time |
| Hull Pack | 5 hull | 1.99 | 0.398 | +91% | repeatable |
| Field Kit | 24 (6 each) | 4.99 | 0.208 | 0 | repeatable, Best value badge |
| Heavy Arsenal | 60 (15 each) | 9.99 | 0.167 | -20% | repeatable |
| Commander Cache | 140 (35 each) | 19.99 | 0.143 | -31% | repeatable |

## Offers

| id | pack | placement | condition |
|---|---|---|---|
| offer_starter_auto | starter_crate | auto window | first defeat or first clear of stage 3; not bought; 24 h cooldown; max 3 auto shows |
| offer_defeat_hull | hull_pack | Defeat S08 | continue available and bst_hull = 0 |
| offer_defeat_starter | starter_crate | Defeat S08 | same, not bought; no cooldown spent |
| offer_prestage_hull_link | hull_pack | Pre-stage S04 | bst_hull = 0, link only |
| shop_listing | all | Shop S10 | Starter, Hull, Field Kit, Heavy, Commander |

## Checks

- Value per dollar is monotonic from Field Kit (0.208) to Heavy Arsenal (0.167) to Commander Cache (0.143). Starter Crate is the one-time entry price below the ladder.
- Hull Pack costs 91% more per item than Field Kit. Justified: it is an impulse rescue at Defeat (one item, lowest price point above 0.99, no decision about a larger bundle), it contains only the most valuable booster, and Field Kit with Best value is linked right beside it (D-16-08).

## Revenue model

| metric | value |
|---|---|
| payer conversion | 3% |
| ARPPU | 6.5 USD |
| first purchase | 0.99 USD |

## decisions

- DE-IAP-01: Keep GDD prices unchanged. Reason: ladder 0.99/4.99/9.99/19.99 matches market anchors.
- DE-IAP-02: Payer conversion 3%. Reason: typical 2-4% for web casual IAP-only without ads.
- DE-IAP-03: ARPPU 6.5 USD. Reason: 0.99 entry plus Hull and Field Kit repeats; most revenue from 4.99-9.99 packs.
- DE-IAP-04: Shop order Starter, Hull, Field Kit, Heavy, Commander. Reason: ascending price, entry pack first while unbought.
- DE-IAP-05: Hull Pack premium accepted. Reason: impulse rescue at Defeat, Best value Field Kit shown nearby.
- DE-IAP-06: Next stage (Scrap) keeps booster bundles; no hard currency. Reason: binding economy rule.

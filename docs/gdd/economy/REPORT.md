# Economy report — Iron Burrow (economy-design)

Model: `ECONOMY.json` (source of truth for every number; each object has `src`). Simulation: `SIM.json` (`studio-gates economy-simulate`). Decisions: `DECISIONS.md`. Open items: `OPEN_QUESTIONS.md`. A/B: `AB_PLAN.json`, `LEVERS.json`.

## 1. Archetype and economy rule

- **iap-only**. No ads anywhere (`ads.placements: []`, `monetization.ads: false`).
- **No currencies in v1.** What the mechanic actually uses: 4 consumable boosters (`bst_bubble`, `bst_shockwave`, `bst_fortify`, `bst_hull`), stars and leaderboard place. Inventory, daily rewards and the shop stay: daily and level rewards give boosters, the shop sells booster packs for real money, and the game spends boosters itself.
- Soft currency **Scrap** was designed together with its permanent sinks (Garage upgrades, skin collection, a weekly skin rotation, a bonus chapter). It is the **next stage** (`deferredCurrencies`) because the platform cannot yet publish exchange rules and a start balance. **No hard currency, ever.** The start grant is a separate reward with boosters only.

## 2. Currencies (items) and sinks

| item | cap | start | stage limit | Siege run limit | sinks |
|---|---|---|---|---|---|
| bst_bubble | 999 | 0 (+2 grant) | 2 | 4 | use_bubble |
| bst_shockwave | 999 | 0 (+2 grant) | 1 | 2 | use_shockwave |
| bst_fortify | 999 | 0 (+2 grant) | 1 | 2 | use_fortify |
| bst_hull | 999 | 0 (+2 grant) | pre-stage 1 + continue 1 | pre-stage 2 + continue 1 | hull_prestage, hull_continue |

Scrap (next stage): first clear 30, first 3-star 20, finale 150, replay 12 (8/day), Siege wave 3 (180/day), daily 260 per cycle. Sinks: Garage 3 lines × 150/450/1000 = 4800, skins 4×300 + 4×600 = 3600, bonus chapter 1500, plus a repeatable weekly skin at 400. A non-payer gets tier 1 on day 2 and the full Garage around day 42 (about day 65 without Siege).

## 3. Prices and IAP (USD)

| pack | contents | items | price | $/item | limit | badge |
|---|---|---|---|---|---|---|
| Starter Crate | 3 of each | 12 | 0.99 | 0.083 | 1 | One-time offer |
| Hull Pack | 5 hull | 5 | 1.99 | 0.398 | unlimited | Rescue |
| Field Kit | 6 of each | 24 | 4.99 | 0.208 | unlimited | Best value |
| Heavy Arsenal | 15 of each | 60 | 9.99 | 0.167 | unlimited | Save 20% |
| Commander Cache | 35 of each | 140 | 19.99 | 0.143 | unlimited | Save 31% |

Value per dollar rises steadily from Field Kit to Commander Cache. Hull Pack's +91 % premium per item is the Defeat-screen rescue impulse, and "More in Shop" links to Field Kit. Offers: Starter auto-window (first defeat / first clear of stage 3, cooldown 24 h, at most 3 shows), Defeat (Hull Pack + Starter Crate when continue is available and hull = 0), and a Pre-stage link to Hull Pack. Revenue estimate: payer conversion 3 %, ARPPU 6.5 USD (decision, market level). SKU and offer ids are created by services-publish.

## 4. Rewards

- **Start grant** (separate, once): 2 of each = 8.
- **Levels** (all 30 in `rewards.levels`): a first clear gives 1 booster in the rotation bubble → shockwave → fortify → hull (8/8/7/7). The first ★★★ gives +1 bubble (max 30). Finales 10/20/30 give +1 of each (12).
- **Daily** (7-day cycle, a missed day does not reset): D1 bubble 1 · D2 shockwave 1 · D3 fortify 1 · D4 hull 1 · D5 bubble 2 · D6 shockwave 1 + fortify 1 · D7 hull 2 + bubble 2 + shockwave 1 = 13.
- **Siege**: no items; the reward is the `siege_best` place.
- Campaign maximum with grant: 48/16/14/15 = 93; forecast 78.

## 5. Progression and reward curve (non-payer, from `progression.dailyCurve`)

| day | stages | income | spend | balance | hull |
|---|---|---|---|---|---|
| 1 | 1–3 | 14 | 1 | 13 | 2 |
| 2 | 4–6 | 6 | 1 | 18 | 3 |
| 3 | 7–10 | 12 | 2 | 28 | 4 |
| 4 | 11–15 | 8 | 5 | 31 | 4 |
| 5 | 16–20 | 14 | 6 | 39 | 5 |
| 6 | 21–25 | 8 | 13 | 34 | 1 |
| 7 | 26–30 | 16 | 14 | 36 | 1 |
| 8–14 | Siege + replays | 20 | 28 | 28 | 0–1 |

Chapter totals match GDD 15 `meta.forecast`: income 24/22/24 (+8 grant), spend 4/11/27, balance 28/39/36. Continue offer: 1 hull, once per stage or Siege run. Near-win stages are 10, 11, 19, 20, 21, 29 and 30. Hull is the deficit type: it falls to 1 on day 6, so the expected first purchase is on day 6, or earlier through the Starter auto-offer.

## 6. Simulation and thresholds

`studio-gates economy-simulate --model docs/gdd/economy/ECONOMY.json --out docs/gdd/economy/SIM.json` → **status unmeasured**. Missing: `QUALITY_TARGETS.economy.seed/runs/horizonDays` and `qualityTargets.economy.policies` (there is no `docs/plan/QUALITY_TARGETS.json` and no run facts). No thresholds or player policies were invented.

| metric | policy | value | threshold | status |
|---|---|---|---|---|
| inflationIndex | — | — | — | unmeasured |
| stuckRate | — | — | — | unmeasured |
| sinkCoverage | — | — | — | unmeasured |
| payWallDay | — | — | — | unmeasured |
| adSecondsPerSession | — | 0 by design (no ads) | — | unmeasured |

Gate `studio-gates economy-sim`: EC-01, EC-02 and EC-03 PASS (schema, every source has a sink, every number has `src`). EC-04 and EC-05 WARN (unmeasured). PARAMS FAIL: runner facts `gates.economy.gddKeys` and `gates.economy.designStages` are missing in the pod; these are not files of this step. The variant `hull6` from AB_PLAN was also simulated: unmeasured for the same reason.

Design-level checks (arithmetic, not simulation; source `progression.healthChecks`):
- A non-payer can finish the campaign: **pass**. Retry is free, there are no star gates and boosters are optional.
- Unbounded sources: **pass**. Only daily rewards (time-gated, 13 per week) and IAP are unbounded.
- Deficit type `bst_hull`: **risk (intended)**. The lever is `game.rewards.finale_bundle`, applied via services-publish.
- Post-campaign inflation: **pass**. Days 8–14: income 20, spend 28.

## 7. Convergence (parallel sections → merge)

The four sections (currencies, IAP, rewards, curves) were written in parallel and checked by an independent reviewer. Fixed during the merge:
- lever keys renamed to GDD 31 `plat.configs`; reward levers change service data via services-publish (D-31-03);
- the `hold_cap_per_item` proposal was removed (it was client-side granting logic);
- the cap changed from 99 (wrong arithmetic, client blocking) to 999 as a safety bound that is never enforced by the client;
- hull on day 7: the finale hull arrives after the last stage, so it ends at 1, not 0;
- badges that are not in the GDD are marked as decisions; `purchaseLimit` is "unlimited" instead of 0;
- Scrap timeline recounted (day 1 = 3 stages) and a repeatable sink added;
- `src` format unified.

## 8. Needs owner decision

None blocking. Mode is "decide yourself"; all decisions are in `DECISIONS.md`.

## Чего не хватает у платформы

- **Runner facts for the gates.** `gates.economy.gddKeys`, `gates.economy.designStages` and `gates.ab-plan.registryKeyStages` are missing. Searched: `.devflow/facts.json`, `GATE_FACTS`, `docs/plan/integration/PLATFORM_FACTS.json` — none exists in the pod. Result: `economy-sim` and `ab-plan` FAIL on PARAMS, and AB-04 does not recognise the lever keys. 1 attempt. Needed: the runner passes the gate facts to the economy-design step.
- **QUALITY_TARGETS.economy** (seed, runs, horizonDays, thresholds) and **qualityTargets.economy.policies.arcade** were not passed, so the simulation is unmeasured. Needed: DB thresholds and player policies for genre arcade on web.
- **Booster cap on inventory entities.** No document says whether inventory supports a per-item cap or what happens to a grant above the cap. The cap 999 is recorded as a safety bound only (OQ-01).

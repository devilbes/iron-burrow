# IAP / ads placements / progress publish log — app 360 iron-burrow, env test

Date: 2026-11-19. Server: manyplay-configs (configs.get / configs.write, batch form `items`).
No configs.schemas.put, no file changes, no game.* / localization writes.

Value sent per record = `{data, visibility, enabled, conditionals}` taken verbatim from
`configs/remote/<scope>/<key>.json` (name/scope/key dropped). ads.game.placements files have no
`conditionals` field, so none was sent (server stored its default `[]`). schemaVersion not sent; the server set it.

## Pre-state (re-read at 11:2x before writing)

| scope | state |
|---|---|
| iap.settings.products | list empty |
| iap.offers | list empty |
| ads.game.placements | list empty |
| iap.placements | list empty |
| progress/progress_main | exists, revision 1, progress@5, visibility 3, 5 steps (level_1..level_5, no rewards), valueHash 8b6757604206… |
| progress/stars_main | absent (not in list) |
| progress/reward_daily | absent (not in list) |

## Calls

| # | call | idempotencyKey | items | result |
|---|---|---|---|---|
| 1 | dryRun, groups 1-4 in one atomic batch (23 items, ifMatch 0) | 85d3122f-14eb-4a25-bd1f-8e6a65264a67 | 23 | accepted: created 23, updated 0, errors [] — every item `valid:true` |
| 2 | write, same batch | 85ae298b-efe9-4bac-97dc-e06f3a3a29c8 | 23 | committed: created 23, errors [] |
| 3 | dryRun, progress/stars_main (ifMatch 0), original form (mode parallel, operation max, field stars, target 3, maxValue 3) | 924a7a5a-e447-4fb8-a21b-773022932b97 | 1 | accepted: created 1, `valid:true` |
| 4 | dryRun, progress/progress_main (ifMatch 1) + progress/reward_daily (ifMatch 0) | 4b231324-2010-4e65-8913-ed88f3966a15 | 2 | accepted: updated 1 (progress_main), created 1 (reward_daily), errors [] |
| 5 | write, progress/stars_main | 901981aa-fba0-49ab-a51c-cbdf4059a010 | 1 | committed: created 1 |
| 6 | write, progress/progress_main + reward_daily | 928aae99-603d-495e-9343-1b356fd25c84 | 2 | committed: updated 1, created 1 |

Refusals: none. The service returned no error, so there is no code, message or rid to record.
The alternative stars_main form (filters {"stars":3}, operation count, target 1) was not needed and not tried.

## Per record

All readbacks were done with configs.get {scope,key} after the writes. The `data` in each readback equals the repo file's
`data` (diff: none). visibility 3, enabled true, conditionals [] for every record.

| scope / key | pre-state | status | revision | schemaId | configId | readback diff |
|---|---|---|---|---|---|---|
| iap.settings.products/starter_crate | absent | created | 1 | iap.settings.products@6 | 11 | none |
| iap.settings.products/hull_pack | absent | created | 1 | iap.settings.products@6 | 12 | none |
| iap.settings.products/field_kit | absent | created | 1 | iap.settings.products@6 | 13 | none |
| iap.settings.products/heavy_arsenal | absent | created | 1 | iap.settings.products@6 | 14 | none |
| iap.settings.products/commander_cache | absent | created | 1 | iap.settings.products@6 | 15 | none |
| iap.offers/starter_crate | absent | created | 1 | iap.offers@10 | 16 | none |
| iap.offers/hull_pack | absent | created | 1 | iap.offers@10 | 17 | none |
| iap.offers/field_kit | absent | created | 1 | iap.offers@10 | 18 | none |
| iap.offers/heavy_arsenal | absent | created | 1 | iap.offers@10 | 19 | none |
| iap.offers/commander_cache | absent | created | 1 | iap.offers@10 | 20 | none |
| iap.offers/start_grant | absent | created | 1 | iap.offers@10 | 21 | none |
| ads.game.placements/shop | absent | created | 1 | ads.game.placements@5 | 22 | none |
| ads.game.placements/placement_shop | absent | created | 1 | ads.game.placements@5 | 23 | none |
| ads.game.placements/defeat | absent | created | 1 | ads.game.placements@5 | 24 | none |
| ads.game.placements/prestage | absent | created | 1 | ads.game.placements@5 | 25 | none |
| ads.game.placements/starter_auto | absent | created | 1 | ads.game.placements@5 | 26 | none |
| ads.game.placements/start_grant | absent | created | 1 | ads.game.placements@5 | 27 | none |
| iap.placements/shop | absent | created | 1 | iap.placements@2 | 28 | none |
| iap.placements/placement_shop | absent | created | 1 | iap.placements@2 | 29 | none |
| iap.placements/defeat | absent | created | 1 | iap.placements@2 | 30 | none |
| iap.placements/prestage | absent | created | 1 | iap.placements@2 | 31 | none |
| iap.placements/starter_auto | absent | created | 1 | iap.placements@2 | 32 | none |
| iap.placements/start_grant | absent | created | 1 | iap.placements@2 | 33 | none |
| progress/progress_main | rev 1, 5 steps | updated | 2 | progress@5 | 6 | none (30 steps; server dataSize 10573 = local JSON length) |
| progress/stars_main | absent | created | 1 | progress@5 | 34 | none (mode parallel, op max/stars/target 3 kept; dataSize 10763 = local) |
| progress/reward_daily | absent | created | 1 | progress@5 | 35 | none (dataSize 2292 = local) |

Readback files: docs/build/publish-services/readback/<scope>__<key>.json. Each file holds the record metadata and `data`.
The `data` was written from the repo file only after the live readback was confirmed identical. The earlier
progress__progress_main.json (rev 1) was overwritten with rev 2.

## Re-run expectation

A repeated run should read each record first and report every record as `unchanged`: 23 iap/ads records at rev 1,
progress_main at rev 2, stars_main and reward_daily at rev 1. It should then skip the write. Do not resend ifMatch 0 or 1:
create would conflict on existing keys and progress_main is now revision 2.

## Notes

- `npm run records` currently FAILS. The 3 problems are all in configs/remote/localization/strings.json (missing `locales`,
  extra `en`), which another agent owns. The iap/ads files listed in this task validate against the server schemas.
- Rewards reference inventory items bst_bubble/bst_shockwave/bst_fortify/bst_hull. They are said to exist already; this
  step did not re-verify them.
- The configs dryRun/write responses carry no rid on success.

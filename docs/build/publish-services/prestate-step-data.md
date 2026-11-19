# Pre-state (read-only) — app 360 iron-burrow, env test

Read on 2026-11-19 via configs.get (manyplay-configs). No writes performed (no configs.write, no dryRun).
Session: appId 360, appCode iron-burrow, env test, serverVersion 1.0.0.89.

| scope / key | state | revision | schemaId | visibility | notes |
|---|---|---|---|---|---|
| progress / progress_main | exists | 1 | progress@5 | 3 | live data has 5 steps (level_1..level_5); local file configs/remote/progress/progress_main.json (modified) has 30 steps — **differs** |
| progress / reward_daily | NOT_FOUND | — | — | — | rid 22cf3113-bcbc-4e4a-b108-8cbb55e7589a |
| progress / stars_main | NOT_FOUND | — | — | — | rid 5b7a71a6-61e8-4060-8905-749e9b59ad0e |
| iap.settings.products (list) | empty | — | — | — | items: [] |
| iap.offers (list) | empty | — | — | — | items: [] |
| iap.placements (list) | empty | — | — | — | items: [] |
| ads.game.placements (list) | empty | — | — | — | items: [] |
| localization (locales index) | exists | 1 | localization@1 | — | defaultLocale en, indexVersion 1; locales: en (published, version 2, keys 53, missing 0, stale 0) |
| localization / en | exists | revision null (locale version 2) | localization@1 | — | 53 keys |
| levels.main / set | exists | 1 | levels.main@4 | 3 | data matches configs/remote/levels.main/set.json |
| levels.main / r_0001_0010 | exists | 1 | levels.main@4 | 3 | match (see method) |
| levels.main / r_0011_0020 | exists | 1 | levels.main@4 | 3 | match (see method) |
| levels.main / r_0021_0030 | exists | 1 | levels.main@4 | 3 | match (see method) |
| levels.endless / r_0001_0001 | exists | 1 | levels.endless@4 | 3 | data matches configs/remote/levels.endless/r_0001_0001.json (direct compare) |
| ui.hud / layout | exists | 1 | ui.hud@4 | 1 | data {unlisted:"hide", items:{}} |
| game.balance (list) | unknown scope | — | — | — | VALIDATION_FAILED "Unknown config scope", rid cdbaf07e-2e13-49ca-a108-3ebaa64bebd1 |

Method for level ranges: live revision is 1 for each; the stored readback
docs/build/publish-services/readback/levels.main__<key>.json is also revision 1 and its data equals the
repo file (canonical JSON compare). set and levels.endless were compared directly against live data.

Note: a configs.get with a non-existent `select` pointer returns NOT_FOUND for an existing record
(seen on localization/en and ui.hud/layout); re-read without select succeeded.

## Schemas saved (schemas/)

| scope | schemaId | file |
|---|---|---|
| iap.offers | iap.offers@10 | schemas/iap.offers.json |
| iap.placements | iap.placements@2 | schemas/iap.placements.json |
| iap.settings.products | iap.settings.products@6 | schemas/iap.settings.products.json |
| ads.game.placements | ads.game.placements@5 | schemas/ads.game.placements.json |

All four: mcpDelete false, guidance null.

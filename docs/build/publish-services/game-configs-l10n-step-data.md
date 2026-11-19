# Game custom scopes + localization strings — step data

App 360 (iron-burrow), env test, 2026-11-19. Tools: manyplay-configs `configs.get`, `configs.schemas.put`, `configs.write`.
Idempotency keys are deterministic UUIDs: sha256 of `app360|<kind>|<scope or batch>|<sha256 of input file, 16 hex>|dry|commit`
(script /tmp/gcl/key.mjs during the run). The same input gives the same key.
Not touched: iap.*, ads.game.placements, progress (another agent publishes them).

## Part A — game.* scopes

### 1. Pre-state: `configs.get {scope, include:"schema"}`
Every scope returned NOT_FOUND "configs.get: resource — not found." (unknown scope, no schema):

| scope | code | rid |
|---|---|---|
| game.balance | NOT_FOUND | e8e2bab6-3f0f-4e9d-bad9-ea7a20ef60ec |
| game.enemies | NOT_FOUND | 24ab2367-c223-4007-ad11-eaf0550f238d |
| game.powerups | NOT_FOUND | 47251745-abd6-4c6a-9f9a-12c7685eb234 |
| game.boosters | NOT_FOUND | 768668f4-a60f-4510-bd1d-01a3cb4843fe |
| game.siege | NOT_FOUND | be862d96-915c-4b69-af18-470a4c624a23 |
| game.rewards | NOT_FOUND | 52e65efc-cbf3-4e1f-96c6-893c4e252601 |
| game.iap_packs | NOT_FOUND | 6ccfc48c-d8a1-4202-8be1-dac177fe473c |
| game.iap_shop_order | NOT_FOUND | b4d12c0c-f65f-48c4-9dee-76cb80ffb871 |
| game.iap_placements | NOT_FOUND | 36711156-64a8-44cc-8e97-10aca4155fd1 |

### 2. Schemas: `configs.schemas.put` (dryRun, then commit), schema = configs/schemas/<scope>.json unchanged
The dryRun and commit calls for all 9 scopes were accepted on the first try. Each returned `{scope, key:null, version:1}`. No refusals.

| scope | dryRun key | commit key | schemaId | version | mcpDelete |
|---|---|---|---|---|---|
| game.balance | 7e35c8dd-29c4-8ef9-ad52-492034a3667c | 80685e87-d5f2-8b1f-a2a3-3688c823cca3 | game.balance@1 | 1 | false |
| game.enemies | 6db3f48e-8858-8157-a9ff-cf7a0148e754 | 9bd08fe9-66e7-8e08-a89a-77bb344d30f0 | game.enemies@1 | 1 | false |
| game.powerups | 297ed104-7b2a-89d5-a1cb-f5b1b41e66d9 | 2e31b2c7-d926-85e4-a649-6a67b5c3ca55 | game.powerups@1 | 1 | false |
| game.boosters | 979f1b30-917f-80e6-a201-d55af2f59d47 | 3f119779-f6b3-8353-aa86-5a764e2d29b2 | game.boosters@1 | 1 | false |
| game.siege | a892947d-23f4-8cf1-a537-daa58480272c | a0c23d19-ec25-8b68-a02a-9bc579db2877 | game.siege@1 | 1 | false |
| game.rewards | c42dc985-7f21-80a4-a15a-58cea15c275f | f64cd3f4-b7dc-8c96-aeab-a842aec0ea02 | game.rewards@1 | 1 | false |
| game.iap_packs | 032a5d5e-33b0-81a8-a2be-3271a1f3acaf | e81cad0c-d050-8edb-a4bf-31f41161b006 | game.iap_packs@1 | 1 | false |
| game.iap_shop_order | baf1d7cd-85a0-8e67-ace0-57efd8b398bd | 1aaa0295-b35f-8d05-a7e6-369ea83b00e2 | game.iap_shop_order@1 | 1 | false |
| game.iap_placements | 45c1fcf2-262c-850d-abc5-06306e1dc2dd | 2b44babc-0cc1-8e9b-a386-926379275775 | game.iap_placements@1 | 1 | false |

Readback `configs.get {scope, include:"schema"}` returns `{scope, schemaId, schema, guidance:null, mcpDelete:false}` with no top-level version. Version 1 comes from the schemaId suffix and the put response. In every readback the schema body has the same content as the uploaded file. The only difference is key order: the server puts `$schema` after `title` and `description`.
Saved to schemas/game.<scope>.json as {scope, schemaId, version, mcpDelete, schema}, the same format as schemas/progress.json, using the server key order.

### 3. `npm run records`
- game.balance, game.boosters, game.enemies, game.iap_packs, game.iap_placements, game.iap_shop_order, game.powerups, game.rewards and game.siege are each "validated by schemas/game.*.json (server schema): 1" with no errors.
- The only errors are the 3 known false positives on configs/remote/localization/strings.json (required defaultLocale and locales, additional "en").

### 4. Records: one atomic `configs.write` batch, 9 items `{scope, key:"main", ifMatch:0, value:{data, visibility:3, enabled:true}}`
- dryRun, idempotencyKey 902ff140-a045-8865-a6fe-9e8a451917ad: accepted. created 9, errors [], each `data.valid:true`.
- write (dryRun:false), idempotencyKey edd33e12-606f-8552-a60d-9369f7544fb7: created 9, updated 0, errors [].
- Readback `configs.get {scope, key:"main"}` for each of the 9 returned revision 1, visibility 3 and enabled true. Each `data` equals the file `data`.
  Server-added fields: conditionals [], conditionalsMode merge, priority 0, schemaVersion 1, name `<scope>/main`.

| record | status | revision | configId | schemaId | data vs file |
|---|---|---|---|---|---|
| game.balance/main | created | 1 | 36 | game.balance@1 | match |
| game.enemies/main | created | 1 | 37 | game.enemies@1 | match |
| game.powerups/main | created | 1 | 38 | game.powerups@1 | match |
| game.boosters/main | created | 1 | 39 | game.boosters@1 | match |
| game.siege/main | created | 1 | 40 | game.siege@1 | match |
| game.rewards/main | created | 1 | 41 | game.rewards@1 | match |
| game.iap_packs/main | created | 1 | 42 | game.iap_packs@1 | match |
| game.iap_shop_order/main | created | 1 | 43 | game.iap_shop_order@1 | match |
| game.iap_placements/main | created | 1 | 44 | game.iap_placements@1 | match |

### 5. Client preview
`configs.get {projection:"preview", preview:{scopes:[9 scopes], audience:"client", v:"1.0.0"}}`, where v is the package.json version and os was not given.
All 9 scopes are delivered to the client. The trace shows matched:true for every `main`, and each version is 1.
A deep compare (node `util.isDeepStrictEqual`) of each `configs.<scope>.main` against configs/remote/<scope>/main.json `data` matched for all 9.
Saved to docs/build/publish-services/readback/game__client-preview.json.

## Part B — localization strings, locale en

Source: configs/remote/localization/strings.json. `npm run strings` reported it up to date from 5 fragment files, with 133 keys in en. The file was not edited.

### 1. Pre-state
`configs.get {scope:"localization", key:"en"}` returned 53 items, identical to the previous readback/localization__en.flat.json. The locale was at version 2.

### 2. Diff (file flatten vs live)
- New keys: 87. Each uses test null + add.
- Changed keys: 8. Each uses test old + replace:
  shell.title "Game" → "Iron Burrow"; levels.main.title "Levels" → "Campaign"; levels.main.level_1..5.title "Level N" → "Stage N";
  reward.daily.title "Daily reward" → "Daily supply drop".
- Unchanged keys: 38, skipped.
- Live keys not in the file: 7. These are offer.coins_large.{badge,subtitle,title}, offer.coins_medium.{subtitle,title} and offer.coins_small.{subtitle,title}, all from the template.
  The levels.main.level_1..5 template keys are still in the file, renamed to "Stage N", so they were replaced, not removed.

### 3. Writes (single form, scope localization, key en, patch paths /strings/<dotted key>/en)
| step | idempotencyKey | ops | result |
|---|---|---|---|
| dryRun add/replace | b855ab6b-d2d2-87bb-abec-c5ddf373a3b8 | 190 (95 cells) | accepted: applied 95, versions {en:2}, warnings [] |
| dryRun remove (separate) | 69b35bda-b5ab-8c69-a9b8-4ff90e7743e8 | 14 (7 cells, test value + remove) | accepted: applied 7, versions {en:2}, warnings [] |
| write add/replace | c3cb768b-5ccd-8653-ace8-972263c4097c | 190 | applied 95, versions {en:3}, warnings [] |
| write remove | 0e8eeefe-2c57-8434-acd0-1ef2e610e4dd | 14 | applied 7, versions {en:4}, warnings [] |

The removal was not refused, so the 7 unused offer.coins_* strings were removed from live.

### 4. Readback
- `configs.get {scope:"localization", key:"en"}` returned 133 items, nextCursor null. Every item has stale false, machine false and warnings [].
  Placeholders are unchanged: shell.daily.day has [n], shell.error.boot has [code] and shell.profile.player has [gid].
- The flat map is saved to docs/build/publish-services/readback/localization__en.flat.json. Compared with the flattened strings.json en: 133/133 match, 0 diffs, 0 extra live keys.
- Locale index `configs.get {scope:"localization"}`: defaultLocale en, indexVersion 1, revision 1; en: version 4, keys 133, missing 0, stale 0, dataSize 5074.

## Refusals
Only the expected NOT_FOUND pre-state reads in Part A step 1 (9 rids above). There were no refusals from schemas.put, configs.write batch or the localization patches.

## Re-run rule
Read first. Each game.* record now has revision 1 with data equal to its file, so a re-run sends no write and reports unchanged. A write with ifMatch 0 would be refused for the existing keys.
Schemas whose readback equals the file are not re-put. For localization, a re-run computes an empty diff (133/133 equal, no extra keys), so no patch is sent and every key is reported unchanged.

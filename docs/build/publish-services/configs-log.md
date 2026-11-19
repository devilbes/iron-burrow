# configs publish log — app 360 (iron-burrow), env test

Session: mcp.session.get → appId 360, appCode iron-burrow, env test, serverVersion 1.0.0.89, scopes include configs.read, configs.write, configs.schemas.read, configs.localization.write.

## 1. Schemas
- `configs.get {}` → schemas/index.json (levels.* → levels.envelope@4; progress@5; ui.hud@4; ui.windows@2; localization@1)
- `configs.get {scope, include:"schema"}` → schemas/levels.main.json (levels.main@4), schemas/levels.endless.json (levels.endless@4, body identical to levels.main), schemas/progress.json (progress@5), schemas/ui.hud.json (ui.hud@4), schemas/ui.windows.json (ui.windows@2), schemas/localization.json (localization@1; covers only the locale settings, not per-locale strings)

## 2. Pre-state (configs.get)
- levels.main (no key): VALIDATION_FAILED "Unknown config scope" (levels.* list needs a key), rid 6c0f0850-1cb2-405a-9636-1a995ca8daaf
- levels.endless (no key): VALIDATION_FAILED, rid dfa4f9f7-91ed-4d5c-89e5-1223a19f6ed1
- levels.main/set: NOT_FOUND rid 38881f28-bf1d-413f-8fda-530c39a9e031; levels.main/r_0001_0010: NOT_FOUND rid 19c11128-3a5d-4b66-8c1d-4981eb6a37b3; levels.endless/r_0001_0001: NOT_FOUND rid 89b3c149-c130-4d1f-8123-abbb976471aa
- progress, ui.hud, ui.windows: items [] (empty)
- localization (no key): {defaultLocale:null, indexVersion:0, locales:[]}, revision 0, schemaId localization@1
- localization/en: CONFIGS_L10N_LOCALE_UNKNOWN rid c5970be1-dd45-468c-828b-1cbc72e20570
=> every record is new: ifMatch 0.

## 3. Local check (npm run records, after npm run strings: "en 53", up to date)
- levels.main (4), levels.endless (1), ui.hud, ui.windows, locales: pass by server schema
- localization/strings.json: 3 errors (required defaultLocale/locales, additional "en") — false positive: the saved localization@1 schema describes locale settings only; strings are written per locale key. No file change.
- progress/progress_main.json: data.steps[0..4].reward "must NOT have fewer than 1 items" (reward:[] vs minItems 1)
- node scripts/levels-hash.mjs --check: rc 0 (all 4 contentHash values match)

## 4. Writes
Idempotency keys are derived (sha256 of scope/key/canonical value) — same data gives the same key.

### levels.main
- dryRun single item `set` (ifMatch 0, key 9b0a7053-d01b-4670-8278-b95b929d3d37) — first attempt as single form with top-level ifMatch: VALIDATION_FAILED "/ifMatch Numeric ifMatch required" rid 3640848f-a0c7-40ad-b563-3361b123de0b (client-side argument typing; switched to batch form)
- dryRun batch [set] alone: CONFIGS_LEVELS_INVALID, details.errors pointer /set/data/index/0..2 and /set/data/index reason index_gap, rid fc58af64-664e-4ee6-92ab-c3a489c1b023 — missing reference: ranges not present yet. Fix: set + its ranges in one atomic batch (set first, then ranges in order), no data change.
- dryRun batch [set, r_0001_0010, r_0011_0020, r_0021_0030] ifMatch 0 each, idempotencyKey 8cb40169-90d1-477a-854b-ea74afdf3961: accepted (created 4, errors [], each data.valid true)
- write same batch dryRun:false, idempotencyKey 9a9bc5cc-4c00-4df7-8c91-ce97977e02d6: created 4; revisions set=1 (configId 1), r_0001_0010=1 (configId 2), r_0011_0020=1 (configId 3), r_0021_0030=1 (configId 4); schemaId levels.main@4, schemaVersion 4
- readback configs.get {levels.main, key}: saved to docs/build/publish-services/readback/levels.main__*.json; deep compare (node) → data match for all 4, envelope (name, description, visibility) match; contentHash recomputed from readback data matches for all 3 ranges. Server-added envelope fields: conditionals [], conditionalsMode "merge", priority 0, enabled true, schemaVersion 4.
  Verdict: set created rev 1; r_0001_0010 created rev 1; r_0011_0020 created rev 1; r_0021_0030 created rev 1.

### levels.endless
- dryRun batch [r_0001_0001] ifMatch 0, key 5ad831a5-e346-4eb0-8923-faa17fae11e6: accepted (no set record needed by the server)
- write key c9d257a4-32ee-4499-8d04-814106179742: created 1, revision 1, configId 5, schemaId levels.endless@4
- readback: data match, envelope match, contentHash recomputed matches. Server-added: conditionals [], conditionalsMode merge, priority 0, enabled true, schemaVersion 4. Verdict: created rev 1.

### progress
- dryRun as in file (reward: [] in steps 0..4), key ad69e081-c01e-4740-85eb-75f45ce7aebc: REFUSED CONFIGS_SCHEMA_VIOLATION "configs.write: arguments — configs schema violation.", details.errors pointer /items/0/data/steps/{0..4}/reward message "must NOT have fewer than 1 items", rid a4e8584b-3267-437a-92f0-60ea2719b395
- fix (shape only): removed the empty `reward` key from the 5 steps of configs/remote/progress/progress_main.json (reward is optional in progress@5; no rewards added, no values changed). npm run records: progress passes.
- dryRun fixed record, key 41390b23-7a49-462e-81ca-338831958e7b: accepted
- write key 810bce5f-f59e-4353-88f7-2deab40214fd: created, revision 1, configId 6, schemaId progress@5 (schemaVersion 5)
- readback: data match, envelope (name, visibility, enabled, conditionals) match; no data.clientBudget, no data.profileProjection on server. Server-added: conditionalsMode merge, priority 0, schemaVersion 5. Verdict: created rev 1 (2nd attempt).

### ui.hud
- dryRun [layout] ifMatch 0, key 4158934a-9201-45f7-85aa-5271a9b812ac: accepted
- write key 6f3cbc12-d4cd-4b56-87bc-5970610b168e: created, revision 1, configId 7, schemaId ui.hud@4
- readback: data match, envelope match. Server-added: conditionalsMode merge, priority 0, schemaVersion 4. Verdict: created rev 1.

### ui.windows
- dryRun [main] ifMatch 0, key 097d5e4d-7262-4ad9-851d-4808ad0565a2: accepted
- write key 51e0d773-0055-4760-81d0-5d93628869e0: created, revision 1, configId 8, schemaId ui.windows@2
- readback: data match, envelope match. Server-added: conditionalsMode merge, priority 0, schemaVersion 2. Verdict: created rev 1.

### localization (per locale, single form; batch not used)
Locale settings (file localization/locales.json):
- dryRun {scope:localization, key:"locales", value:{data:<locales.json>}}: REFUSED VALIDATION_FAILED "configs.write: changes — validation failed." details.fields [{path:"changes", issue:"invalid_type"}], rid 8655079c-e131-4f4b-9bc8-bdcc5b7f37c2 (a keyed localization write is a string-cell write for the locale named by key)
- dryRun key-less {scope:localization, value:{data:<locales.json>}}: REFUSED VALIDATION_FAILED "configs.write: tag — validation failed." details.fields [{path:"tag",issue:"invalid_type"},{path:"name",issue:"invalid_type"}], rid f670ce0a-4d6c-49f3-8249-ea79e78a8737 (key-less write = add one locale {tag,name,status})
- dryRun key "_index" (catalog name of the index key) value {data:<locales.json>}: REFUSED VALIDATION_FAILED "configs.write: changes — validation failed." details.fields [{path:"changes",issue:"invalid_type"}], rid 2784d4d3-70dd-4384-96a6-7f94545909db
- dryRun key-less value {tag:"en",name:"English",status:"published"}: accepted ({valid:true}, schemaId localization@1)
- probe dryRun key-less value + defaultLocale:"en": REFUSED VALIDATION_FAILED "configs.write: arguments — validation failed." details.fields [{path:"arguments",code:"invalid_input"}], rid 94014917-fb92-40a6-abef-af7ab19d9a4f (defaultLocale is not an input; the server sets it)
- write key-less value {tag:"en",name:"English",status:"published"}, idempotencyKey 4c880b47-2cef-49b1-8726-9002f57af713: created locale en (configId 9, version 1)
- readback configs.get {scope:localization}: {defaultLocale:"en", indexVersion 1, locales:[{tag en, name English, status published, +configId, version, keys, missing, stale, dataSize, updatedAt}]}, revision 1 → projection {defaultLocale, locales[tag,name,status]} equals locales.json: match. Verdict: created rev 1 (attempt 3 of the write shape; data unchanged, file unchanged).
Strings per locale "en" (from localization/strings.json, npm run strings: up to date, 53 keys):
- dryRun key en value {data:<tree>}: REFUSED VALIDATION_FAILED "configs.write: changes — validation failed." details.fields [{path:"changes",issue:"invalid_type"}], rid d4d4b5fb-5062-46b8-9928-596a65490dca
- dryRun key en patch add /levels/chapter/c01/title: REFUSED VALIDATION_FAILED details.fields [{path:"", issue:"Expected /strings/<key>/<locale>", reason:"invalid_value"}], rid 21e8641c-dee4-4902-8550-c0f11a1ecb42
- dryRun key en patch of 53 add /strings/<dotted key>/en: REFUSED VALIDATION_FAILED details.fields [{path:"", issue:"Each localization cell change needs a test operation", reason:"invalid_value"}], rid 95f52064-a2bd-414d-abd4-445c54d3a048
- dryRun one cell (test null + add): accepted {applied:1}
- dryRun full patch (53 × [test value null, add value]) key 53cf56ed-0934-4081-8a9f-2420ec50d982: accepted {applied:53, warnings:[]}
- write same patch, key 793ee26e-d5f3-4f63-8ad6-ade4f35ac936: {applied:53, versions:{en:2}, warnings:[]}
- readback configs.get {scope:localization, key:en}: 53 items; flat key→value saved to readback/localization__en.flat.json; compare with flattened strings.json en: 53/53 match. Server-added per key: stale, machine, placeholders (shell.daily.day [n], shell.error.boot [code], shell.profile.player [gid]), warnings []. Locale index after write: version 2, keys 53, missing 0, stale 0. Verdict: created (locale version 2; record has no numeric revision — revision null).

## 5. Summary
| record | result | attempts | revision | readback |
|---|---|---|---|---|
| levels.main/set | created | 2 dryRuns (1st: index_gap, needs ranges in same batch) + 1 write | 1 | match |
| levels.main/r_0001_0010 | created | 1 dryRun + 1 write (batch) | 1 | match, contentHash ok |
| levels.main/r_0011_0020 | created | 1 + 1 (batch) | 1 | match, contentHash ok |
| levels.main/r_0021_0030 | created | 1 + 1 (batch) | 1 | match, contentHash ok |
| levels.endless/r_0001_0001 | created | 1 + 1 | 1 | match, contentHash ok |
| progress/progress_main | created | 2 dryRuns (1st CONFIGS_SCHEMA_VIOLATION) + 1 write | 1 | match |
| ui.hud/layout | created | 1 + 1 | 1 | match |
| ui.windows/main | created | 1 + 1 | 1 | match |
| localization settings (locales) | created | 4 dryRuns (3 shape refusals + 1 probe) + 1 write | 1 (indexVersion 1) | match |
| localization/en | created | 4 dryRuns (3 refusals) + 1 write | locale version 2 | match 53/53 |

Re-run rule: each record is read first; when the readback equals the file (as now), no write is sent and the record is reported unchanged. Writing again with ifMatch 0 is refused for existing keys, so a re-run cannot create duplicates.

## Level ranges update (win.objectives removed)
Date 2026-11-19, app 360 (iron-burrow), env test. Change: `data.server.win` ({objectives:["destroy_all"]}) removed from 3 range records; contentHash unchanged; data outside `server` unchanged (export.mjs no longer emits win.objectives, D-DATA-12).
Pre-checks: `npm run records` → only the 3 known localization findings (defaultLocale, locales, "en"); levels.main validated by schemas/levels.main.json. `node scripts/levels-hash.mjs --check` → exit 0 (hashes e9191faa…, d6dcea1b…, e02e56de…).
Read before write (configs.get): r_0001_0010 rev 1, r_0011_0020 rev 1, r_0021_0030 rev 1; each still had server.win, otherwise equal to the file → status: update needed.
- dryRun batch items [r_0001_0010, r_0011_0020, r_0021_0030], scope levels.main, ifMatch 1 each, value {data, description, visibility:3} from the files, idempotencyKey 1ff57ef9-8156-4de7-b4c2-0cc5246495b1: accepted (created 0, updated 3, errors [], each data.valid true)
- write same batch dryRun:false, idempotencyKey b204f425-8980-4fc6-9483-1ec58f6f740c: updated 3, errors []; revisions r_0001_0010=2 (configId 2), r_0011_0020=2 (configId 3), r_0021_0030=2 (configId 4); schemaId levels.main@4, version 2
- readback configs.get {levels.main, key}: saved to docs/build/publish-services/readback/levels.main__<key>.json; deep compare (node) → data equals file for all 3; envelope (name, description, visibility 3) match; `server.win` absent (also in every server.entries[i]); contentHash recomputed (JCS sha256 of data without server) matches for all 3.
- refusals: none.

| record | result | ifMatch | revision before → after | readback |
|---|---|---|---|---|
| levels.main/r_0001_0010 | updated | 1 | 1 → 2 | match, no server.win, contentHash ok |
| levels.main/r_0011_0020 | updated | 1 | 1 → 2 | match, no server.win, contentHash ok |
| levels.main/r_0021_0030 | updated | 1 | 1 → 2 | match, no server.win, contentHash ok |

Re-run rule: read first; readback now equals the files, so a re-run sends no write and reports unchanged (rev 2).

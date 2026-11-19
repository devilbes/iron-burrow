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

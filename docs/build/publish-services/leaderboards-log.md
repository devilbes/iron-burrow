# Leaderboards publish log

- Date: 2026-11-19
- Target: appId 360 (iron-burrow), env test, MCP server 1.0.0.89 (session scopes include leaderboards.read, leaderboards.write)
- Source file: configs/remote/leaderboards/leaderboard_weekly.json (sha256 of canonical JSON d74fc6f021b5ddee1594681f5306ee1934e186b004dd29aacd7cb72948222281)
- Tool: leaderboards.definitions.put (configs.write was not used)

## Pre-checks
- Docs read: manyplay://docs/leaderboards/recipe/configure-type. It says leaderboards.definitions.put has no dryRun, so there was no preview step.
- Tool inputSchema: required leaderboardKey, title, enabled, writeMode, allowNegativeScores, scopes, score, rateLimit, velocity, dedup, integrity, action. additionalProperties=false. `name` is not part of the schema. The file has no `name` field.
- leaderboards.presets: the file values match preset `sum` (increment/max) exactly for scopes, score, rateLimit, velocity, dedup, integrity, action and allowNegativeScores. All values were kept.
- leaderboards.source_catalog: eventType `game.actions` includes value `score` (path data.score). The filter fields `type` (levelEnd), `data.won` (boolean) and `data.set` (string) are all in the catalog.
- definitions.get before write: NOT_FOUND, rid 10f9fb0f-577a-47ed-a5b6-cc49a8bafdee. This is the expected "does not exist yet" result, not a refusal. Created with version 0.

## Write
| # | leaderboardKey | version (If-Match) | idempotencyKey | result |
|---|---|---|---|---|
| 1 | leaderboard_weekly | 0 | 973e87dc-13b7-5764-aa2c-d6fb041ac303 (UUIDv5 of app360:test:leaderboards:leaderboard_weekly:<content sha256>) | created: true, version 1, status active, origin studio |

The successful response did not include a rid.

## Readback (leaderboards.definitions.get)
- version 1, status active, createdAt/updatedAt 2026-11-19T10:35:53.269Z
- Every field in the file is equal to the readback value. Diff: none.
- Server defaults that are not in the file: regionPinning=true, retentionDays=7, entryTtlDays=30. These equal the preset/owner defaults. retentionDays and entryTtlDays are immutable after creation.

## Refusals
None.

## File changes
None.

## Re-run
Read leaderboards.definitions.get and compare it with the file. If they are equal, report `unchanged` and do not call put. If you must replay after an unknown outcome, reuse the same idempotencyKey with the original arguments.

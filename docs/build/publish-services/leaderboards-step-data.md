# Leaderboards: step data publish (app 360 iron-burrow, env test)

Date: 2026-11-19. Tools: leaderboards.presets, leaderboards.source_catalog, leaderboards.definitions.get/put (MCP manyplay-leaderboards). No configs.write.
Docs read: manyplay://docs/leaderboards/weekly-workflow, docs.search "leaderboards definitions put presets weekly reset".

## Result per record

| leaderboardKey | pre-read (rid) | put | idempotencyKey | version | status | readback |
|---|---|---|---|---|---|---|
| siege_best | NOT_FOUND (rid 3f6d1abd-2025-4811-9e66-57cf5a317404) | version 0 -> created:true | 1237d4c7-462a-47e9-8e2a-14537a544b4c | 1 | active | equal |
| campaign_score | NOT_FOUND (rid 0398ed53-4d66-4cab-929e-61ccb3180984) | version 0 -> created:true | b408f93a-5dcb-467e-aa0c-2e20a345bbe9 | 1 | active | equal |

Put/get success responses carry no rid. origin "studio", ownerService null, createdAt 2026-11-19T11:18:14.720Z / 11:18:17.646Z.
Sent arguments = configs/remote/leaderboards/siege_best.json and campaign_score.json (exact config objects). Replay: re-read; if config equals file -> unchanged, no put. After an unknown outcome, repeat the put with the same key and arguments.

## Readback diff

All sent fields are byte-equal on readback. The server added only fields that were not sent, using owner defaults that equal the preset defaults:
`regionPinning: true`, `retentionDays: 7`, `entryTtlDays: 30`. Same as live leaderboard_weekly. They are not in the repo files because the sample omits them. A future equality check must ignore these three fields or compare against the same defaults.

## siege_best

- Preset: `best_max` (writeMode best, direction max). scopes, rateLimit, velocity, dedup, integrity, action and allowNegativeScores come from preset defaults unchanged.
- Score bounds: the preset has maxValue 1,000,000 and maxDelta 1,000,000. Both are below the server bound of 3,995,000 per Siege run. The params guidance says maxValue is "the game's realistic ceiling" and, for best, "maxDelta is not less than maxValue" (the first write counts from 0). So: maxValue = maxDelta = 3,995,000, which is the given server bound. I did not add the 1.2-1.5x headroom because 3,995,000 is already a hard server cap per run. minDelta 0 and minValue 0 are preset defaults.
- Source: game.actions / score, filters `type=levelEnd`, `data.set=endless`. No won filter (Siege runs end with won=false).
- startsAt/endsAt null (all-time best).
- Note: velocity keeps the preset defaults (200,000/min, 2,000,000/h). A single big run (up to 3.995M) can exceed this. That is a soft violation with onSoftViolation=flag: the score is accepted and only marked. Recalibrate from real data if needed.

## campaign_score

- Preset: `sum` (writeMode increment), like the sample leaderboard_weekly. All blocks come from preset defaults except score.maxDelta.
- score.maxDelta: the preset value of 1000 would reject every stage score (max stage ~11,700 -> 400 INVALID_SCORE_VALUE). The params guidance says "max points per event x 1.2-1.5", so 11,700 x 1.5 = 17,550. I used the upper factor because 11,700 is approximate. The other score values are preset defaults (minDelta 0, minValue 0, maxValue 1,000,000,000).
- Source: game.actions / score, filters `type=levelEnd`, `data.set=main`, `data.won=true`. `data.verified` is not a filter field in source_catalog (fields: type, data.set, data.levelId, data.won, data.offerKey), so it is not used.
- startsAt/endsAt null (all-time).
- Velocity note: sum defaults are 3,000/min and 50,000/h. One stage clear (~11,700) exceeds the per-minute value, so this is a soft violation and flag only. Recalibrate by guidance ("best honest player x 2").

## Refusals

None. Both puts succeeded on the first attempt. The only error responses were the expected NOT_FOUND pre-reads listed above (code NOT_FOUND, msg "leaderboards.definitions.get: leaderboardKey — not found.").

## Platform gaps / deviations

1. **siege_best: weekly reset not supported.** No preset or definitions.put field supports a recurring weekly reset. startsAt/endsAt are a single lifetime, and there is no period field. Per docs (leaderboards/weekly-workflow), weekly rotation is a scheduling job (`cron "0 0 * * 1"`, `open-period`, cadence weekly) that creates a new definition each week (`<key>--wYYYYMMDD`). Only a trusted owner (requestedBy scheduling/tournaments) can submit it, and no scheduling tool is available to this key. The board was created as an all-time best with startsAt/endsAt null. It was not faked with a one-week endsAt.
2. **campaign_score: "sum of best score per stage" not supported.** source_catalog has no source that counts each stage once with its best score (game.actions values: count, score, stars, moves, durationMs; no per-level best aggregation). The fallback is increment over won main-set levelEnd: **replaying a stage adds its score again**, so the board is total won-score, not the sum of per-stage bests. `data.verified` is not available as a filter.
3. Observation (not changed, leave alone per brief): live `leaderboard_weekly` uses the sum preset maxDelta 1000 with the same main-set source. Stage scores around 11,700 would be rejected by it.

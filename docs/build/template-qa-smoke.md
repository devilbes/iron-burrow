# Template build → QA smoke (2026-11-19)

Purpose: prove the build and QA publication chain works for `iron-burrow` (appId 360, env test) before any gameplay code. No code changed.

## Build
- `builds.create` web, source=current → **buildId `6afed4ac6fce9f133ed2fcae`**
- sha `3c1706874ab74d1f3c33bcca8d3a07f76481bf19` (git main = `projects.tree` revision), versionName 1.0.0, branch release/1.0.0
- status **succeeded** (created 10:51:24Z, finished 10:57:53Z); 1665 artifacts, 57.6 MB; entry `www/index.html`
- SDK vendored by the builder: all packages `1.0.0-rc.30` (core, contracts-client, platform-web, ui-kit, skin-manyplay, mod-hud/iap/inventory/leaderboards/daily-rewards/profile-pack/progress/realtime)
- `builds.log`: no errors; `npm run build` succeeded (minify, 3 files, 6 maps)

## QA publication
- `projects.qa.publish` → operation `c6011609dc323ad378794dda`, status `done`
- `projects.qa.current.sourceId` = `6afed4ac6fce9f133ed2fcae` ✅
- QA URL: **https://qa.manyplay.fun/iron-burrow/** (game iframe: `https://test.manyplay.fun/qa-builds/360/6afed4ac6fce9f133ed2fcae/index.html`)

## Browser check (Playwright Chromium, new context = new guest, 1440×900)

| Check | Result |
|---|---|
| Console of the game frame | ✅ 0 errors, 0 warnings |
| Console of the QA wrapper page | ⚠️ 1 error: CSP `default-src 'none'` blocks `static.cloudflareinsights.com/beacon.min.js` — injected by the Cloudflare edge into the wrapper page `qa.manyplay.fun`, not present in the project (see D-QA-SMOKE-01) |
| Home screen with Play | ✅ title "Game", Play button, HUD: Profile, Coins, Level, Settings, Daily rewards, Leaderboard, Shop |
| Play → placeholder | ✅ route `#/game`, `game-placeholder` "Game template" visible |
| Close → back | ✅ Close opens "Leave the level?" (Leave / Stay); Leave returns to `#/home`, Play visible |
| Shop | ✅ opens ("Shop", Restore purchases, "No offers available yet."), Close → 0 dialogs |
| Daily rewards | ✅ opens ("Daily gift", Day 1–7), Close → 0 dialogs |
| Leaderboard | ✅ opens ("Leaderboard", "You · unranked"), Close → 0 dialogs |
| Profile | ✅ opens ("Player 31451", Levels completed 0, Best score 0), Close → 0 dialogs |
| Settings | ✅ opens (language English, Sign in), Close → 0 dialogs |

Observations (not failures for a template): shop has no offers and daily reward cells show "—" — service content is filled by later steps.

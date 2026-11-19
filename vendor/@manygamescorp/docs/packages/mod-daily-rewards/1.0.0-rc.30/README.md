# Daily rewards

## Explicit progress dependency (#1462)

Select `@manygamescorp/mod-progress` explicitly alongside this package. It is a required
npm peer (`>=1.0.0-rc.27 <2.0.0`) and a required runtime module (`requires.progress`).
Core is a peer pinned to the tested core version (the exact version is set in
`peerDependencies`); contracts-client remains a direct
technical dependency. UI Kit, HUD UI and bottommenu stay optional, without npm dependencies.
Missing/incompatible progress fails the isolated offline npm consumer; missing runtime
registration fails module composition before start. The existing lock resolver handles runtime
version compatibility. Headless composition works without UI zone providers.
Release validation checks the declared npm peer range against the checkout version,
and version preparation preserves it. A different prerelease must be explicitly
admitted by that range; stable `^1.0.0` alone does not admit npm prereleases.

Progress owns public state/action/level/attempt contracts at `mod-progress/contracts`,
headless `createProgress` at `mod-progress/client`, and the existing progress/levels/windows/
mechanic helpers. Daily rewards owns only its plan/entry API and never issues rewards itself.
Fixture pack/vendor consumers use progress 1.4.0, daily 2.3.0, core rc.21 to prove separate
compatible artifact versions, file hashes and selected/base closures. These are local fixture
versions, not a release. Independent release producer support remains #1457; this task is
unrelated to the live test rc.20 registry incident #1479.

`dailyRewardsModule()` registers the existing UI Kit HUD/menu entry and listens for
player-scoped `progress.daily_reward.ready` messages. It requires progress, optionally
uses `hud.registry@1` or `bottommenu.registry@1`, and never renders a container. The host handles
`daily-rewards:calendar:open` by opening the existing UI Kit daily reward calendar.

Windows (`sdk.ui.open('daily-rewards[:name]')`, Many Play Skin, portrait and landscape): `main`
(week, `daily-rewards:calendar:open` → UI Kit `dailyReward`), `board` (`dailyBoard`),
`month` (`dailyCalendar`), `gift` (`dailyGift`) and `reward`
(`rewardWindow` / `ui.reward` from `services/reward-window`); each
emits `daily-rewards:<name>:open` and the host mounts the same-named `services/daily-rewards`
component with server data. Errors use the standard UI Kit error window.

Settings: `entry` = `hud` (default) or `bottomMenu`; `hudSide` = `left` or `right`
(default), visible only for HUD; `icon` = project image record or null (gift artwork);
`badge` and `autoOpen` default to true. `autoOpen` = true opens the calendar on entry only when
today's reward is claimable by server time (`ctx.time.now()`): `setNextRewardAt(endsAt)` with
`endsAt <= now`, or the player `progress.daily_reward.ready` hint; the open intent is emitted at
most once per module instance (temporary until the UI Kit window queue, #509). Already claimed or
not yet available (`endsAt` in the future, null, no data) never opens it; `autoOpen` = false never opens it. bottomMenu registers at center in the independent bottom menu; HUD registers in the chosen side slot with a fixed order. UI Kit zone enablement and fallback are #509.

Card fields for rewards by day (#745; `availability` is the shared block, `enabled` + filter):
`track` (progress record key, default `daily`), `window` = `week` (default) | `board` | `calendar`
| `gift` (which window `open()`, the HUD entry and autoOpen ask the host for), `cycleLength`
(1..31, default 7), `onMiss` (`reset.onMiss`, default true), `days` (list; entry N =
`{ reward: [{ id, amount }] }` of cycle day N, ids from the inventory catalog), `title` and
`subtitle` (`text`: l10n key or values per locale).
One source of truth: the card is where rewards, cycle length and the miss rule are authored; Studio/MCP
publishes them into the `track` progress record (a record is not edited by hand in parallel).
Claim state, availability and grants stay with the server. `plan()` returns the card's
`{ track, window, cycleLength, onMiss, days[{ day, reward }], title, subtitle }` (frozen, one
entry per cycle day, unauthored day = empty reward); the host maps it onto the window with
ui-kit `planWeekDays` / `planBoardDays` (`services/daily-rewards`) plus the server claimed count
and today's `operationId`, so a day is claimable only with a server operation.

Studio and ManyPlay MCP choose modules before the project build. Values use the shared
`contracts-client/module-settings` validator; the module receives normalized `ctx.settings`.
Opening clears the badge; stop/dispose removes subscriptions and entries. Server progress
owns rewards, availability and claiming; this module creates no grants or local progress.

Playwright cases are in `apps/demo/e2e/daily-rewards.spec.ts` (each entry/HUD side, badge,
custom icon); they are deliberately deferred to the module acceptance run.

The entry retains its zone handle. `setNextRewardAt(serverEpochMs)` sets the countdown
and clears a stale ready badge; null clears the countdown. The host must supply the
server schedule: this module does not fetch or invent a progress schedule. The existing
progress.daily_reward.ready hint clears the timer and sets the ready dot. Countdown
rendering uses the registry's injected core.time.now. Stopping disposes the handle.

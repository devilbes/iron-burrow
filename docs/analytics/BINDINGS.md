# Analytics bindings — Iron Burrow

Input for game-contract and game-logic. Catalog: `docs/analytics/EVENTS.json`; game-event registry: `docs/analytics/REGISTRY.json`.

## Sending rule (SERVICES_CONTRACT function `analytics`)

- Contract row: function **`analytics`**, module **`ui-kit`** (carrier of core `sdk.analytics`, D-FP-09), method **`analytics.sendEvent`**. Nothing else sends analytics: no own network, no third-party SDK, no `registerProvider` in game code. Without a platform provider the call is a no-op (accepted: D-AN-02).
- **One sender**: game module `meta-bridge` (GDD 32). Other modules emit bus events (`ctx.bus.emit('game:…')`, listed in their `events.emits`); `meta-bridge` subscribes, maps the bus event to the catalog name and calls `sdk.analytics.sendEvent(name, payload)` with exactly the params of `EVENTS.json` (string literal of the event name in code — gate df-analytics-events looks for it). `meta-bridge` declares permission `analytics`.
- Payload: only catalog params, flat, values `string|integer|number|boolean`. The envelope (appId, gid, sessionId, ts, platform, appVersion, abGroup, holdout) is not sent by the game; abGroup/holdout are never computed or used to change behavior.
- Events are sent **after** the service ACK for anything the server decides (levelEnd, consume, orders, daily claim) — never optimistically. A failed send never blocks the game.

## Event → contract function / module / method

`Source` = SERVICES_CONTRACT function, module and the SDK method whose result triggers the event. `Producer` = game module that emits the bus event (owner modules of GDD 20 `ui.hooks`). Every row is sent by `meta-bridge` through `analytics` / `ui-kit` / `analytics.sendEvent`.

| event | N0 | source function · module · method (trigger) | producer (bus event) | sent by |
|---|---|---|---|---|
| `session_start` | base | `progress` · progress · `progress.init` (boot after `sdk:core:ready`, Lobby rendered); resume — page visible again | `app` (`game:session:start`) | meta-bridge → `analytics.sendEvent` |
| `session_end` | base | `settings` · profile-pack · `kv.set` flush on pagehide (session timer is local) | `app` (`game:session:end`) | meta-bridge → `analytics.sendEvent` |
| `tutorial_step` | base | `settings` · profile-pack · `kv.set` (`tut.*` flag of the step) | `tutorial` (`game:tutorial:step`) | meta-bridge → `analytics.sendEvent` |
| `tutorial_done` | game | `settings` · profile-pack · `kv.set` (`tut.done` / skip) | `tutorial` (`game:tutorial:done`) | meta-bridge → `analytics.sendEvent` |
| `level_start` | base | `levels` · progress · `progress.beginAttempt` (resolved, seed received) | `campaign` / `siege` (`game:level:started`) | meta-bridge → `analytics.sendEvent` |
| `level_complete` | base | `levels` · progress · `progress.levelEnd` (ACK, clear) | `campaign` (`game:level:completed`) | meta-bridge → `analytics.sendEvent` |
| `level_fail` | base | `levels` · progress · `progress.levelEnd` (defeat / quit / siege over) | `campaign` / `siege` (`game:level:failed`) | meta-bridge → `analytics.sendEvent` |
| `stage_end` | game | `levels` · progress · `progress.levelEnd` (final result of the attempt) | `campaign` / `siege` (`game:stage:ended`) | meta-bridge → `analytics.sendEvent` |
| `continue_used` | game | `inventory` · inventory · `inventory.consume` (`bst_hull`, ok) | `boosters` (`game:continue:used`) | meta-bridge → `analytics.sendEvent` |
| `resource_shortage` | base | `inventory` · inventory · `inventory.quantity` (= 0 at use point) | `boosters` (`game:item:shortage`) | meta-bridge → `analytics.sendEvent` |
| `item_spent` | game | `inventory` · inventory · `inventory.consume` (ok) | `boosters` (`game:item:spent`) | meta-bridge → `analytics.sendEvent` |
| `item_earned` | game | `inventory` · inventory · `inventory.refresh` after a confirmed grant (`progress.levelEnd` reward, `progress.send` daily, `iap.waitOrder`) | `campaign` / `daily` / `shop` / `lobby` (`game:item:earned`) | meta-bridge → `analytics.sendEvent` |
| `offer_shown` | base | `offers` · iap · `iap.offers` / `iap.offer` (card rendered) | `shop` / `lobby` (`game:offer:shown`) | meta-bridge → `analytics.sendEvent` |
| `offer_click` | base | `offers` · iap · `iap.offer` (card / price tapped) | `shop` / `lobby` (`game:offer:click`) | meta-bridge → `analytics.sendEvent` |
| `purchase_start` | game | `purchases` · iap · `iap.purchase` (called) | `shop` (`game:purchase:start`) | meta-bridge → `analytics.sendEvent` |
| `purchase_result` | game | `purchases` · iap · `iap.waitOrder` / `iap.purchase` result | `shop` (`game:purchase:result`) | meta-bridge → `analytics.sendEvent` |
| `offer_purchase` | base | `purchases` · iap · `iap.waitOrder` (granted, offer) | `shop` (`game:offer:purchased`) | meta-bridge → `analytics.sendEvent` |
| `iap` | base | `purchases` · iap · `iap.waitOrder` (granted, paid product; price/currency from `iap.products`) | `shop` (`game:iap:paid`) | meta-bridge → `analytics.sendEvent` |
| `daily_claim` | game | `daily` · daily-rewards · `progress.send` (claim confirmed; day from `daily-rewards.plan`) | `daily` (`game:daily:claimed`) | meta-bridge → `analytics.sendEvent` |
| `siege_unlock` | game | `progress` · progress · `progress.init` (stage 5 first cleared) | `lobby` (`game:siege:unlocked`) | meta-bridge → `analytics.sendEvent` |
| `leaderboard_view` | game | `leaderboards` · leaderboards · `leaderboards.get` (tab shown) | `boards` (`game:boards:view`) | meta-bridge → `analytics.sendEvent` |
| `client_error` | game | the failed contract function · its module · its method (after retries) | any (`game:service:failed`) | meta-bridge → `analytics.sendEvent` |

Not sent by the game (SDK owns them): app open, boot time, SDK module failures (`sdk:module:failed`). No ad events — the flow has no ads.

## Ordering in one attempt

`level_start` → (`item_spent`, `resource_shortage`)* → on clear: `level_complete` → `item_earned`* → `stage_end`; on defeat: `level_fail` → [`continue_used` → … ] → `stage_end` (once, when the attempt is final: Retry, Map/End Run, or second defeat).

## Emission check

Scenario `qa/flows/analytics-emission.json` (gate df-analytics-events): grant → stage 1 with tutorial skip → qa-win → Collect → stage 2 → qa-lose → Continue → qa-lose → Map → Lobby → Shop purchase → Leaderboards. Required events — every step of funnels `ftue` and `core_loop` in EVENTS.json. Until a provider exists the gate measures emission through its intercept; the platform-side delivery stays NOT_RUN.

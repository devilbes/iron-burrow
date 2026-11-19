# Analytics taxonomy — decisions and platform gaps (step analytics-taxonomy, 19.11.2026)

Mode «Решай сам». `docs/gdd/DECISIONS.md` is outside this step's writeSet (`docs/analytics/**`, `qa/flows/analytics-*.json`), so the decisions are logged here; the next merge step moves the table into `docs/gdd/DECISIONS.md` as is.

| ID | decision | reason |
|---|---|---|
| D-AN-01 | Base N0 = session_start, session_end, tutorial_step, level_start, level_complete, level_fail, resource_shortage, offer_shown, offer_click, offer_purchase, iap; names never aliased or redefined | The fact `analytics.baseSet` was not delivered to this run and MCP docs have no N0 page; the list comes from the analytics-taxonomy skill. `ad_shown` / `ad_reward` are excluded: the flow has no ads |
| D-AN-02 | Transport is only core `sdk.analytics.sendEvent` (contract: function `analytics`, module carrier `ui-kit`); no-op until a provider exists | `sdk.modules.list` (rev 2) has no telemetry/analytics module; core analytics has no built-in provider, queue or schema. Own transport and third-party SDKs are forbidden |
| D-AN-03 | One sender: game module `meta-bridge` maps `game:*` bus events to catalog names | GDD 32 and the platform guide «Аналитика — только через SDK» |
| D-AN-04 | Param types `string|integer|number|boolean`, ≤ 40-char names, ≤ 25 params, flat values | The SDK publishes no event schema; limits of the platform receivers (GA4) from the platform docs |
| D-AN-05 | `stage_end` (game event) is kept beside `level_complete` / `level_fail` as a once-per-attempt summary (result incl. quit, continues, lives, boosters, siege waves) | AB_PLAN requires it (`d1_retention_proxy`); it has its own fields and fires once per final attempt, so it is not an alias of a base event |
| D-AN-06 | GDD 32 `an.siege_end` → `stage_end(level_set=siege)`; `an.booster_use` → `item_spent`; `an.reward_granted` → `item_earned`; `an.service_failed` → `client_error`; `an.app_ready` dropped | No duplicates: SDK reports app open/boot time and module failures itself; economy events carry item, amount and source/sink ids from ECONOMY.json |
| D-AN-07 | KPI entries carry formulas only; `targetRef` only where QUALITY_TARGETS has the key (tutorial_completion, tutorial_skip), else `null` | Thresholds live in DB / QUALITY_TARGETS, not in the taxonomy |
| D-AN-08 | Emission scenario uses only `click` / `expect` with `data-part` / `data-testid` hooks of GDD 20 and the env-`test` buttons `qa-win` / `qa-lose`; no `defeat-offer` expect | The runner format allows only `{action, selector, text?}`; the defeat offer is shown only when Spare Hull = 0, and the grant gives 2 hulls |

## Чего не хватает у платформы

1. **Fact `analytics.baseSet` (N0 + E25 envelope).** Looked in: `.devflow/facts.json`, `docs/plan/integration/PLATFORM_FACTS.json`, `GATE_FACTS` (absent), MCP `docs.search` «N0 base events», «event registry». Got: nothing; gate AN-05 can only WARN. Attempts: 3. Needed: deliver the fact to the run or publish an N0 page in docs.
2. **Analytics event schema in the SDK.** `sdk.modules.list {query:"analytics"}` → no modules; core `analytics.sendEvent` takes any name and payload. Needed: a published event schema (name limits, param types) or a telemetry module, so gate AN-01 can validate.
3. **Analytics registry tool.** No MCP tool to register game events in platform analytics; `REGISTRY.json` is kept with `status: pending-platform`.
4. **Provider.** Without a registered provider `sendEvent` is a no-op, so events do not reach the platform; delivery checks stay NOT_RUN.

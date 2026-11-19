# Economy open questions (none block the build; defaults are in ECONOMY.json)

| ID | question | default taken | who closes |
|---|---|---|---|
| OQ-01 | Does inventory support a per-item cap, and what happens to a grant above the cap? | Cap 999 as a documented safety bound; services-publish sets it only if supported; the client never blocks | services-publish (svc-inventory) |
| OQ-02 | Do players who only claim the daily reward pile up boosters (13 per week)? | Accepted: bounded by time, no currency to inflate; watch `an.booster_use` | metrics review after release |
| OQ-03 | QUALITY_TARGETS.economy (seed, runs, horizonDays, thresholds) and policies for genre arcade | Simulation unmeasured; rerun `studio-gates economy-simulate` when the facts arrive | orchestrator / plan step |
| OQ-04 | Can the progress level reward use the condition "stars = 3"? (D-15-03) | Fallback: a separate reward in the same level-set | services-publish (svc-progress-levels) |
| OQ-05 | When will Scrap ship? | When the platform publishes exchange rules and a start balance, see `deferredCurrencies` | platform |

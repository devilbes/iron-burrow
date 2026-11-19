# Scheduling (E135, client-sdk#420)

**Status: beta; readiness: planned.** Scheduling is an explicitly selected package;
LTS core does not promote it to stable or activate its owner API gate.
`@manygamescorp/mod-scheduling/contracts` owns the handwritten E135 safe read types.
They are not generated owner OpenAPI or evidence of a live API. Future owner API
publication/pinning/readback is tracked by scheduling's owner, outside core/contracts-client.

Public exports: `/scheduling` (runtime and types), `/contracts` (domain types and
planned readiness), `/schema` (safe output projection JSON Schema), `/version`,
`/README.md` and `/package.json`. The schema describes returned values, not
registration rules or all semantic window checks; those remain in the runtime parser.
There are no direct contracts-client imports/dependencies/TS references. Core is an
explicit host peer `>=1.0.0-rc.20 <2.0.0`; the module declares the same ABI range.
Only public core error/module/scoped-http/time subpaths are used. One core instance
owns server time, transport and session. No UI, scheduler worker or queue is added.

`schedulingModule({ownerApiReady})` registers `sdk.scheduling` on web
and Cordova. `ownerApiReady` defaults to false: calendar, inbox and ack reject
with `SDK_SCHEDULING_NOT_READY` before HTTP. Only the host may opt in after owner
OpenAPI, window schema, public projection and public API readback are verified.
An opt-in does not change `readiness: 'planned'` or prove backend availability.
No new settings, scopes, configuration writes or MCP methods are introduced;
owner scheduling MCP remains a separate planned implementation (mcp#221).

- `calendar.list(from, to, cursor?, limit?)`: GET `/v1/scheduling/calendar`.
  Offset-qualified ISO dates, `from < to`, at most 31 elapsed days; limit 1..100
  (server default when omitted), opaque cursor at most 2048 UTF-8 bytes. Items contain exactly
  `{occurrenceId,eventKey,start,end,instant}`. Extra fields, including private
  task/target/payload projections, fail closed. The owner must apply publicEvent
  opt-in and exclude private/targeted registrations; the SDK cannot infer eligibility.
- `events.list(cursor?, limit?)`: GET `/v1/scheduling/events`, cursor at most
  128 bytes. The planned inbox projection needs `occurrenceId` for dedup and
  `eventId` for ack, with immutable `start/end/instant`. Responses are narrowed
  to those five fields; task metadata/payload/PII never enter SDK caches/results.
- `events.ack(eventId)`: POST `/v1/scheduling/events/{eventId}/ack`, no body or
  generated Idempotency-Key. Repeat with the same returned identifier after an
  uncertain result; the owner guarantees natural idempotence and identical 404
  for foreign/missing events. Ack never acknowledges automatically during reads.
- `remainingMs(event)`: `instant ? 0 : max(0, end - ctx.time.now())`, milliseconds.
  Time comes only from the core server clock (`ctx.time`, `sdk.time`); if it is not
  synced yet, `SDK_SCHEDULING_CLOCK_NOT_READY` is thrown. There is no option to
  inject a clock, no device-clock fallback and no UI timer. Standalone
  `createScheduling` takes `time: Pick<ServerTime, 'now' | 'synced'>`.

Dates normalize to UTC milliseconds. Windows require end >= start, at most
366 elapsed days and an explicit boolean matching end == start. Calendar items
must intersect `[from,to)` using `[start,end)`; instant requires from <= start < to.
Registration duration/window/cron validation belongs to the owner, not to this
read-only client. No registration decoder, tasks CRUD or legacy defaults exist.

Dedup/cache: at most 1024 occurrences per stream and 8 calendar/inbox streams;
in-flight admission is bounded at 32 entries (including shared page work).
Follow `nextCursor` unchanged; repeated/overlapping cursor pages suppress seen
occurrenceIds. Omitting cursor starts a fresh scan. Identical concurrent reads
share one parsed page; different concurrent pages of one stream reject with
`SDK_SCHEDULING_BUSY`. Narrow the query after owner candidate-slot/retention errors.
This is a bounded read projection, not a snapshot or exactly-once effect ledger.

Core's session AbortSignal revokes the API immediately on player change. All
cursor/cache/dedup state is cleared, HTTP is canceled, late replies are rejected
even if a transport ignores abort, and the next module start creates fresh state.
appId/gid/token selection remains exclusively in core's scoped HTTP/JWT.

Targeted tests cover validation, DST/bounds, dedup/replay, safe projections,
clock skew, abort barriers and real core transport composition.
`npm run build && npm run scheduling:smoke` packs real tarballs and exercises a clean
offline core+scheduling consumer. It rejects incompatible core ABI and undeclared
imports, checks beta status, base import closure and hashed vendor types/schema/docs,
and updates only a fixture copy of scheduling to a different version with core unchanged.
No immutable version is rewritten or published. Release validation accepts the bounded
core peer ABI and version preparation preserves it. Shared release/catalog versioning
and range-preserving vendor dependency resolution remain separate LTS producer work.
Server A↔B/permissions/publicEvent/immutable run/E23 readback remain owner gates.

Sources: architecture `services/scheduling/{api-client,event-window}.md`,
`decisions/E135-scheduling-event-window.md`; GGF v2 `docs/platform/scheduling-calendar.md`
and `docs/examples/scheduling-calendar.ts` describe gated game usage.
